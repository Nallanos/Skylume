#!/usr/bin/env python3
"""
Test script to verify stability improvements and min_cluster_size changes
"""

import asyncio
import logging
import sys
import os
import time
from typing import List, Dict

# Add the python-service directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from ai_service.services.clustering.hdbscan_clusterer import HDBSCANClusterer
from ai_service.services.tag_service import TagService
from ai_service.clients.adonis_api_client import AdonisApiClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MockApiClient:
    """Mock API client for testing"""
    
    async def close(self):
        pass

def test_min_cluster_size():
    """Test that min_cluster_size has been updated to 5"""
    print("🔍 Testing min_cluster_size configuration...")
    
    try:
        # Test default initialization
        clusterer = HDBSCANClusterer()
        params = clusterer.get_parameters()
        
        print(f"📊 Default min_cluster_size: {params['min_cluster_size']}")
        
        if params['min_cluster_size'] == 5:
            print("✅ min_cluster_size correctly set to 5")
            return True
        else:
            print(f"❌ min_cluster_size is {params['min_cluster_size']}, expected 5")
            return False
            
    except Exception as e:
        print(f"❌ Error testing min_cluster_size: {e}")
        return False

def test_memory_management():
    """Test memory management functionality"""
    print("🧠 Testing memory management...")
    
    try:
        api_client = MockApiClient()
        tag_service = TagService(api_client=api_client)
        
        # Test memory check functionality
        memory_stats = tag_service._check_memory_usage()
        print(f"📊 Current memory usage: {memory_stats['current_mb']:.1f}MB")
        
        # Test memory management
        tag_service._manage_memory()
        print("✅ Memory management executed successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing memory management: {e}")
        return False

def test_process_stability():
    """Test process stability improvements"""
    print("🛡️ Testing process stability features...")
    
    try:
        # Test that psutil is available
        import psutil
        process = psutil.Process()
        memory_info = process.memory_info()
        print(f"📊 Process memory: {memory_info.rss / 1024 / 1024:.1f}MB")
        
        # Test that gc is available
        import gc
        gc.collect()
        print("🧹 Garbage collection executed")
        
        print("✅ Process stability features working")
        return True
        
    except Exception as e:
        print(f"❌ Error testing process stability: {e}")
        return False

async def test_tag_service_initialization():
    """Test TagService initialization with new parameters"""
    print("🏗️ Testing TagService initialization...")
    
    try:
        api_client = MockApiClient()
        
        start_time = time.time()
        tag_service = TagService(api_client=api_client)
        init_time = time.time() - start_time
        
        print(f"⏱️ TagService initialization time: {init_time:.2f}s")
        
        # Check that clusterer has correct parameters
        clusterer_params = tag_service.clusterer.get_parameters()
        print(f"📊 Clusterer parameters: {clusterer_params}")
        
        if clusterer_params['min_cluster_size'] == 5:
            print("✅ TagService clusterer correctly configured")
            return True
        else:
            print(f"❌ TagService clusterer min_cluster_size is {clusterer_params['min_cluster_size']}, expected 5")
            return False
            
    except Exception as e:
        print(f"❌ Error testing TagService initialization: {e}")
        return False

async def run_all_tests():
    """Run all stability tests"""
    print("🧪 Running stability improvement tests...")
    print("=" * 60)
    
    tests = [
        ("Min Cluster Size", test_min_cluster_size),
        ("Memory Management", test_memory_management),
        ("Process Stability", test_process_stability),
        ("TagService Initialization", test_tag_service_initialization),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        print("-" * 40)
        
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY:")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All stability improvements working correctly!")
        return True
    else:
        print("⚠️ Some tests failed - please check the implementation")
        return False

if __name__ == "__main__":
    print("🔬 Stability Improvements Test Suite")
    print("=" * 60)
    
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
