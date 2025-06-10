#!/usr/bin/env python3
"""
Test to verify that hierarchical optimization is removed and no "Niche_" prefixes are generated
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_no_hierarchical_prefixes():
    """Test that hierarchical optimization doesn't add mechanical prefixes"""
    print("🧪 Testing No Hierarchical Optimization...")
    
    try:
        from ai_service.services.improved_tag_generator import ImprovedTagGenerator
        
        generator = ImprovedTagGenerator()
        
        # Test various scenarios that would previously get "Niche_" prefixes
        test_cases = [
            # Small cluster keywords
            [("acting", 0.9), ("career", 0.8), ("entertainment", 0.7)],
            [("specialized", 0.9), ("niche", 0.8)],
            [("micro", 0.9), ("small", 0.8), ("group", 0.7)],
            [("developer", 0.9), ("coding", 0.8)],
            [("photography", 0.9), ("creative", 0.8)],
        ]
        
        print("\n📋 Testing tag generation without hierarchical optimization:")
        
        all_passed = True
        for i, keywords in enumerate(test_cases, 1):
            tag = generator.generate_tag_from_keywords(keywords)
            
            # Check that NO mechanical prefixes are added
            has_niche_prefix = tag.startswith("Niche_")
            has_micro_prefix = tag.startswith("Micro_")
            has_small_prefix = tag.startswith("Small_")
            
            # Check that NO mechanical suffixes are added
            has_community_suffix = tag.endswith("_Community")
            has_network_suffix = tag.endswith("_Network")
            has_group_suffix = tag.endswith("_Group")
            has_hub_suffix = tag.endswith("_Hub")
            
            mechanical_issues = []
            if has_niche_prefix:
                mechanical_issues.append("Niche_ prefix")
            if has_micro_prefix:
                mechanical_issues.append("Micro_ prefix")
            if has_small_prefix:
                mechanical_issues.append("Small_ prefix")
            if has_community_suffix:
                mechanical_issues.append("_Community suffix")
            if has_network_suffix:
                mechanical_issues.append("_Network suffix")
            if has_group_suffix:
                mechanical_issues.append("_Group suffix")
            if has_hub_suffix:
                mechanical_issues.append("_Hub suffix")
            
            if mechanical_issues:
                print(f"❌ Test {i}: '{tag}' has mechanical patterns: {', '.join(mechanical_issues)}")
                all_passed = False
            else:
                print(f"✅ Test {i}: '{tag}' - Clean, no mechanical patterns")
        
        # Test that tags are simple and natural
        print("\n📋 Testing tag naturalness:")
        natural_tests = [
            [("javascript", 0.9), ("programming", 0.8)],
            [("design", 0.9), ("creative", 0.8)],
            [("startup", 0.9), ("entrepreneur", 0.8)],
        ]
        
        for i, keywords in enumerate(natural_tests, 1):
            tag = generator.generate_tag_from_keywords(keywords)
            
            # Should be simple, clean words
            is_natural = (
                not "_" in tag or tag.count("_") <= 1  # At most one underscore
            ) and (
                len(tag.split("_")) <= 2  # At most two words
            ) and (
                not any(mechanical in tag.lower() for mechanical in 
                       ['niche', 'micro', 'small', 'community', 'network', 'group', 'hub'])
            )
            
            if is_natural:
                print(f"✅ Natural {i}: '{tag}' - Simple and clean")
            else:
                print(f"❌ Natural {i}: '{tag}' - Still has complexity")
                all_passed = False
        
        if all_passed:
            print("\n🎯 SUCCESS: No hierarchical optimization, clean simple tags!")
            return True
        else:
            print("\n❌ FAILED: Still has mechanical optimization patterns")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_no_hierarchical_prefixes()
    exit(0 if success else 1)
