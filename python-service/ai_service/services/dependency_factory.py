"""
Centralized dependency factory for MainOrchestrator.

This module provides robust instantiation of all dependencies with fallback mechanisms,
following the dependency injection pattern for better testability and maintainability.
"""

import logging
import os
from typing import Dict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.models.interfaces.clustering_model import ClusteringModel
from ai_service.models.interfaces.tag_generator import TagGenerator
from ai_service.utils.text_cleaner import TextCleaner
from ai_service.services.semantic_clustering.processors.text_cleaner import TextCleaner as NewTextCleaner
from ai_service.models.transformer_embedder import TransformerEmbedder
from ai_service.services.taggers.keybert_tagger import KeyBERTTagger
from ai_service.services.clustering.hdbscan_clusterer import HDBSCANClusterer
from ai_service.services.taggers.improved_tag_generator import ImprovedTagGenerator
from ai_service.services.semantic_clustering.clustering.enhanced_clustering_fallback import EnhancedClusteringFallback
from ai_service.services.semantic_clustering.clustering.profile_clusterer import ProfileClusterer
from ai_service.services.semantic_clustering.processors.profile_processor import ProfileProcessor
# Import modular semantic clustering services
from ai_service.services.semantic_clustering import (
    MemoryManager,
    SemanticKeywordExtractor,
    KeywordClusterer,
    CoherenceValidator,
    TagGeneratorService,
    MultiScaleOptimizer,
    TagValidator
)

# Import new specialized services
from ai_service.services.semantic_clustering.processors.profile_enricher import ProfileEnricher
from ai_service.services.semantic_clustering.processors.embedding_validator import EmbeddingValidator
from ai_service.services.semantic_clustering.processors.embedding_generator import EmbeddingGenerator
from ai_service.services.semantic_clustering.processors.processing_stats_manager import ProcessingStatsManager
from ai_service.services.semantic_clustering.processors.profile_deduplicator import ProfileDeduplicator

# Import AccountService for profile enrichment
try:
    from bluesky.api import AccountService
    from atproto import Client
    ACCOUNT_SERVICE_AVAILABLE = True
except ImportError:
    AccountService = None
    Client = None
    ACCOUNT_SERVICE_AVAILABLE = False

# Import AccountService for profile enrichment
try:
    from bluesky.api import AccountService
    from atproto import Client
    ACCOUNT_SERVICE_AVAILABLE = True
except ImportError:
    AccountService = None
    Client = None
    ACCOUNT_SERVICE_AVAILABLE = False


class DependencyFactory:

    @staticmethod
    def get_lda_topic_modeler(logger = None):
        """
        Get an instance of the LDATopicModeler.
        Args:
            logger: Optional logger to use
        Returns:
            LDATopicModeler instance
        """
        try:
            from ai_service.services.lda_core.lda_topic_modeler import LDATopicModeler
            return LDATopicModeler(logger=logger or DependencyFactory._logger)
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize LDATopicModeler: {e}")
            raise RuntimeError(f"Failed to initialize LDATopicModeler: {e}")
    """
    Central factory for all dependencies used in MainOrchestrator.
    
    Provides robust instantiation with fallback mechanisms and error handling.
    Each method ensures a functional instance is returned or raises an explicit exception.
    """
    
    _logger = logging.getLogger(__name__)
    
    # Cache for singleton instances (optional)
    _embedding_model_cache: EmbeddingModel = None
    _clusterer_cache: ClusteringModel = None
    _tag_generator_cache: TagGenerator = None
    _text_cleaner_cache: NewTextCleaner = None
    
    @staticmethod
    def get_embedding_model(use_cache: bool = True) -> EmbeddingModel:
        """
        Get embedding model with fallback mechanism.
        
        Args:
            use_cache: Whether to use cached instance
            
        Returns:
            EmbeddingModel instance
            
        Raises:
            RuntimeError: If all instantiation attempts fail
        """
        if use_cache and DependencyFactory._embedding_model_cache:
            return DependencyFactory._embedding_model_cache
            
        try:
            DependencyFactory._logger.info("📥 Loading embedding model...")
            primary_model = os.getenv("EMBEDDING_MODEL_PRIMARY", "all-mpnet-base-v2")
            DependencyFactory._logger.info(f"🔧 Using embedding model from environment: {primary_model}")
            model = TransformerEmbedder(primary_model)
            DependencyFactory._logger.info(f"✅ Embedding model loaded successfully: {primary_model}")
            
            if use_cache:
                DependencyFactory._embedding_model_cache = model
            return model
            
        except Exception as e:
            DependencyFactory._logger.warning(f"⚠️ Primary embedding model failed: {e}")
            
            # Fallback: Try a smaller model
            try:
                DependencyFactory._logger.info("🔄 Trying fallback embedding model...")
                fallback_model = os.getenv("EMBEDDING_MODEL_FALLBACK", "all-MiniLM-L6-v2")
                DependencyFactory._logger.info(f"🔧 Using fallback embedding model: {fallback_model}")
                model = TransformerEmbedder(fallback_model)
                DependencyFactory._logger.info(f"✅ Fallback embedding model loaded successfully: {fallback_model}")
                
                if use_cache:
                    DependencyFactory._embedding_model_cache = model
                return model
                
            except Exception as fallback_e:
                DependencyFactory._logger.error(f"❌ All embedding model attempts failed. Primary: {e}, Fallback: {fallback_e}")
                raise RuntimeError(f"Failed to initialize embedding model: {e}")
    
    @staticmethod
    def get_clusterer(use_cache: bool = True) -> ClusteringModel:
        """
        Get clustering model with fallback mechanism.
        
        Args:
            use_cache: Whether to use cached instance
            
        Returns:
            ClusteringModel instance
            
        Raises:
            RuntimeError: If all instantiation attempts fail
        """
        if use_cache and DependencyFactory._clusterer_cache:
            return DependencyFactory._clusterer_cache
            
        try:
            DependencyFactory._logger.info("📥 Loading clusterer...")
            clusterer = HDBSCANClusterer(
                min_cluster_size=4, 
                metric="cosine", 
                cluster_selection_method="leaf"
            )
            DependencyFactory._logger.info("✅ Clusterer loaded successfully with min_cluster_size=4")
            
            if use_cache:
                DependencyFactory._clusterer_cache = clusterer
            return clusterer
            
        except Exception as e:
            DependencyFactory._logger.warning(f"⚠️ Primary clusterer failed: {e}")
            
            # Fallback: Try with different parameters
            try:
                DependencyFactory._logger.info("🔄 Trying fallback clusterer...")
                clusterer = HDBSCANClusterer(
                    min_cluster_size=2, 
                    metric="euclidean", 
                    cluster_selection_method="eom"
                )
                DependencyFactory._logger.info("✅ Fallback clusterer loaded successfully")
                
                if use_cache:
                    DependencyFactory._clusterer_cache = clusterer
                return clusterer
                
            except Exception as fallback_e:
                DependencyFactory._logger.error(f"❌ All clusterer attempts failed. Primary: {e}, Fallback: {fallback_e}")
                raise RuntimeError(f"Failed to initialize clusterer: {e}")
    
    @staticmethod
    def get_tag_generator(use_cache: bool = True) -> TagGenerator:
        """
        Get tag generator with fallback mechanism.
        
        Args:
            use_cache: Whether to use cached instance
            
        Returns:
            TagGenerator instance
            
        Raises:
            RuntimeError: If all instantiation attempts fail
        """
        if use_cache and DependencyFactory._tag_generator_cache:
            return DependencyFactory._tag_generator_cache
            
        try:
            DependencyFactory._logger.info("📥 Loading tag generator...")
            generator = KeyBERTTagger()
            DependencyFactory._logger.info("✅ Tag generator loaded successfully")
            
            if use_cache:
                DependencyFactory._tag_generator_cache = generator
            return generator
            
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to load tag generator: {e}")
            raise RuntimeError(f"Failed to initialize tag generator: {e}")
    
    @staticmethod
    def get_text_cleaner(use_cache: bool = True) -> NewTextCleaner:
        """
        Get text cleaner utility.
        
        Args:
            use_cache: Whether to use cached instance
            
        Returns:
            NewTextCleaner instance with semantic filtering
        """
        if use_cache and DependencyFactory._text_cleaner_cache:
            return DependencyFactory._text_cleaner_cache
            
        cleaner = NewTextCleaner()
        
        if use_cache:
            DependencyFactory._text_cleaner_cache = cleaner
        return cleaner
    
    @staticmethod
    def get_improved_tag_generator() -> ImprovedTagGenerator:
        """
        Get improved tag generator instance.
        
        Returns:
            ImprovedTagGenerator instance
        """
        try:
            return ImprovedTagGenerator()
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize improved tag generator: {e}")
            raise RuntimeError(f"Failed to initialize improved tag generator: {e}")
    
    @staticmethod
    def get_memory_manager(config: Dict = None) -> MemoryManager:
        """
        Get memory manager with configuration.
        
        Args:
            config: Configuration dictionary
            
        Returns:
            MemoryManager instance
        """
        config = config or {}
        return MemoryManager(
            memory_threshold_mb=config.get('memory_threshold_mb', 2048),
            gc_interval=config.get('gc_interval', 100)
        )
    
    @staticmethod
    def get_fallback_handler(embedding_model: EmbeddingModel) -> EnhancedClusteringFallback:
        """
        Get enhanced clustering fallback handler.
        
        Args:
            embedding_model: Embedding model instance
            
        Returns:
            EnhancedClusteringFallback instance
        """
        try:
            # Initialize KeyBERT tagger for enhanced text extraction
            keybert_tagger = None
            try:
                keybert_tagger = KeyBERTTagger(embedding_model=embedding_model)
                DependencyFactory._logger.info("✅ KeyBERT tagger initialized for fallback handler")
            except Exception as e:
                DependencyFactory._logger.warning(f"⚠️ KeyBERT tagger initialization failed: {e}")
            
            return EnhancedClusteringFallback(embedding_model, keybert_tagger=keybert_tagger)
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize fallback handler: {e}")
            raise RuntimeError(f"Failed to initialize fallback handler: {e}")
    
    @staticmethod
    def get_profile_processor(
        embedding_model: EmbeddingModel,
        text_cleaner: NewTextCleaner,
        memory_manager: MemoryManager,
        account_service
    ) -> ProfileProcessor:
        """
        Get profile processor with explicit dependencies using the new ProfileProcessor.
        
        Args:
            embedding_model: Embedding model instance
            text_cleaner: Optional text cleaner instance (will create new TextCleaner if None)
            memory_manager: Optional memory manager instance
            account_service: Optional AccountService for profile enrichment
            
        Returns:
            ProfileProcessor instance
        """
        try:
            return ProfileProcessor(
                embedding_model=embedding_model,
                text_cleaner=text_cleaner,
                memory_manager=memory_manager,
                account_service=account_service
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize new ProfileProcessor: {e}")
            raise RuntimeError(f"Failed to initialize new ProfileProcessor: {e}")
    
    @staticmethod
    def get_profile_clusterer(
        clusterer: ClusteringModel,
        memory_manager: MemoryManager,
        fallback_handler: EnhancedClusteringFallback,
        embedding_model: EmbeddingModel
    ) -> ProfileClusterer:
        """
        Get profile clusterer with explicit dependencies.
        
        Args:
            clusterer: Clustering model instance
            memory_manager: Memory manager instance
            fallback_handler: Fallback handler instance
            embedding_model: Embedding model instance
            
        Returns:
            ProfileClusterer instance
        """
        try:
            return ProfileClusterer(
                clusterer=clusterer,
                memory_manager=memory_manager,
                fallback_handler=fallback_handler,
                embedding_model=embedding_model
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize profile clusterer: {e}")
            raise RuntimeError(f"Failed to initialize profile clusterer: {e}")
    
    @staticmethod
    def get_semantic_keyword_extractor(
        embedding_model: EmbeddingModel,
        memory_manager: MemoryManager
    ) -> SemanticKeywordExtractor:
        """
        Get semantic keyword extractor with explicit dependencies.
        
        Args:
            embedding_model: Embedding model instance
            memory_manager: Memory manager instance
            
        Returns:
            SemanticKeywordExtractor instance
        """
        try:
            return SemanticKeywordExtractor(
                embedding_model=embedding_model,
                memory_manager=memory_manager
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize keyword extractor: {e}")
            raise RuntimeError(f"Failed to initialize keyword extractor: {e}")
    
    @staticmethod
    def get_keyword_clusterer(
        embedding_model: EmbeddingModel,
        memory_manager: MemoryManager
    ) -> KeywordClusterer:
        """
        Get keyword clusterer with explicit dependencies.
        
        Args:
            embedding_model: Embedding model instance
            memory_manager: Memory manager instance
            
        Returns:
            KeywordClusterer instance
        """
        try:
            return KeywordClusterer(
                embedding_model=embedding_model,
                memory_manager=memory_manager
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize keyword clusterer: {e}")
            raise RuntimeError(f"Failed to initialize keyword clusterer: {e}")
    
    @staticmethod
    def get_coherence_validator(
        embedding_model: EmbeddingModel,
        memory_manager: MemoryManager
    ) -> CoherenceValidator:
        """
        Get coherence validator with explicit dependencies.
        
        Args:
            embedding_model: Embedding model instance
            memory_manager: Memory manager instance
            
        Returns:
            CoherenceValidator instance
        """
        try:
            return CoherenceValidator(
                embedding_model=embedding_model,
                memory_manager=memory_manager
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize coherence validator: {e}")
            raise RuntimeError(f"Failed to initialize coherence validator: {e}")
    
    @staticmethod
    def get_tag_generator_service(
        embedding_model: EmbeddingModel,
        memory_manager: MemoryManager
    ) -> TagGeneratorService:
        """
        Get tag generator service with explicit dependencies.
        
        Args:
            embedding_model: Embedding model instance
            memory_manager: Memory manager instance
            
        Returns:
            TagGeneratorService instance
        """
        try:
            return TagGeneratorService(
                embedding_model=embedding_model,
                memory_manager=memory_manager
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize tag generator service: {e}")
            raise RuntimeError(f"Failed to initialize tag generator service: {e}")
    
    @staticmethod
    def get_multi_scale_optimizer(
        embedding_model: EmbeddingModel,
        memory_manager: MemoryManager
    ) -> MultiScaleOptimizer:
        """
        Get multi-scale optimizer with explicit dependencies.
        
        Args:
            embedding_model: Embedding model instance
            memory_manager: Memory manager instance
            
        Returns:
            MultiScaleOptimizer instance
        """
        try:
            return MultiScaleOptimizer(
                embedding_model=embedding_model,
                memory_manager=memory_manager
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize multi-scale optimizer: {e}")
            raise RuntimeError(f"Failed to initialize multi-scale optimizer: {e}")
    
    @staticmethod
    def get_tag_validator(
        embedding_model: EmbeddingModel,
        memory_manager: MemoryManager
    ) -> TagValidator:
        """
        Get tag validator with explicit dependencies.
        
        Args:
            embedding_model: Embedding model instance
            memory_manager: Memory manager instance
            
        Returns:
            TagValidator instance
        """
        try:
            return TagValidator(
                embedding_model=embedding_model,
                memory_manager=memory_manager
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize tag validator: {e}")
            raise RuntimeError(f"Failed to initialize tag validator: {e}")
    
    @staticmethod
    def clear_cache():
        """Clear all cached instances."""
        DependencyFactory._embedding_model_cache = None
        DependencyFactory._clusterer_cache = None
        DependencyFactory._tag_generator_cache = None
        DependencyFactory._text_cleaner_cache = None
        DependencyFactory._logger.info("🧹 Dependency cache cleared")
    
    @staticmethod
    def create_test_dependencies() -> Dict:
        """
        Create mock dependencies for testing.
        
        Returns:
            Dictionary with mock dependencies
        """
        # This could be expanded for unit testing
        DependencyFactory._logger.info("🧪 Creating test dependencies")
        return {
            "embedding_model": "mock_embedding_model",
            "clusterer": "mock_clusterer",
            "tag_generator": "mock_tag_generator",
            "text_cleaner": "mock_text_cleaner"
        }
    
    @staticmethod
    def get_account_service(handle: str = None, password: str = None):
        """
        Get AccountService instance for profile enrichment.
        
        Args:
            handle: Bluesky handle for authentication (optional)
            password: Bluesky password for authentication (optional)
            
        Returns:
            AccountService instance or None if not available
        """
        if not ACCOUNT_SERVICE_AVAILABLE:
            DependencyFactory._logger.warning("AccountService not available - bluesky.api not imported")
            return None
        
        try:
            client = Client()
            
            # Only login if credentials are provided
            if handle and password:
                client.login(handle, password)
                DependencyFactory._logger.info(f"✅ AccountService initialized with authentication for {handle}")
            else:
                DependencyFactory._logger.info("✅ AccountService initialized without authentication")
            
            return AccountService(client)
            
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize AccountService: {e}")
            return None

    @staticmethod
    def get_profile_enricher(
        memory_manager: MemoryManager,
        account_service=None
    ) -> ProfileEnricher:
        """
        Get profile enricher with explicit dependencies.
        
        Args:
            memory_manager: Memory manager instance
            account_service: Optional AccountService for profile enrichment
            
        Returns:
            ProfileEnricher instance
        """
        try:
            return ProfileEnricher(
                memory_manager=memory_manager,
                account_service=account_service
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize ProfileEnricher: {e}")
            raise RuntimeError(f"Failed to initialize ProfileEnricher: {e}")

    @staticmethod
    def get_embedding_validator(
        memory_manager: MemoryManager,
        embedding_model: EmbeddingModel
    ) -> EmbeddingValidator:
        """
        Get embedding validator with explicit dependencies.
        
        Args:
            memory_manager: Memory manager instance
            embedding_model: Embedding model instance
            
        Returns:
            EmbeddingValidator instance
        """
        try:
            return EmbeddingValidator(
                memory_manager=memory_manager,
                embedding_model=embedding_model
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize EmbeddingValidator: {e}")
            raise RuntimeError(f"Failed to initialize EmbeddingValidator: {e}")

    @staticmethod
    def get_embedding_generator(
        embedding_model: EmbeddingModel,
        memory_manager: MemoryManager
    ) -> EmbeddingGenerator:
        """
        Get embedding generator with explicit dependencies.
        
        Args:
            embedding_model: Embedding model instance
            memory_manager: Memory manager instance
            
        Returns:
            EmbeddingGenerator instance
        """
        try:
            return EmbeddingGenerator(
                embedding_model=embedding_model,
                memory_manager=memory_manager
            )
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize EmbeddingGenerator: {e}")
            raise RuntimeError(f"Failed to initialize EmbeddingGenerator: {e}")

    @staticmethod
    def get_processing_stats_manager() -> ProcessingStatsManager:
        """
        Get processing stats manager instance.
        
        Returns:
            ProcessingStatsManager instance
        """
        try:
            return ProcessingStatsManager()
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize ProcessingStatsManager: {e}")
            raise RuntimeError(f"Failed to initialize ProcessingStatsManager: {e}")

    @staticmethod
    def get_profile_deduplicator() -> ProfileDeduplicator:
        """
        Get profile deduplicator instance.
        
        Returns:
            ProfileDeduplicator instance
        """
        try:
            return ProfileDeduplicator()
        except Exception as e:
            DependencyFactory._logger.error(f"❌ Failed to initialize ProfileDeduplicator: {e}")
            raise RuntimeError(f"Failed to initialize ProfileDeduplicator: {e}")
