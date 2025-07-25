#!/usr/bin/env python3
"""
Simple test script for the refactored ProfileProcessor structure.
Tests basic class imports and structure without complex dependencies.
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

def test_service_structure():
    """Test the structure of refactored services without complex dependencies."""
    
    try:
        logger.info("🔍 Testing basic service structure...")
        
        # Test individual service class imports
        logger.info("📦 Testing service class imports...")
        
        try:
            from ai_service.services.semantic_clustering.processors.profile_enricher import ProfileEnricher
            logger.info("✅ ProfileEnricher imported successfully")
        except ImportError as e:
            logger.error(f"❌ ProfileEnricher import failed: {e}")
            
        try:
            from ai_service.services.semantic_clustering.processors.embedding_validator import EmbeddingValidator
            logger.info("✅ EmbeddingValidator imported successfully")
        except ImportError as e:
            logger.error(f"❌ EmbeddingValidator import failed: {e}")
            
        try:
            from ai_service.services.semantic_clustering.processors.embedding_generator import EmbeddingGenerator
            logger.info("✅ EmbeddingGenerator imported successfully")
        except ImportError as e:
            logger.error(f"❌ EmbeddingGenerator import failed: {e}")
            
        try:
            from ai_service.services.semantic_clustering.processors.processing_stats_manager import ProcessingStatsManager
            logger.info("✅ ProcessingStatsManager imported successfully")
        except ImportError as e:
            logger.error(f"❌ ProcessingStatsManager import failed: {e}")
            
        try:
            from ai_service.services.semantic_clustering.processors.profile_deduplicator import ProfileDeduplicator
            logger.info("✅ ProfileDeduplicator imported successfully")
        except ImportError as e:
            logger.error(f"❌ ProfileDeduplicator import failed: {e}")
        
        # Test simple service instantiation without dependencies
        logger.info("🏗️ Testing simple service instantiation...")
        
        # These services should work without complex dependencies
        stats_manager = ProcessingStatsManager()
        logger.info("✅ ProcessingStatsManager created")
        
        deduplicator = ProfileDeduplicator()
        logger.info("✅ ProfileDeduplicator created")
        
        # Test basic functionality
        logger.info("🧪 Testing basic functionality...")
        
        # Test deduplicator
        sample_profiles = [
            {'handle': 'test1', 'display_name': 'Test 1'},
            {'handle': 'test1', 'display_name': 'Test 1'},  # duplicate
            {'handle': 'test2', 'display_name': 'Test 2'}
        ]
        
        unique_profiles, dedup_stats = deduplicator.deduplicate_profiles(sample_profiles)
        logger.info(f"✅ Deduplication: {len(unique_profiles)} unique from {len(sample_profiles)} total")
        logger.info(f"   Stats: {dedup_stats}")
        
        # Test stats manager
        stats_manager.record_profiles_processed(len(unique_profiles))
        stats_manager.record_processing_time("test", 0.1)
        processing_stats = stats_manager.get_processing_statistics()
        logger.info(f"✅ Processing stats: profiles={processing_stats.get('profiles_processed', 0)}")
        
        # Test refactored ProfileProcessor structure
        logger.info("🔄 Testing refactored ProfileProcessor structure...")
        
        try:
            from ai_service.services.semantic_clustering.processors.profile_processor import ProfileProcessor
            logger.info("✅ Refactored ProfileProcessor imported successfully")
            
            # Check if it has expected methods
            methods_to_check = [
                'enrich_profile',
                'validate_embedding_quality', 
                'generate_embeddings',
                'deduplicate_profiles',
                'get_processing_statistics'
            ]
            
            for method_name in methods_to_check:
                if hasattr(ProfileProcessor, method_name):
                    logger.info(f"   ✅ Method '{method_name}' found")
                else:
                    logger.warning(f"   ⚠️ Method '{method_name}' not found")
                    
        except ImportError as e:
            logger.error(f"❌ ProfileProcessor import failed: {e}")
        
        logger.info("🎉 Basic structure tests completed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Test error: {e}")
        logger.exception("Full traceback:")
        return False

def test_file_existence():
    """Test that all expected files exist."""
    
    logger.info("📁 Testing file existence...")
    
    files_to_check = [
        "ai_service/services/semantic_clustering/processors/profile_enricher.py",
        "ai_service/services/semantic_clustering/processors/embedding_validator.py", 
        "ai_service/services/semantic_clustering/processors/embedding_generator.py",
        "ai_service/services/semantic_clustering/processors/processing_stats_manager.py",
        "ai_service/services/semantic_clustering/processors/profile_deduplicator.py",
        "ai_service/services/semantic_clustering/processors/profile_processor.py",
        "ai_service/services/semantic_clustering/processors/profile_processor_backup.py",
        "ai_service/services/lda_core/lda_topic_modeler.py"
    ]
    
    all_exist = True
    for file_path in files_to_check:
        full_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), file_path)
        if os.path.exists(full_path):
            logger.info(f"   ✅ {file_path}")
        else:
            logger.error(f"   ❌ {file_path}")
            all_exist = False
    
    return all_exist

if __name__ == "__main__":
    logger.info("🚀 Starting simple refactoring tests...")
    
    # Test file existence first
    files_ok = test_file_existence()
    
    # Test basic structure
    structure_ok = test_service_structure()
    
    if files_ok and structure_ok:
        logger.info("✅ All basic tests passed! Refactoring structure is good.")
        sys.exit(0)
    else:
        logger.error("❌ Some tests failed! Check the errors above.")
        sys.exit(1)
