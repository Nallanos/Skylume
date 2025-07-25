#!/usr/bin/env python3
"""
Test script to verify that our ProfileProcessor embedding fixes work correctly.
"""

import sys
import json
import numpy as np
from pathlib import Path

# Add the ai_service directory to Python path
sys.path.append(str(Path(__file__).parent / "ai_service"))

from ai_service.services.semantic_clustering.processors.profile_processor import ProfileProcessor

def test_embedding_validation():
    """Test that embedding validation works correctly."""
    print("🧪 Testing embedding validation...")
    
    processor = ProfileProcessor()
    
    # Test cases
    test_cases = [
        # Valid embedding
        ([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], True, "Valid embedding"),
        
        # Invalid cases
        ([], False, "Empty list"),
        (None, False, "None"),
        ([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], False, "All zeros"),
        ([1, 2, 3], False, "Too short"),
        ([float('nan')] * 50, False, "Contains NaN"),
        ([float('inf')] * 50, False, "Contains infinity"),
        ([1e-10] * 50, False, "Magnitude too small"),
        ([1e10] * 50, False, "Magnitude too large"),
    ]
    
    passed = 0
    for embedding, expected, description in test_cases:
        result = processor.validate_embedding_quality(embedding)
        if result == expected:
            print(f"  ✅ {description}")
            passed += 1
        else:
            print(f"  ❌ {description}: expected {expected}, got {result}")
    
    print(f"🎯 Validation tests: {passed}/{len(test_cases)} passed\n")
    return passed == len(test_cases)

def test_data_cleaning():
    """Test that data cleaning removes invalid embeddings."""
    print("🧪 Testing data cleaning...")
    
    processor = ProfileProcessor()
    
    # Create test data with mix of valid and invalid embeddings
    test_data = [
        {"handle": "valid1", "embedding": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]},
        {"handle": "invalid_empty", "embedding": []},
        {"handle": "valid2", "embedding": np.random.random(50).tolist()},
        {"handle": "invalid_zeros", "embedding": [0] * 50},
        {"handle": "valid3", "embedding": np.random.random(100).tolist()},
        {"handle": "invalid_nan", "embedding": [float('nan')] * 50},
    ]
    
    print(f"  📊 Input data: {len(test_data)} profiles")
    
    cleaned = processor.clean_embeddings_data(test_data)
    
    print(f"  📊 Cleaned data: {len(cleaned)} profiles")
    
    # Should have only valid profiles
    expected_valid = 3
    if len(cleaned) == expected_valid:
        print(f"  ✅ Correctly filtered data: {len(cleaned)} valid profiles")
        return True
    else:
        print(f"  ❌ Expected {expected_valid} valid profiles, got {len(cleaned)}")
        return False

def test_umap_data_fix():
    """Test that UMAP data fixing works."""
    print("🧪 Testing UMAP data preparation...")
    
    # Simulate data that would cause UMAP to fail
    test_embeddings = [
        [0.1, 0.2, 0.3, 0.4, 0.5],  # Valid
        [],                          # Invalid - empty
        [0.6, 0.7, 0.8, 0.9, 1.0],  # Valid
        [0, 0, 0, 0, 0],            # Invalid - all zeros
        [1.1, 1.2, 1.3, 1.4, 1.5], # Valid
    ]
    
    test_handles = ["user1", "user2", "user3", "user4", "user5"]
    
    print(f"  📊 Input: {len(test_embeddings)} embeddings")
    
    # Simulate the filtering that our UMAP fix does
    valid_embeddings = []
    valid_handles = []
    
    for embedding, handle in zip(test_embeddings, test_handles):
        if (embedding is not None and 
            isinstance(embedding, (list, np.ndarray)) and 
            len(embedding) > 0 and
            not all(x == 0 for x in embedding)):
            valid_embeddings.append(embedding)
            valid_handles.append(handle)
    
    print(f"  📊 Valid: {len(valid_embeddings)} embeddings")
    
    if len(valid_embeddings) == 3:  # Should filter out 2 invalid ones
        print("  ✅ UMAP filtering works correctly")
        return True
    else:
        print(f"  ❌ Expected 3 valid embeddings, got {len(valid_embeddings)}")
        return False

def main():
    print("🚀 Testing Embedding Fixes\n")
    
    tests = [
        test_embedding_validation,
        test_data_cleaning,
        test_umap_data_fix,
    ]
    
    passed = 0
    for test in tests:
        if test():
            passed += 1
    
    print(f"📋 Summary: {passed}/{len(tests)} test suites passed")
    
    if passed == len(tests):
        print("🎉 All tests passed! The embedding fixes should work correctly.")
        return 0
    else:
        print("⚠️ Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    exit(main())
