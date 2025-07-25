#!/usr/bin/env python3
"""
Test rapide pour vérifier le ProfileDeduplicator.
"""

import sys
import os
import logging

# Add the current directory to the path to import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_deduplicator():
    """Test du ProfileDeduplicator avec différents formats de profils."""
    
    try:
        from ai_service.services.semantic_clustering.processors.profile_deduplicator import ProfileDeduplicator
        
        deduplicator = ProfileDeduplicator()
        
        # Test avec des dictionnaires
        dict_profiles = [
            {'handle': 'user1.bsky.social', 'did': 'did:plc:123', 'description': 'Test 1'},
            {'handle': 'user2.bsky.social', 'did': 'did:plc:456', 'description': 'Test 2'},
            {'handle': 'user1.bsky.social', 'did': 'did:plc:123', 'description': 'Test 1 duplicate'},  # Duplicate
            {'handle': 'user3.bsky.social', 'description': 'Test 3 no did'},  # No DID
            {'description': 'Test 4 no handle or did'},  # No identifiers
        ]
        
        logger.info("🧪 Testing with dictionary profiles...")
        unique_dict = deduplicator.deduplicate_profiles(dict_profiles)
        logger.info(f"Dict test: {len(dict_profiles)} → {len(unique_dict)} profiles")
        
        # Test avec des objets simulés
        class MockProfile:
            def __init__(self, handle=None, did=None, description=None):
                self.handle = handle
                self.did = did
                self.description = description
                
        object_profiles = [
            MockProfile('user1.bsky.social', 'did:plc:123', 'Test 1'),
            MockProfile('user2.bsky.social', 'did:plc:456', 'Test 2'),
            MockProfile('user1.bsky.social', 'did:plc:123', 'Test 1 duplicate'),  # Duplicate
            MockProfile('user3.bsky.social', None, 'Test 3 no did'),  # No DID
            MockProfile(None, None, 'Test 4 no identifiers'),  # No identifiers
        ]
        
        logger.info("🧪 Testing with object profiles...")
        unique_objects = deduplicator.deduplicate_profiles(object_profiles)
        logger.info(f"Object test: {len(object_profiles)} → {len(unique_objects)} profiles")
        
        # Test avec profils vides
        logger.info("🧪 Testing with empty profiles...")
        empty_result = deduplicator.deduplicate_profiles([])
        logger.info(f"Empty test: 0 → {len(empty_result)} profiles")
        
        # Test avec profils sans identifiants
        no_id_profiles = [
            {'description': 'Profile without handle or did'},
            {'other_field': 'value'},
            MockProfile(None, None, 'Another profile without IDs')
        ]
        
        logger.info("🧪 Testing with profiles without identifiers...")
        no_id_result = deduplicator.deduplicate_profiles(no_id_profiles)
        logger.info(f"No ID test: {len(no_id_profiles)} → {len(no_id_result)} profiles")
        
        if len(unique_dict) > 0 and len(unique_objects) > 0:
            logger.info("✅ ProfileDeduplicator seems to be working correctly!")
        else:
            logger.error("❌ ProfileDeduplicator might have issues!")
            
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        logger.exception("Full traceback:")

if __name__ == "__main__":
    logger.info("🚀 Testing ProfileDeduplicator...")
    test_deduplicator()
