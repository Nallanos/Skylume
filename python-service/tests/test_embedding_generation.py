#!/usr/bin/env python3
"""
Test script to verify that embedding generation works without the unsupported parameters.
"""

import sys
import asyncio
from pathlib import Path

# Add the ai_service directory to Python path
sys.path.append(str(Path(__file__).parent / "ai_service"))

from ai_service.services.semantic_clustering.processors.profile_processor import ProfileProcessor

async def test_embedding_generation():
    """Test that embedding generation works correctly without unsupported parameters."""
    print("🧪 Testing embedding generation...")
    
    # Create a processor (without embedding model for now)
    processor = ProfileProcessor()
    
    # Test texts
    test_texts = [
        "I'm a software developer passionate about AI and machine learning",
        "Love cooking, traveling, and photography. Based in Paris.",
        "Entrepreneur focused on sustainable technology solutions"
    ]
    
    print(f"📊 Test texts: {len(test_texts)}")
    
    # Create mock profiles for testing
    mock_profiles = []
    for i, text in enumerate(test_texts):
        mock_profile = {
            'did': f'did:plc:test{i}',
            'handle': f'testuser{i}',
            'description': text,
            'followersCount': 100,
            'postsCount': 50
        }
        mock_profiles.append(mock_profile)
    
    try:
        # Test the process_profiles method (without actual embedding model)
        profiles, embeddings, stats = await processor.process_profiles(mock_profiles)
        
        print(f"✅ Processing completed successfully:")
        print(f"   📊 Profiles: {len(profiles)}")
        print(f"   🧠 Embeddings: {len(embeddings)}")
        print(f"   ⏱️ Time: {stats.get('processing_time', 0):.2f}s")
        print(f"   📈 Pre-filtered: {stats.get('pre_filtered_count', 0)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def main():
    print("🚀 Testing ProfileProcessor without unsupported parameters\n")
    
    success = await test_embedding_generation()
    
    if success:
        print("\n🎉 Test passed! The embedding generation should work now.")
        return 0
    else:
        print("\n⚠️ Test failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    exit(asyncio.run(main()))
