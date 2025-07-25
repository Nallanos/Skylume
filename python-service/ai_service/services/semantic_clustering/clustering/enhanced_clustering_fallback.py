"""
Enhanced clustering fallback using LDA topic-distribution-based clustering for weak clusters.
Provides advanced topic modeling and distribution-based clustering as fallback.
"""

import logging
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from ai_service.services.taggers.keybert_tagger import KeyBERTTagger
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.clustering.clustering_utils import detect_weak_clusters
from ai_service.services.semantic_clustering.clustering.lda_profile_corpus_builder import LDAProfileCorpusBuilder
from ai_service.services.semantic_clustering.keywords.keyword_extractor import SemanticKeywordExtractor


class EnhancedClusteringFallback:
    """
    Fallback clustering system using LDA topic distribution matrix.
    """
    def __init__(self, embedding_model: EmbeddingModel, keyword_extractor: Optional[SemanticKeywordExtractor] = None, keybert_tagger: Optional[KeyBERTTagger] = None):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.keyword_extractor = keyword_extractor
        self.keybert_tagger = keybert_tagger
        self.logger.info("🔄 EnhancedClusteringFallback initialized")

    def set_keyword_extractor(self, keyword_extractor: SemanticKeywordExtractor):
        self.keyword_extractor = keyword_extractor
    
    def set_lda_topic_modeler(self, lda_topic_modeler):
        """Set LDA topic modeler for enhanced clustering."""
        self.lda_topic_modeler = lda_topic_modeler
        self.logger.info("✅ LDA topic modeler injected into EnhancedClusteringFallback")
        
    def process_weak_clusters(self, weak_clusters: List[Dict[str, Any]], 
                            profile_processor,
                            cohesion_threshold: float = 0.4) -> List[Dict[str, Any]]:
        """
        Process weak clusters using LDA topic-distribution-based fallback.
        
        Args:
            weak_clusters: List of weak cluster dictionaries
            profile_processor: ProfileProcessor instance for text extraction
            cohesion_threshold: Minimum cohesion for valid clusters
            
        Returns:
            List of improved clusters
        """
        if not weak_clusters:
            return []
        
        # Extract all profiles and embeddings from weak clusters
        all_profiles = []
        all_embeddings = []
        
        for cluster in weak_clusters:
            profiles = cluster.get('profiles', [])
            embeddings = cluster.get('embedding', [])
            
            for i, profile in enumerate(profiles):
                if i < len(embeddings):
                    all_profiles.append(profile)
                    all_embeddings.append(embeddings[i])
        
        if len(all_profiles) < 3:
            self.logger.info(f"Too few profiles ({len(all_profiles)}) for LDA fallback, creating miscellaneous cluster")
            return [self._create_misc_cluster(all_profiles, all_embeddings)]
        
        self.logger.info(f"🔄 Processing {len(all_profiles)} profiles from {len(weak_clusters)} weak clusters with LDA topic-distribution fallback")
        
        # Step 1: Build optimized LDA corpus using LDAProfileCorpusBuilder
        if self.keyword_extractor:
            corpus_builder = LDAProfileCorpusBuilder(
                profiles=all_profiles,
                keyword_extractor=self.keyword_extractor,
                config={
                    'keywords_per_bio': 8,
                    'keywords_per_posts': 12,
                    'keywords_per_followings': 8,
                    'min_tokens_per_document': 10,  # Correction ici
                    'enable_lemmatization': False,
                    'remove_proper_nouns': True,
                    'sources_to_include': ['bio', 'posts', 'followings'],
                    'min_keyword_score': 0.1,
                    'max_keywords_total': 40
                }
            )

            valid_texts = corpus_builder.build_corpus()

            # Log corpus statistics
            corpus_stats = corpus_builder.get_corpus_stats(valid_texts)
            self.logger.info(f"📊 LDA corpus stats: {corpus_stats['total_documents']} docs, "
                             f"avg {corpus_stats['avg_tokens']:.1f} tokens/doc, "
                             f"range {corpus_stats['min_tokens']}-{corpus_stats['max_tokens']}")

            # Filter profiles to match valid texts
            if len(valid_texts) != len(all_profiles):
                # Some profiles were filtered out - need to align
                valid_profiles = []
                valid_embeddings = []

                for i, profile in enumerate(all_profiles):
                    if i < len(valid_texts):  # Simple mapping - could be improved
                        valid_profiles.append(profile)
                        valid_embeddings.append(all_embeddings[i])

                self.logger.info(f"🔍 Aligned {len(valid_profiles)} profiles with {len(valid_texts)} valid texts")
            else:
                valid_profiles = all_profiles
                valid_embeddings = all_embeddings
        else:
            # Fallback to old method if no KeyBERT available
            self.logger.warning("⚠️ No KeyBERT tagger available, falling back to basic text extraction")
            profile_texts = profile_processor.extract_cluster_texts(all_profiles)
            valid_indices = []
            valid_texts = []
            
            for i, text in enumerate(profile_texts):
                if text and text.strip() and len(text.strip()) > 10:  # Filter meaningful texts
                    valid_indices.append(i)
                    valid_texts.append(text.strip())
            
            # Filter profiles and embeddings to match valid texts
            valid_profiles = [all_profiles[i] for i in valid_indices]
            valid_embeddings = [all_embeddings[i] for i in valid_indices]
        
        if len(valid_texts) < 3:
            self.logger.info(f"Too few valid texts ({len(valid_texts)}) for LDA fallback, creating miscellaneous cluster")
            return [self._create_misc_cluster(all_profiles, all_embeddings)]
        
        # Step 2: Build LDA topic distribution matrix
        topic_matrix = self._build_lda_topic_matrix(valid_texts)
        
        if topic_matrix is None:
            self.logger.info("LDA topic matrix creation failed, creating miscellaneous cluster")
            return [self._create_misc_cluster(valid_profiles, valid_embeddings)]
        
        # Step 3: Try HDBSCAN on topic distribution matrix
        all_hdbscan_clusters = self._apply_hdbscan_on_topic_matrix(
            topic_matrix, valid_profiles, valid_embeddings, cohesion_threshold
        )

        # Utiliser detect_weak_clusters pour séparer bons et faibles clusters (en passant persistence_threshold)
        good_clusters, weak_clusters = detect_weak_clusters(
            all_hdbscan_clusters,
            cohesion_threshold=cohesion_threshold,
            persistence_threshold=0.65,
            logger=self.logger
        )

        if good_clusters:
            self.logger.info(f"✅ HDBSCAN on topic matrix produced {len(good_clusters)} good clusters and {len(weak_clusters)} weak clusters")
            # On retourne les bons clusters, mais on continue le fallback avec les faibles
        else:
            self.logger.info("HDBSCAN produced no good clusters")

        # S'il reste des clusters faibles, on tente le fallback shrinking par topic
        if weak_clusters:
            self.logger.info(f"🔄 {len(weak_clusters)} weak clusters after HDBSCAN, shrinking each topic group to reach 0.65 cosine similarity")

            # Extraire tous les profils et embeddings des weak_clusters
            fallback_profiles = []
            fallback_embeddings = []
            for cluster in weak_clusters:
                fallback_profiles.extend(cluster.get('profiles', []))
                fallback_embeddings.extend(cluster.get('embedding', []))

            self.logger.info(f"🔍 Extracted {len(fallback_profiles)} profiles and {len(fallback_embeddings)} embeddings from weak clusters")

            # Grouper par topic dominant (corrigé pour éviter l'index out of range)
            dominant_topics = topic_matrix.argmax(axis=1)
            topic_strengths = topic_matrix.max(axis=1)
            
            self.logger.info(f"🔍 Topic analysis: {len(dominant_topics)} profiles, "
                           f"topic strengths range: {topic_strengths.min():.3f}-{topic_strengths.max():.3f}")
            
            topic_groups = {}
            n = min(len(fallback_profiles), len(dominant_topics))
            profiles_with_weak_topics = 0
            
            for i in range(n):
                topic = dominant_topics[i]
                strength = topic_strengths[i]
                if strength > 0.2:
                    if topic not in topic_groups:
                        topic_groups[topic] = {'indices': [], 'profiles': [], 'embeddings': [], 'topic_strengths': []}
                    topic_groups[topic]['indices'].append(i)
                    topic_groups[topic]['profiles'].append(fallback_profiles[i])
                    topic_groups[topic]['embeddings'].append(fallback_embeddings[i])
                    topic_groups[topic]['topic_strengths'].append(strength)
                else:
                    profiles_with_weak_topics += 1

            self.logger.info(f"🔍 Topic grouping: {len(topic_groups)} groups formed, "
                           f"{profiles_with_weak_topics} profiles with weak topic strength (<0.2)")
            
            # Log details of each topic group
            for topic, group_data in topic_groups.items():
                avg_strength = np.mean(group_data['topic_strengths'])
                self.logger.info(f"  - Topic {topic}: {len(group_data['profiles'])} profiles, avg_strength={avg_strength:.3f}")

            self.logger.info(f"Found {len(topic_groups)} topic groups for shrinking")
            result_clusters = []
            for topic, group_data in topic_groups.items():
                if len(group_data['profiles']) < 2:
                    self.logger.info(f"❌ Topic {topic}: too few profiles ({len(group_data['profiles'])}), skipping")
                    continue
                    
                self.logger.info(f"🔄 Topic {topic}: attempting to shrink {len(group_data['profiles'])} profiles")
                shrunk_cluster = self._shrink_group_by_similarity(group_data, cohesion_threshold=0.55)
                
                if shrunk_cluster:
                    shrunk_cluster['cluster_id'] = f'lda_topic_{topic}_shrunk'
                    shrunk_cluster['method'] = 'lda_topic_shrunk'
                    result_clusters.append(shrunk_cluster)
                    self.logger.info(f"✅ Topic {topic} cluster shrunk and accepted: {shrunk_cluster['size']} profiles, cohesion={shrunk_cluster['cohesion']:.3f}")
                else:
                    self.logger.info(f"❌ Topic {topic} cluster rejected (too weak even after shrinking)")

            self.logger.info(f"🔍 Shrinking completed: {len(result_clusters)} clusters created")
            
            if result_clusters:
                return (good_clusters or []) + result_clusters
            else:
                self.logger.info("All fallback methods failed, creating miscellaneous cluster")
                return (good_clusters or []) + [self._create_misc_cluster(fallback_profiles, fallback_embeddings)]
        else:
            if good_clusters:
                return good_clusters
            else:
                self.logger.info("All fallback methods failed, creating miscellaneous cluster")
                return [self._create_misc_cluster(valid_profiles, valid_embeddings)]
    
    def _build_lda_topic_matrix(self, texts: List[str], n_topics: int = None) -> Optional[np.ndarray]:
        """
        Build LDA topic distribution matrix from profile texts using LDATopicModeler.
        """
        if hasattr(self, 'lda_topic_modeler') and self.lda_topic_modeler:
            return self.lda_topic_modeler.build_topic_matrix(texts, n_topics)
        else:
            # Fallback to existing implementation
            from ai_service.services.lda_core.lda_topic_modeler import LDATopicModeler
            lda_modeler = LDATopicModeler(logger=self.logger)
            return lda_modeler.build_topic_matrix(texts, n_topics)
    
    def _apply_hdbscan_on_topic_matrix(self, topic_matrix: np.ndarray, 
                                     profiles: List[Any], 
                                     embeddings: List[List[float]], 
                                     cohesion_threshold: float,
                                     clusterer=None) -> List[Dict[str, Any]]:
        """
        Apply HDBSCAN clustering on LDA topic distribution matrix.
        
        Args:
            topic_matrix: Topic distribution matrix (n_profiles x n_topics)
            profiles: List of profile objects
            embeddings: List of profile embeddings
            cohesion_threshold: Minimum cohesion for valid clusters
            clusterer: Optional pre-configured HDBSCAN clusterer
            
        Returns:
            List of valid clusters or empty list if failed
        """
        try:
            from hdbscan import HDBSCAN
            
            # Use provided clusterer or create new one
            if clusterer is None:
                # Configure HDBSCAN for topic distributions
                min_cluster_size = max(2, len(profiles) // 6)  # Smaller clusters allowed
                
                clusterer = HDBSCAN(
                    min_cluster_size=min_cluster_size,
                    min_samples=1,
                    metric='euclidean',  # Good for topic distributions
                    alpha=1.0,
                    cluster_selection_epsilon=0.1  # Allow denser clusters
                )
            
            self.logger.info(f"Applying HDBSCAN on topic matrix")
            
            cluster_labels = clusterer.fit_predict(topic_matrix)
            
            # Check clustering success
            unique_labels = set(cluster_labels)
            valid_clusters = [label for label in unique_labels if label != -1]
            
            if not valid_clusters:
                self.logger.info("HDBSCAN produced no valid clusters")
                return []
            
            self.logger.info(f"HDBSCAN found {len(valid_clusters)} potential clusters")
            
            # Build clusters with all metrics (including correct persistence)
            all_clusters = []
            # HDBSCAN attribue cluster_persistence_ dans l'ordre de clusterer.labels_ >= 0
            # On construit un mapping: label -> index dans cluster_persistence_
            label_to_persistence_idx = {}
            if hasattr(clusterer, 'labels_') and hasattr(clusterer, 'cluster_persistence_'):
                unique_labels = [l for l in np.unique(clusterer.labels_) if l != -1]
                for idx, label in enumerate(unique_labels):
                    label_to_persistence_idx[label] = idx
            for label in valid_clusters:
                # Get profiles for this cluster
                cluster_indices = [i for i, l in enumerate(cluster_labels) if l == label]
                if len(cluster_indices) < 2:
                    continue
                cluster_profiles = [profiles[i] for i in cluster_indices]
                cluster_embeddings = [embeddings[i] for i in cluster_indices]
                # Calculate cohesion using actual embeddings
                cohesion = self._calculate_cohesion(cluster_embeddings)
                # Get persistence if available (mapping label -> idx)
                persistence = None
                if hasattr(clusterer, 'cluster_persistence_') and clusterer.cluster_persistence_ is not None:
                    idx = label_to_persistence_idx.get(label)
                    if idx is not None and idx < len(clusterer.cluster_persistence_):
                        persistence = float(clusterer.cluster_persistence_[idx])
                centroid = self._calculate_centroid(cluster_embeddings)
                if hasattr(centroid, 'tolist'):
                    centroid = centroid.tolist()
                cluster_dict = {
                    'cluster_id': f'lda_hdbscan_{label}',
                    'profiles': cluster_profiles,
                    'embedding': [e.tolist() if hasattr(e, 'tolist') else e for e in cluster_embeddings],
                    'size': len(cluster_profiles),
                    'cohesion': cohesion,
                    'centroid': centroid,
                    'method': 'lda_hdbscan',
                    'persistence': persistence
                }
                all_clusters.append(cluster_dict)
            
            # Use centralized quality detection instead of manual validation
            good_clusters, weak_clusters = detect_weak_clusters(
                all_clusters,
                cohesion_threshold=cohesion_threshold
            )
            
            self.logger.info(f"✅ Quality check: {len(good_clusters)} good clusters, {len(weak_clusters)} weak clusters")
            
            return good_clusters
            
        except ImportError:
            self.logger.warning("HDBSCAN not available")
            return []
        except Exception as e:
            self.logger.error(f"HDBSCAN on topic matrix failed: {e}")
            return []
    
    def _group_by_dominant_topic(self, topic_matrix: np.ndarray, 
                               profiles: List[Any], 
                               embeddings: List[List[float]], 
                               cohesion_threshold: float) -> List[Dict[str, Any]]:
        """
        Group profiles by their dominant LDA topic.
        
        Args:
            topic_matrix: Topic distribution matrix (n_profiles x n_topics)
            profiles: List of profile objects
            embeddings: List of profile embeddings
            cohesion_threshold: Minimum cohesion for valid clusters
            
        Returns:
            List of topic-based clusters
        """
        try:
            # Get dominant topic for each profile
            dominant_topics = topic_matrix.argmax(axis=1)
            topic_strengths = topic_matrix.max(axis=1)
            
            # Group profiles by dominant topic
            topic_groups = {}
            for i, (topic, strength) in enumerate(zip(dominant_topics, topic_strengths)):
                # Filter by topic strength
                if strength > 0.2:  # Minimum topic strength
                    if topic not in topic_groups:
                        topic_groups[topic] = {
                            'indices': [],
                            'profiles': [],
                            'embeddings': [],
                            'topic_strengths': []
                        }
                    topic_groups[topic]['indices'].append(i)
                    topic_groups[topic]['profiles'].append(profiles[i])
                    topic_groups[topic]['embeddings'].append(embeddings[i])
                    topic_groups[topic]['topic_strengths'].append(strength)
            
            self.logger.info(f"Found {len(topic_groups)} topic groups")
            
            # Process each topic group
            result_clusters = []
            for topic, group_data in topic_groups.items():
                if len(group_data['profiles']) < 2:
                    continue
                
                # Calculate cohesion
                cohesion = self._calculate_cohesion(group_data['embeddings'])
                avg_topic_strength = np.mean(group_data['topic_strengths'])
                
                self.logger.info(f"Topic {topic}: {len(group_data['profiles'])} profiles, "
                               f"cohesion={cohesion:.3f}, avg_strength={avg_topic_strength:.3f}")
                
                if cohesion >= cohesion_threshold:
                    # Good cohesion - keep as is
                    cluster_dict = {
                        'cluster_id': f'lda_topic_{topic}',
                        'profiles': group_data['profiles'],
                        'embedding': group_data['embeddings'],
                        'size': len(group_data['profiles']),
                        'cohesion': cohesion,
                        'centroid': self._calculate_centroid(group_data['embeddings']),
                        'method': 'lda_dominant_topic',
                        'topic_strength': avg_topic_strength
                    }
                    result_clusters.append(cluster_dict)
                    self.logger.info(f"✅ Topic {topic} cluster accepted")
                
                else:
                    # Poor cohesion - try to shrink the group
                    shrunk_cluster = self._shrink_group_by_similarity(
                        group_data, cohesion_threshold
                    )
                    if shrunk_cluster:
                        shrunk_cluster['cluster_id'] = f'lda_topic_{topic}_shrunk'
                        shrunk_cluster['method'] = 'lda_topic_shrunk'
                        result_clusters.append(shrunk_cluster)
                        self.logger.info(f"✅ Topic {topic} cluster shrunk and accepted")
                    else:
                        self.logger.info(f"❌ Topic {topic} cluster rejected (too weak even after shrinking)")
            
            return result_clusters
            
        except Exception as e:
            self.logger.error(f"Dominant topic grouping failed: {e}")
            return []
    
    def _shrink_group_by_similarity(self, group_data: Dict[str, List], 
                                  cohesion_threshold: float = 0.4) -> Optional[Dict[str, Any]]:
        """
        Shrink a group by keeping only the most similar profiles.
        
        Args:
            group_data: Dict with 'profiles' and 'embeddings' keys
            cohesion_threshold: Minimum cohesion for valid cluster
            
        Returns:
            Shrunk cluster dict or None if no valid cluster found
        """
        try:
            profiles = group_data['profiles']
            embeddings = group_data['embeddings']
            
            if len(profiles) < 3:
                self.logger.info(f"🔍 Shrinking: group too small ({len(profiles)} profiles), cannot shrink")
                return None
            
            initial_cohesion = self._calculate_cohesion(embeddings)
            self.logger.info(f"🔍 Shrinking: starting with {len(profiles)} profiles, "
                           f"initial cohesion={initial_cohesion:.3f}, target={cohesion_threshold:.3f}")
            
            # Shrinking avec recalcul du centroïde à chaque itération
            indices = list(range(len(profiles)))
            iteration = 0
            
            while len(indices) > 2:
                iteration += 1
                current_embeddings = [embeddings[i] for i in indices]
                cohesion = self._calculate_cohesion(current_embeddings)
                
                self.logger.info(f"🔍 Shrinking iteration {iteration}: {len(indices)} profiles, cohesion={cohesion:.3f}")
                
                if cohesion >= cohesion_threshold:
                    selected_profiles = [profiles[i] for i in indices]
                    result = {
                        'cluster_id': 'shrunk_group',
                        'profiles': selected_profiles,
                        'embedding': current_embeddings,
                        'size': len(selected_profiles),
                        'cohesion': cohesion,
                        'centroid': self._calculate_centroid(current_embeddings),
                        'method': 'similarity_shrunk'
                    }
                    self.logger.info(f"✅ Shrinking successful: {len(selected_profiles)} profiles, cohesion={cohesion:.3f}")
                    return result
                
                # Recalculer le centroïde à chaque étape
                centroid = self._calculate_centroid(current_embeddings)
                similarities = [(i, self._cosine_similarity(embeddings[i], centroid)) for i in indices]
                to_remove = min(similarities, key=lambda x: x[1])[0]
                remove_similarity = min(similarities, key=lambda x: x[1])[1]
                
                self.logger.info(f"🔍 Shrinking: removing profile with similarity {remove_similarity:.3f}")
                indices.remove(to_remove)
            
            self.logger.info(f"❌ Shrinking failed: reached minimum size without achieving target cohesion")
            return None
            
        except Exception as e:
            self.logger.warning(f"Group shrinking failed: {e}")
            return None
    
    def _calculate_cohesion(self, embeddings: List[List[float]]) -> float:
        """Calculate average cosine similarity within a group."""
        try:
            if not embeddings or len(embeddings) < 2:
                return 1.0
            
            similarities = []
            n = len(embeddings)
            
            for i in range(n):
                for j in range(i + 1, n):
                    similarity = self._cosine_similarity(embeddings[i], embeddings[j])
                    similarities.append(similarity)
            
            return float(np.mean(similarities)) if similarities else 0.0
            
        except Exception as e:
            self.logger.warning(f"Cohesion calculation failed: {e}")
            return 0.0
    
    def _calculate_centroid(self, embeddings: List[List[float]]) -> np.ndarray:
        """Calculate normalized centroid of embeddings."""
        try:
            if not embeddings:
                return np.array([])
            
            embeddings_array = np.array(embeddings)
            centroid = np.mean(embeddings_array, axis=0)
            
            # Normalize
            norm = np.linalg.norm(centroid)
            if norm > 0:
                centroid = centroid / norm
            
            return centroid
            
        except Exception as e:
            self.logger.warning(f"Centroid calculation failed: {e}")
            return np.array([])
    
    def _cosine_similarity(self, vec1: List[float], vec2: Any) -> float:
        """Calculate cosine similarity between two vectors."""
        try:
            v1 = np.array(vec1)
            v2 = np.array(vec2) if not isinstance(vec2, np.ndarray) else vec2
            
            if len(v1) != len(v2):
                return 0.0
            
            dot_product = np.dot(v1, v2)
            norms = np.linalg.norm(v1) * np.linalg.norm(v2)
            
            if norms > 0:
                return float(dot_product / norms)
            
            return 0.0
            
        except Exception as e:
            self.logger.warning(f"Cosine similarity calculation failed: {e}")
            return 0.0
    
    def _create_misc_cluster(self, profiles: List[Any], embeddings: List[List[float]]) -> Dict[str, Any]:
        """Create a miscellaneous cluster for unclustered profiles."""
        centroid = self._calculate_centroid(embeddings) if embeddings else np.array([])
        if hasattr(centroid, 'tolist'):
            centroid = centroid.tolist()
        return {
            'cluster_id': 'misc_fallback',
            'profiles': profiles,
            'embedding': [e.tolist() if hasattr(e, 'tolist') else e for e in embeddings],
            'size': len(profiles),
            'cohesion': 0.0,
            'centroid': centroid,
            'method': 'miscellaneous',
            'is_miscellaneous': True
        }
    
    def get_fallback_summary(self, enhanced_clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get summary statistics about enhanced clustering results."""
        if not enhanced_clusters:
            return {'total_clusters': 0, 'methods_used': [], 'avg_cohesion': 0.0}
        
        methods = [cluster.get('method', 'unknown') for cluster in enhanced_clusters]
        cohesions = [cluster.get('cohesion', 0.0) for cluster in enhanced_clusters]
        
        return {
            'total_clusters': len(enhanced_clusters),
            'total_profiles': sum(cluster.get('size', 0) for cluster in enhanced_clusters),
            'methods_used': list(set(methods)),
            'method_distribution': {method: methods.count(method) for method in set(methods)},
            'avg_cohesion': sum(cohesions) / len(cohesions) if cohesions else 0.0,
            'cohesion_range': {'min': min(cohesions), 'max': max(cohesions)} if cohesions else {'min': 0, 'max': 0}
        }
    
    
    def _calculate_cluster_variance(self, embeddings: List[List[float]]) -> float:
        """Calcule la variance d'un cluster."""
        try:
            if not embeddings or len(embeddings) < 2:
                return 0.0
            
            embeddings_array = np.array(embeddings)
            
            # Calculer la variance moyenne sur toutes les dimensions
            variances = np.var(embeddings_array, axis=0)
            mean_variance = np.mean(variances)
            
            return float(mean_variance)
            
        except Exception as e:
            self.logger.warning(f"Error calculating cluster variance: {e}")
            return 1.0  # Valeur élevée par défaut pour marquer comme faible
