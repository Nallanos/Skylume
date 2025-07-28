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
