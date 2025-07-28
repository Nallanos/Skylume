import asyncio
import time
import signal
import threading
import logging
from typing import List, Dict, Protocol, Tuple, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from ai_service.clients.adonis_api_client import AdonisApiClient
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.models.interfaces.clustering_model import ClusteringModel
from ai_service.models.interfaces.tag_generator import TagGenerator
from ai_service.utils.text_cleaner import TextCleaner
from ai_service.services.taggers.improved_tag_generator import ImprovedTagGenerator

# Import new ProfileProcessor and TextCleaner
from ai_service.services.semantic_clustering.processors.profile_processor import ProfileProcessor
from ai_service.services.semantic_clustering.processors.text_cleaner import TextCleaner as NewTextCleaner

# Import centralized dependency factory
from ai_service.services.dependency_factory import DependencyFactory

# Type definitions for ProfileView and other Bluesky types
class ProfileView(Protocol):
    """Protocol defining the structure of a ProfileView object"""
    handle: str
    did: str = None
    description: str = None

# Mock Client class for graceful degradation when atproto is not available
class MockClient:
    """Mock client for when atproto is not available"""
    def login(self, handle: str, password: str) -> None:
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.warning("atproto not available - client functionality disabled")
        raise NotImplementedError("atproto not available - client functionality disabled")

# Set Client to MockClient by default (graceful degradation)
Client = MockClient
ATPROTO_AVAILABLE = False

# Try to import real dependencies if available
try:
    from atproto import Client as AtprotoClient
    try:
        from atproto_client.models.app.bsky.actor.defs import ProfileView as ActualProfileView
        # Override our protocol with the real type if available
        ProfileView = ActualProfileView  # type: ignore
    except ImportError:
        # Keep our protocol as the ProfileView type
        pass
    Client = AtprotoClient
    ATPROTO_AVAILABLE = True
    logging.info("atproto dependencies successfully imported")
except ImportError:
    logging.warning("atproto dependencies not available - using fallback implementations")


class MainOrchestrator:
    """
    Lightweight orchestrator for the 7-step semantic clustering pipeline.
    
    This refactored service follows the single responsibility principle by delegating
    specific tasks to specialized services
    
    1. Profile Processing → ProfileProcessor
    2. Profile Clustering → ProfileClusterer  
    3. Keyword Extraction → SemanticKeywordExtractor
    4. Keyword Clustering → KeywordClusterer
    5. Coherence Validation → CoherenceValidator
    6. Tag Generation → TagGeneratorService
    7. Multi-Scale Optimization → MultiScaleOptimizer + TagValidator
    
    The orchestrator coordinates these services through dependency injection.
    """
    
    def __init__(self, 
                 api_client: AdonisApiClient,
                 embedding_model: EmbeddingModel,
                 clusterer: ClusteringModel,
                 tag_generator: TagGenerator,
                 text_cleaner: NewTextCleaner,
                 config: dict = None):
        """
        Initialize the TagService orchestrator with dependency injection.
        
        Args:
            api_client: Client API for communicating with AdonisJS
            embedding_model: Model for generating embeddings (optional, will use factory)
            clusterer: Model for clustering (optional, will use factory)
            tag_generator: Generator for tags (optional, will use factory)
            text_cleaner: New TextCleaner utility (optional, will use factory)
            config: Configuration dictionary
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self.api_client = api_client
        self.config = config or {}
        
        self.logger.info("🔄 Initializing modular TagService orchestrator with DependencyFactory...")
        start_time = time.time()
        
        try:
            # Initialize core dependencies using DependencyFactory
            self.embedding_model = embedding_model
            self.clusterer = clusterer
            self.tag_generator = tag_generator
            self.text_cleaner = text_cleaner
            
            # Initialize specialized services through dependency injection
            self._init_specialized_services()
            
            # Initialize the working ImprovedTagGenerator implementation
            self.improved_tag_generator = DependencyFactory.get_improved_tag_generator()
            
            elapsed = time.time() - start_time
            self.logger.info(f"✅ Modular TagService orchestrator initialized in {elapsed:.1f}s")
            
        except Exception as e:
            self.logger.error(f"❌ Error initializing TagService orchestrator: {e}")
            raise
    
    def _init_specialized_services(self):
        """Initialize all specialized services using DependencyFactory with proper dependency injection."""
        try:
            # Core infrastructure services
            self.memory_manager = DependencyFactory.get_memory_manager(self.config)
            
            # Initialize AccountService for profile enrichment
            self.account_service = DependencyFactory.get_account_service()
            if self.account_service:
                self.logger.info("✅ AccountService initialized for profile enrichment")
            else:
                self.logger.warning("⚠️ AccountService not available - profile enrichment disabled")
            
            # Step 1: Profile processing with AccountService injection
            self.profile_processor = DependencyFactory.get_profile_processor(
                embedding_model=self.embedding_model,
                text_cleaner=self.text_cleaner,
                memory_manager=self.memory_manager,
                account_service=self.account_service
            )
            
            # Step 2: Profile clustering  
            # Initialize the fallback handler using DependencyFactory
            self.fallback_handler = DependencyFactory.get_fallback_handler(self.embedding_model)
            self.profile_clusterer = DependencyFactory.get_profile_clusterer(
                clusterer=self.clusterer,
                memory_manager=self.memory_manager,
                fallback_handler=self.fallback_handler,
                embedding_model=self.embedding_model
            )
            
            # LDA topic modeler for enhanced clustering
            self.lda_topic_modeler = DependencyFactory.get_lda_topic_modeler(logger=self.logger)
            
            # KeyBERT tagger for LDA-based tagging
            try:
                from ai_service.services.taggers.keybert_tagger import KeyBERTTagger
                self.keybert_tagger = KeyBERTTagger(
                    embedding_model=self.embedding_model,
                    text_cleaner=self.text_cleaner
                )
                self.logger.info("✅ KeyBERT tagger initialized for LDA-based tagging")
            except ImportError as e:
                self.logger.warning(f"⚠️ KeyBERT not available: {e} - will use fallback tagging")
                self.keybert_tagger = None
            except Exception as e:
                self.logger.error(f"❌ Error initializing KeyBERT tagger: {e}")
                self.keybert_tagger = None
            
            # Step 3: Keyword extraction
            self.keyword_extractor = DependencyFactory.get_semantic_keyword_extractor(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            # Step 4: Keyword clustering
            self.keyword_clusterer = DependencyFactory.get_keyword_clusterer(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            # Step 5: Coherence validation
            self.coherence_validator = DependencyFactory.get_coherence_validator(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            # Step 6: Tag generation
            self.tag_generator_service = DependencyFactory.get_tag_generator_service(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            # Step 7: Multi-scale optimization and validation
            self.multi_scale_optimizer = DependencyFactory.get_multi_scale_optimizer(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            self.tag_validator = DependencyFactory.get_tag_validator(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            self.logger.info("✅ All specialized services initialized successfully using DependencyFactory")
            
        except Exception as e:
            self.logger.error(f"❌ Error initializing specialized services: {e}")
            raise
    
    def export_user_embeddings_for_umap(self, followers: List[dict], embeddings: List[List[float]], out_path: str = "user_embeddings.json"):
        """
        Exporte les embeddings utilisateurs et leurs handles dans un fichier JSON pour la visualisation UMAP.
        """
        data = []
        for profile, emb in zip(followers, embeddings):
            handle = self._get_profile_field(profile, 'handle')
            if handle and emb is not None:
                # Convertit les embeddings numpy en liste si nécessaire
                if hasattr(emb, 'tolist'):
                    emb = emb.tolist()
                data.append({"handle": handle, "embedding": emb})
        with open(out_path, "w") as f:
            import json
            json.dump(data, f, indent=2)
        self.logger.info(f"Exported {len(data)} user embeddings to {out_path} for UMAP visualization.")

    def run_umap_visualization(self, embeddings_path: str = "user_embeddings.json"):
        """
        Appelle le script de visualisation UMAP sur les embeddings exportés.
        """
        import subprocess
        import sys
        import os
        script_path = os.path.join(os.path.dirname(__file__), "semantic_clustering", "umap_users.py")
        python_exec = sys.executable
        env = os.environ.copy()
        env["USER_EMBEDDINGS_PATH"] = embeddings_path
        result = subprocess.run([python_exec, script_path], env=env, capture_output=True, text=True)
        if result.returncode == 0:
            self.logger.info("UMAP visualization generated successfully.")
        else:
            self.logger.error(f"UMAP visualization failed: {result.stderr}")

    def export_clustered_data_for_umap(self, final_clusters: List[Dict], out_path: str = "clustered_data_for_adonisjs.json"):
        """
        Exporte les données clusterisées finales avec les tags pour visualisation UMAP colorée.
        
        Args:
            final_clusters: Liste des clusters finaux avec leurs tags
            out_path: Chemin de sortie pour le fichier JSON
        """
        try:
            import json
            clustered_data = []
            
            for cluster_idx, cluster in enumerate(final_clusters):
                # Extraire les profils et leurs embeddings
                profiles = cluster.get('profiles', [])
                embeddings = cluster.get('embedding', [])
                tag = cluster.get('tag', f'Cluster_{cluster_idx}')
                
                # Si pas d'embeddings dans le cluster, essayer de les récupérer
                if not embeddings and profiles:
                    # Pour les clusters de bruit ou sans embeddings, on skip
                    if cluster.get('cluster_type') == 'noise' or cluster.get('skip_tagging'):
                        continue
                    # Sinon, générer des embeddings si possible
                    try:
                        profile_texts = [self._get_profile_field(p, 'description') or self._get_profile_field(p, 'handle') for p in profiles]
                        valid_texts = [t for t in profile_texts if t and t.strip()]
                        if valid_texts:
                            embeddings = self.embedding_model.encode(valid_texts)
                            if hasattr(embeddings, 'tolist'):
                                embeddings = embeddings.tolist()
                    except Exception as e:
                        self.logger.warning(f"Could not generate embeddings for cluster {cluster_idx}: {e}")
                        continue
                
                # Ajouter chaque profil avec son embedding et tag de cluster
                for i, profile in enumerate(profiles):
                    if i < len(embeddings):
                        handle = self._get_profile_field(profile, 'handle')
                        if handle and embeddings[i] is not None:
                            embedding = embeddings[i]
                            # Convertir les embeddings numpy en liste si nécessaire
                            if hasattr(embedding, 'tolist'):
                                embedding = embedding.tolist()
                            
                            clustered_data.append({
                                "handle": handle,
                                "embedding": embedding,
                                "cluster_tag": tag,
                                "cluster_id": cluster_idx,
                                "cohesion": cluster.get('cohesion', 0.0),
                                "cluster_size": cluster.get('size', len(profiles)),
                                "robustness_tag": cluster.get('robustness_tag', 'Unknown')
                            })
            
            # Sauvegarder les données
            with open(out_path, "w") as f:
                json.dump(clustered_data, f, indent=2)
            
            self.logger.info(f"✅ Exported {len(clustered_data)} clustered profiles to {out_path} for colored UMAP visualization")
            return len(clustered_data)
            
        except Exception as e:
            self.logger.error(f"❌ Error exporting clustered data for UMAP: {e}")
            return 0

    def run_clustered_umap_visualization(self, clustered_data_path: str = "clustered_data_for_adonisjs.json"):
        """
        Génère une visualisation UMAP colorée des clusters finaux avant envoi à AdonisJS.
        """
        try:
            import matplotlib.pyplot as plt
            import numpy as np
            import json
            from umap import UMAP
            from sklearn.preprocessing import StandardScaler
            
            # Charger les données clusterisées
            with open(clustered_data_path, 'r') as f:
                data = json.load(f)
            
            if not data:
                self.logger.warning("No clustered data found for UMAP visualization")
                return
            
            # Extraire embeddings, tags et handles
            embeddings = np.array([item['embedding'] for item in data])
            cluster_tags = [item['cluster_tag'] for item in data]
            handles = [item['handle'] for item in data]
            robustness_tags = [item['robustness_tag'] for item in data]
            
            # Normaliser les embeddings
            scaler = StandardScaler()
            embeddings_scaled = scaler.fit_transform(embeddings)
            
            # Appliquer UMAP
            self.logger.info("🔄 Generating UMAP projection for clustered data...")
            umap_model = UMAP(n_neighbors=15, min_dist=0.1, n_components=2, random_state=42)
            embedding_2d = umap_model.fit_transform(embeddings_scaled)
            
            # Créer la visualisation avec couleurs par cluster
            plt.figure(figsize=(16, 12))
            
            # Obtenir les tags uniques et assigner des couleurs
            unique_tags = list(set(cluster_tags))
            colors = plt.cm.Set3(np.linspace(0, 1, len(unique_tags)))
            color_map = dict(zip(unique_tags, colors))
            
            # Tracer chaque cluster avec une couleur différente
            for tag in unique_tags:
                mask = np.array([t == tag for t in cluster_tags])
                if np.any(mask):
                    cluster_points = embedding_2d[mask]
                    cluster_handles = np.array(handles)[mask]
                    cluster_robustness = np.array(robustness_tags)[mask]
                    
                    plt.scatter(
                        cluster_points[:, 0], 
                        cluster_points[:, 1],
                        c=[color_map[tag]], 
                        label=f'{tag} ({np.sum(mask)} profiles)',
                        alpha=0.7,
                        s=60
                    )
                    
                    # Ajouter quelques labels pour les plus gros clusters
                    if np.sum(mask) >= 5:  # Seulement pour les clusters de 5+ profils
                        for i in range(min(3, len(cluster_points))):  # Max 3 labels par cluster
                            plt.annotate(
                                cluster_handles[i], 
                                (cluster_points[i, 0], cluster_points[i, 1]),
                                xytext=(5, 5), 
                                textcoords='offset points',
                                fontsize=8,
                                alpha=0.6
                            )
            
            plt.title('UMAP Visualization of Final Clusters (Before AdonisJS)', fontsize=16, fontweight='bold')
            plt.xlabel('UMAP Dimension 1', fontsize=12)
            plt.ylabel('UMAP Dimension 2', fontsize=12)
            plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=10)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            # Sauvegarder
            output_path = "final_clusters_umap_visualization.png"
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
            plt.close()
            
            self.logger.info(f"✅ Clustered UMAP visualization saved to {output_path}")
            
            # Statistiques des clusters
            cluster_stats = {}
            for tag in unique_tags:
                count = cluster_tags.count(tag)
                cluster_stats[tag] = count
            
            self.logger.info("📊 Final cluster distribution:")
            for tag, count in sorted(cluster_stats.items(), key=lambda x: x[1], reverse=True):
                self.logger.info(f"   - {tag}: {count} profiles")
            
        except Exception as e:
            self.logger.error(f"❌ Error generating clustered UMAP visualization: {e}")
            # Ne pas faire échouer le pipeline si la visualisation échoue

    async def analyze_audience(self, account_handle: str, followers: List[dict], max_concurrent: int = 1, 
                             bluesky_handle: str = None, bluesky_password: str = None) -> List[Dict]:
        """
        Main orchestrator for the 7-step semantic clustering pipeline. Renamed from generate_tags for clarity.
        
        This method coordinates all specialized services to transform raw follower data
        into meaningful semantic clusters with high-quality tags.
        
        Args:
            account_handle: Handle of the account being analyzed
            followers: List of follower profiles to analyze
            max_concurrent: Maximum concurrent processing (for future scalability)
            bluesky_handle: Optional Bluesky handle for API authentication
            bluesky_password: Optional Bluesky password for API authentication
            
        Returns:
            List of cluster dictionaries with semantic tags and metadata
        """
        try:
            start_time = time.time()
            self.logger.info(f"🚀 Starting modular 7-step semantic clustering for {account_handle}")
            self.logger.info(f"📊 Processing {len(followers)} followers through modular pipeline")
            
            # Initialize memory monitoring
            self.memory_manager.check_memory_usage()
            
            if not followers:
                self.logger.warning("No followers provided for analysis")
                return []

                        # STEP 1: Profile Processing
            self.logger.info("🔄 Step 1: Processing profiles through ProfileProcessor (bio-only strategy)...")
            # Authentification si identifiants fournis (déléguée à AccountService si besoin)
            if bluesky_handle and bluesky_password and hasattr(self.account_service, "login"):
                self.account_service.login(bluesky_handle, bluesky_password)
            # Traitement des profils
            processed_data = await self.profile_processor.process_profiles(followers)
            
            # Extraire les données du dictionnaire retourné
            final_profiles = processed_data.get('valid_profiles', [])
            final_embeddings = processed_data.get('profile_embeddings', [])
            trash_profiles = processed_data.get('trash_profiles', [])
            validation_stats = processed_data  # Toutes les stats sont dans le dict

            # Log des statistiques de séparation
            self.logger.info(f"📊 Profile separation: {len(final_profiles)} with bio, {len(trash_profiles)} without bio")

            # --- EXPORT & VISUALISATION UMAP AVANT CLUSTERING (seulement profils valides) ---
            if final_profiles and final_embeddings:
                self.export_user_embeddings_for_umap(final_profiles, final_embeddings)
                self.run_umap_visualization()
            # --- FIN EXPORT & VISU ---

            # Construction du dictionnaire pour compatibilité avec le pipeline existant
            processed_data = {
                'valid_profiles': final_profiles,
                'profile_embeddings': final_embeddings,
                'trash_profiles': trash_profiles,
                'validation_stats': validation_stats
            }
            if not processed_data['valid_profiles']:
                self.logger.warning("No valid profiles for clustering")
                return []
            
            # STEP 2: Profile Clustering with Quality Control
            if self.fallback_handler is not None and self.profile_processor is not None:
                self.logger.info("🔄 Step 2: Clustering profiles with quality control through ProfileClusterer...")
                
                # Inject LDA topic modeler into the fallback handler
                if hasattr(self.fallback_handler, 'set_lda_topic_modeler'):
                    self.fallback_handler.set_lda_topic_modeler(self.lda_topic_modeler)
                
                # Inject LDA topic modeler into the profile clusterer
                if hasattr(self.profile_clusterer, 'set_lda_topic_modeler'):
                    self.profile_clusterer.set_lda_topic_modeler(self.lda_topic_modeler)
                
                # Use the NEW multi-method clustering pipeline
                profile_clusters = self.profile_clusterer.cluster_profiles_with_multi_method_pipeline(
                    processed_data['profile_embeddings'],
                    processed_data['valid_profiles'],
                    profile_processor=self.profile_processor,
                    min_cluster_size=3,
                )
            else:
                self.logger.warning("Fallback handler or profile processor not available, skipping clustering")
                return []            
            
            if not profile_clusters:
                self.logger.warning("No profile clusters generated")
                return []
            
            self.logger.info(f"✅ Generated {len(profile_clusters)} profile clusters")
            
            # Process each cluster through steps 3-7
            final_clusters = []
            
            for i, cluster_data in enumerate(profile_clusters):
                try:
                    # Vérifier si ce cluster doit être ignoré pour le tagging
                    if cluster_data.get('skip_tagging', False):
                        robustness_tag = cluster_data.get('robustness_tag', 'Cannot Determine')
                        self.logger.info(f"⚠️ Skipping cluster {i+1}/{len(profile_clusters)} - {robustness_tag}")
                        
                        # Ajouter quand même le cluster avec un statut spécial
                        cluster_data['tags'] = []
                        cluster_data['keywords'] = []
                        cluster_data['validation_status'] = 'skip_tagging'
                        cluster_data['processing_status'] = 'skipped'
                        final_clusters.append(cluster_data)
                        continue
                    
                    self.logger.info(f"🔄 Processing cluster {i+1}/{len(profile_clusters)}")
                    
                    # NOUVEAU TAGGING BASÉ SUR LDA + KEYBERT
                    cluster_tag_result = self._generate_lda_based_tag(i, cluster_data)
                    
                    # Construire le cluster final avec toutes les données
                    final_cluster = self._build_final_cluster(cluster_data, cluster_tag_result)
                    final_clusters.append(final_cluster)
                    
                    # Log cluster details for debugging
                    cluster_size = final_cluster.get('size', 0)
                    handles_count = len(final_cluster.get('handles', []))
                    embedding_status = "OK" if final_cluster.get('embedding') else "NULL"
                    self.logger.info(f"Final cluster {i+1}: size={cluster_size}, handles={handles_count}, embedding={embedding_status}, tag='{final_cluster.get('tag', 'unknown')}'")
                    
                except Exception as e:
                    self.logger.error(f"❌ Error processing cluster {i+1}: {e}")
                    continue
            
            # Generate insights and suggestions
            total_time = time.time() - start_time
            self.logger.info(f"✅ Completed modular pipeline in {total_time:.1f}s")
            self.logger.info(f"📈 Generated {len(final_clusters)} final semantic clusters")
            
            # Create noise cluster for trash profiles (profiles without meaningful bio)
            if trash_profiles:
                noise_cluster = self._create_noise_cluster(trash_profiles)
                final_clusters.append(noise_cluster)
                self.logger.info(f"🗑️ Added noise cluster with {len(trash_profiles)} profiles without bio")
            
            # --- VISUALISATION UMAP DES CLUSTERS FINAUX AVANT ENVOI À ADONISJS ---
            self.logger.info("🎨 Generating final clusters UMAP visualization before sending to AdonisJS...")
            try:
                # Exporter les données clusterisées avec tags
                exported_count = self.export_clustered_data_for_umap(final_clusters)
                if exported_count > 0:
                    # Générer la visualisation UMAP colorée
                    self.run_clustered_umap_visualization()
                    self.logger.info(f"✅ Generated colored UMAP visualization for {exported_count} clustered profiles")
                else:
                    self.logger.warning("⚠️ No data exported for UMAP visualization")
            except Exception as viz_error:
                self.logger.warning(f"⚠️ UMAP visualization failed (non-critical): {viz_error}")
            # --- FIN VISUALISATION CLUSTERS FINAUX ---
            
            # Nettoyer tous les ndarrays avant de retourner les résultats
            cleaned_final_clusters = self._clean_ndarrays_from_results(final_clusters)
        except Exception as e:
            self.logger.error(f"❌ Error in modular semantic clustering pipeline: {e}")
            cleaned_final_clusters = []
        return cleaned_final_clusters

    def _generate_lda_based_tag(self, cluster_index: int, cluster_data: Dict) -> Dict:
        """
        Génère un tag pour un cluster en utilisant les topics LDA et le nouveau pipeline de validation.
        
        Args:
            cluster_index: Index du cluster
            cluster_data: Données du cluster avec les informations LDA
            
        Returns:
            Dictionnaire avec tag et mots-clés
        """
        # Vérifier si le cluster doit être ignoré pour le tagging
        if cluster_data.get('skip_tagging', False):
            robustness_tag = cluster_data.get('robustness_tag', 'Cannot Determine')
            self.logger.info(f"⚠️ Skipping cluster {cluster_index+1} - {robustness_tag}")
            return {
                'tag': robustness_tag.replace('🔴 ', '').replace('🟠 ', '').replace('🟡 ', '').replace('🟢 ', ''),
                'keywords': [],
                'tagging_method': 'skipped',
                'validation_status': 'skip_tagging',
                'quality_score': 0.0,
                'is_high_quality': False
            }
        
        try:
            # Récupérer les topics LDA du cluster
            lda_topics = cluster_data.get('lda_topics', [])
            n_topics = cluster_data.get('lda_n_topics', 0)
            
            # Préparer les mots-clés à partir des topics LDA
            keyword_cluster = []
            if lda_topics and len(lda_topics) > 0:
                # Combiner les top mots de tous les topics LDA avec des scores artificiels
                for i, topic_words in enumerate(lda_topics):
                    # Prendre les 10 top mots de chaque topic avec scores décroissants
                    top_words = topic_words[:10] if len(topic_words) >= 10 else topic_words
                    for j, word in enumerate(top_words):
                        # Score artificiel décroissant : topic 0 > topic 1, mot 0 > mot 1
                        score = 0.9 - (i * 0.1) - (j * 0.05)
                        keyword_cluster.append((word, max(score, 0.1)))
                
                self.logger.debug(f"🎯 Prepared {len(keyword_cluster)} keywords from {len(lda_topics)} LDA topics for cluster {cluster_index+1}")
            
            # Extraire les textes des profils pour le contexte sémantique
            profiles = cluster_data.get('profiles', [])
            cluster_texts = []
            if profiles and self.profile_processor:
                try:
                    cluster_texts = self.profile_processor.extract_cluster_texts(profiles)
                    # Limiter pour les performances
                    cluster_texts = cluster_texts[:10] if len(cluster_texts) > 10 else cluster_texts
                except Exception as e:
                    self.logger.warning(f"⚠️ Failed to extract cluster texts: {e}")
                    cluster_texts = []
            
            # Utiliser le nouveau pipeline de génération et validation
            if hasattr(self, 'tag_generator_service') and self.tag_generator_service:
                # TODO: Implémenter la collecte de tous les tags pour la fréquence
                all_tags = getattr(self, '_current_session_tags', [])
                
                tag_result = self.tag_generator_service.generate_and_filter_tags(
                    keyword_cluster=keyword_cluster,
                    cluster_texts=cluster_texts,  # Utilise les textes au lieu des handles
                    all_tags=all_tags
                )
                
                # Stocker le tag généré pour la session
                if not hasattr(self, '_current_session_tags'):
                    self._current_session_tags = []
                self._current_session_tags.append(tag_result['tag'])
                
                # Logger la qualité du tag
                quality_info = f"quality={tag_result['quality_score']:.2f}"
                if not tag_result['is_high_quality']:
                    quality_info += f", issues={tag_result['issues']}"
                
                self.logger.info(f"✅ Generated tag '{tag_result['tag']}' for cluster {cluster_index+1} ({quality_info})")
                
                return {
                    'tag': tag_result['tag'],
                    'keywords': keyword_cluster[:10],  # Garder les top mots-clés
                    'tagging_method': tag_result['generation_method'],
                    'quality_score': tag_result['quality_score'],
                    'is_high_quality': tag_result['is_high_quality'],
                    'validation_issues': tag_result['issues'],
                    'filters_passed': tag_result['filters_passed'],
                    'lda_topics_used': len(lda_topics)
                }
            
            # Fallback si le service n'est pas disponible
            self.logger.warning(f"⚠️ TagGeneratorService not available for cluster {cluster_index+1}, using simple fallback")
            
            if keyword_cluster:
                fallback_tag = keyword_cluster[0][0].title()
                return {
                    'tag': fallback_tag,
                    'keywords': keyword_cluster[:10],
                    'tagging_method': 'simple_fallback',
                    'quality_score': 0.3,
                    'is_high_quality': False,
                    'lda_topics_used': len(lda_topics)
                }
            
            # Fallback complet
            return {
                'tag': 'Community',
                'keywords': [],
                'tagging_method': 'generic_fallback',
                'quality_score': 0.2,
                'is_high_quality': False,
                'lda_topics_used': 0
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error in LDA-based tagging for cluster {cluster_index+1}: {e}")
            return {
                'tag': 'Community',
                'keywords': [],
                'tagging_method': 'error_fallback',
                'quality_score': 0.1,
                'is_high_quality': False,
                'error': str(e)
            }

    def _build_final_cluster(self, cluster_data: Dict, tag_result: Dict) -> Dict:
        """
        Construit le cluster final avec toutes les données nécessaires.
        
        Args:
            cluster_data: Données brutes du cluster
            tag_result: Résultat du tagging
            
        Returns:
            Cluster final formaté
        """
        profiles = cluster_data.get('profiles', [])
        handles = self._extract_profile_handles(profiles)
        
        # Convertir l'embedding en liste si c'est un ndarray
        embedding = cluster_data.get('embedding', [])
        if hasattr(embedding, 'tolist'):
            embedding = embedding.tolist()
        
        # Calculer la persistence pondérée
        cohesion = cluster_data.get('cohesion', 0.0)
        
        final_cluster = {
            'handles': handles,
            'size': len(profiles),
            'profiles': profiles,
            'embedding': embedding,
            'tag': tag_result.get('tag', 'Community'),
            'keywords': tag_result.get('keywords', []),
            'cohesion': cohesion,
            
            # Données de robustesse propagées
            'robustness_level': cluster_data.get('robustness_level'),
            'robustness_tag': cluster_data.get('robustness_tag'),
            'pipeline_step': cluster_data.get('pipeline_step'),
            'skip_tagging': cluster_data.get('skip_tagging', False),
            'processing_status': cluster_data.get('processing_status', 'processed'),
            'clustering_method': cluster_data.get('clustering_method', 'HDBSCAN'),
            
            # Informations de tagging
            'tagging_method': tag_result.get('tagging_method', 'unknown'),
            'lda_topics_used': tag_result.get('lda_topics_used', 0),
            'validation_status': tag_result.get('validation_status', 'processed'),
            
            # Nouvelles informations de qualité des tags
            'tag_quality_score': tag_result.get('quality_score', 0.0),
            'tag_is_high_quality': tag_result.get('is_high_quality', False),
            'tag_validation_issues': tag_result.get('validation_issues', []),
            'tag_filters_passed': tag_result.get('filters_passed', [])
        }
        
        return final_cluster
            

    def _extract_cluster_texts(self, cluster_profiles: List[dict]) -> List[str]:
        """Extract text content from cluster profiles."""
        cluster_texts = []
        for profile in cluster_profiles:
            description = self._get_profile_field(profile, 'description')
            handle = self._get_profile_field(profile, 'handle')
            
            if description and isinstance(description, str) and description.strip():
                cluster_texts.append(description)
            elif handle and isinstance(handle, str) and handle.strip():
                cluster_texts.append(handle.replace('.bsky.social', '').replace('.', ' '))
            else:
                cluster_texts.append("")
        
        return cluster_texts
    
    def _get_profile_field(self, profile: dict, field: str) -> str:
        """Safely extract field from profile object or dictionary."""
        try:
            # Try object attribute access first
            if hasattr(profile, field):
                return getattr(profile, field)
            # Try dictionary access
            elif isinstance(profile, dict) and field in profile:
                return profile[field]
            else:
                return None
        except Exception:
            return None
    
    
    def _extract_cluster_texts(self, cluster_profiles: List[dict]) -> List[str]:
        """Extract text content from cluster profiles."""
        cluster_texts = []
        for profile in cluster_profiles:
            description = self._get_profile_field(profile, 'description')
            handle = self._get_profile_field(profile, 'handle')
            
            if description and isinstance(description, str) and description.strip():
                cluster_texts.append(description)
            elif handle and isinstance(handle, str) and handle.strip():
                cluster_texts.append(handle.replace('.bsky.social', '').replace('.', ' '))
            else:
                cluster_texts.append("")
        
        return cluster_texts
    
    def _get_profile_field(self, profile: dict, field: str) -> str:
        """Safely extract field from profile object or dictionary."""
        try:
            # Try object attribute access first
            if hasattr(profile, field):
                return getattr(profile, field)
            # Try dictionary access
            elif isinstance(profile, dict) and field in profile:
                return profile[field]
            else:
                return None
        except Exception:
            return None
    
    def _extract_profile_handles(self, profiles: List[dict]) -> List[str]:
        """Extract handles from cluster profiles."""
        handles = []
        for profile in profiles:
            handle = self._get_profile_field(profile, 'handle')
            if handle and isinstance(handle, str):
                handles.append(handle)
        return handles
    
        """Calculate centroid embedding from multiple embeddings."""
        try:
            if not embeddings or not embeddings[0]:
                return []
            
            # Calculate mean for each dimension
            num_dimensions = len(embeddings[0])
            centroid = [0.0] * num_dimensions
            
            for embedding in embeddings:
                for i, value in enumerate(embedding):
                    if i < num_dimensions:
                        centroid[i] += value
            
            # Divide by number of embeddings to get mean
            num_embeddings = len(embeddings)
            centroid = [value / num_embeddings for value in centroid]
            
            return centroid
            
        except Exception as e:
            self.logger.warning(f"Error calculating centroid embedding: {e}")
            return embeddings[0] if embeddings else []
    def _create_noise_cluster(self, trash_profiles: List[Any]) -> Dict[str, Any]:
        """
        Create a noise cluster for profiles without meaningful bio.
        
        Args:
            trash_profiles: List of profiles without meaningful bio
            
        Returns:
            Noise cluster dictionary compatible with AdonisJS format
        """
        handles = self._extract_profile_handles(trash_profiles)
        
        noise_cluster = {
            'tag': 'No Bio',
            'handles': handles,
            'size': len(trash_profiles),
            'profiles': trash_profiles,
            'embedding': [],  # No embedding for noise cluster
            'keywords': [],
            'cohesion': 0.0,
            'persistence': None,
            'validation_status': 'noise_cluster',
            'processing_status': 'noise',
            'cluster_type': 'noise',
            'skip_tagging': True,
            'robustness_tag': 'Profiles Without Bio'
        }
        
        self.logger.info(f"🗑️ Created noise cluster with {len(trash_profiles)} profiles")
        return noise_cluster

    def _clean_ndarrays_from_results(self, final_clusters: List[Dict]) -> List[Dict]:
        """
        Nettoie récursivement tous les ndarrays des résultats pour éviter les erreurs de sérialisation JSON.
        
        Args:
            final_clusters: Liste des clusters avec potentiels ndarrays
            
        Returns:
            Liste nettoyée sans ndarrays
        """
        def clean_value(value):
            """Nettoie récursivement une valeur."""
            if hasattr(value, 'tolist'):  # numpy array
                return value.tolist()
            elif isinstance(value, dict):
                return {k: clean_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [clean_value(item) for item in value]
            else:
                return value
        
        try:
            cleaned_clusters = []
            for cluster in final_clusters:
                cleaned_cluster = clean_value(cluster)
                cleaned_clusters.append(cleaned_cluster)
            
            self.logger.debug(f"🧹 Cleaned {len(final_clusters)} clusters from numpy arrays")
            return cleaned_clusters
            
        except Exception as e:
            self.logger.warning(f"Error cleaning ndarrays: {e}")
            return final_clusters  # Return original if cleaning fails


