#!/usr/bin/env python3
"""
Quick test to verify ImprovedTagGenerator integration works correctly
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_integration():
    """Test the ImprovedTagGenerator integration"""
    print("🧪 Testing ImprovedTagGenerator Integration...")
    
    try:
        from ai_service.services.improved_tag_generator import ImprovedTagGenerator
        
        # Test basic functionality
        generator = ImprovedTagGenerator()
        
        # Test simple keyword generation
        test_keywords = [
            ("javascript", 0.9),
            ("programming", 0.8),
            ("developer", 0.6)
        ]
        
        tag = generator.generate_tag_from_keywords(test_keywords)
        print(f"✅ Generated tag: '{tag}'")
        
        # Test validation
        is_valid = generator.validate_tag_quality(tag)
        print(f"✅ Tag quality validation: {is_valid}")
        
        # Test with empty input
        empty_tag = generator.generate_tag_from_keywords([])
        print(f"✅ Empty input fallback: '{empty_tag}'")
        
        # Test with stopword filtering
        stopword_keywords = [
            ("the", 0.9),
            ("javascript", 0.8),
            ("you", 0.7)
        ]
        
        filtered_tag = generator.generate_tag_from_keywords(stopword_keywords)
        print(f"✅ Stopword filtering result: '{filtered_tag}'")
        
        print("\n🎯 Integration test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_integration()
