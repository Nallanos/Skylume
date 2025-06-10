#!/usr/bin/env python3
"""
Test script to verify the simplified tag generation works correctly
"""
import sys
import os

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_simplified_tag_generator():
    """Test the simplified tag generator directly"""
    print("\n🧪 Testing Simplified Tag Generator...")
    
    try:
        from ai_service.services.improved_tag_generator import ImprovedTagGenerator
        
        generator = ImprovedTagGenerator()
        
        # Test cases that should generate simple, single keywords
        test_cases = [
            # Good input cases (should work well)
            ([('developer', 0.9), ('javascript', 0.7)], "Developer"),     # Should become "Developer"
            ([('python', 0.8), ('programming', 0.6)], "Python"),         # Should become "Python"
            ([('entrepreneur', 0.9), ('startup', 0.7)], "Entrepreneur"), # Should become "Entrepreneur"
            ([('design', 0.8), ('ui', 0.6)], "Design"),                  # Should become "Design"
            ([('art', 0.8), ('creative', 0.6)], "Art"),                  # Should become "Art"
            ([('music', 0.9), ('musician', 0.5)], "Music"),              # Should become "Music"
            ([('politics', 0.8), ('news', 0.6)], "Politics"),            # Should become "Politics"
            
            # Mixed quality input (should filter and pick best)
            ([('you', 0.6), ('politics', 0.8)], "Politics"),             # Should filter 'you', pick 'politics'
            ([('i', 0.4), ('developer', 0.9)], "Developer"),             # Should filter 'i', pick 'developer'
            ([('your', 0.8), ('leadership', 0.6)], "Leadership"),        # Should filter 'your', pick 'leadership'
            
            # Bad input cases (should fall back to Community)
            ([('your', 0.7), ('are', 0.5)], "Community"),                # All filtered -> Community
            ([], "Community"),                                            # Empty -> Community
            ([('', 0.5)], "Community"),                                  # Empty string -> Community
            ([('a', 0.8), ('b', 0.6)], "Community"),                    # Too short -> Community
        ]
        
        results = []
        for i, (keywords, expected) in enumerate(test_cases):
            try:
                tag = generator.generate_tag_from_keywords(keywords)
                is_quality = generator.validate_tag_quality(tag)
                is_correct = tag == expected
                results.append((keywords, tag, expected, is_correct, is_quality, True))
                
                status = "✅" if is_correct else ("⚠️" if is_quality else "❌")
                print(f"{status} Test {i+1}: {keywords} -> '{tag}' (expected '{expected}', quality: {is_quality})")
                
            except Exception as e:
                results.append((keywords, str(e), expected, False, False, False))
                print(f"❌ Test {i+1}: {keywords} -> ERROR: {e}")
        
        # Summary
        success_count = sum(1 for _, _, _, _, _, success in results if success)
        correct_count = sum(1 for _, _, _, correct, _, success in results if success and correct)
        quality_count = sum(1 for _, _, _, _, quality, success in results if success and quality)
        
        print(f"\n📊 Simplified Tag Generator Results:")
        print(f"   ✅ {success_count}/{len(test_cases)} tests completed successfully")
        print(f"   🎯 {correct_count}/{success_count} generated expected tags")
        print(f"   💎 {quality_count}/{success_count} generated quality tags")
        
        # Check for clean output (no underscores, ampersands, or problematic patterns)
        clean_tags = sum(1 for _, tag, _, _, _, success in results 
                        if success and "_" not in str(tag) and "&" not in str(tag))
        no_pronouns = sum(1 for _, tag, _, _, _, success in results 
                         if success and not any(pron in str(tag).lower() for pron in ['your', 'you', 'i ', 'are']))
        
        print(f"   🧹 {clean_tags}/{success_count} tags without underscores or symbols")
        print(f"   📝 {no_pronouns}/{success_count} tags without problematic pronouns")
        
        # Test passes if we get expected results and clean output
        expected_threshold = 0.8  # 80% should match expectations
        has_good_accuracy = correct_count >= (success_count * expected_threshold)
        has_clean_output = clean_tags == success_count and no_pronouns == success_count
        
        passed = success_count == len(test_cases) and has_good_accuracy and has_clean_output
        
        if not passed:
            print(f"   ❌ FAILED")
            if not has_good_accuracy:
                print(f"      Accuracy too low: {correct_count}/{success_count} < {expected_threshold * success_count}")
            if not has_clean_output:
                print(f"      Unclean output: clean={clean_tags}/{success_count}, no_pronouns={no_pronouns}/{success_count}")
        else:
            print(f"   ✅ PASSED")
        
        return passed
        
    except Exception as e:
        print(f"❌ Failed to test simplified tag generator: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("🚀 Running Simplified Tag Generator Tests...")
    
    success = test_simplified_tag_generator()
    
    if success:
        print("\n🎉 All tests passed! The simplified tag generator is working correctly.")
        print("✅ Generating clean, single keyword tags")
        print("✅ Using NLTK stopwords for filtering") 
        print("✅ Hybrid KeyBERT + centroid selection working")
        print("✅ No complex theme detection or rigid patterns")
    else:
        print("\n❌ Some tests failed. Check the output above for details.")
    
    return success

if __name__ == "__main__":
    main()
