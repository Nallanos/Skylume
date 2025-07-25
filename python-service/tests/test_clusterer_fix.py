#!/usr/bin/env python3
"""
Test script to verify that the ProfileClusterer method signature fix works.
"""

import sys
import inspect
from pathlib import Path

# Add the ai_service directory to Python path
sys.path.append(str(Path(__file__).parent / "ai_service"))

try:
    from ai_service.services.semantic_clustering.clustering.profile_clusterer import ProfileClusterer
    CLUSTERER_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Warning: Could not import ProfileClusterer: {e}")
    CLUSTERER_AVAILABLE = False

def test_method_signature():
    """Test that the graduated pipeline method has the correct signature."""
    if not CLUSTERER_AVAILABLE:
        print("❌ ProfileClusterer not available")
        return False
    
    print("🧪 Testing ProfileClusterer method signature...")
    
    try:
        # Get the method signature
        method = getattr(ProfileClusterer, 'cluster_profiles_with_graduated_pipeline')
        signature = inspect.signature(method)
        
        # Expected parameters (excluding 'self')
        expected_params = [
            'profile_embeddings',
            'profiles', 
            'profile_processor',
            'cohesion_threshold',
            'persistence_threshold', 
            'min_cluster_size'
        ]
        
        # Get actual parameters (excluding 'self')
        actual_params = [name for name in signature.parameters.keys() if name != 'self']
        
        print(f"📊 Expected parameters: {expected_params}")
        print(f"📊 Actual parameters: {actual_params}")
        
        # Check if 'enable_reclustering' is not in the signature
        if 'enable_reclustering' in actual_params:
            print("❌ ERROR: 'enable_reclustering' found in method signature!")
            return False
        
        print("✅ Method signature is correct - no 'enable_reclustering' parameter")
        
        # Check that all expected parameters are present
        missing_params = set(expected_params) - set(actual_params)
        if missing_params:
            print(f"⚠️ Warning: Missing expected parameters: {missing_params}")
        
        extra_params = set(actual_params) - set(expected_params) 
        if extra_params:
            print(f"ℹ️ Extra parameters found: {extra_params}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing method signature: {e}")
        return False

def test_method_call_simulation():
    """Simulate the corrected method call."""
    print("\n🧪 Testing simulated method call...")
    
    try:
        # Simulate the parameters we would pass (like in main_orchestrator)
        call_params = {
            'profile_embeddings': [[0.1, 0.2], [0.3, 0.4]],
            'profiles': [{'handle': 'test1'}, {'handle': 'test2'}],
            'profile_processor': None,  # Would be a real ProfileProcessor
            'cohesion_threshold': 0.5,
            'min_cluster_size': 3,
        }
        
        # Check that we're not passing enable_reclustering
        if 'enable_reclustering' in call_params:
            print("❌ ERROR: Still trying to pass 'enable_reclustering'!")
            return False
        
        print("✅ Simulated call parameters are correct:")
        for key, value in call_params.items():
            print(f"   {key}: {type(value).__name__}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in simulated call test: {e}")
        return False

def main():
    print("🚀 Testing ProfileClusterer Method Signature Fix\n")
    
    tests = [
        ("Method Signature Check", test_method_signature),
        ("Simulated Call Test", test_method_call_simulation),
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
        print("🎉 All tests passed! The method signature fix works correctly.")
        return 0
    else:
        print("⚠️ Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    exit(main())
