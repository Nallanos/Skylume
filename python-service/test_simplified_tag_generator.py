#!/usr/bin/env python3
"""
Test the simplified ImprovedTagGenerator to ensure it still works correctly
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'ai_service'))

from ai_service.services.improved_tag_generator import ImprovedTagGenerator

def test_simplified_generator():
    """Test the simplified tag generator functionality"""
    print("Testing Simplified ImprovedTagGenerator...")
    
    # Initialize without embedding model for basic test
    generator = ImprovedTagGenerator()
    
    # Test 1: Basic keyword filtering
    print("\n1. Testing keyword filtering...")
    test_keywords = [
        ("javascript", 0.9),
        ("programming", 0.8),
        ("the", 0.7),  # Should be filtered (stopword)
        ("developer", 0.6),
        ("user", 0.5),  # Should be filtered (domain exclude)
        ("ai", 0.4),
        ("python", 0.3)
    ]
    
    filtered = generator._filter_blacklisted_keywords(test_keywords)
    print(f"Original keywords: {[kw for kw, _ in test_keywords]}")
    print(f"Filtered keywords: {[kw for kw, _ in filtered]}")
    
    # Should filter out "the" and "user"
    expected_filtered = ["javascript", "programming", "developer", "ai", "python"]
    actual_filtered = [kw for kw, _ in filtered]
    
    if actual_filtered == expected_filtered:
        print("✅ Keyword filtering works correctly")
    else:
        print(f"❌ Keyword filtering failed. Expected: {expected_filtered}, Got: {actual_filtered}")
    
    # Test 2: Tag generation
    print("\n2. Testing tag generation...")
    quality_keywords = [
        ("javascript", 0.9),
        ("programming", 0.8),
        ("developer", 0.6),
        ("ai", 0.4)
    ]
    
    tag = generator.generate_tag_from_keywords(quality_keywords)
    print(f"Generated tag: {tag}")
    
    # Should generate clean tag (highest scored keyword cleaned)
    if tag in ["Javascript", "Programming", "Developer", "Ai"]:
        print("✅ Tag generation works correctly")
    else:
        print(f"❌ Tag generation failed. Expected clean keyword, got: {tag}")
    
    # Test 3: Tag validation
    print("\n3. Testing tag validation...")
    good_tags = ["Javascript", "Photography", "Politics", "AI"]
    bad_tags = ["the", "user", "general", "a__b__c"]
    
    for tag in good_tags:
        if generator.validate_tag_quality(tag):
            print(f"✅ {tag} correctly validated as good")
        else:
            print(f"❌ {tag} incorrectly rejected")
    
    for tag in bad_tags:
        if not generator.validate_tag_quality(tag):
            print(f"✅ {tag} correctly rejected")
        else:
            print(f"❌ {tag} incorrectly accepted")
    
    # Test 4: Keyword cleaning
    print("\n4. Testing keyword cleaning...")
    test_cases = [
        ("javascript developer", "Javascript_Developer"),
        ("  ai programming  ", "Ai_Programming"),
        ("python", "Python"),
        ("", "Community")
    ]
    
    for input_kw, expected in test_cases:
        result = generator._clean_keyword(input_kw)
        if result == expected:
            print(f"✅ '{input_kw}' -> '{result}' (correct)")
        else:
            print(f"❌ '{input_kw}' -> '{result}' (expected '{expected}')")
    
    print("\n5. Testing NLTK stopwords integration...")
    # Check if NLTK stopwords are being used
    common_stopwords = ["the", "and", "is", "are", "was", "were", "have", "has"]
    for word in common_stopwords:
        if word in generator.stopwords:
            print(f"✅ '{word}' is in stopwords")
        else:
            print(f"❌ '{word}' missing from stopwords")
    
    print("\n🎯 Simplified tag generator test completed!")

if __name__ == "__main__":
    test_simplified_generator()
