#!/usr/bin/env python3
"""
Complete integration test for the refactored semantic clustering system.
Tests the full pipeline with all modular services.
"""

import sys
import os
import logging
from typing import List, Dict, Any

# Add the python-service directory to path
sys.path.insert(0, '/workspaces/Bluesky-copilot/python-service')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_imports():
    """Test all imports are working correctly."""
    logger.info("🔍 Testing imports...")
    
    try:
        # Test main TagService import
        from ai_service.services.tag_service import TagService
        logger.info("✅ TagService imported successfully")
        
        # Test semantic clustering package imports
        from ai_service.services.semantic_clustering import (
            MemoryManager,
            ProfileProcessor,
            ProfileClusterer,
            SemanticKeywordExtractor,
            KeywordClusterer,
            CoherenceValidator,
            TagGeneratorService,
            MultiScaleOptimizer,
            TagValidator
        )
        logger.info("✅ All semantic clustering services imported successfully")
        
        return True
        
    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error during import: {e}")
        return False

def test_service_initialization():
    """Test that all services can be initialized correctly."""
    logger.info("🔧 Testing service initialization...")
    
    try:
        from ai_service.services.tag_service import TagService
        
        # Initialize TagService with test parameters
        config = {
            'model_name': 'sentence-transformers/all-MiniLM-L6-v2',
            'cache_dir': '/tmp/test_cache',
            'memory_threshold_mb': 1024,
            'gc_interval': 50
        }
        
        tag_service = TagService(config)
        logger.info("✅ TagService initialized successfully")
        
        # Check that all internal services are initialized
        assert hasattr(tag_service, 'memory_manager'), "MemoryManager not initialized"
        assert hasattr(tag_service, 'profile_processor'), "ProfileProcessor not initialized"
        assert hasattr(tag_service, 'profile_clusterer'), "ProfileClusterer not initialized"
        assert hasattr(tag_service, 'keyword_extractor'), "KeywordExtractor not initialized"
        assert hasattr(tag_service, 'keyword_clusterer'), "KeywordClusterer not initialized"
        assert hasattr(tag_service, 'coherence_validator'), "CoherenceValidator not initialized"
        assert hasattr(tag_service, 'tag_generator'), "TagGenerator not initialized"
        assert hasattr(tag_service, 'optimizer'), "MultiScaleOptimizer not initialized"
        assert hasattr(tag_service, 'tag_validator'), "TagValidator not initialized"
        
        logger.info("✅ All internal services initialized correctly")
        
        return tag_service
        
    except Exception as e:
        logger.error(f"❌ Service initialization error: {e}")
        return None

def test_memory_manager_functionality():
    """Test MemoryManager functionality."""
    logger.info("💾 Testing MemoryManager functionality...")
    
    try:
        from ai_service.services.semantic_clustering import MemoryManager
        
        # Initialize with test parameters
        memory_manager = MemoryManager(memory_threshold_mb=1024, gc_interval=10)
        
        # Test memory checking
        memory_stats = memory_manager.check_memory_usage()
        assert 'current_mb' in memory_stats
        assert 'percent' in memory_stats
        assert 'threshold_mb' in memory_stats
        logger.info(f"✅ Memory check working: {memory_stats['current_mb']:.1f}MB")
        
        # Test memory management
        cleanup_performed = memory_manager.manage_memory()
        logger.info(f"✅ Memory management: cleanup={'performed' if cleanup_performed else 'not needed'}")
        
        # Test memory summary
        summary = memory_manager.get_memory_summary()
        assert 'usage_percent' in summary
        assert 'is_critical' in summary
        logger.info(f"✅ Memory summary: {summary['usage_percent']:.1f}% usage")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ MemoryManager test error: {e}")
        return False

def test_profile_processing():
    """Test ProfileProcessor functionality with sample data."""
    logger.info("📝 Testing ProfileProcessor functionality...")
    
    try:
        from ai_service.services.semantic_clustering import MemoryManager, ProfileProcessor
        
        # Initialize dependencies
        memory_manager = MemoryManager()
        
        # Mock embedding model for testing
        class MockEmbeddingModel:
            def encode(self, texts, **kwargs):
                import numpy as np
                # Return dummy embeddings with consistent dimensions
                return np.random.rand(len(texts), 384)
        
        embedding_model = MockEmbeddingModel()
        
        # Initialize ProfileProcessor
        processor = ProfileProcessor(embedding_model, memory_manager)
        
        # Test data
        profiles = [
            {
                'display_name': 'John Doe',
                'description': 'Software engineer passionate about AI and machine learning',
                'handle': '@johndoe'
            },
            {
                'display_name': 'Jane Smith',
                'description': 'Data scientist working on NLP and deep learning projects',
                'handle': '@janesmith'
            },
            {
                'display_name': 'Bob Wilson',
                'description': 'Tech entrepreneur building the next generation of web apps',
                'handle': '@bobwilson'
            }
        ]
        
        # Test profile processing
        result = processor.process_profiles(profiles)
        
        assert 'texts' in result
        assert 'embeddings' in result
        assert 'metadata' in result
        assert len(result['texts']) == len(profiles)
        assert result['embeddings'].shape[0] == len(profiles)
        
        logger.info(f"✅ Processed {len(profiles)} profiles successfully")
        logger.info(f"✅ Generated embeddings shape: {result['embeddings'].shape}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ ProfileProcessor test error: {e}")
        return False

def test_tag_generation_pipeline():
    """Test the complete tag generation pipeline with sample data."""
    logger.info("🏭 Testing complete tag generation pipeline...")
    
    try:
        # Sample profile data
        profiles = [
            {
                'did': 'did:plc:user1',
                'display_name': 'Alice Johnson',
                'description': 'Machine learning engineer working on computer vision and neural networks. Love hiking and photography.',
                'handle': '@alice.eng'
            },
            {
                'did': 'did:plc:user2', 
                'display_name': 'Bob Chen',
                'description': 'Full-stack developer building React apps and Node.js backends. Coffee enthusiast and gamer.',
                'handle': '@bobchen'
            },
            {
                'did': 'did:plc:user3',
                'display_name': 'Carol Smith',
                'description': 'Data scientist specializing in NLP and time series analysis. Runner and book lover.',
                'handle': '@carol.data'
            },
            {
                'did': 'did:plc:user4',
                'display_name': 'David Wilson',
                'description': 'DevOps engineer passionate about Kubernetes and cloud infrastructure. Mountain biking on weekends.',
                'handle': '@davidops'
            },
            {
                'did': 'did:plc:user5',
                'display_name': 'Eva Garcia',
                'description': 'Product manager coordinating between engineering and design teams. Yoga practitioner and traveler.',
                'handle': '@eva.pm'
            }
        ]
        
        # Initialize the tag service
        config = {
            'model_name': 'sentence-transformers/all-MiniLM-L6-v2',
            'cache_dir': '/tmp/test_cache',
            'memory_threshold_mb': 1024,
            'gc_interval': 50
        }
        
        tag_service = test_service_initialization()
        if not tag_service:
            return False
        
        # Run the complete pipeline
        logger.info("🚀 Running complete tag generation pipeline...")
        
        results = tag_service.generate_semantic_tags(
            profiles=profiles,
            target_clusters=3,
            min_cluster_size=2,
            coherence_threshold=0.5,
            max_tags_per_cluster=5
        )
        
        # Validate results
        assert 'clusters' in results
        assert 'tags' in results
        assert 'metadata' in results
        
        logger.info(f"✅ Pipeline completed successfully!")
        logger.info(f"✅ Generated {len(results['clusters'])} clusters")
        logger.info(f"✅ Generated {len(results['tags'])} tags")
        
        # Log some sample results
        for i, cluster in enumerate(results['clusters'][:3]):  # Show first 3 clusters
            logger.info(f"📊 Cluster {i}: {len(cluster['profiles'])} profiles")
            if cluster['tags']:
                logger.info(f"   Tags: {', '.join(cluster['tags'][:3])}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Pipeline test error: {e}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return False

def run_all_tests():
    """Run all integration tests."""
    logger.info("🧪 Starting complete integration test suite...")
    
    test_results = {
        'imports': test_imports(),
        'initialization': test_service_initialization() is not None,
        'memory_manager': test_memory_manager_functionality(),
        'profile_processing': test_profile_processing(),
        'full_pipeline': test_tag_generation_pipeline()
    }
    
    # Summary
    logger.info("\n" + "="*50)
    logger.info("📋 TEST RESULTS SUMMARY")
    logger.info("="*50)
    
    all_passed = True
    for test_name, passed in test_results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        logger.info(f"{test_name.replace('_', ' ').title()}: {status}")
        if not passed:
            all_passed = False
    
    logger.info("="*50)
    if all_passed:
        logger.info("🎉 ALL TESTS PASSED! The refactored system is working correctly.")
    else:
        logger.info("❌ Some tests failed. Please check the errors above.")
    
    return all_passed

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
