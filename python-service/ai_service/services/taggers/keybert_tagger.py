import numpy as np
import logging
from keybert import KeyBERT
from typing import List, Dict, Any, Tuple, Union, Optional
from ai_service.models.interfaces.tag_generator import TagGenerator
from ai_service.utils.text_cleaner import TextCleaner
from ai_service.models.interfaces.embedding_model import EmbeddingModel

class KeyBERTTagger(TagGenerator):
    """
    Générateur de tags utilisant KeyBERT
    """
    
    def __init__(self, 
                 embedding_model: Optional[EmbeddingModel] = None, 
                 model_name: str = 'all-MiniLM-L6-v2',
                 text_cleaner: Optional[TextCleaner] = None):
        """
        Initialise le générateur de tags KeyBERT
        
        Args:
            embedding_model: Modèle d'embedding à utiliser (optionnel)
            model_name: Nom du modèle KeyBERT à utiliser si embedding_model n'est pas fourni
            text_cleaner: Instance de TextCleaner pour le prétraitement des textes
        """
        self.model = KeyBERT(model=model_name)
        self.embedding_model = embedding_model
        self.text_cleaner = text_cleaner or TextCleaner()
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def clean_text(self, text: str, aggressive: bool = False) -> str:
        """
        Nettoie un texte pour l'analyse
        
        Args:
            text: Texte à nettoyer
            aggressive: Si True, applique un nettoyage plus agressif
            
        Returns:
            Texte nettoyé
        """
        return self.text_cleaner.clean(text, aggressive)
    
    def generate_keywords(self, texts: List[str], top_n: int = 40) -> Tuple[List[Tuple[str, float]], List[float]]:
        """
        Génère des mots-clés pertinents à partir d'un ensemble de textes
        
        Args:
            texts: Liste des textes à analyser
            top_n: Nombre de mots-clés à extraire
            
        Returns:
            Tuple contenant:
                - Liste des tuples (mot-clé, score)
                - Embeddings des mots-clés
        """
        try:
            if not texts:
                return [], []
            
            # Nettoyer les textes
            cleaned_texts = self.text_cleaner.clean(texts)
            if not cleaned_texts:
                return [], []
                
            # Fusion en un corpus unique pour l'analyse
            corpus = " ".join(cleaned_texts)
            
            # Safety check: ensure corpus has enough content for keyword extraction
            if len(corpus.split()) < 5:  # Very short corpus
                self.logger.warning("Corpus too short for keyword extraction, returning fallback")
                return [("content", 0.5)], [0.0] * 384  # Fallback with dummy embedding
            
            # Double extraction pour améliorer la qualité
            # D'abord extraction standard avec MMR pour diversité
            try:
                mmr_candidates = max(50, top_n * 2)  # Ensure candidates >= top_n and sufficient buffer
                
                # Only proceed if we have enough text content for candidates
                if len(corpus.split()) >= mmr_candidates:
                    keywords_mmr = self.model.extract_keywords(
                        corpus,
                        keyphrase_ngram_range=(1, 3),
                        top_n=top_n,
                        nr_candidates=mmr_candidates,
                        use_mmr=True,
                    )
                else:
                    # Use fewer candidates if content is limited
                    limited_candidates = max(20, len(corpus.split()) // 2)
                    limited_top_n = min(top_n, limited_candidates - 5)  # Leave some buffer
                    
                    if limited_top_n > 0 and limited_candidates > limited_top_n:
                        keywords_mmr = self.model.extract_keywords(
                            corpus,
                            keyphrase_ngram_range=(1, 3),
                            top_n=limited_top_n,
                            nr_candidates=limited_candidates,
                            use_mmr=True,
                        )
                    else:
                        keywords_mmr = []
                        
            except Exception as e:
                # Fallback: Try simple extraction without MMR
                import logging
                logging.debug(f"MMR extraction failed: {e}")
                try:
                    keywords_mmr = self.model.extract_keywords(
                        corpus,
                        keyphrase_ngram_range=(1, 2),
                        top_n=min(top_n, 10),
                        use_mmr=False,
                    )
                except:
                    keywords_mmr = []
            
            # Puis extraction avec MaxSum pour les termes les plus représentatifs
            try:
                maxsum_top_n = min(top_n // 2, 15)  # Ensure we don't request more than candidates
                maxsum_candidates = max(30, top_n + 10)  # More buffer for candidates
                
                # Only proceed if we have enough text content for candidates
                if len(corpus.split()) >= maxsum_candidates:
                    keywords_maxsum = self.model.extract_keywords(
                        corpus,
                        keyphrase_ngram_range=(1, 2),
                        top_n=maxsum_top_n,
                        use_maxsum=True,
                        nr_candidates=maxsum_candidates,
                    )
                else:
                    # Skip MaxSum if not enough content
                    keywords_maxsum = []
                    
            except Exception as e:
                # Fallback: Skip MaxSum extraction if it fails
                import logging
                logging.debug(f"MaxSum extraction failed: {e}")
                keywords_maxsum = []
            
            # Fusion des résultats avec suppression des doublons
            all_keywords = {}
            for kw, score in keywords_mmr + keywords_maxsum:
                if kw in all_keywords:
                    # Garder le meilleur score
                    all_keywords[kw] = max(all_keywords[kw], score)
                else:
                    all_keywords[kw] = score
            
            # Reconversion en liste triée par score
            merged_keywords = [(kw, score) for kw, score in all_keywords.items()]
            merged_keywords.sort(key=lambda x: x[1], reverse=True)
            
            # Limiter au nombre demandé
            final_keywords = merged_keywords[:top_n]
            
            # Génération des embeddings
            keyword_texts = [kw for kw, _ in final_keywords]
            
            # Utiliser le modèle d'embedding fourni ou utiliser KeyBERT
            if self.embedding_model:
                keywords_embeddings = self.embedding_model.encode(corpus)
            else:
                # Utiliser le modèle intégré de KeyBERT
                doc_embeddings = self.model.model.encode(cleaned_texts)
                keywords_embeddings = doc_embeddings.tolist()
            
            return final_keywords, keywords_embeddings
            
        except Exception as e:
            import logging
            logging.error(f"❌ Erreur lors de la génération des tags: {e}", exc_info=True)
            return [], []

    def summarize_keywords(self, keywords: List[Tuple[str, float]], max_len: int = 25) -> str:
        """
        Génère un tag représentatif à partir d'une liste de mots-clés
        
        Args:
            keywords: Liste des tuples (mot-clé, score)
            max_len: Longueur maximale du tag généré
            
        Returns:
            Tag unique représentatif
        """
        if not keywords:
            return "misc"
        
        # Si trop peu de mots-clés, retourner simplement le meilleur
        if len(keywords) <= 2:
            return keywords[0][0]
        
        try:
            # Extraire les textes et les scores
            texts, scores = zip(*keywords[:10])  # Limiter aux 10 meilleurs pour la performance
            
            # Normaliser les scores pour qu'ils somment à 1
            scores_array = np.array(scores)
            scores_normalized = scores_array / scores_array.sum()
            
            # Encoder les mots-clés
            if self.embedding_model:
                embeddings = self.embedding_model.encode(texts)
            else:
                # Utiliser le modèle intégré de KeyBERT
                embeddings = self.model.model.encode(texts)
            
            # Calculer le centroïde pondéré
            centroid = np.sum(embeddings * scores_normalized.reshape(-1, 1), axis=0)
            
            # Normaliser le centroïde 
            norm = np.linalg.norm(centroid)
            if norm > 0:
                centroid = centroid / norm
            
            # Trouver le mot-clé le plus proche du centroïde
            similarities = np.dot(embeddings, centroid)
            best_idx = np.argmax(similarities)
            best_keyword = texts[best_idx]
            
            # Gérer la longueur maximale du tag
            if len(best_keyword) > max_len:
                words = best_keyword.split()
                truncated = []
                current_len = 0
                for word in words:
                    if current_len + len(word) + 1 <= max_len:  # +1 pour l'espace
                        truncated.append(word)
                        current_len += len(word) + 1
                    else:
                        break
                best_keyword = " ".join(truncated)
            
            return best_keyword
            
        except Exception as e:
            import logging
            logging.error(f"Erreur lors du résumé des keywords: {e}", exc_info=True)
            # Fallback: retourner le premier mot-clé
            return keywords[0][0] if keywords else "misc"