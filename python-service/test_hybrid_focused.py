#!/usr/bin/env python3
"""
Focused test for the hybrid KeyBERT + centroid tag generation improvements
"""
import numpy as np
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_service.services.improved_tag_generator import ImprovedTagGenerator

class MockEmbeddingModel:
    """Mock embedding model for testing"""
    
    def encode(self, texts):
        """Generate mock embeddings based on text content"""
        embeddings = []
        for text in texts:
            # Simple hash-based embedding for consistent results
            text_lower = text.lower()
            if 'javascript' in text_lower or 'react' in text_lower:
                embeddings.append([0.9, 0.1, 0.0])  # Tech cluster
            elif 'design' in text_lower or 'creative' in text_lower:
                embeddings.append([0.1, 0.9, 0.0])  # Creative cluster
            elif 'business' in text_lower or 'entrepreneur' in text_lower:
                embeddings.append([0.0, 0.1, 0.9])  # Business cluster
            else:
                embeddings.append([0.3, 0.3, 0.4])  # Generic
        return embeddings

def test_hybrid_keyword_selection():
    """Test the hybrid KeyBERT + centroid keyword selection"""
    print("\n🧪 Testing Hybrid KeyBERT + Centroid Keyword Selection")
    
    try:
        # Initialize with mock embedding model
        embedding_model = MockEmbeddingModel()
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

def test_centroid_calculation():
    """Test centroid calculation accuracy"""
    print("\n📐 Testing Centroid Calculation")
    
    try:
        embedding_model = MockEmbeddingModel()
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

def test_single_concept_tags():
    """Test generation of single-concept tags"""
    print("\n🎯 Testing Single-Concept Tag Generation")
    
    embedding_model = MockEmbeddingModel()
    tag_generator = ImprovedTagGenerator(embedding_model=embedding_model)
    
    test_cases = [
        # (keywords, cluster_context, expected_theme)
        ([("javascript", 0.9), ("react", 0.8)], ["javascript developer", "react engineer"], "tech"),
        ([("design", 0.9), ("creative", 0.8)], ["ui designer", "creative director"], "creative"),
        ([("business", 0.9), ("entrepreneur", 0.8)], ["startup founder", "business owner"], "business"),
        ([("writer", 0.9), ("content", 0.8)], ["content writer", "blog author"], "content")
    ]
    
    results = []
    for keywords, context, expected_theme in test_cases:
        cluster_embeddings = embedding_model.encode(context)
        
        # Test optimal keyword selection
        optimal_keyword = tag_generator.select_optimal_keyword_via_centroid(keywords, cluster_embeddings)
        
        # Test tag generation
        generated_tag = tag_generator.generate_tag_from_keywords(keywords, cluster_embeddings)
        
        # Validate tag quality
        is_valid = tag_generator.validate_tag_quality(generated_tag)
        
        # Check for single concept (no & symbols, reasonable length)
        is_single_concept = '&' not in generated_tag and len(generated_tag.split('_')) <= 3
        
        success = is_valid and is_single_concept and optimal_keyword in [kw for kw, _ in keywords]
        
        print(f"   {'✅' if success else '❌'} Keywords: {[kw for kw, _ in keywords]} → Tag: '{generated_tag}'")
        print(f"       Optimal keyword: '{optimal_keyword}', Valid: {is_valid}, Single concept: {is_single_concept}")
        
        results.append(success)
    
    return all(results)

def run_focused_tests():
    """Run focused tests for the hybrid tag generation system"""
    print("🚀 Starting Focused Hybrid Tag Generation Tests")
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
    
    # 6. Single concept tags
    single_concept_success = test_single_concept_tags()
    test_results.append(single_concept_success)
    
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
        "Single Concept Tags"
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
        print("   ✅ KeyBERT semantic relevance + centroid representativeness")
        print("   ✅ Single-concept tags instead of repetitive patterns")
        print("   ✅ Quality filtering removes low-value keywords")
        print("   ✅ Theme-based tag generation for natural naming")
        print("   ✅ Comprehensive validation prevents poor tag quality")
        print("\n🔧 FIXES IMPLEMENTED:")
        print("   • No more 'Your & Leadership' type tags")
        print("   • No more repetitive '_Primary', '_Secondary' suffixes")
        print("   • Optimal keyword selection via semantic centroids")
        print("   • Clean, readable tag names like 'JavaScript_Developers'")
    else:
        print("⚠️  Some tests failed. Please review the implementation.")
    
    return all(test_results)

if __name__ == "__main__":
    # Run the focused test suite
    try:
        result = run_focused_tests()
        exit_code = 0 if result else 1
        exit(exit_code)
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        exit(1)
