"""
Profile clustering service using multiple clustering algorithms with validation and fusion.
Orchestrates the new modular clustering pipeline with embeddings and LDA-based methods.
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional
from ai_service.models.interfaces.clustering_model import ClusteringModel
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.infrastructure import MemoryManager
from ai_service.services.semantic_clustering.clustering.enhanced_clustering_fallback import EnhancedClusteringFallback
from ai_service.services.semantic_clustering.keywords.keyword_extractor import SemanticKeywordExtractor
from ai_service.services.semantic_clustering.processors.profile_processor import ProfileProcessor
from ai_service.services.semantic_clustering.clustering.clustering_utils import detect_weak_clusters

# Import new modular services
from ai_service.services.semantic_clustering.clustering.cluster_validator import ClusterValidator
from ai_service.services.semantic_clustering.clustering.multi_clustering_engine import MultiClusteringEngine
from ai_service.services.semantic_clustering.clustering.cluster_fusion_service import ClusterFusionService


class ProfileClusterer:
    """Service responsible for orchestrating multi-method clustering with validation and fusion."""
    def __init__(self, clusterer: ClusteringModel, memory_manager: MemoryManager, 
                 fallback_handler: Optional[EnhancedClusteringFallback],
                 embedding_model: EmbeddingModel,
                 keyword_extractor: Optional[SemanticKeywordExtractor] = None):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.clusterer = clusterer
        self.memory_manager = memory_manager
        self.embedding_model = embedding_model
        self.keyword_extractor = keyword_extractor

        # Ensure fallback_handler is always available and inject keyword_extractor
        if fallback_handler is not None:
            self.fallback_handler = fallback_handler
            if hasattr(self.fallback_handler, 'set_keyword_extractor'):
                self.fallback_handler.set_keyword_extractor(keyword_extractor)
        elif embedding_model is not None:
            self.fallback_handler = EnhancedClusteringFallback(embedding_model)
            if hasattr(self.fallback_handler, 'set_keyword_extractor'):
                self.fallback_handler.set_keyword_extractor(keyword_extractor)
        else:
            self.fallback_handler = None
            self.logger.warning("⚠️ No fallback_handler provided and no embedding_model available - fallback LDA will be disabled")
        
        # Initialize LDA components
        self.lda_topic_modeler = None
        self.lda_optimized_pipeline = None
        
        # Initialize new modular services
        self.cluster_validator = ClusterValidator()
        self.multi_clustering_engine = MultiClusteringEngine(
            embedding_model=embedding_model,
            clusterer=clusterer,
            lda_topic_modeler=None  # Will be set later
        )
        self.cluster_fusion_service = ClusterFusionService()
        
        self.logger.info("🔄 ProfileClusterer initialized with modular architecture")
    
    def set_lda_topic_modeler(self, lda_topic_modeler):
        """Set LDA topic modeler for enhanced clustering."""
        self.lda_topic_modeler = lda_topic_modeler
        if self.fallback_handler and hasattr(self.fallback_handler, 'set_lda_topic_modeler'):
            self.fallback_handler.set_lda_topic_modeler(lda_topic_modeler)
        
        # Inject into multi-clustering engine
        self.multi_clustering_engine.lda_topic_modeler = lda_topic_modeler
        
        self.logger.info("✅ LDA topic modeler injected into ProfileClusterer and MultiClusteringEngine")
    
    def set_lda_optimized_pipeline(self, lda_optimized_pipeline):
        """Set LDA optimized pipeline for enhanced preprocessing and text extraction."""
        self.lda_optimized_pipeline = lda_optimized_pipeline
        if self.fallback_handler and hasattr(self.fallback_handler, 'set_lda_optimized_pipeline'):
            self.fallback_handler.set_lda_optimized_pipeline(lda_optimized_pipeline)
        self.logger.info("✅ LDA optimized pipeline injected into ProfileClusterer")
    
    def cluster_profiles_with_multi_method_pipeline(self, 
                                                  profile_embeddings: List[List[float]], 
                                                  profiles: List[Any],
                                                  profile_processor: ProfileProcessor,
                                                  min_cluster_size: int = 3) -> List[Dict[str, Any]]:
        """
        NEW MULTI-METHOD CLUSTERING PIPELINE
        
        Combines results from:
        1. KMeans on LDA topic matrix  
        2. HDBSCAN on LDA topic matrix
        3. KMeans on embeddings (optional)
        
        Uses cluster validation and fusion to create optimal final clusters.
        
        Args:
            profile_embeddings: List of embedding vectors for profiles
            profiles: List of profile objects corresponding to embeddings
            profile_processor: Instance of ProfileProcessor for text extraction
            min_cluster_size: Minimum cluster size (default: 3)
            
        Returns:
            List of validated and fused cluster dictionaries
        """
        self.logger.info("🚀 Starting NEW multi-method clustering pipeline")
        self.logger.info(f"📊 Processing {len(profiles)} profiles with min_cluster_size={min_cluster_size}")
        
        if len(profile_embeddings) == 0 or not profiles:
            self.logger.warning("⚠️ No profiles to cluster")
            return []
        
        if len(profile_embeddings) != len(profiles):
            self.logger.error(f"❌ Mismatch: {len(profile_embeddings)} embeddings vs {len(profiles)} profiles")
            return []
        
        try:
            # Memory management
            self.memory_manager.manage_memory()
            
            # =================== STEP 1: Generate LDA Matrix ===================
            self.logger.info("🔄 STEP 1: Generating LDA topic matrix")
            
            lda_result = self.multi_clustering_engine.generate_lda_matrix(profiles, profile_processor)
            if lda_result is None:
                self.logger.warning("⚠️ LDA matrix generation failed, falling back to embeddings-only clustering")
                return self._fallback_embeddings_only_clustering(profile_embeddings, profiles, min_cluster_size)
            
            lda_matrix, lda_model_info = lda_result
            n_topics = lda_matrix.shape[1]
            self.logger.info(f"✅ Generated LDA matrix: {lda_matrix.shape[0]} profiles × {n_topics} topics")
            
            # =================== STEP 2: Multi-Method Clustering ===================
            self.logger.info("🔄 STEP 2: Executing multi-method clustering")
            
            clustering_results = {}
            
            # 2a. KMeans on LDA
            self.logger.info("🔄 STEP 2a: KMeans clustering on LDA matrix")
            kmeans_lda_clusters = self.multi_clustering_engine.cluster_lda_kmeans(
                lda_matrix, profiles, profile_embeddings, n_clusters=None
            )
            if kmeans_lda_clusters:
                clustering_results['kmeans_lda'] = kmeans_lda_clusters
                self.logger.info(f"✅ KMeans LDA: {len(kmeans_lda_clusters)} clusters")
            
            # 2b. HDBSCAN on LDA
            self.logger.info("🔄 STEP 2b: HDBSCAN clustering on LDA matrix")
            hdbscan_lda_clusters = self.multi_clustering_engine.cluster_lda_hdbscan(
                lda_matrix, profiles, profile_embeddings
            )
            if hdbscan_lda_clusters:
                clustering_results['hdbscan_lda'] = hdbscan_lda_clusters
                self.logger.info(f"✅ HDBSCAN LDA: {len(hdbscan_lda_clusters)} clusters")
            
            # 2c. Optional: KMeans on embeddings (for stability)
            if len(profile_embeddings) > 10:  # Only for larger datasets
                self.logger.info("🔄 STEP 2c: KMeans clustering on embeddings (stability check)")
                kmeans_emb_clusters = self.multi_clustering_engine.cluster_embeddings_kmeans(
                    profile_embeddings, profiles, n_clusters=None
                )
                if kmeans_emb_clusters:
                    clustering_results['kmeans_embeddings'] = kmeans_emb_clusters
                    self.logger.info(f"✅ KMeans embeddings: {len(kmeans_emb_clusters)} clusters")
            
            if not clustering_results:
                self.logger.warning("⚠️ All clustering methods failed")
                return []
            
            # =================== STEP 3: Cluster Validation ===================
            self.logger.info("🔄 STEP 3: Validating clusters from all methods")
            
            validated_clustering_results = {}
            for method, clusters in clustering_results.items():
                validated_clusters = self.cluster_validator.validate_multiple_clusters(clusters)
                validated_clustering_results[method] = validated_clusters
                
                # Log validation summary
                valid_count = sum(1 for c in validated_clusters if c['is_valid'])
                self.logger.info(f"📊 {method}: {valid_count}/{len(validated_clusters)} clusters validated")
            
            # =================== STEP 4: Cluster Fusion ===================
            self.logger.info("🔄 STEP 4: Fusing validated clusters using scoring system")
            
            fused_clusters = self.cluster_fusion_service.fuse_clustering_results(
                validated_clustering_results, profiles, profile_embeddings
            )
            
            # =================== STEP 5: Final Processing ===================
            self.logger.info("🔄 STEP 5: Final processing and metadata addition")
            
            final_clusters = []
            for i, cluster in enumerate(fused_clusters):
                # Filter by minimum size
                if cluster.get('size', 0) >= min_cluster_size:
                    final_cluster = self._prepare_final_cluster(cluster, i, lda_model_info)
                    final_clusters.append(final_cluster)
                else:
                    self.logger.debug(f"🔄 Filtering out small cluster (size={cluster.get('size', 0)})")
            
            # =================== SUMMARY ===================
            fusion_stats = self.cluster_fusion_service.get_fusion_statistics(fused_clusters)
            self.logger.info("📊 MULTI-METHOD CLUSTERING SUMMARY:")
            self.logger.info(f"   • Input methods: {list(clustering_results.keys())}")
            self.logger.info(f"   • Final clusters: {len(final_clusters)}")
            self.logger.info(f"   • Average fusion score: {fusion_stats['avg_fusion_score']:.3f}")
            self.logger.info(f"   • Average stability: {fusion_stats['avg_stability_score']:.3f}")
            
            return final_clusters
            
        except Exception as e:
            self.logger.error(f"❌ Error in multi-method clustering pipeline: {e}", exc_info=True)
            return []
    
    def _fallback_embeddings_only_clustering(self, 
                                           profile_embeddings: List[List[float]], 
                                           profiles: List[Any], 
                                           min_cluster_size: int) -> List[Dict[str, Any]]:
        """Fallback to embeddings-only clustering when LDA fails."""
        self.logger.info("🔄 FALLBACK: Embeddings-only clustering")
        
        try:
            # Use HDBSCAN on embeddings
            clusters = self.multi_clustering_engine.cluster_embeddings_hdbscan(profile_embeddings, profiles)
            
            # Validate clusters
            validated_clusters = self.cluster_validator.validate_multiple_clusters(clusters)
            
            # Filter by size and prepare
            final_clusters = []
            for i, cluster in enumerate(validated_clusters):
                if cluster.get('size', 0) >= min_cluster_size:
                    final_cluster = self._prepare_final_cluster(cluster, i, None)
                    final_cluster['robustness_level'] = 'fallback_embeddings'
                    final_cluster['pipeline_step'] = 'fallback'
                    final_cluster['robustness_tag'] = '🟠 Fallback'
                    final_clusters.append(final_cluster)
            
            self.logger.info(f"✅ Fallback clustering generated {len(final_clusters)} clusters")
            return final_clusters
            
        except Exception as e:
            self.logger.error(f"❌ Fallback clustering failed: {e}")
            return []
    
    def _prepare_final_cluster(self, 
                             cluster: Dict[str, Any], 
                             cluster_index: int, 
                             lda_model_info: Optional[Dict]) -> Dict[str, Any]:
        """Prepare final cluster with all necessary metadata."""
        final_cluster = cluster.copy()
        
        # Add standard metadata
        final_cluster['cluster_id'] = cluster_index
        final_cluster['robustness_level'] = 'multi_method'
        final_cluster['pipeline_step'] = 'multi_method_fusion'
        final_cluster['robustness_tag'] = '🟢 Multi-Method'
        
        # Add LDA information if available
        if lda_model_info:
            final_cluster['lda_topics'] = lda_model_info.get('topic_words', [])
            final_cluster['lda_n_topics'] = len(lda_model_info.get('topic_words', []))
        
        # Add validation information
        validation = final_cluster.get('validation', {})
        final_cluster['validation_status'] = validation.get('status', 'unknown')
        
        # Ensure required fields exist
        if 'centroid' not in final_cluster:
            embeddings = final_cluster.get('embedding', [])
            final_cluster['centroid'] = self._calculate_centroid(embeddings)
        
        return final_cluster
    
    def _calculate_centroid(self, embeddings: List[List[float]]) -> List[float]:
        """Calculate centroid of embeddings."""
        if not embeddings:
            return []
        
        try:
            embeddings_array = np.array(embeddings)
            centroid = np.mean(embeddings_array, axis=0)
            return centroid.tolist()
        except Exception:
            return []
    
    def cluster_profiles_with_graduated_pipeline(self, profile_embeddings: List[List[float]], 
                                               profiles: List[Any],
                                               profile_processor: ProfileProcessor,
                                               cohesion_threshold: float = 0.4,
                                               persistence_threshold: float = 0.1,
                                               min_cluster_size: int = 3) -> List[Dict[str, Any]]:
        """
        Pipeline graduée de clustering avec 5 étapes de robustesse décroissante.
        
        1. Embeddings → HDBSCAN (clustering naturel)
        2. Profils faibles → LDA matrice → vectorisation topics
        3. LDA matrice → HDBSCAN (clustering thématique)
        4. Encore faibles → KMeans (k=n_topics, clustering forcé)
        5. Encore faibles → Tag "Cannot determine" (profils inclassables)
        
        Args:
            profile_embeddings: Liste des embeddings des profils
            profiles: Liste des profils correspondants
            profile_processor: Instance de ProfileProcessor pour LDA
            cohesion_threshold: Seuil de cohésion minimum (défaut: 0.4)
            persistence_threshold: Seuil de persistance minimum (défaut: 0.1)
            min_cluster_size: Taille minimale de cluster (défaut: 3)
            
        Returns:
            Liste des clusters finaux avec tags de robustesse
        """
        self.logger.info("🚀 Starting graduated clustering pipeline (5-step robustness cascade)")
        self.logger.info(f"📊 Processing {len(profiles)} profiles with thresholds: cohesion≥{cohesion_threshold}, persistence≥{persistence_threshold}")
        
        if len(profile_embeddings) == 0 or not profiles:
            return []
        
        # Containers pour les différents niveaux de robustesse
        strong_clusters = []
        weak_profiles = []
        weak_embeddings = []
        pipeline_stats = {
            'step1_strong_clusters': 0,
            'step1_weak_profiles': 0,
            'step2_lda_topics': 0,
            'step3_thematic_clusters': 0,
            'step3_weak_profiles': 0,
            'step4_forced_clusters': 0,
            'step5_cannot_determine': 0,
            'total_processed': len(profiles)
        }
        
        try:
            # =================== ÉTAPE 1: Embeddings → HDBSCAN ===================
            self.logger.info("🔄 STEP 1: Natural clustering in embedding space (HDBSCAN)")
            
            initial_clusters = self._perform_initial_clustering(profile_embeddings, profiles)
            
            # Évaluation de la robustesse des clusters initiaux
            for cluster in initial_clusters:
                cohesion = cluster.get('cohesion', 0.0)
                persistence = cluster.get('persistence', 0.0)
                
                # Critères de robustesse
                is_strong = (
                    cohesion >= cohesion_threshold and
                    (persistence is None or persistence >= persistence_threshold) and
                    cluster.get('size', 0) >= min_cluster_size
                )
                
                if is_strong:
                    # Cluster fort → accepté directement
                    cluster['robustness_level'] = 'strong'
                    cluster['pipeline_step'] = 1
                    cluster['robustness_tag'] = '🟢 Strong'
                    strong_clusters.append(cluster)
                    pipeline_stats['step1_strong_clusters'] += 1
                    self.logger.info(f"✅ STEP 1: Strong cluster accepted (size={cluster['size']}, cohesion={cohesion:.3f}, persistence={persistence})")
                else:
                    # Cluster faible → collecte pour étapes suivantes
                    weak_profiles.extend(cluster.get('profiles', []))
                    weak_embeddings.extend(cluster.get('embedding', []))
                    pipeline_stats['step1_weak_profiles'] += cluster.get('size', 0)
                    self.logger.info(f"⚠️ STEP 1: Weak cluster detected (size={cluster['size']}, cohesion={cohesion:.3f}, persistence={persistence}) → forwarding to LDA")
            
            if not weak_profiles:
                self.logger.info("✅ STEP 1 COMPLETE: All clusters are strong, no further processing needed")
            
            # =================== ÉTAPE 2: Profils faibles → LDA matrice ===================
            self.logger.info(f"🔄 STEP 2: LDA topic modeling for {len(weak_profiles)} weak profiles")
            
            lda_topic_vectors = None
            lda_model_info = None
            n_topics = 0
            
            if self.lda_topic_modeler and profile_processor:
                try:
                    # Extraction des textes pour LDA
                    weak_texts = profile_processor.extract_cluster_texts(weak_profiles)
                    if weak_texts and any(text.strip() for text in weak_texts):

                        # Récupérer à la fois la matrice et les informations du modèle LDA
                        result = self.lda_topic_modeler.build_topic_matrix(weak_texts, return_model_info=True)
                        if result and result[0] is not None:
                            lda_topic_vectors, lda_model_info = result
                            n_topics = lda_topic_vectors.shape[1]
                            pipeline_stats['step2_lda_topics'] = n_topics
                            self.logger.info(f"✅ STEP 2: LDA generated {n_topics} topics for {lda_topic_vectors.shape[0]} profiles")
                            
                            # Log les topics disponibles pour le tagging
                            if lda_model_info and 'topic_words' in lda_model_info:
                                for i, topic_words in enumerate(lda_model_info['topic_words']):
                                    top_5_words = topic_words[:5]
                                    self.logger.info(f"  🎯 Topic {i}: {', '.join(top_5_words)}")
                        else:
                            self.logger.warning("⚠️ STEP 2: LDA analysis failed or returned no results")
                    else:
                        self.logger.warning("⚠️ STEP 2: No valid text content for LDA analysis")
                except Exception as e:
                    self.logger.error(f"❌ STEP 2: LDA modeling failed: {e}")
            else:
                self.logger.warning("⚠️ STEP 2: LDA topic modeler not available")
            
            lda_len = 0
            if lda_topic_vectors is None:
                lda_len = 0
            elif hasattr(lda_topic_vectors, 'shape'):
                lda_len = lda_topic_vectors.shape[0]
            else:
                lda_len = len(lda_topic_vectors)
            if lda_len == 0:
                # Fallback direct vers étape 4 (KMeans) avec k conservateur
                fallback_k = max(2, min(8, len(weak_profiles) // 3))
                self.logger.info(f"⏭️ STEP 2 FAILED: Skipping to STEP 4 (KMeans with fallback k={fallback_k})")
                return self._apply_kmeans_fallback_with_k(strong_clusters, weak_profiles, weak_embeddings, pipeline_stats, fallback_k)
            
            # =================== ÉTAPE 3: LDA matrice → HDBSCAN ===================
            self.logger.info(f"� STEP 3: Thematic clustering in LDA space (HDBSCAN on {len(lda_topic_vectors)} topic vectors)")
            
            thematic_clusters = []
            remaining_weak_profiles = []
            remaining_weak_embeddings = []
            remaining_lda_vectors = []
            
            try:
                # Clustering HDBSCAN dans l'espace thématique LDA
                self.logger.info("🔄 Performing HDBSCAN clustering on LDA topic vectors")
                thematic_cluster_results = self._perform_lda_clustering(lda_topic_vectors, weak_profiles, weak_embeddings)

                for cluster in thematic_cluster_results:
                    cohesion = cluster.get('cohesion', 0.0)
                    persistence = cluster.get('persistence', 0.0)

                    is_strong = (
                        cohesion >= cohesion_threshold * 0.8 and  # Seuil légèrement plus permissif pour LDA
                        (persistence is None or persistence >= persistence_threshold * 0.8) and
                        cluster.get('size', 0) >= min_cluster_size
                    )

                    if is_strong:
                        # Cluster thématique fort
                        cluster['robustness_level'] = 'thematic'
                        cluster['pipeline_step'] = 3
                        cluster['robustness_tag'] = '🟡 Thematic'
                        thematic_clusters.append(cluster)
                        pipeline_stats['step3_thematic_clusters'] += 1
                        self.logger.info(f"✅ STEP 3: Thematic cluster accepted (size={cluster['size']}, cohesion={cohesion:.3f})")
                    else:
                        # Toujours faible même après LDA
                        remaining_weak_profiles.extend(cluster.get('profiles', []))
                        remaining_weak_embeddings.extend(cluster.get('embedding', []))
                        # Récupérer les vecteurs LDA correspondants
                        cluster_profile_ids = [id(p) for p in cluster.get('profiles', [])]
                        # Correction : utiliser .shape[0] si ndarray, sinon len()
                        lda_len = lda_topic_vectors.shape[0] if hasattr(lda_topic_vectors, 'shape') else len(lda_topic_vectors)
                        for i, profile in enumerate(weak_profiles):
                            if id(profile) in cluster_profile_ids and i < lda_len:
                                remaining_lda_vectors.append(lda_topic_vectors[i])
                        pipeline_stats['step3_weak_profiles'] += cluster.get('size', 0)
                        self.logger.info(f"⚠️ STEP 3: Weak thematic cluster (size={cluster['size']}, cohesion={cohesion:.3f}) → forwarding to KMeans")

            except Exception as e:
                self.logger.error(f"❌ STEP 3: Thematic clustering failed: {e}")
                # Fallback: tous les profils restent faibles
                remaining_weak_profiles = weak_profiles
                remaining_weak_embeddings = weak_embeddings
                remaining_lda_vectors = lda_topic_vectors
            
            if not remaining_weak_profiles:
                self.logger.info("✅ STEP 3 COMPLETE: All weak profiles successfully clustered thematically")
                return self._finalize_graduated_results(strong_clusters, thematic_clusters, pipeline_stats=pipeline_stats, lda_model_info=lda_model_info)
            
            # =================== ÉTAPE 4: Encore faibles → KMeans ===================
            # Réduction sémantique du nombre de topics pour k
            optimal_k = self._calculate_optimal_k_from_topics(
                lda_topic_vectors if lda_topic_vectors is not None else [], 
                n_topics, 
                len(remaining_weak_profiles)
            )
            
            self.logger.info(f"🔄 STEP 4: Forced clustering with KMeans (k={optimal_k}, reduced from {n_topics} topics) for {len(remaining_weak_profiles)} resistant profiles")
            
            forced_clusters = []
            try:
                if optimal_k > 1 and len(remaining_weak_profiles) >= optimal_k:
                    # Utiliser les vecteurs LDA pour KMeans si disponibles
                    vectors_for_kmeans = remaining_lda_vectors if remaining_lda_vectors else remaining_weak_embeddings
                    forced_clusters = self._apply_kmeans_forced_clustering(
                        vectors_for_kmeans, remaining_weak_profiles, k=min(optimal_k, len(remaining_weak_profiles))
                    )
                    
                    for cluster in forced_clusters:
                        cluster['robustness_level'] = 'forced'
                        cluster['pipeline_step'] = 4
                        cluster['robustness_tag'] = '🟠 Forced'
                        pipeline_stats['step4_forced_clusters'] += 1
                        self.logger.info(f"⚠️ STEP 4: Forced cluster created (size={cluster['size']})")
                        
                    remaining_weak_profiles = []  # Tous traités par KMeans
                    
                else:
                    self.logger.warning(f"⚠️ STEP 4: Insufficient profiles for KMeans (need ≥{n_topics}, have {len(remaining_weak_profiles)})")
                    
            except Exception as e:
                self.logger.error(f"❌ STEP 4: KMeans clustering failed: {e}")
            
            # =================== ÉTAPE 5: Encore faibles → "Cannot determine" ===================
            cannot_determine_cluster = []
            if remaining_weak_profiles:
                self.logger.info(f"🔄 STEP 5: Creating 'Cannot determine' cluster for {len(remaining_weak_profiles)} unclassifiable profiles")
                
                cannot_determine_cluster = [{
                    'cluster_id': -999,  # ID spécial pour "Cannot determine"
                    'profiles': remaining_weak_profiles,
                    'embedding': remaining_weak_embeddings,
                    'size': len(remaining_weak_profiles),
                    'cohesion': 0.0,  # Cohésion nulle par définition
                    'centroid': self._calculate_cluster_centroid(remaining_weak_embeddings) if remaining_weak_embeddings else [],
                    'persistence': None,
                    'robustness_level': 'cannot_determine',
                    'pipeline_step': 5,
                    'robustness_tag': '🔴 Cannot Determine',
                    'is_noise': True,
                    'skip_tagging': True  # Flag pour éviter le tagging dans la suite
                }]
                
                pipeline_stats['step5_cannot_determine'] = len(remaining_weak_profiles)
                self.logger.info(f"⚠️ STEP 5: Created 'Cannot determine' cluster (size={len(remaining_weak_profiles)})")
            
            # =================== FINALISATION ===================
            all_final_clusters = strong_clusters + thematic_clusters + forced_clusters + cannot_determine_cluster
            return self._finalize_graduated_results(all_final_clusters, [], pipeline_stats=pipeline_stats, lda_model_info=lda_model_info)
            
        except Exception as e:
            self.logger.error(f"❌ Error in graduated pipeline: {e}", exc_info=True)
            return []

    def cluster_profiles(self, profile_embeddings: List[List[float]], profiles: List[Any]) -> List[Dict[str, Any]]:
        """
        Cluster profiles using HDBSCAN with cosine metric.
        
        Args:
            profile_embeddings: List of embedding vectors for profiles
            profiles: List of profile objects corresponding to embeddings
        
        Returns:
            List of cluster dictionaries, each with:
                - 'cluster_id': int
                - 'profiles': list
                - 'embedding': list
                - 'size': int
                - 'cohesion': float
                - 'centroid': np.ndarray
                - 'persistence': float or None (HDBSCAN cluster persistence if available)
        """
        try:
            if len(profile_embeddings) == 0 or not profiles:
                self.logger.warning("No profile embeddings or profiles provided for clustering")
                return []
            
            if len(profile_embeddings) != len(profiles):
                self.logger.error("Mismatch between embeddings and profiles count")
                return []
            
            # Memory management before clustering
            self.memory_manager.manage_memory()
            
            # Adjust clustering parameters based on dataset size
            dataset_size = len(profile_embeddings)
            self.clusterer.adjust_for_dataset_size(dataset_size)
            
            self.logger.info(f"🔄 Clustering {dataset_size} profiles with HDBSCAN (cosine metric)")
            self.logger.info(f"📊 Parameters: min_cluster_size={self.clusterer.min_cluster_size}, min_samples={self.clusterer.min_samples}")
            
            # Perform clustering with cosine metric
            # On récupère aussi la persistance si disponible
            cluster_labels, clusterer = self.clusterer.fit_predict(profile_embeddings)
            # clusterer doit être un objet HDBSCAN
            persistences = None
            try:
                # hdbscan >=0.8: cluster_persistence_ (array, index by label)
                persistences = getattr(clusterer, 'cluster_persistence_', None)
                if persistences is not None:
                    self.logger.info(f"🔍 HDBSCAN cluster_persistence_ found: {len(persistences)} values: {persistences}")
                else:
                    self.logger.warning("⚠️ HDBSCAN cluster_persistence_ not available")
            except Exception as e:
                self.logger.warning(f"⚠️ Error getting HDBSCAN persistence: {e}")
                persistences = None
            
            clusters = {}
            noise_profiles = []
            for i, label in enumerate(cluster_labels):
                if label == -1:  # Noise/outlier
                    noise_profiles.append({
                        'profile': profiles[i],
                        'embedding': profile_embeddings[i]
                    })
                else:
                    if label not in clusters:
                        clusters[label] = {
                            'profiles': [],
                            'embedding': [],
                            'cluster_id': label
                        }
                    clusters[label]['profiles'].append(profiles[i])
                    clusters[label]['embedding'].append(profile_embeddings[i])
            
            # Convert to list format and add metadata, including persistence (robust mapping)
            cluster_list = []
            # Build label->persistence index mapping if possible
            label_to_persistence_idx = None

            if persistences is not None:
                # unique_labels: all cluster labels except noise (-1), sorted as in cluster_persistence_
                unique_labels = [l for l in np.unique(cluster_labels) if l != -1]
                label_to_persistence_idx = {label: idx for idx, label in enumerate(unique_labels)}
                self.logger.info(f"🔍 Label to persistence mapping: {label_to_persistence_idx}")
            for cluster_id, cluster_data in clusters.items():
                cluster_size = len(cluster_data['profiles'])
                cohesion = self._calculate_cluster_cohesion(cluster_data['embedding'])
                # Persistance HDBSCAN si dispo (robuste)
                persistence = None
                if persistences is not None and label_to_persistence_idx is not None:
                    idx = label_to_persistence_idx.get(cluster_id)
                    if idx is not None and idx < len(persistences):
                        persistence = float(persistences[idx])
                        self.logger.info(f"🔍 Cluster {cluster_id}: assigned persistence = {persistence}")
                    else:
                        self.logger.warning(f"⚠️ Cluster {cluster_id}: no persistence mapping found (idx={idx})")
                else:
                    self.logger.warning(f"⚠️ Cluster {cluster_id}: no persistences available")
                cluster_result = {
                    'cluster_id': cluster_id,
                    'profiles': cluster_data['profiles'],
                    'embedding': cluster_data['embedding'],
                    'size': cluster_size,
                    'cohesion': cohesion,
                    'centroid': self._calculate_cluster_centroid(cluster_data['embedding']),
                    'persistence': persistence
                }
                cluster_list.append(cluster_result)
            # Handle noise profiles - create small clusters or merge with existing ones
            if noise_profiles and len(noise_profiles) >= 2:
                noise_cluster = {
                    'cluster_id': -1,
                    'profiles': [item['profile'] for item in noise_profiles],
                    'embedding': [item['embedding'] for item in noise_profiles],
                    'size': len(noise_profiles),
                    'cohesion': self._calculate_cluster_cohesion([item['embedding'] for item in noise_profiles]),
                    'centroid': self._calculate_cluster_centroid([item['embedding'] for item in noise_profiles]),
                    'persistence': None
                }
                cluster_list.append(noise_cluster)
            # Sort clusters by size (largest first)
            cluster_list.sort(key=lambda x: x['size'], reverse=True)
            # Log cluster statistics
            self._log_clustering_stats(cluster_list, noise_profiles)
            return cluster_list
            
        except Exception as e:
            self.logger.error(f"❌ Error in profile clustering: {e}", exc_info=True)
            return []
    
    def _build_cluster_results(self, clusters: Dict, noise_profiles: List[Dict]) -> List[Dict[str, Any]]:
        """Build cluster result objects with metadata."""
        cluster_list = []
        
        # Process regular clusters
        for cluster_id, cluster_data in clusters.items():
            cluster_size = len(cluster_data['profiles'])
            
            # Calculate cluster cohesion
            cohesion = self._calculate_cluster_cohesion(cluster_data['embedding']) 
            
            cluster_result = {
                'cluster_id': cluster_id,
                'profiles': cluster_data['profiles'],
                'embedding': cluster_data['embedding'],
                'size': cluster_size,
                'cohesion': cohesion,
                'centroid': self._calculate_cluster_centroid(cluster_data['embedding'])  # Fixed: Use singular 'embedding'
            }
            
            cluster_list.append(cluster_result)
        
        # Handle noise profiles - create small clusters or merge with existing ones
        if noise_profiles and len(noise_profiles) >= 2:
            # Create a noise cluster if we have enough noise profiles
            noise_cluster = {
                'cluster_id': -1,
                'profiles': [item['profile'] for item in noise_profiles],
                'embedding': [item['embedding'] for item in noise_profiles],
                'size': len(noise_profiles),
                'cohesion': self._calculate_cluster_cohesion([item['embedding'] for item in noise_profiles]),
                'centroid': self._calculate_cluster_centroid([item['embedding'] for item in noise_profiles])
            }
            cluster_list.append(noise_cluster)
        
        # Sort clusters by size (largest first)
        cluster_list.sort(key=lambda x: x['size'], reverse=True)
        
        return cluster_list
    
    def _calculate_cluster_cohesion(self, cluster_embeddings: List[List[float]]) -> float:
        """
        Calculate the cohesion score for a cluster based on internal similarity.
        
        Args:
            cluster_embeddings: List of embedding vectors in the cluster
            
        Returns:
            Cohesion score between 0 and 1 (higher = more cohesive)
        """
        try:
            if len(cluster_embeddings) == 0 or len(cluster_embeddings) < 2:
                return 1.0  # Perfect cohesion for single items
            
            embeddings_array = np.array(cluster_embeddings)
            
            # Normalize embeddings for cosine similarity
            norms = np.linalg.norm(embeddings_array, axis=1)
            # Éviter la division par zéro
            norms = np.where(norms == 0, 1e-8, norms)
            normalized_embeddings = embeddings_array / norms[:, np.newaxis]
            
            # Calculate pairwise cosine similarities
            similarities = []
            n = len(normalized_embeddings)
            
            for i in range(n):
                for j in range(i + 1, n):
                    similarity = np.dot(normalized_embeddings[i], normalized_embeddings[j])
                    similarities.append(similarity)
            
            # Return average similarity as cohesion score
            return float(np.mean(similarities)) if similarities else 0.0
            
        except Exception as e:
            self.logger.warning(f"Error calculating cluster cohesion: {e}")
            return 0.0
    
    def _calculate_cluster_centroid(self, cluster_embeddings: List[List[float]]) -> np.ndarray:
        """
        Calculate the centroid (mean) of cluster embeddings.
        
        Args:
            cluster_embeddings: List of embedding vectors for the cluster
            
        Returns:
            Normalized centroid vector as numpy array
        """
        try:
            if len(cluster_embeddings) == 0:
                return np.array([])
            
            # Convert to numpy array and calculate mean
            embeddings_array = np.array(cluster_embeddings)
            centroid = np.mean(embeddings_array, axis=0)
            
            # Normalize the centroid
            norm = np.linalg.norm(centroid)
            if norm > 0:
                centroid = centroid / norm
            
            return centroid
            
        except Exception as e:
            self.logger.warning(f"Error calculating cluster centroid: {e}")
            return np.array([])
    
    def _log_clustering_stats(self, cluster_list: List[Dict], noise_profiles: List[Dict]):
        """Log clustering statistics."""
        total_clustered = sum(c['size'] for c in cluster_list)
        noise_count = len(noise_profiles) if len(noise_profiles) < 2 else 0
        
        self.logger.info(f"✅ Profile clustering complete:")
        self.logger.info(f"   📊 {len(cluster_list)} clusters generated")
        self.logger.info(f"   👥 {total_clustered} profiles clustered")
        self.logger.info(f"   🔇 {noise_count} noise profiles")
        self.logger.info(f"   📈 Cluster sizes: {[c['size'] for c in cluster_list]}")
    
    def get_clustering_summary(self, clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get summary statistics about clustering results."""
        if not clusters:
            return {
                'total_clusters': 0,
                'total_profiles': 0,
                'average_cluster_size': 0,
                'cohesion_stats': {}
            }
        
        sizes = [c['size'] for c in clusters]
        cohesions = [c.get('cohesion', 0) for c in clusters]
        
        return {
            'total_clusters': len(clusters),
            'total_profiles': sum(sizes),
            'cluster_sizes': {
                'min': min(sizes),
                'max': max(sizes),
                'average': sum(sizes) / len(sizes),
                'distribution': sizes
            },
            'cohesion_stats': {
                'min': min(cohesions) if cohesions else 0,
                'max': max(cohesions) if cohesions else 0,
                'average': sum(cohesions) / len(cohesions) if cohesions else 0
            }
        }


    def _validate_quality_control_inputs(self, profile_processor: ProfileProcessor) -> None:
        """
        Vérifie que les entrées nécessaires au contrôle qualité sont présentes.
        Args:
            profile_processor: Instance de ProfileProcessor requise pour le fallback LDA.
        Raises:
            ValueError: Si profile_processor est None.
        Effets:
            Loggue un warning si le fallback_handler est absent.
        """
        if profile_processor is None:
            self.logger.error("❌ profile_processor est obligatoire pour le contrôle qualité avec fallback LDA")
            raise ValueError("profile_processor est obligatoire pour le contrôle qualité avec fallback LDA")
        if self.fallback_handler is None:
            self.logger.warning("⚠️ Aucun fallback_handler disponible - le fallback LDA sera désactivé")

    def _perform_initial_clustering(self, profile_embeddings: list[list[float]], profiles: list[dict]) -> list[dict]:
        """
        Effectue le clustering initial HDBSCAN.
        Args:
            profile_embeddings: Liste des vecteurs d'embedding (list[list[float]]).
            profiles: Liste des profils (list[dict] ou objets profil).
        Returns:
            Liste de clusters (list[dict]), chaque dict contient au moins: 'cluster_id', 'profiles', 'embedding', 'size', 'cohesion', 'centroid', 'persistence'.
        """
        self.logger.info(f"🔄 Starting initial clustering with {len(profiles)} profiles")
        initial_clusters = self.cluster_profiles(profile_embeddings, profiles)
        self.logger.info(f"🔍 Initial clustering produced {len(initial_clusters)} clusters")
        return initial_clusters

    def _assess_cluster_quality(
        self,
        clusters: list[dict],
        cohesion_threshold: float,
        variance_threshold: float,
        persistence_threshold: float
    ) -> dict:
        """
        Évalue la qualité des clusters (bons/faibles) selon les seuils fournis.
        Args:
            clusters: Liste de clusters (list[dict])
            cohesion_threshold: Seuil de cohésion minimum
            variance_threshold: Seuil de variance maximum
            persistence_threshold: Seuil de persistance HDBSCAN
        Returns:
            dict avec les clés:
                - 'good_clusters': list[dict]
                - 'weak_clusters': list[dict]
                - 'total_good_profiles': int
                - 'total_weak_profiles': int
        """
        self.logger.info(f"🔍 Starting quality assessment on {len(clusters)} clusters")
        good_clusters, weak_clusters = detect_weak_clusters(
            clusters,
            cohesion_threshold=cohesion_threshold,
            variance_threshold=variance_threshold,
            persistence_threshold=persistence_threshold,
            logger=self.logger
        )
        result = {
            'good_clusters': good_clusters,
            'weak_clusters': weak_clusters,
            'total_good_profiles': sum(len(c.get('profiles', [])) for c in good_clusters),
            'total_weak_profiles': sum(len(c.get('profiles', [])) for c in weak_clusters)
        }
        self.logger.info(f"📊 Quality assessment: {len(good_clusters)} good clusters ({result['total_good_profiles']} profiles), "
                        f"{len(weak_clusters)} weak clusters ({result['total_weak_profiles']} profiles)")
        return result

    def _handle_reclustering(
        self,
        quality_result: dict,
        enable_reclustering: bool,
        profile_processor: ProfileProcessor,
        cohesion_threshold: float,
        min_cluster_size: int
    ) -> list[dict]:
        """
        Gère le reclustering adaptatif des clusters faibles et l'ajout des profils non clusterisés.
        Args:
            quality_result: dict retourné par _assess_cluster_quality
            enable_reclustering: bool, active le reclustering
            profile_processor: ProfileProcessor
            cohesion_threshold: float
            min_cluster_size: int
        Returns:
            Liste finale de clusters (list[dict])
        """
        final_clusters = quality_result['good_clusters'].copy()
        weak_clusters = quality_result['weak_clusters']

        if not enable_reclustering or not weak_clusters:
            self.logger.info("⏭️ Reclustering disabled or no weak clusters to process")
            return final_clusters
        
        self.logger.info(f"♻️ Starting adaptive reclustering on {len(weak_clusters)} weak clusters")
        all_weak_profiles = self._extract_profiles_from_clusters(weak_clusters)
        reclustered = self._adaptive_reclustering(
            weak_clusters, profile_processor, 
            cohesion_threshold=cohesion_threshold, 
            min_cluster_size=min_cluster_size
        )
        
        valid_reclustered = [c for c in reclustered if c and c.get('profiles')]
        final_clusters.extend(valid_reclustered)
        self._handle_unclustered_profiles(all_weak_profiles, valid_reclustered, final_clusters)
        return final_clusters

    def _extract_profiles_from_clusters(self, clusters: list[dict]) -> list[dict]:
        """
        Extrait tous les profils d'une liste de clusters.
        Args:
            clusters: list[dict] (chaque dict doit avoir 'profiles')
        Returns:
            Liste de profils (list[dict] ou objets profil)
        """
        all_profiles = []
        for cluster in clusters:
            all_profiles.extend(cluster.get('profiles', []))
        return all_profiles

    def _handle_unclustered_profiles(
        self,
        original_weak_profiles: list[dict],
        reclustered: list[dict],
        final_clusters: list[dict]
    ) -> None:
        """
        Ajoute un cluster 'miscellaneous' pour les profils faibles non reclusterisés.
        Args:
            original_weak_profiles: Liste initiale de profils faibles (list[dict])
            reclustered: Liste de clusters issus du reclustering (list[dict])
            final_clusters: Liste finale de clusters à compléter (list[dict])
        """
        reclustered_profile_ids = set()
        for cluster in reclustered:
            for profile in cluster.get('profiles', []):
                reclustered_profile_ids.add(id(profile))
        unclustered_profiles = [p for p in original_weak_profiles if id(p) not in reclustered_profile_ids]
        if unclustered_profiles:
            self.logger.info(f"🗂️ Creating miscellaneous cluster for {len(unclustered_profiles)} unclustered profiles")
            misc_cluster = self._create_miscellaneous_cluster(unclustered_profiles)
            final_clusters.extend(misc_cluster)

    def _finalize_clustering_results(self, final_clusters: list[dict], input_count: int) -> list[dict]:
        """
        Valide et loggue les résultats finaux du clustering.
        Args:
            final_clusters: Liste finale de clusters (list[dict])
            input_count: Nombre de profils en entrée (int)
        Returns:
            Liste finale de clusters (list[dict])
        """
        total_profiles = sum(len(cluster.get('profiles', [])) for cluster in final_clusters)
        avg_cohesion = (sum(cluster.get('cohesion', 0) for cluster in final_clusters) / len(final_clusters)) if final_clusters else 0
        self._log_final_cluster_breakdown(final_clusters)
        self._validate_profile_count(total_profiles, input_count)
        self.logger.info(f"✅ Quality control completed: {len(final_clusters)} final clusters, "
                        f"{total_profiles} total profiles, avg cohesion: {avg_cohesion:.3f}")
        return final_clusters

    def _log_final_cluster_breakdown(self, clusters: list[dict]) -> None:
        """
        Loggue le détail de chaque cluster final.
        Args:
            clusters: Liste de clusters (list[dict])
        """
        self.logger.info("📦 Final clusters breakdown:")
        for idx, cluster in enumerate(clusters):
            cluster_id = cluster.get('cluster_id', 'N/A')
            size = len(cluster.get('profiles', []))
            cohesion = cluster.get('cohesion', 0)
            persistence = cluster.get('persistence')
            persistence_str = f", persistence={persistence:.3f}" if persistence is not None else ""
            misc_str = " (miscellaneous)" if cluster.get('is_miscellaneous', False) else ""
            self.logger.info(f"  - Cluster {idx} (id={cluster_id}, size={size}, cohesion={cohesion:.3f}{persistence_str}){misc_str}")

    def _validate_profile_count(self, total_profiles: int, input_count: int) -> None:
        """
        Vérifie que tous les profils d'entrée sont bien clusterisés.
        Args:
            total_profiles: Nombre de profils dans les clusters finaux
            input_count: Nombre de profils en entrée
        """
        if total_profiles != input_count:
            self.logger.warning(f"⚠️ Profile count mismatch: {total_profiles} in final clusters, {input_count} in input!")
        else:
            self.logger.info(f"🔢 Profile count validation OK: {total_profiles} profiles clustered")

    def _adaptive_reclustering(self, weak_clusters: List[Dict[str, Any]], 
                             profile_processor=None,
                             cohesion_threshold: float = 0.3,
                             max_iterations: int = 10,
                             min_cluster_size: int = 2) -> List[Dict[str, Any]]:
        """
        Effectue un reclustering adaptatif sur les clusters faibles.
        
        Args:
            weak_clusters: List of weak cluster dictionaries
            profile_processor: ProfileProcessor instance for enhanced fallback
            cohesion_threshold: Seuil de cohésion pour la détection des clusters faibles
            max_iterations: Maximum number of reclustering iterations
            min_cluster_size: Minimum size for valid clusters
            
        Returns:
            List of improved clusters
        """
        if not weak_clusters:
            return []
        
        # Récupérer tous les profils des clusters faibles
        all_weak_profiles = []
        all_weak_embeddings = []
        
        for cluster in weak_clusters:
            profiles = cluster.get('profiles', [])
            embeddings = cluster.get('embedding', [])
            for i, profile in enumerate(profiles):
                if i < len(embeddings):
                    all_weak_profiles.append(profile)
                    all_weak_embeddings.append(embeddings[i])
        
        if len(all_weak_profiles) < min_cluster_size:
            self.logger.info(f"🔄 Too few profiles ({len(all_weak_profiles)}) for reclustering, creating 'Miscellaneous' group")
            return self._create_miscellaneous_cluster(all_weak_profiles)
        
        self.logger.info(f"🔄 Starting adaptive reclustering on {len(all_weak_profiles)} profiles")
        
        # Reclustering itératif
        current_profiles = all_weak_profiles
        current_embeddings = all_weak_embeddings
        final_clusters = []
        
        # Gérer les profils restants non clusterisés
        if current_profiles:
            self.logger.info(f"🗂️ {len(current_profiles)} profiles remaining after reclustering")
            if len(current_profiles) >= 3:
                handler = self.fallback_handler
                if handler and profile_processor:
                    self.logger.info("🔄 Attempting enhanced LDA fallback for remaining profiles")
                    try:
                        weak_cluster = {
                            'profiles': current_profiles,
                            'embedding': current_embeddings,
                            'size': len(current_profiles),
                            'cohesion': 0.0,
                            'is_weak': True
                        }
                        fallback_clusters = handler.process_weak_clusters(
                            [weak_cluster],
                            profile_processor,
                            cohesion_threshold=cohesion_threshold
                        )
                        if fallback_clusters:
                            self.logger.info(f"✅ Enhanced fallback succeeded with {len(fallback_clusters)} clusters")
                            final_clusters.extend(fallback_clusters)
                            # Extraire les profils qui ont été clusterisés par le fallback
                            fallback_profile_ids = set()
                            for cluster in fallback_clusters:
                                for profile in cluster.get('profiles', []):
                                    fallback_profile_ids.add(id(profile))
                            # Garder seulement les profils non traités par le fallback
                            remaining_profiles = [p for p in current_profiles if id(p) not in fallback_profile_ids]
                            current_profiles = remaining_profiles
                            self.logger.info(f"🔍 After fallback: {len(current_profiles)} profiles still unclustered")
                        else:
                            self.logger.info("🔄 Enhanced fallback produced no clusters")
                    except Exception as e:
                        self.logger.error(f"❌ Enhanced fallback failed: {e}")
                else:
                    self.logger.warning("⚠️ Fallback LDA not attempted: fallback_handler or profile_processor missing")
            if current_profiles:
                self.logger.info(f"🗂️ Adding {len(current_profiles)} unclustered profiles to miscellaneous cluster")
                misc_cluster = self._create_miscellaneous_cluster(current_profiles)
                final_clusters.extend(misc_cluster)
        
        # Vérification : tous les profils faibles doivent être dans les clusters finaux
        total_final = sum(len(c.get('profiles', [])) for c in final_clusters)
        if total_final != len(all_weak_profiles):
            self.logger.warning(f"⚠️ Reclustering: {total_final} profiles in final clusters, but {len(all_weak_profiles)} weak profiles at start!")
        
        self.logger.info(f"✅ Adaptive reclustering completed: {len(final_clusters)} final clusters")
        return final_clusters
    
    def _perform_strict_clustering(self, profiles: List[Any], embeddings: List[List[float]], 
                                 min_cluster_size: int) -> List[Dict[str, Any]]:
        """
        Effectue un clustering avec des paramètres stricts.
        """
        try:
            if len(profiles) < min_cluster_size:
                return []
            
            clusters = {}
            used_indices = set()
            
            for i, embedding in enumerate(embeddings):
                if i in used_indices:
                    continue
                
                # Trouver les profils similaires
                cluster_profiles = [profiles[i]]
                cluster_embeddings = [embedding]
                used_indices.add(i)
                
                for j, other_embedding in enumerate(embeddings):
                    if j in used_indices or j == i:
                        continue
                    
                    # Calculer la similarité cosinus
                    similarity = self._calculate_cosine_similarity(embedding, other_embedding)
                    if similarity > 0.7:  # Seuil strict
                        cluster_profiles.append(profiles[j])
                        cluster_embeddings.append(other_embedding)
                        used_indices.add(j)
                
                # Créer le cluster si assez de membres
                if len(cluster_profiles) >= min_cluster_size:
                    cluster_data = {
                        'cluster_id': len(clusters),
                        'profiles': cluster_profiles,
                        'embedding': cluster_embeddings,
                        'size': len(cluster_profiles),
                        'cohesion': self._calculate_cluster_cohesion(cluster_embeddings),
                        'centroid': self._calculate_cluster_centroid(cluster_embeddings)
                    }
                    clusters[len(clusters)] = cluster_data
                else:
                    # Si le cluster n'a pas assez de membres, libérer les indices
                    for k in range(len(cluster_profiles)):
                        profile_idx = profiles.index(cluster_profiles[k])
                        used_indices.discard(profile_idx)
            
            # Log des profils non utilisés pour debugging
            unused_count = len(profiles) - len(used_indices)
            if unused_count > 0:
                self.logger.info(f"🔄 Strict clustering: {unused_count} profiles not clustered (will be handled separately)")
            
            return list(clusters.values())
            
        except Exception as e:
            self.logger.error(f"❌ Error in strict clustering: {e}")
            return []
    
    def _calculate_cosine_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calcule la similarité cosinus entre deux embeddings."""
        try:
            # Utiliser numpy pour le calcul
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calcul de la similarité cosinus
            cosine_sim = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
            return float(cosine_sim)
            
        except Exception as e:
            self.logger.warning(f"Error calculating cosine similarity: {e}")
            return 0.0
    
    def _create_miscellaneous_cluster(self, profiles: List[Any]) -> List[Dict[str, Any]]:
        """Crée un cluster 'Divers' pour les profils non clusterisés."""
        if not profiles:
            return []
        
        # Pour les profils divers, on ne peut pas récupérer les embeddings facilement
        # On crée un cluster simple
        misc_cluster = {
            'cluster_id': -1,
            'profiles': profiles,
            'embedding': [],  # Pas d'embeddings pour les divers
            'size': len(profiles),
            'cohesion': 0.0,  # Faible par définition
            'variance': 1.0,  # Élevée par définition
            'centroid': np.array([]),
            'is_miscellaneous': True
        }
        
        self.logger.info(f"🗂️ Created miscellaneous cluster with {len(profiles)} profiles")
        return [misc_cluster]

    def _calculate_cluster_variance(self, embeddings: List[List[float]]) -> float:
        """Calcule la variance d'un cluster."""
        try:
            if not embeddings or len(embeddings) < 2:
                return 0.0
            embeddings_array = np.array(embeddings)
            variance = float(np.mean(np.var(embeddings_array, axis=0)))
            return variance
        except Exception as e:
            self.logger.warning(f"Error calculating variance: {e}")
            return 0.0
    
    def _perform_lda_clustering(self, lda_topic_vectors: List[List[float]], profiles: List[Any], embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Effectue un clustering HDBSCAN dans l'espace thématique LDA.
        
        Args:
            lda_topic_vectors: Vecteurs de distribution des topics LDA
            profiles: Profils correspondants
            embeddings: Embeddings originaux correspondants
            
        Returns:
            Liste de clusters thématiques
        """
        try:
            self.logger.info(f"🔄 Clustering {len(lda_topic_vectors)} profiles in LDA topic space")
            
            # Utiliser HDBSCAN avec les vecteurs LDA
            cluster_labels, clusterer = self.clusterer.fit_predict(lda_topic_vectors)
            
            # Organiser les résultats
            clusters = {}
            noise_profiles = []
            
            for i, label in enumerate(cluster_labels):
                if label == -1:  # Bruit
                    if i < len(profiles) and i < len(embeddings):
                        noise_profiles.append({
                            'profile': profiles[i],
                            'embedding': embeddings[i] if i < len(embeddings) else [],
                            'lda_vector': lda_topic_vectors[i]
                        })
                else:
                    if label not in clusters:
                        clusters[label] = {
                            'profiles': [],
                            'embedding': [],
                            'lda_vectors': [],
                            'cluster_id': label
                        }
                    if i < len(profiles):
                        clusters[label]['profiles'].append(profiles[i])
                    if i < len(embeddings):
                        clusters[label]['embedding'].append(embeddings[i])
                    clusters[label]['lda_vectors'].append(lda_topic_vectors[i])
            
            # Construire les résultats finaux
            cluster_list = []
            for cluster_id, cluster_data in clusters.items():
                if len(cluster_data['profiles']) >= 2:  # Minimum 2 profils par cluster
                    cluster_result = {
                        'cluster_id': cluster_id,
                        'profiles': cluster_data['profiles'],
                        'embedding': cluster_data['embedding'],
                        'lda_vectors': cluster_data['lda_vectors'],
                        'size': len(cluster_data['profiles']),
                        'cohesion': self._calculate_cluster_cohesion(cluster_data['embedding']),
                        'centroid': self._calculate_cluster_centroid(cluster_data['embedding']),
                        'persistence': None,  # À récupérer si nécessaire
                        'clustering_method': 'LDA_HDBSCAN'
                    }
                    cluster_list.append(cluster_result)
            
            # Ajouter les profils bruit comme cluster faible si assez nombreux
            if noise_profiles and len(noise_profiles) >= 2:
                noise_cluster = {
                    'cluster_id': -1,
                    'profiles': [item['profile'] for item in noise_profiles],
                    'embedding': [item['embedding'] for item in noise_profiles],
                    'size': len(noise_profiles),
                    'cohesion': self._calculate_cluster_cohesion([item['embedding'] for item in noise_profiles]),
                    'centroid': self._calculate_cluster_centroid([item['embedding'] for item in noise_profiles]),
                    'persistence': None,
                    'clustering_method': 'LDA_HDBSCAN'
                }
                cluster_list.append(noise_cluster)
            
            self.logger.info(f"✅ LDA clustering produced {len(cluster_list)} thematic clusters")
            return cluster_list
            
        except Exception as e:
            self.logger.error(f"❌ Error in LDA clustering: {e}")
            return []
    
    def _apply_kmeans_forced_clustering(self, vectors: List[List[float]], profiles: List[Any], k: int) -> List[Dict[str, Any]]:
        """
        Applique KMeans pour forcer un clustering même sur des données difficiles.
        
        Args:
            vectors: Vecteurs à clusteriser (LDA ou embeddings)
            profiles: Profils correspondants
            k: Nombre de clusters à forcer
            
        Returns:
            Liste de clusters forcés
        """
        try:
            if not vectors or len(vectors) < k or k <= 0:
                return []
            
            from sklearn.cluster import KMeans
            import numpy as np
            
            self.logger.info(f"🔄 Applying forced KMeans clustering (k={k}) on {len(vectors)} vectors")
            
            # Application KMeans
            vectors_array = np.array(vectors)
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(vectors_array)
            
            # Organisation des résultats
            clusters = {}
            for i, label in enumerate(cluster_labels):
                if label not in clusters:
                    clusters[label] = {
                        'profiles': [],
                        'embedding': [],
                        'vectors': [],
                        'cluster_id': label
                    }
                if i < len(profiles):
                    clusters[label]['profiles'].append(profiles[i])
                if i < len(vectors):
                    clusters[label]['vectors'].append(vectors[i])
            
            # Construction des résultats finaux
            cluster_list = []
            for cluster_id, cluster_data in clusters.items():
                # Pour KMeans, on estime les embeddings originaux si pas disponibles
                if not cluster_data.get('embedding'):
                    cluster_data['embedding'] = cluster_data['vectors']  # Utiliser les vecteurs comme proxy
                
                cluster_result = {
                    'cluster_id': cluster_id,
                    'profiles': cluster_data['profiles'],
                    'embedding': cluster_data['embedding'],
                    'size': len(cluster_data['profiles']),
                    'cohesion': self._calculate_cluster_cohesion(cluster_data['embedding']),
                    'centroid': self._calculate_cluster_centroid(cluster_data['embedding']),
                    'persistence': None,  # KMeans n'a pas de persistence
                    'clustering_method': 'KMeans_Forced',
                    'kmeans_inertia': float(kmeans.inertia_) if hasattr(kmeans, 'inertia_') else None
                }
                cluster_list.append(cluster_result)
            
            self.logger.info(f"✅ KMeans forced clustering produced {len(cluster_list)} clusters")
            return cluster_list
            
        except Exception as e:
            self.logger.error(f"❌ Error in KMeans forced clustering: {e}")
            return []
    
    def _apply_kmeans_fallback(self, strong_clusters: List[Dict], weak_profiles: List[Any], weak_embeddings: List[List[float]], pipeline_stats: Dict) -> List[Dict[str, Any]]:
        """
        Applique directement KMeans comme fallback quand LDA échoue.
        
        Args:
            strong_clusters: Clusters forts déjà identifiés
            weak_profiles: Profils faibles à traiter
            weak_embeddings: Embeddings des profils faibles
            pipeline_stats: Statistiques de la pipeline
            
        Returns:
            Liste complète des clusters finaux
        """
        try:
            # Essayer KMeans avec un nombre raisonnable de clusters
            k = max(2, min(8, len(weak_profiles) // 3))  # Heuristique: k entre 2 et 8
            
            self.logger.info(f"🔄 FALLBACK: Applying KMeans directly (k={k}) on {len(weak_profiles)} profiles")
            
            forced_clusters = self._apply_kmeans_forced_clustering(weak_embeddings, weak_profiles, k)
            
            # Marquer comme forcé
            for cluster in forced_clusters:
                cluster['robustness_level'] = 'forced'
                cluster['pipeline_step'] = 4
                cluster['robustness_tag'] = '🟠 Forced (LDA Fallback)'
                pipeline_stats['step4_forced_clusters'] += 1
            
            # S'il reste des profils non traités, les mettre en "Cannot determine"
            if not forced_clusters and weak_profiles:
                cannot_determine_cluster = [{
                    'cluster_id': -999,
                    'profiles': weak_profiles,
                    'embedding': weak_embeddings,
                    'size': len(weak_profiles),
                    'cohesion': 0.0,
                    'centroid': self._calculate_cluster_centroid(weak_embeddings),
                    'persistence': None,
                    'robustness_level': 'cannot_determine',
                    'pipeline_step': 5,
                    'robustness_tag': '🔴 Cannot Determine',
                    'is_noise': True,
                    'skip_tagging': True
                }]
                pipeline_stats['step5_cannot_determine'] = len(weak_profiles)
                forced_clusters = cannot_determine_cluster
            
            return self._finalize_graduated_results(strong_clusters, forced_clusters, pipeline_stats)
            
        except Exception as e:
            self.logger.error(f"❌ Error in KMeans fallback: {e}")
            return strong_clusters  # Au minimum retourner les clusters forts
    
    def _finalize_graduated_results(self, *cluster_groups, pipeline_stats: Dict = None, lda_model_info: Dict = None) -> List[Dict[str, Any]]:
        """
        Finalise les résultats de la pipeline graduée avec logging détaillé.
        
        Args:
            *cluster_groups: Groupes de clusters à combiner
            pipeline_stats: Statistiques de la pipeline
            lda_model_info: Informations LDA pour le tagging (topics et mots)
            
        Returns:
            Liste finale de tous les clusters avec informations LDA
        """
        # Combiner tous les groupes de clusters
        final_clusters = []
        for group in cluster_groups:
            if isinstance(group, list):
                final_clusters.extend(group)
        
        # Ajouter les informations LDA à chaque cluster pour le tagging
        if lda_model_info and 'topic_words' in lda_model_info:
            self.logger.info(f"🎯 Adding LDA topic information to {len(final_clusters)} clusters")
            for cluster in final_clusters:
                cluster['lda_topics'] = lda_model_info['topic_words']
                cluster['lda_n_topics'] = lda_model_info.get('n_topics', 0)
                self.logger.debug(f"  Added {len(lda_model_info['topic_words'])} LDA topics to cluster (size={cluster.get('size', 0)})")
        else:
            self.logger.warning("⚠️ No LDA model info available for tagging enhancement")
        
        # Tri par robustesse puis par taille
        robustness_order = {'strong': 1, 'thematic': 2, 'forced': 3, 'cannot_determine': 4}
        final_clusters.sort(key=lambda x: (robustness_order.get(x.get('robustness_level', 'unknown'), 5), -x.get('size', 0)))
        
        # Logging détaillé des résultats
        total_profiles = sum(c.get('size', 0) for c in final_clusters)
        
        self.logger.info("🎯 GRADUATED PIPELINE COMPLETE:")
        self.logger.info(f"   📊 Total clusters: {len(final_clusters)}")
        self.logger.info(f"   👥 Total profiles: {total_profiles}")
        
        if pipeline_stats:
            self.logger.info("📈 PIPELINE BREAKDOWN:")
            self.logger.info(f"   🟢 Step 1 (Strong HDBSCAN): {pipeline_stats.get('step1_strong_clusters', 0)} clusters")
            self.logger.info(f"   🟡 Step 3 (Thematic LDA): {pipeline_stats.get('step3_thematic_clusters', 0)} clusters")
            self.logger.info(f"   🟠 Step 4 (Forced KMeans): {pipeline_stats.get('step4_forced_clusters', 0)} clusters")
            self.logger.info(f"   🔴 Step 5 (Cannot Determine): {pipeline_stats.get('step5_cannot_determine', 0)} profiles")
            self.logger.info(f"   📚 LDA Topics Generated: {pipeline_stats.get('step2_lda_topics', 0)}")
        
        # Détail par cluster
        for i, cluster in enumerate(final_clusters):
            robustness = cluster.get('robustness_tag', '❓ Unknown')
            size = cluster.get('size', 0)
            cohesion = cluster.get('cohesion', 0.0)
            skip_tag = cluster.get('skip_tagging', False)
            has_lda = 'lda_topics' in cluster and cluster['lda_topics']
            skip_str = " (SKIP TAGGING)" if skip_tag else ""
            lda_str = " | LDA Topics Available" if has_lda else ""
            self.logger.info(f"   - Cluster {i+1}: {robustness} | Size: {size} | Cohesion: {cohesion:.3f}{skip_str}{lda_str}")
        
        return final_clusters
    
    def _calculate_optimal_k_from_topics(self, lda_topic_vectors: List[List[float]], 
                                       n_topics: int, 
                                       n_profiles: int,
                                       similarity_threshold: float = 0.8) -> int:
        """
        Calcule k optimal en fusionnant les topics LDA sémantiquement similaires.
        
        Args:
            lda_topic_vectors: Vecteurs de distribution des topics LDA
            n_topics: Nombre initial de topics LDA
            n_profiles: Nombre de profils à clusteriser
            similarity_threshold: Seuil de similarité cosinus pour fusionner les topics (défaut: 0.8)
            
        Returns:
            k optimal après fusion des topics similaires
        """
        try:
            if not lda_topic_vectors or n_topics <= 1:
                # Fallback conservateur
                return max(2, min(8, n_profiles // 3))
            
            self.logger.info(f"🔍 Analyzing semantic similarity between {n_topics} LDA topics")
            
            # Extraire les centroids des topics depuis les vecteurs LDA
            # Chaque vecteur LDA est une distribution sur les topics
            # On transpose pour avoir les topics en lignes
            topic_vectors_array = np.array(lda_topic_vectors)
            if topic_vectors_array.shape[1] != n_topics:
                self.logger.warning(f"⚠️ Topic vectors dimension mismatch: expected {n_topics}, got {topic_vectors_array.shape[1]}")
                return max(2, min(n_topics, n_profiles // 2))
            
            # Calculer les centroids de chaque topic (moyenne des distributions)
            topic_centroids = []
            for topic_idx in range(n_topics):
                # Extraire les valeurs de ce topic pour tous les profils
                topic_values = topic_vectors_array[:, topic_idx]
                # Créer un vecteur représentatif du topic (utiliser la distribution moyenne)
                topic_centroid = np.mean(topic_vectors_array[topic_values > np.mean(topic_values)], axis=0)
                if len(topic_centroid) == 0 or np.allclose(topic_centroid, 0):
                    # Fallback: utiliser la distribution moyenne globale pondérée par ce topic
                    weights = topic_values / (np.sum(topic_values) + 1e-8)
                    topic_centroid = np.average(topic_vectors_array, axis=0, weights=weights)
                topic_centroids.append(topic_centroid)
            
            # Calculer la matrice de similarité cosinus entre les topics
            similarity_matrix = np.zeros((n_topics, n_topics))
            for i in range(n_topics):
                for j in range(i + 1, n_topics):
                    similarity = self._calculate_cosine_similarity(
                        topic_centroids[i].tolist(), 
                        topic_centroids[j].tolist()
                    )
                    similarity_matrix[i, j] = similarity
                    similarity_matrix[j, i] = similarity
            
            # Identifier les paires de topics similaires
            similar_pairs = []
            for i in range(n_topics):
                for j in range(i + 1, n_topics):
                    if similarity_matrix[i, j] >= similarity_threshold:
                        similar_pairs.append((i, j, similarity_matrix[i, j]))
                        self.logger.info(f"🔗 Topics {i} and {j} are similar (cosine_sim={similarity_matrix[i, j]:.3f})")
            
            # Fusionner les topics similaires en groupes
            topic_groups = list(range(n_topics))  # Initialement chaque topic est dans son propre groupe
            
            for topic1, topic2, sim_score in similar_pairs:
                # Fusionner les groupes contenant topic1 et topic2
                group1 = topic_groups[topic1]
                group2 = topic_groups[topic2]
                if group1 != group2:
                    # Remplacer toutes les occurrences de group2 par group1
                    new_group = min(group1, group2)
                    old_group = max(group1, group2)
                    for k in range(len(topic_groups)):
                        if topic_groups[k] == old_group:
                            topic_groups[k] = new_group
            
            # Compter le nombre de groupes uniques (= k optimal)
            unique_groups = len(set(topic_groups))
            reduction_ratio = (n_topics - unique_groups) / n_topics if n_topics > 0 else 0
            
            # Contraintes de bon sens
            optimal_k = max(2, min(unique_groups, n_profiles // 2))  # Au moins 2, max la moitié des profils
            
            self.logger.info(f"✅ Topic similarity analysis complete:")
            self.logger.info(f"   📊 Original topics: {n_topics}")
            self.logger.info(f"   🔗 Similar pairs found: {len(similar_pairs)}")
            self.logger.info(f"   📉 Semantic groups: {unique_groups}")
            self.logger.info(f"   🎯 Optimal k: {optimal_k} (reduction: {reduction_ratio:.1%})")
            
            return optimal_k
            
        except Exception as e:
            self.logger.error(f"❌ Error calculating optimal k from topics: {e}")
            # Fallback conservateur en cas d'erreur
            return max(2, min(n_topics or 4, n_profiles // 3))
    
    def _apply_kmeans_fallback_with_k(self, strong_clusters: List[Dict], weak_profiles: List[Any], 
                                    weak_embeddings: List[List[float]], pipeline_stats: Dict, k: int) -> List[Dict[str, Any]]:
        """
        Applique directement KMeans comme fallback avec un k spécifié.
        
        Args:
            strong_clusters: Clusters forts déjà identifiés
            weak_profiles: Profils faibles à traiter
            weak_embeddings: Embeddings des profils faibles
            pipeline_stats: Statistiques de la pipeline
            k: Nombre de clusters à forcer
            
        Returns:
            Liste complète des clusters finaux
        """
        try:
            self.logger.info(f"🔄 FALLBACK: Applying KMeans directly (k={k}) on {len(weak_profiles)} profiles")
            
            forced_clusters = self._apply_kmeans_forced_clustering(weak_embeddings, weak_profiles, k)
            
            # Marquer comme forcé
            for cluster in forced_clusters:
                cluster['robustness_level'] = 'forced'
                cluster['pipeline_step'] = 4
                cluster['robustness_tag'] = '🟠 Forced (LDA Fallback)'
                pipeline_stats['step4_forced_clusters'] += 1
            
            # S'il reste des profils non traités, les mettre en "Cannot determine"
            if not forced_clusters and weak_profiles:
                cannot_determine_cluster = [{
                    'cluster_id': -999,
                    'profiles': weak_profiles,
                    'embedding': weak_embeddings,
                    'size': len(weak_profiles),
                    'cohesion': 0.0,
                    'centroid': self._calculate_cluster_centroid(weak_embeddings) if weak_embeddings else [],
                    'persistence': None,
                    'robustness_level': 'cannot_determine',
                    'pipeline_step': 5,
                    'robustness_tag': '🔴 Cannot Determine',
                    'is_noise': True,
                    'skip_tagging': True
                }]
                pipeline_stats['step5_cannot_determine'] = len(weak_profiles)
                forced_clusters = cannot_determine_cluster
            
            all_final_clusters = strong_clusters + forced_clusters
            return self._finalize_graduated_results(all_final_clusters, [], pipeline_stats)
            
        except Exception as e:
            self.logger.error(f"❌ Error in KMeans fallback with k={k}: {e}")
            # Créer un cluster "Cannot determine" pour tous les profils faibles
            cannot_determine_cluster = [{
                'cluster_id': -999,
                'profiles': weak_profiles,
                'embedding': weak_embeddings,
                'size': len(weak_profiles),
                'cohesion': 0.0,
                'centroid': self._calculate_cluster_centroid(weak_embeddings) if weak_embeddings else [],
                'persistence': None,
                'robustness_level': 'cannot_determine',
                'pipeline_step': 5,
                'robustness_tag': '🔴 Cannot Determine',
                'is_noise': True,
                'skip_tagging': True
            }]
            pipeline_stats['step5_cannot_determine'] = len(weak_profiles)
            all_final_clusters = strong_clusters + cannot_determine_cluster
            return self._finalize_graduated_results(all_final_clusters, [], pipeline_stats)
