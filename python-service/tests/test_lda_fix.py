#!/usr/bin/env python3
"""
Test script to verify that the LDATopicModeler method call fix works.
"""

import sys
import logging
from pathlib import Path

# Add the ai_service directory to Python path
sys.path.append(str(Path(__file__).parent / "ai_service"))

try:
    from ai_service.services.lda_core.lda_topic_modeler import LDATopicModeler
    MODELER_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Warning: Could not import LDATopicModeler: {e}")
    MODELER_AVAILABLE = False

def test_lda_modeler_interface():
    """Test that LDATopicModeler has the correct methods."""
    if not MODELER_AVAILABLE:
        print("❌ LDATopicModeler not available")
        return False
    
    print("🧪 Testing LDATopicModeler interface...")
    
    try:
        # Create instance
        modeler = LDATopicModeler()
        
        # Check that build_topic_matrix method exists
        if not hasattr(modeler, 'build_topic_matrix'):
            print("❌ build_topic_matrix method not found!")
            return False
        
        print("✅ build_topic_matrix method found")
        
        # Check that analyze_topics method does NOT exist (should not be called)
        if hasattr(modeler, 'analyze_topics'):
            print("⚠️ Warning: analyze_topics method still exists (but should not be used)")
        else:
            print("✅ analyze_topics method correctly not found")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing LDATopicModeler interface: {e}")
        return False

def test_lda_modeler_functionality():
    """Test that build_topic_matrix works correctly."""
    if not MODELER_AVAILABLE:
        print("❌ Skipping functionality test - LDATopicModeler not available")
        return False
    
    print("\n🧪 Testing LDATopicModeler functionality...")
    
    try:
        # Create instance
        modeler = LDATopicModeler()
        
        # Test data
        test_texts = [
            "I love programming and software development with Python",
            "Photography is my passion, I take photos of nature and landscapes", 
            "Machine learning and artificial intelligence fascinate me",
            "I enjoy cooking and trying new recipes from different cultures",
            "Data science and analytics are my main interests"
        ]
        
        print(f"📊 Testing with {len(test_texts)} text samples")
        
        # Test build_topic_matrix method
        result = modeler.build_topic_matrix(test_texts, n_topics=3)
        
        if result is not None:
            print(f"✅ LDA model built successfully:")
            print(f"   📊 Matrix shape: {result.shape}")
            print(f"   🎯 Expected: ({len(test_texts)}, 3) profiles x topics")
            
            # Validate shape
            if result.shape == (len(test_texts), 3):
                print("✅ Matrix shape is correct")
                return True
            else:
                print(f"⚠️ Matrix shape unexpected: got {result.shape}, expected ({len(test_texts)}, 3)")
                return False
        else:
            print("❌ LDA model building failed (returned None)")
            return False
            
    except Exception as e:
        print(f"❌ Error testing LDATopicModeler functionality: {e}")
        return False

def test_insufficient_data_handling():
    """Test that LDATopicModeler handles insufficient data gracefully."""
    if not MODELER_AVAILABLE:
        print("❌ Skipping insufficient data test - LDATopicModeler not available")
        return False
    
    print("\n🧪 Testing insufficient data handling...")
    
    try:
        modeler = LDATopicModeler()
        
        # Test with too few texts
        few_texts = ["hello", "world"]
        result = modeler.build_topic_matrix(few_texts, n_topics=2)
        
        if result is None:
            print("✅ Correctly handled insufficient data (returned None)")
            return True
        else:
            print("⚠️ Expected None for insufficient data, but got result")
            return False
            
    except Exception as e:
        print(f"❌ Error testing insufficient data handling: {e}")
        return False

def main():
    print("🚀 Testing LDATopicModeler Method Fix\n")
    
    tests = [
        ("Interface Check", test_lda_modeler_interface),
        ("Functionality Test", test_lda_modeler_functionality), 
        ("Insufficient Data Test", test_insufficient_data_handling),
    ]
    
    passed = 0
    for name, test in tests:
        print(f"--- {name} ---")
        if test():
            print(f"✅ {name} PASSED\n")
            passed += 1
        else:
            print(f"❌ {name} FAILED\n")
    
    print(f"📋 Summary: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All tests passed! The LDATopicModeler fix works correctly.")
        return 0
    else:
        print("⚠️ Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    # Set up logging to avoid noise during tests
    logging.getLogger().setLevel(logging.WARNING)
    exit(main())
