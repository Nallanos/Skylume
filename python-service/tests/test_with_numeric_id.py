#!/usr/bin/env python3
"""
Test script to verify the update-progress endpoint with a numeric analysis ID
"""

import httpx
import sys
import json

BASE_URL = "http://localhost:8081"

def test_update_progress_with_numeric_id():
    """Test the update-progress endpoint with a numeric analysis ID"""
    print("Testing update-progress endpoint with numeric ID...")
    
    # Test with numeric ID (even though it won't exist in DB, the validation should pass)
    test_data = {
        "analysisId": "123",  # String that can be parsed as integer
        "analyzed": 50,
        "total": 100,
        "percentage": 50
    }
    
    try:
        response = httpx.post(f"{BASE_URL}/internal/python/update-progress", json=test_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 404:
            print("✅ Validation passed - Analysis ID is numeric, returns 404 because analysis doesn't exist")
        elif response.status_code == 200:
            print("✅ Success - Analysis updated")
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            
    except httpx.HTTPError as e:
        print(f"HTTP Error: {e}")
    except Exception as e:
        print(f"Error: {e}")

def test_update_progress_with_invalid_id():
    """Test the update-progress endpoint with an invalid analysis ID"""
    print("\nTesting update-progress endpoint with invalid ID...")
    
    # Test with non-numeric ID
    test_data = {
        "analysisId": "not-a-number",
        "analyzed": 50,
        "total": 100,
        "percentage": 50
    }
    
    try:
        response = httpx.post(f"{BASE_URL}/internal/python/update-progress", json=test_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 400:
            print("✅ Validation correctly rejects non-numeric analysis ID")
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            
    except httpx.HTTPError as e:
        print(f"HTTP Error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("=== Testing Update Progress Validation ===")
    test_update_progress_with_numeric_id()
    test_update_progress_with_invalid_id()
