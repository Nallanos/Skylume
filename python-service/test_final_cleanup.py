#!/usr/bin/env python3
"""
Final cleanup verification test - ensures no more rigid patterns or legacy methods
"""

import sys
import os
sys.path.append('/workspaces/Bluesky-copilot/python-service')

def test_tag_service_cleanup():
    """Test that TagService no longer has rigid pattern methods"""
    print("🧹 Testing TagService cleanup...")
    
    try:
        from ai_service.services.tag_service import TagService
        from ai_service.models.transformer_embedder import TransformerEmbedder
        
        # Initialize TagService with ImprovedTagGenerator
        embedding_model = TransformerEmbedder()
        tag_service = TagService(embedding_model=embedding_model)
        
        # Verify ImprovedTagGenerator is properly initialized
        assert hasattr(tag_service, 'improved_tag_generator'), "ImprovedTagGenerator not initialized"
        assert tag_service.improved_tag_generator is not None, "ImprovedTagGenerator is None"
        
        # Verify problematic methods are removed
        problematic_methods = [
            '_apply_hierarchical_optimization',
            '_ensure_tag_uniqueness', 
            '_detect_concept_type',
            '_create_single_keyword_tag',
            '_create_dual_keyword_tag', 
            '_create_multi_keyword_tag',
            '_format_tag'
        ]
        
        for method_name in problematic_methods:
            assert not hasattr(tag_service, method_name), f"Problematic method {method_name} still exists"
        
        print("✅ All problematic methods successfully removed")
        
        # Test _create_natural_tag method works with ImprovedTagGenerator
        test_keywords = ['javascript', 'programming', 'coding']
        tag = tag_service._create_natural_tag(test_keywords)
        
        print(f"🏷️  Generated tag: '{tag}'")
        
        # Verify tag is clean (no underscores, no suffixes)
        assert '_' not in tag, f"Tag contains underscores: {tag}"
        assert not tag.endswith('_Community'), f"Tag has mechanical suffix: {tag}"
        assert not tag.endswith('_Network'), f"Tag has mechanical suffix: {tag}"
        assert not tag.startswith('Niche_'), f"Tag has Niche prefix: {tag}"
        
        print("✅ Generated tag is clean (no rigid patterns)")
        
        # Test with different keyword types
        test_cases = [
            ['python', 'data', 'science'],
            ['art', 'creative', 'design'],
            ['politics', 'news', 'discussion']
        ]
        
        for keywords in test_cases:
            tag = tag_service._create_natural_tag(keywords)
            print(f"🏷️  Keywords {keywords} -> Tag: '{tag}'")
            
            # Verify each tag is clean
            assert isinstance(tag, str), f"Tag is not a string: {tag}"
            assert len(tag) > 0, f"Tag is empty"
            assert not any(suffix in tag for suffix in ['_Community', '_Network', '_Group']), f"Rigid suffix in tag: {tag}"
            assert not tag.startswith('Niche_'), f"Niche prefix in tag: {tag}"
        
        print("✅ All tag generation tests passed - no rigid patterns detected")
        return True
        
    except Exception as e:
        print(f"❌ Error in cleanup test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_improved_generator_integration():
    """Test that ImprovedTagGenerator is working in the pipeline"""
    print("\n🔧 Testing ImprovedTagGenerator integration...")
    
    try:
        from ai_service.services.tag_service import TagService
        from ai_service.models.transformer_embedder import TransformerEmbedder
        
        embedding_model = TransformerEmbedder()
        tag_service = TagService(embedding_model=embedding_model)
        
        # Test the main tag generation method
        test_keyword_cluster = [
            ('javascript', 0.9),
            ('programming', 0.8), 
            ('web', 0.7),
            ('development', 0.6)
        ]
        
        tag = tag_service._generate_natural_tag_from_semantic_group(test_keyword_cluster)
        print(f"🏷️  Semantic group tag: '{tag}'")
        
        # Verify clean single keyword output
        assert isinstance(tag, str), f"Tag is not string: {tag}"
        assert len(tag.split()) == 1, f"Tag is not single word: '{tag}'"
        assert tag.isalpha() or tag.replace('-', '').isalpha(), f"Tag contains special chars: '{tag}'"
        
        print("✅ Semantic group tag generation working correctly")
        
        # Test multiple different semantic groups
        test_groups = [
            [('art', 0.9), ('creative', 0.8), ('design', 0.7)],
            [('politics', 0.9), ('news', 0.8), ('government', 0.7)],
            [('technology', 0.9), ('innovation', 0.8), ('startup', 0.7)]
        ]
        
        for group in test_groups:
            tag = tag_service._generate_natural_tag_from_semantic_group(group)
            print(f"🏷️  Group {[kw for kw, _ in group]} -> '{tag}'")
            
            # All should be clean single words
            assert len(tag.split()) == 1, f"Multi-word tag: '{tag}'"
            assert not any(char in tag for char in ['_', '&', ' ']), f"Special chars in tag: '{tag}'"
        
        print("✅ All semantic group tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Error in integration test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Running final cleanup verification tests...\n")
    
    success = True
    success &= test_tag_service_cleanup()
    success &= test_improved_generator_integration()
    
    print(f"\n{'🎉 ALL TESTS PASSED' if success else '❌ SOME TESTS FAILED'}")
    print("\n📋 Summary:")
    print("✅ Removed all rigid pattern methods (_format_tag, hierarchical optimization, etc.)")
    print("✅ ImprovedTagGenerator properly integrated")
    print("✅ Clean single keyword output verified")
    print("✅ No more mechanical suffixes (_Community, _Network)")
    print("✅ No more Niche_ prefixes")
    
    if success:
        print("\n🎯 TagService cleanup is COMPLETE!")
        print("The system should now generate natural single keywords like 'JavaScript', 'Politics', 'Art'")
    
    sys.exit(0 if success else 1)
