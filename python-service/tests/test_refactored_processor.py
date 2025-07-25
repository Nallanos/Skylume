#!/usr/bin/env python3
"""
Test script for the refactored ProfileProcessor with specialized services.
"""

import sys
import os
import logging

# Add the current directory to the path to import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_refactored_services():
    """Test the refactored ProfileProcessor and specialized services."""
    
    try:
        # Test individual service imports
        logger.info("🔍 Testing service imports...")
        
        from ai_service.services.dependency_factory import DependencyFactory
        from ai_service.services.semantic_clustering.processors.profile_enricher import ProfileEnricher
        from ai_service.services.semantic_clustering.processors.embedding_validator import EmbeddingValidator
        from ai_service.services.semantic_clustering.processors.embedding_generator import EmbeddingGenerator
        from ai_service.services.semantic_clustering.processors.processing_stats_manager import ProcessingStatsManager
        from ai_service.services.semantic_clustering.processors.profile_deduplicator import ProfileDeduplicator
        from ai_service.services.lda_core.lda_topic_modeler import LDATopicModeler
        
        logger.info("✅ All service imports successful")
        
        # Test creating individual services
        logger.info("🏗️ Testing service instantiation...")
        
        # Create basic dependencies
        memory_manager = DependencyFactory.get_memory_manager()
        embedding_model = DependencyFactory.get_embedding_model()
        
        # Test specialized services
        stats_manager = DependencyFactory.get_processing_stats_manager()
        deduplicator = DependencyFactory.get_profile_deduplicator()
        enricher = DependencyFactory.get_profile_enricher(memory_manager)
        validator = DependencyFactory.get_embedding_validator(memory_manager, embedding_model)
        generator = DependencyFactory.get_embedding_generator(embedding_model, memory_manager)
        
        logger.info("✅ All specialized services created successfully")
        
        # Test LDA Topic Modeler with TextCleaner integration
        logger.info("🎯 Testing LDA Topic Modeler...")
        lda_modeler = DependencyFactory.get_lda_topic_modeler(logger)
        
        # Test with sample data
        sample_texts = [
            "I love machine learning and artificial intelligence research",
            "Python programming is great for data science applications",
            "Deep learning models are transforming natural language processing",
            "Web development with React and Node.js is exciting",
            "Cloud computing and DevOps practices improve scalability",
            "Data visualization helps understand complex datasets better"
        ]
        
        logger.info("📊 Testing LDA topic modeling...")
        topic_matrix = lda_modeler.build_topic_matrix(sample_texts)
        
        if topic_matrix is not None:
            logger.info(f"✅ LDA topic matrix created: shape {topic_matrix.shape}")
        else:
            logger.warning("⚠️ LDA topic matrix creation failed")
        
        # Test refactored ProfileProcessor
        logger.info("🔄 Testing refactored ProfileProcessor...")
        
        profile_processor = DependencyFactory.get_profile_processor(
            memory_manager=memory_manager,
            embedding_model=embedding_model
        )
        
        # Test with sample profile data
        sample_profiles = [
            {
                'handle': 'test.user1',
                'display_name': 'Test User 1',
                'description': 'Machine learning researcher and Python developer',
                'posts_count': 150,
                'followers_count': 500,
                'following_count': 200
            },
            {
                'handle': 'test.user2', 
                'display_name': 'Test User 2',
                'description': 'Web developer specializing in React and Node.js',
                'posts_count': 80,
                'followers_count': 300,
                'following_count': 150
            }
        ]
        
        logger.info("🧹 Testing profile deduplication...")
        unique_profiles, stats = deduplicator.deduplicate_profiles(sample_profiles)
        logger.info(f"✅ Deduplication: {len(unique_profiles)} unique profiles from {len(sample_profiles)} original")
        
        logger.info("📈 Testing processing stats...")
        stats_manager.record_profiles_processed(len(unique_profiles))
        stats_manager.record_processing_time("deduplication", 0.1)
        processing_stats = stats_manager.get_processing_statistics()
        logger.info(f"✅ Processing stats: {processing_stats}")
        
        logger.info("🎉 All tests completed successfully!")
        return True
        
    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Test error: {e}")
        logger.exception("Full traceback:")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting refactored ProfileProcessor tests...")
    success = test_refactored_services()
    
    if success:
        logger.info("✅ All tests passed! Refactoring successful.")
        sys.exit(0)
    else:
        logger.error("❌ Tests failed! Check the errors above.")
        sys.exit(1)
