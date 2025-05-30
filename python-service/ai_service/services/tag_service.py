import asyncio
import numpy as np
import logging
from collections import defaultdict
from typing import List, Dict, Any, Tuple, Optional

from ai_service.database.database import Database
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.models.interfaces.clustering_model import ClusteringModel
from ai_service.models.interfaces.tag_generator import TagGenerator
from ai_service.utils.text_cleaner import TextCleaner
from ai_service.models.transformer_embedder import TransformerEmbedder
from ai_service.services.taggers.keybert_tagger import KeyBERTTagger
from ai_service.services.clustering.hdbscan_clusterer import HDBSCANClusterer
from ai_service.services.clustering.umap_visualizer import UMAPVisualizer
from bluesky.api import AccountService

from atproto_client.models.app.bsky.actor.defs import ProfileView
from atproto import Client


class TagService:
    """
    Service principal pour la génération de tags de clusters.
    Orchestre tout le processus de génération de tags.
    """
    
    def __init__(self, 
                 embedding_model: Optional[EmbeddingModel] = None,
                 clusterer: Optional[ClusteringModel] = None,
                 tag_generator: Optional[TagGenerator] = None,
                 text_cleaner: Optional[TextCleaner] = None,
                 visualizer_output_dir: str = "./"):
        """
        Initialise le service de tags
        
        Args:
            embedding_model: Modèle pour générer des embeddings
            clusterer: Modèle de clustering
            tag_generator: Générateur de tags
            text_cleaner: Nettoyeur de texte
            visualizer_output_dir: Répertoire de sortie pour les visualisations
        """
        # Initialiser ou utiliser les composants par défaut
        self.embedding_model = embedding_model or TransformerEmbedder("sentence-transformers/all-mpnet-base-v2")
        # Utiliser la métrique cosinus qui est plus adaptée aux embeddings de texte
        self.clusterer = clusterer or HDBSCANClusterer(metric="cosine", cluster_selection_method="leaf")
        self.tag_generator = tag_generator or KeyBERTTagger()
        self.text_cleaner = text_cleaner or TextCleaner()
        self.visualizer = UMAPVisualizer(output_dir=visualizer_output_dir)
        
        # Logger pour le suivi
        self.logger = logging.getLogger(self.__class__.__name__)
        
    async def generate_tags(self, 
                           account_handle: str, 
                           followers: List[ProfileView], 
                           database: Database, 
                           max_concurrent) -> List[Dict[str, Any]]:
        """
        Génère des tags pour regrouper les followers d'un compte
        
        Args:
            account_handle: Le handle du compte
            followers: Liste des followers à analyser
            database: Connexion à la base de données
            max_concurrent: Nombre maximal de requêtes concurrentes
            
        Returns:
            Liste de clusters avec leurs métadonnées
        """
        try:
            # Configuration
            semaphore = asyncio.Semaphore(max_concurrent)
            account_service = await self._create_account_service(database, account_handle)
            
            # Récupération des données
            self.logger.info(f"Démarrage de generate_tags pour {account_handle} avec {len(followers)} followers")
            
            # Traitement des followers en parallèle
            api_results = await self._fetch_follower_data(followers, account_service, semaphore)
            
            # Extraction des textes bruts
            user_text_corpus = self._extract_raw_texts(api_results)
            
            # Traitement IA des profils
            profile_data = await self._process_profiles(api_results)
            
            # Obtention de profils valides avec embeddings
            valid_profiles = self._get_valid_profiles(profile_data)
            
            if not valid_profiles:
                self.logger.warning("Aucun profil valide trouvé")
                return []
            
            # Clustering des profils
            cluster_labels, cluster_data = await self._cluster_profiles(valid_profiles)
            
            # Génération des tags pour chaque cluster
            cluster_tags = await self._generate_cluster_tags(
                cluster_labels, valid_profiles, user_text_corpus)
            
            self.logger.info(f"Génération des tags terminée: {len(cluster_tags)} clusters trouvés")
            return cluster_tags
            
        except Exception as e:
            self.logger.critical(f"Erreur critique dans generate_tags: {e}", exc_info=True)
            return []
    
    async def _create_account_service(self, database: Database, account_handle: str) -> AccountService:
        """
        Crée et configure un service de compte Bluesky
        """
        client = Client()
        account_service = AccountService(client)
        
        # Récupérer les données du compte
        self.logger.info("Récupération des données du compte")
        account = await database.fetch("SELECT * FROM accounts WHERE handle=$1", account_handle)
        print(account)
        if not account:
            raise ValueError(f"Compte non trouvé: {account_handle}")
        
        # Login
        account_service.login(account[0]["handle"], account[0]["app_password"])
        return account_service
    
    async def _fetch_follower_data(self, followers: List[ProfileView], 
                                   account_service: AccountService, 
                                   semaphore: asyncio.Semaphore) -> List[Dict[str, Any]]:
        """
        Récupère les données pour chaque follower (profil, posts, follows)
        """
        self.logger.info("Récupération des données des followers")
        api_tasks = []
        
        for follower in followers:
            api_tasks.append(self._fetch_single_follower(follower, account_service, semaphore))
            
        return await asyncio.gather(*api_tasks)
    
    async def _fetch_single_follower(self, follower: Dict[str, Any], 
                                    account_service: AccountService, 
                                    semaphore: asyncio.Semaphore) -> Dict[str, Any]:
        """
        Récupère les données pour un seul follower
        """
        async with semaphore:
            try:
                # Get profile is a synchronous method, so we use to_thread
                profile = await asyncio.to_thread(account_service.get_profile, follower["handle"])
                if not profile:
                    return None

                # Get profile data is a synchronous method that returns follows and posts
                follows, posts = await asyncio.to_thread(account_service.get_profile_data, profile.did)

                return {
                    "profile": profile,
                    "follows": follows,
                    "posts": posts
                }
            except Exception as e:
                self.logger.error(f"Error fetching data for follower {follower['handle']}: {e}")
                return None
    
    async def _process_follows_and_posts(self, account_service: AccountService, 
                                        did: str, 
                                        semaphore: asyncio.Semaphore) -> Tuple[List[Any], List[Any]]:
        """
        Récupère les follows et posts d'un utilisateur
        """
        async with semaphore:
            try:
                follows, posts = await asyncio.to_thread(account_service.get_profile_data, did)
                return follows, posts
            except Exception as e:
                self.logger.error(f"Error getting profile data for {did}: {e}")
                return [], []
    
    def _extract_raw_texts(self, api_results: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """
        Extrait les textes bruts (bio, posts) des résultats API
        """
        corpus = {}

        for result in api_results:
            if not result or "profile" not in result:
                continue

            handle = result["profile"].handle
            texts = []

            # Bio
            bio = result["profile"].description or ""
            texts.append(bio)

            # Posts
            if result["posts"]:
                post_texts = [p.post.record.text for p in result["posts"] 
                             if hasattr(p.post.record, "text")]
                texts.extend(post_texts)

            # Nettoyer les textes
            cleaned = [self.text_cleaner.clean(t) for t in texts if isinstance(t, str)]
            cleaned = [t for t in cleaned if t]  # Filtrer les None
            cleaned = cleaned[:30]  # Limiter pour des raisons de performance
            corpus[handle] = cleaned

        return corpus
    
    async def _process_profiles(self, api_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Traite les profils pour extraire les embeddings
        """
        self.logger.info("Traitement IA des profils")
        profile_tasks = [self._process_single_profile(res) for res in api_results if res]
        return await asyncio.gather(*profile_tasks)
    
    async def _process_single_profile(self, api_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Traite un profil individuel pour extraire ses embeddings
        """
        profile = api_result["profile"]
        follows = api_result["follows"]
        posts = api_result["posts"]

        profile_data = {
            "handle": profile.handle,
            "bio": [],
            "posts": [],
            "following_bio": []
        }

        # Traiter la bio
        bio_embedding = None
        if profile.description:
            cleaned_bio = self.text_cleaner.clean(profile.description, False)
            if cleaned_bio:
                bio_embedding = await asyncio.to_thread(
                    self.embedding_model.encode, cleaned_bio)
                profile_data["bio"] = bio_embedding[0]  # Prendre le premier élément car c'est un seul texte

        # Traiter les posts
        if posts:
            post_texts = []
            for p in posts:
                if hasattr(p.post.record, 'text'):
                    cleaned_text = self.text_cleaner.clean(p.post.record.text, aggressive=True)
                    if cleaned_text:
                        post_texts.append(cleaned_text)

            if post_texts:
                posts_embeddings = await asyncio.to_thread(
                    self.embedding_model.encode, post_texts)
                
                # Filtrer par similarité avec la bio si disponible
                filtered_post_embeddings = []
                for emb in posts_embeddings:
                    if bio_embedding:
                        sim = self.embedding_model.get_similarity(emb, bio_embedding[0])
                        if sim >= 0.75:
                            filtered_post_embeddings.append(emb)
                    else:
                        filtered_post_embeddings.append(emb)

                profile_data["posts"] = filtered_post_embeddings

        # Traiter les follows
        if follows:
            follow_texts = []
            for f in follows:
                if f.description:
                    cleaned_follow = self.text_cleaner.clean(f.description, aggressive=True)
                    if cleaned_follow:
                        follow_texts.append(cleaned_follow)

            if follow_texts:
                follow_embeddings = await asyncio.to_thread(
                    self.embedding_model.encode, follow_texts)
                
                # Filtrer par similarité avec la bio si disponible
                filtered_follow_embeddings = []
                for emb in follow_embeddings:
                    if bio_embedding:
                        sim = self.embedding_model.get_similarity(emb, bio_embedding[0])
                        if sim >= 0.65:
                            filtered_follow_embeddings.append(emb)
                    else:
                        filtered_follow_embeddings.append(emb)

                profile_data["following_bio"] = filtered_follow_embeddings

        return profile_data
    
    def _get_valid_profiles(self, processed_profiles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filtre les profils pour ne garder que ceux avec des embeddings valides
        """
        self.logger.info("Génération des embeddings globaux")
        valid_profiles = []
        for profile in processed_profiles:
            embedding = self._get_global_profile_embedding(profile)
            if embedding:
                valid_profiles.append({
                    "handle": profile["handle"],
                    "embedding": embedding
                })
        return valid_profiles
    
    def _get_global_profile_embedding(self, profile: Dict[str, Any]) -> List[float]:
        """
        Obtient un embedding global représentatif pour un profil
        """
        vectors = []
        weights = []
        
        if profile["bio"]:
            vectors.append(profile["bio"])
            weights.append(1.0)
            
        if profile["following_bio"]:
            avg_follow = np.mean(profile["following_bio"], axis=0)
            weight = 1 / np.sqrt(len(profile["following_bio"]))
            vectors.append(avg_follow)
            weights.append(weight)

        if profile["posts"]:
            avg_posts = np.mean(profile["posts"], axis=0)
            weight = 1 / np.sqrt(len(profile["posts"]))
            vectors.append(avg_posts)
            weights.append(weight)

        if not vectors:
            return []

        weighted_avg = np.average(vectors, axis=0, weights=weights)
        norm = np.linalg.norm(weighted_avg)
        return (weighted_avg / norm).tolist() if norm > 0 else weighted_avg.tolist()
    
    async def _cluster_profiles(self, valid_profiles: List[Dict[str, Any]]) -> Tuple[List[int], Any]:
        """
        Regroupe les profils en clusters
        """
        self.logger.info(f'Clustering de {len(valid_profiles)} profils')
        embeddings = [p["embedding"] for p in valid_profiles]
        handles = [p["handle"] for p in valid_profiles]
        
        # Ajuster les paramètres du clusterer en fonction de la taille du dataset
        self.clusterer.adjust_for_dataset_size(len(valid_profiles))
        
        # Effectuer le clustering
        labels, clusterer = self.clusterer.fit_predict(embeddings)
        
        # Générer la visualisation
        self.logger.info("Génération de visualisation UMAP")
        self.visualizer.generate_visualization(embeddings, labels, handles)
        
        return labels, clusterer
    
    async def _generate_cluster_tags(self, 
                                    labels: List[int], 
                                    valid_profiles: List[Dict[str, Any]], 
                                    user_text_corpus: Dict[str, List[str]]) -> List[Dict[str, Any]]:
        """
        Génère des tags pour chaque cluster
        """
        self.logger.info("Organisation des clusters")
        clusters = defaultdict(list)
        for profile, label in zip(valid_profiles, labels):
            clusters[label].append(profile["handle"])

        # Analyse des clusters et génération de tags
        self.logger.info("Génération des tags par cluster")
        cluster_tags = []
        
        # Trier les clusters par taille
        sorted_clusters = sorted(
            [(label, handles) for label, handles in clusters.items() if label != -1],
            key=lambda x: len(x[1]), 
            reverse=True
        )
        
        for label, handles in sorted_clusters:
            # Récupérer les textes pour ce cluster
            cluster_texts = []
            for handle in handles:
                cluster_texts.extend(user_text_corpus.get(handle, []))
            
            if cluster_texts:
                # Extraire les mots-clés et leur embedding
                keywords, keyword_embeddings = self.tag_generator.generate_keywords(cluster_texts, top_n=30)
                
                if keywords:
                    # Générer un tag représentatif
                    representative_tag = self.tag_generator.summarize_keywords(keywords)
                    
                    # Calculer les top mots-clés secondaires
                    top_keywords = [kw for kw, _ in keywords[:5]] if len(keywords) >= 5 else [kw for kw, _ in keywords]
                    
                    # Calculer la cohésion du cluster
                    cohesion = self._calculate_cluster_cohesion(label, valid_profiles, labels)
                    
                    # Créer l'entrée cluster avec métadonnées enrichies
                    cluster_tags.append({
                        "tag": representative_tag,
                        "handles": handles,
                        "keywords": top_keywords,
                        "embedding": keyword_embeddings if isinstance(keyword_embeddings, list) else keyword_embeddings.tolist(),
                        "size": len(handles),
                        "cohesion": float(cohesion),
                        "cluster_id": int(label)
                    })
        
        # Trier par taille décroissante
        cluster_tags.sort(key=lambda x: x["size"], reverse=True)
        return cluster_tags
    
    def _calculate_cluster_cohesion(self, 
                                  label: int, 
                                  valid_profiles: List[Dict[str, Any]], 
                                  labels: List[int]) -> float:
        """
        Calcule la cohésion d'un cluster (similarité moyenne par rapport au centroïde)
        """
        # Récupérer les indices des profils dans ce cluster
        cluster_indices = [i for i, (_, l) in enumerate(zip(valid_profiles, labels)) if l == label]
        
        if not cluster_indices:
            return 0.0
        
        # Récupérer les embeddings des profils dans ce cluster
        cluster_embeddings = [valid_profiles[i]["embedding"] for i in cluster_indices]
        
        # Calculer le centroïde
        centroid = np.mean(cluster_embeddings, axis=0)
        
        # Normaliser le centroïde
        norm = np.linalg.norm(centroid)
        if norm > 0:
            centroid = centroid / norm
        
        # Calculer les similarités
        similarities = [np.dot(emb, centroid) for emb in cluster_embeddings]
        return np.mean(similarities)