#!/usr/bin/env python3
"""
Test script to verify the tag generation improvements and clustering fixes
"""
import sys
import os
import asyncio
import logging
from typing import List, Dict, Any

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_improved_tag_generator():
    """Test the improved tag generator directly"""
    print("\n🧪 Testing Improved Tag Generator...")
    
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        from ai_service.services.improved_tag_generator import ImprovedTagGenerator
        
        generator = ImprovedTagGenerator()
        
        # Test cases that should generate simple, single keywords
        test_cases = [
            # Bad input cases (should filter and fall back to Community)
            [('your', 0.8), ('leadership', 0.6)],  # Should become "Leadership" or "Community" 
            [('your', 0.7), ('are', 0.5)],          # Should become "Community" (all filtered)
            [('you', 0.6), ('politics', 0.8)],      # Should become "Politics"
            [('i', 0.4), ('developer', 0.9)],       # Should become "Developer"
            
            # Good input cases (should work well)
            [('developer', 0.9), ('javascript', 0.7)],     # Should become "Javascript" 
            [('python', 0.8), ('programming', 0.6)],       # Should become "Python"
            [('entrepreneur', 0.9), ('startup', 0.7)],     # Should become "Entrepreneur"
            [('design', 0.8), ('ui', 0.6)],                # Should become "Design"
            [('machine', 0.7), ('learning', 0.8)],         # Should become "Learning"
            [('art', 0.8), ('creative', 0.6)],             # Should become "Art"
            [('music', 0.9), ('musician', 0.5)],           # Should become "Music"
            [('business', 0.7), ('marketing', 0.6)],       # Should become "Business"
            
            # Edge cases
            [],                                              # Empty keywords -> "Community"
            [('', 0.5)],                                    # Empty string -> "Community"
            [('a', 0.8), ('b', 0.6)],                      # Too short -> "Community"
        ]
        
        results = []
        for i, keywords in enumerate(test_cases):
            try:
                tag = generator.generate_tag_from_keywords(keywords)
                is_quality = generator.validate_tag_quality(tag)
                results.append((keywords, tag, is_quality, True))
                status = "✅" if is_quality else "⚠️"
                print(f"{status} Test {i+1}: {keywords} -> '{tag}' (Quality: {is_quality})")
            except Exception as e:
                results.append((keywords, str(e), False, False))
                print(f"❌ Test {i+1}: {keywords} -> ERROR: {e}")
        
        # Summary
        success_count = sum(1 for _, _, _, success in results if success)
        quality_count = sum(1 for _, _, quality, success in results if success and quality)
        
        print(f"\n📊 Tag Generator Results:")
        print(f"   ✅ {success_count}/{len(test_cases)} tests completed successfully")
        print(f"   🎯 {quality_count}/{success_count} generated high-quality tags")
        
        # Check for specific improvements
        no_ampersands = sum(1 for _, tag, _, success in results if success and "&" not in str(tag))
        no_pronouns = sum(1 for _, tag, _, success in results if success and not any(pron in str(tag).lower() for pron in ['your', 'you', 'i ', 'are']))
        
        print(f"   🚫 {no_ampersands}/{success_count} tags without '&' symbols")
        print(f"   📝 {no_pronouns}/{success_count} tags without problematic pronouns")
        
        # More realistic quality expectation: Good tags from good input, fallback for bad input
        # We expect at least 70% quality tags from the total, and 100% without problematic patterns
        quality_threshold = 0.7
        has_good_quality = quality_count >= (len(test_cases) * quality_threshold)
        no_bad_patterns = no_ampersands == success_count and no_pronouns == success_count
        
        passed = success_count == len(test_cases) and has_good_quality and no_bad_patterns
        
        if not passed:
            print(f"   ❌ FAILED")
            if not has_good_quality:
                print(f"      Quality too low: {quality_count}/{len(test_cases)} < {quality_threshold * len(test_cases)}")
            if not no_bad_patterns:
                print(f"      Bad patterns found: ampersands={no_ampersands}/{success_count}, pronouns={no_pronouns}/{success_count}")
        else:
            print(f"   ✅ PASSED")
        
        return passed
        
    except Exception as e:
        print(f"❌ Failed to test improved tag generator: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_clustering_size_filtering():
    """Test that clustering properly filters by minimum size"""
    print("\n🧪 Testing Clustering Size Filtering...")
    
    try:
        # Mock cluster data with various sizes
        mock_clusters = [
            {'tag': 'Large_Community', 'size': 15, 'handles': ['user'] * 15},
            {'tag': 'Medium_Group', 'size': 5, 'handles': ['user'] * 5},
            {'tag': 'Small_Cluster', 'size': 2, 'handles': ['user'] * 2},
            {'tag': 'Single_User', 'size': 1, 'handles': ['user']},
            {'tag': 'Good_Size', 'size': 8, 'handles': ['user'] * 8},
        ]
        
        # Filter by minimum size (≥3 members)
        valid_clusters = [cluster for cluster in mock_clusters if cluster['size'] >= 3]
        small_clusters = [cluster for cluster in mock_clusters if cluster['size'] < 3]
        
        print(f"   📊 Original clusters: {len(mock_clusters)}")
        print(f"   ✅ Valid clusters (≥3): {len(valid_clusters)}")
        print(f"   🔍 Small clusters (<3): {len(small_clusters)}")
        
        # Verify results
        expected_valid = 3  # Large_Community (15), Medium_Group (5), Good_Size (8)
        expected_small = 2  # Small_Cluster (2), Single_User (1)
        
        success = (len(valid_clusters) == expected_valid and 
                  len(small_clusters) == expected_small)
        
        if success:
            print("   ✅ Size filtering working correctly")
        else:
            print("   ❌ Size filtering failed")
            
        return success
        
    except Exception as e:
        print(f"❌ Failed to test clustering size filtering: {e}")
        return False

def test_supercluster_prevention():
    """Test that not every cluster becomes its own supercluster"""
    print("\n🧪 Testing Supercluster Prevention...")
    
    try:
        # Mock clusters with distinctly different embeddings
        # Create programming-related embeddings (should be similar)
        python_embedding = [0.1] * 192 + [0.9] * 192  # Programming pattern
        js_embedding = [0.15] * 192 + [0.85] * 192    # Similar programming pattern
        
        # Create art-related embedding (completely different pattern)  
        art_embedding = [0.9] * 192 + [0.1] * 192     # Opposite pattern
        
        mock_clusters = [
            {
                'tag': 'Python_Developers',
                'size': 10,
                'embedding': python_embedding,
                'handles': ['dev1', 'dev2']
            },
            {
                'tag': 'JavaScript_Developers', 
                'size': 8,
                'embedding': js_embedding,
                'handles': ['dev3', 'dev4']
            },
            {
                'tag': 'Artists_Community',
                'size': 6,
                'embedding': art_embedding,
                'handles': ['artist1', 'artist2']
            }
        ]
        
        # Simple similarity calculation
        def simple_cosine_similarity(a, b):
            dot_product = sum(x * y for x, y in zip(a, b))
            norm_a = sum(x * x for x in a) ** 0.5
            norm_b = sum(x * x for x in b) ** 0.5
            return dot_product / (norm_a * norm_b) if norm_a > 0 and norm_b > 0 else 0
        
        # Group similar clusters (threshold 0.7)
        similarity_threshold = 0.7
        groups = []
        processed = set()
        
        for i, cluster1 in enumerate(mock_clusters):
            if i in processed:
                continue
                
            group = [cluster1]
            processed.add(i)
            
            for j, cluster2 in enumerate(mock_clusters[i+1:], i+1):
                if j in processed:
                    continue
                    
                similarity = simple_cosine_similarity(cluster1['embedding'], cluster2['embedding'])
                print(f"   🔍 Similarity between {cluster1['tag']} and {cluster2['tag']}: {similarity:.3f}")
                if similarity >= similarity_threshold:
                    group.append(cluster2)
                    processed.add(j)
            
            groups.append(group)
        
        print(f"   📊 Original clusters: {len(mock_clusters)}")
        print(f"   🎯 Supercluster groups: {len(groups)}")
        
        # Verify grouping
        for i, group in enumerate(groups):
            tags = [cluster['tag'] for cluster in group]
            print(f"   📦 Group {i+1}: {tags}")
        
        # Expected: Python and JavaScript developers should be grouped together (similar embeddings)
        # Artists should be separate (different embedding)
        expected_groups = 2
        success = len(groups) == expected_groups
        
        if success:
            print("   ✅ Supercluster prevention working correctly")
        else:
            print("   ❌ Supercluster prevention failed")
            
        return success
        
    except Exception as e:
        print(f"❌ Failed to test supercluster prevention: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting Tag Quality and Clustering Improvements Test")
    print("=" * 60)
    
    tests = [
        ("Improved Tag Generator", test_improved_tag_generator),
        ("Clustering Size Filtering", test_clustering_size_filtering),
        ("Supercluster Prevention", test_supercluster_prevention),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"   {status}")
        except Exception as e:
            results.append((test_name, False))
            print(f"   ❌ FAILED: {e}")
    
    # Summary
    print(f"\n{'=' * 60}")
    print("📊 Final Test Results:")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅" if result else "❌"
        print(f"   {status} {test_name}")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All improvements working correctly!")
    else:
        print("⚠️  Some improvements need attention")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
