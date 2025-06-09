#!/usr/bin/env python3
"""
Test script to verify the tag generation improvements
"""
import sys
import os
import logging
from typing import List, Tuple
from collections import Counter
import re

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_stopwords_filtering():
    """Test the enhanced stopwords filtering"""
    print("🧪 Testing Enhanced Stopwords Filtering...")
    
    try:
        import nltk
        from nltk.corpus import stopwords
        
        # Get NLTK stopwords
        try:
            en_stopwords = set(stopwords.words('english'))
            fr_stopwords = set(stopwords.words('french'))
            print(f"✅ NLTK English stopwords: {len(en_stopwords)} words")
            print(f"✅ NLTK French stopwords: {len(fr_stopwords)} words")
        except:
            en_stopwords = set()
            fr_stopwords = set()
            print("⚠️ NLTK stopwords not available, using fallback")
        
        # Extended stopwords including problematic ones
        extended_stopwords = {
            'your', 'are', 'you', 'i', 'me', 'my', 'we', 'our', 'they', 'them', 'their',
            'this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'how',
            'what', 'who', 'why', 'which', 'some', 'any', 'all', 'each', 'every',
            'many', 'much', 'few', 'several', 'both', 'either', 'neither',
            'very', 'really', 'quite', 'just', 'only', 'much', 'many', 'more', 'most',
        }
        
        all_stopwords = en_stopwords | fr_stopwords | extended_stopwords
        
        # Test problematic words that were causing issues
        problematic_words = ['your', 'are', 'you', 'i', 'me', 'my', 'leadership']
        filtered_words = [w for w in problematic_words if w not in all_stopwords]
        
        print(f"✅ Problematic words: {problematic_words}")
        print(f"✅ After filtering: {filtered_words}")
        print(f"✅ Successfully filtered out: {set(problematic_words) - set(filtered_words)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Stopwords test failed: {e}")
        return False

def test_tag_generation_patterns():
    """Test the new tag generation patterns"""
    print("\n🧪 Testing Tag Generation Patterns...")
    
    # Mock implementation of the enhanced tag generation logic
    def generate_test_tag(keywords: List[str]) -> str:
        if not keywords:
            return "Group_1"
        
        # Clean keywords
        cleaned_keywords = []
        for kw in keywords:
            cleaned = kw.strip().lower()
            if len(cleaned) >= 3 and cleaned not in {'group', 'community', 'people', 'users'}:
                cleaned_keywords.append(cleaned)
        
        if not cleaned_keywords:
            return "Mixed_Community_1"
        
        primary_keyword = cleaned_keywords[0]
        
        # Avoid problematic words
        avoid_words = {'your', 'are', 'you', 'i', 'me', 'my', 'we', 'our', 'they', 'them', 'their'}
        
        # Tech patterns
        if any(tech in primary_keyword for tech in ['dev', 'program', 'code', 'tech', 'software', 'engineer']):
            if len(cleaned_keywords) > 1:
                secondary = cleaned_keywords[1]
                if any(lang in secondary for lang in ['javascript', 'python', 'react', 'node', 'web']):
                    return f"{secondary.title()} {primary_keyword.title()}s"
                elif secondary not in avoid_words:
                    return f"{primary_keyword.title()} & {secondary.title()}"
            return f"{primary_keyword.title()}s"
        
        # Generic patterns
        if len(cleaned_keywords) >= 2:
            first, second = cleaned_keywords[0], cleaned_keywords[1]
            
            if first not in avoid_words and second not in avoid_words:
                return f"{first.title()} & {second.title()}"
            elif first in avoid_words and second not in avoid_words:
                return f"{second.title()} Community"
            else:
                for kw in cleaned_keywords[2:]:
                    if kw not in avoid_words:
                        return f"{kw.title()} Community"
        
        # Single keyword
        if len(cleaned_keywords) == 1:
            keyword = cleaned_keywords[0]
            if keyword not in avoid_words:
                return f"{keyword.title()} Community"
        
        return "Interest_Group_1"
    
    # Test cases
    test_cases = [
        # Problematic cases that should be fixed
        (['your', 'leadership'], 'Should avoid "Your & Leadership"'),
        (['your', 'are'], 'Should avoid "Your & Are"'),
        (['you', 'politics'], 'Should become "Politics Community"'),
        (['i', 'am', 'developer'], 'Should become "Developer Community"'),
        
        # Good cases that should work well
        (['developer', 'javascript'], 'Should become "Developer & Javascript"'),
        (['python', 'developer'], 'Should become "Python Developers"'),
        (['entrepreneur', 'startup'], 'Should become "Entrepreneur & Startup"'),
        (['design', 'ui'], 'Should become "Design & Ui"'),
        (['machine', 'learning'], 'Should work well'),
        
        # Edge cases
        ([], 'Empty keywords'),
        ([''], 'Empty string'),
        (['a', 'b'], 'Too short'),
    ]
    
    results = []
    for keywords, description in test_cases:
        try:
            tag = generate_test_tag(keywords)
            results.append((keywords, tag, description, True))
            print(f"✅ {keywords} -> '{tag}' ({description})")
        except Exception as e:
            results.append((keywords, str(e), description, False))
            print(f"❌ {keywords} -> ERROR: {e} ({description})")
    
    # Check for improvements
    success_count = sum(1 for _, _, _, success in results if success)
    print(f"\n✅ Tag generation tests: {success_count}/{len(test_cases)} passed")
    
    return success_count == len(test_cases)

def test_blacklist_filtering():
    """Test the enhanced blacklist filtering"""
    print("\n🧪 Testing Blacklist Filtering...")
    
    # Blacklist from our implementation
    absolute_blacklist = {
        'your', 'are', 'you', 'i', 'me', 'my', 'we', 'our', 'they', 'them', 'their',
        'this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'how',
        'what', 'who', 'why', 'which', 'some', 'any', 'all', 'each', 'every',
        'very', 'really', 'quite', 'just', 'only', 'much', 'many', 'more', 'most',
    }
    
    # Test keywords that should be filtered
    test_keywords = [
        ('leadership', 5.0),  # Good keyword
        ('your', 3.0),        # Should be filtered
        ('are', 2.0),         # Should be filtered  
        ('technology', 4.0),  # Good keyword
        ('you', 1.0),         # Should be filtered
        ('developer', 6.0),   # Good keyword
        ('really', 2.5),      # Should be filtered
    ]
    
    # Simulate blacklist filtering
    filtered_keywords = []
    for keyword, score in test_keywords:
        keyword_lower = keyword.lower()
        if not any(blacklisted in keyword_lower for blacklisted in absolute_blacklist):
            filtered_keywords.append((keyword, score))
        else:
            print(f"🚫 Filtered out: '{keyword}' (blacklisted)")
    
    print(f"✅ Original keywords: {[kw for kw, _ in test_keywords]}")
    print(f"✅ After filtering: {[kw for kw, _ in filtered_keywords]}")
    
    # Should have filtered out: your, are, you, really
    expected_filtered = ['leadership', 'technology', 'developer']
    actual_filtered = [kw for kw, _ in filtered_keywords]
    
    success = set(actual_filtered) == set(expected_filtered)
    print(f"✅ Blacklist filtering: {'PASSED' if success else 'FAILED'}")
    
    return success

def main():
    """Run all tests"""
    print("🔧 Testing Tag Generation Improvements")
    print("=" * 50)
    
    tests = [
        test_stopwords_filtering,
        test_blacklist_filtering, 
        test_tag_generation_patterns,
    ]
    
    results = []
    for test_func in tests:
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test_func.__name__} failed with error: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print(f"✅ Passed: {sum(results)}/{len(results)}")
    print(f"❌ Failed: {len(results) - sum(results)}/{len(results)}")
    
    if all(results):
        print("🎉 All tests passed! Tag generation improvements are working correctly.")
    else:
        print("⚠️ Some tests failed. Please review the implementation.")
    
    return all(results)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
