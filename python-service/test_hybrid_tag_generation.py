#!/usr/bin/env python3
"""
Comprehensive test for the hybrid KeyBERT + centroid tag generation approach
"""
import asyncio
import sys
import os
import numpy as np
from typing import List, Dict, Any

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_service.services.improved_tag_generator import ImprovedTagGenerator
from ai_service.services.tag_service import TagService
from ai_service.clients.adonis_api_client import AdonisApiClient
from ai_service.models.transformer_embedder import TransformerEmbedder

def test_hybrid_keyword_selection():
    """Test the hybrid KeyBERT + centroid keyword selection"""
    print("\n🧪 Testing Hybrid KeyBERT + Centroid Keyword Selection")
    
    try:
        # Initialize with embedding model
        embedding_model = TransformerEmbedder()
        tag_generator = ImprovedTagGenerator(embedding_model=embedding_model)
        
        # Test case: JavaScript developers cluster
        keywords = [
            ("javascript", 0.8),
            ("react", 0.7),
            ("frontend", 0.6),
            ("web", 0.5),
            ("developer", 0.4)
        ]
        
        # Simulate cluster embeddings for JavaScript developers
        cluster_texts = [
            "JavaScript developer building React applications",
            "Frontend engineer specializing in web development",
            "Full-stack developer with React and Node.js experience"
        ]
        cluster_embeddings = embedding_model.encode(cluster_texts)
        if isinstance(cluster_embeddings, np.ndarray):
            cluster_embeddings = cluster_embeddings.tolist()
        
        # Test hybrid selection
        optimal_keyword = tag_generator.select_optimal_keyword_via_centroid(keywords, cluster_embeddings)
        print(f"   ✅ Optimal keyword selected: '{optimal_keyword}'")
        
        # Generate tag using hybrid approach
        final_tag = tag_generator.generate_tag_from_keywords(keywords, cluster_embeddings)
        print(f"   ✅ Generated tag: '{final_tag}'")
        
        # Validate tag quality
        is_valid = tag_generator.validate_tag_quality(final_tag)
        print(f"   ✅ Tag quality validation: {is_valid}")
        
        return optimal_keyword, final_tag, is_valid
        
    except Exception as e:
        print(f"   ❌ Hybrid selection test failed: {e}")
        return None, None, False

def test_theme_detection():
    """Test theme detection for different keyword categories"""
    print("\n🎯 Testing Theme Detection")
    
    tag_generator = ImprovedTagGenerator()
    
    test_cases = [
        (["javascript", "react", "programming"], "tech"),
        (["design", "creative", "art"], "creative"),
        (["entrepreneur", "startup", "business"], "business"),
        (["writer", "content", "blog"], "content"),
        (["random", "general", "stuff"], "general")
    ]
    
    results = []
    for keywords, expected_theme in test_cases:
        detected_theme = tag_generator.detect_primary_theme(keywords)
        success = detected_theme == expected_theme
        print(f"   {'✅' if success else '❌'} Keywords {keywords} → Theme: {detected_theme} (expected: {expected_theme})")
        results.append(success)
    
    return all(results)

def test_quality_filtering():
    """Test quality filtering of keywords"""
    print("\n🔍 Testing Quality Filtering")
    
    tag_generator = ImprovedTagGenerator()
    
    # Keywords with various quality levels
    test_keywords = [
        ("javascript", 0.9),  # Good
        ("&", 0.8),          # Bad - special character
        ("you", 0.7),        # Bad - pronoun
        ("programming", 0.6), # Good
        ("group", 0.5),      # Bad - generic
        ("ai", 0.4),         # Good but short - should pass
        ("a", 0.3),          # Bad - too short
        ("design", 0.2)      # Good
    ]
    
    filtered = tag_generator._filter_blacklisted_keywords(test_keywords)
    filtered_keywords = [kw for kw, _ in filtered]
    
    print(f"   Original keywords: {[kw for kw, _ in test_keywords]}")
    print(f"   Filtered keywords: {filtered_keywords}")
    
    # Should keep: javascript, programming, ai, design
    expected_good = {"javascript", "programming", "ai", "design"}
    actual_good = set(filtered_keywords)
    
    success = expected_good.issubset(actual_good)
    print(f"   ✅ Quality filtering: {success}")
    
    return success

def test_tag_validation():
    """Test tag quality validation"""
    print("\n✅ Testing Tag Quality Validation")
    
    tag_generator = ImprovedTagGenerator()
    
    test_cases = [
        ("JavaScript_Developers", True),     # Good tag
        ("React_Community", True),           # Good tag
        ("Your & Leadership", False),        # Bad - contains &
        ("General", False),                  # Bad - generic
        ("Tech_Stack_Web_Frontend_Experts", False),  # Bad - too many underscores
        ("Design_Creators", True),           # Good tag
        ("", False),                         # Bad - empty
        ("AI_Professionals", True)           # Good tag
    ]
    
    results = []
    for tag, expected_valid in test_cases:
        is_valid = tag_generator.validate_tag_quality(tag)
        success = is_valid == expected_valid
        print(f"   {'✅' if success else '❌'} Tag '{tag}' → Valid: {is_valid} (expected: {expected_valid})")
        results.append(success)
    
    return all(results)

async def test_full_integration():
    """Test full integration with TagService using hybrid approach"""
    print("\n🔗 Testing Full Integration with TagService")
    
    try:
        # Mock API client
        api_client = AdonisApiClient("http://localhost:3333")
        
        # Initialize TagService
        tag_service = TagService(api_client)
        
        # Test profile data with clear themes
        test_profiles = [
            {"handle": "developer1.bsky.social", "description": "JavaScript developer building React applications"},
            {"handle": "developer2.bsky.social", "description": "Frontend engineer with TypeScript and Vue.js"},
            {"handle": "developer3.bsky.social", "description": "Full-stack developer using Node.js and React"},
            {"handle": "designer1.bsky.social", "description": "UI/UX designer creating beautiful interfaces"},
            {"handle": "designer2.bsky.social", "description": "Graphic designer specializing in brand identity"},
            {"handle": "business1.bsky.social", "description": "Startup founder and entrepreneur"},
            {"handle": "business2.bsky.social", "description": "Business consultant and strategy advisor"}
        ]
        
        # Generate tags using the improved system
        clusters = await tag_service.generate_tags("test_account", test_profiles)
        
        print(f"   Generated {len(clusters)} clusters:")
        for i, cluster in enumerate(clusters):
            tag = cluster.get('tag', 'Unknown')
            size = cluster.get('size', 0)
            keywords = cluster.get('keywords', [])
            print(f"     Cluster {i+1}: '{tag}' ({size} profiles) - Keywords: {keywords[:3]}")
        
        # Validate results
        has_clusters = len(clusters) > 0
        no_ampersands = all('&' not in cluster.get('tag', '') for cluster in clusters)
        meaningful_names = all(len(cluster.get('tag', '')) > 3 for cluster in clusters)
        
        success = has_clusters and no_ampersands and meaningful_names
        print(f"   ✅ Integration test: {success}")
        
        return success, clusters
        
    except Exception as e:
        print(f"   ❌ Integration test failed: {e}")
        return False, []

def test_centroid_calculation():
    """Test centroid calculation accuracy"""
    print("\n📐 Testing Centroid Calculation")
    
    try:
        embedding_model = TransformerEmbedder()
        tag_generator = ImprovedTagGenerator(embedding_model=embedding_model)
        
        # Test embeddings
        test_embeddings = [
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.0, 0.0, 1.0]
        ]
        
        centroid = tag_generator._calculate_centroid(test_embeddings)
        
        # Expected centroid should be normalized [1/√3, 1/√3, 1/√3]
        expected_value = 1.0 / np.sqrt(3)
        expected_centroid = np.array([expected_value, expected_value, expected_value])
        
        if centroid is not None:
            difference = np.linalg.norm(centroid - expected_centroid)
            success = difference < 0.001  # Small tolerance for floating point
            print(f"   ✅ Centroid calculation: {success}")
            print(f"   Calculated: {centroid}")
            print(f"   Expected: {expected_centroid}")
            return success
        else:
            print("   ❌ Centroid calculation returned None")
            return False
            
    except Exception as e:
        print(f"   ❌ Centroid calculation test failed: {e}")
        return False

async def run_comprehensive_tests():
    """Run all tests for the hybrid tag generation system"""
    print("🚀 Starting Comprehensive Hybrid Tag Generation Tests")
    print("=" * 60)
    
    # Run all tests
    test_results = []
    
    # 1. Hybrid keyword selection
    optimal_kw, final_tag, tag_valid = test_hybrid_keyword_selection()
    test_results.append(all([optimal_kw is not None, final_tag is not None, tag_valid]))
    
    # 2. Theme detection
    theme_success = test_theme_detection()
    test_results.append(theme_success)
    
    # 3. Quality filtering
    filter_success = test_quality_filtering()
    test_results.append(filter_success)
    
    # 4. Tag validation
    validation_success = test_tag_validation()
    test_results.append(validation_success)
    
    # 5. Centroid calculation
    centroid_success = test_centroid_calculation()
    test_results.append(centroid_success)
    
    # 6. Full integration
    integration_success, clusters = await test_full_integration()
    test_results.append(integration_success)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    test_names = [
        "Hybrid Keyword Selection",
        "Theme Detection", 
        "Quality Filtering",
        "Tag Validation",
        "Centroid Calculation",
        "Full Integration"
    ]
    
    passed_tests = 0
    for i, (name, result) in enumerate(zip(test_names, test_results)):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{i+1:2d}. {name:<25} {status}")
        if result:
            passed_tests += 1
    
    print("-" * 60)
    print(f"TOTAL: {passed_tests}/{len(test_results)} tests passed")
    
    if all(test_results):
        print("🎉 ALL TESTS PASSED! Hybrid tag generation system is working correctly.")
        print("\n📈 IMPROVEMENTS ACHIEVED:")
        print("   • KeyBERT semantic relevance + centroid representativeness")
        print("   • Single-concept tags instead of repetitive patterns")
        print("   • Quality filtering removes low-value keywords")
        print("   • Theme-based tag generation for natural naming")
        print("   • Comprehensive validation prevents poor tag quality")
    else:
        print("⚠️  Some tests failed. Please review the implementation.")
    
    return all(test_results)

if __name__ == "__main__":
    # Run the comprehensive test suite
    try:
        result = asyncio.run(run_comprehensive_tests())
        exit_code = 0 if result else 1
        exit(exit_code)
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        exit(1)
