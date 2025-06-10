#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from ai_service.services.improved_tag_generator import ImprovedTagGenerator

def test_simple_tag_generation():
    """Test the basic functionality of the improved tag generator"""
    print("🧪 Testing corrected hybrid tag generation...")
    
    # Create tag generator without embedding model for basic test
    generator = ImprovedTagGenerator()
    
    # Test cases
    test_cases = [
        [("javascript", 0.9), ("programming", 0.8), ("coding", 0.7)],
        [("photography", 0.9), ("camera", 0.8), ("visual", 0.7)],
        [("politics", 0.9), ("government", 0.8), ("news", 0.7)],
        [("ai", 0.9), ("machine", 0.8), ("learning", 0.7)]
    ]
    
    print("Testing simple keyword selection (no centroid):")
    for i, keywords in enumerate(test_cases):
        try:
            tag = generator.generate_tag_from_keywords(keywords)
            print(f"  Test {i+1}: {[kw for kw, _ in keywords]} → '{tag}'")
        except Exception as e:
            print(f"  Test {i+1}: ERROR - {e}")
    
    print("\n✅ Basic test completed!")

if __name__ == "__main__":
    test_simple_tag_generation()
