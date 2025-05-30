#!/usr/bin/env python3
"""
Simple test worker using only standard library modules to test the API endpoints.
"""

import asyncio
import json
import time
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, Any, Optional

class SimpleWorkerTest:
    """Simple worker test using only standard library modules"""
    
    def __init__(self, api_base_url: str = "http://localhost:8081"):
        self.api_base_url = api_base_url.rstrip('/')
        self.polling_interval = 5  # Seconds
        
    async def start(self):
        """Start the worker in polling mode"""
        print("Starting simple worker test")
        
        # Test the endpoints
        await self.test_endpoints()
        
    async def test_endpoints(self):
        """Test all the endpoints"""
        print("\n=== Testing API Endpoints ===")
        
        # Test bulk job endpoint
        print("1. Testing next-bulk-job endpoint...")
        bulk_job = await self._get_next_bulk_job()
        if bulk_job:
            print(f"Got bulk job: {bulk_job}")
        else:
            print("No bulk jobs available (expected)")
            
        # Test recurring job endpoint
        print("\n2. Testing next-recurring-job endpoint...")
        recurring_job = await self._get_next_recurring_job()
        if recurring_job:
            print(f"Got recurring job: {recurring_job}")
        else:
            print("No recurring jobs available (expected)")
            
        # Test complete job endpoint
        print("\n3. Testing complete-job endpoint...")
        test_complete = await self._complete_job("test-job-123", None, {"test": "data"}, "completed")
        print(f"Complete job response: {test_complete}")
        
        # Test update progress endpoint
        print("\n4. Testing update-progress endpoint...")
        test_progress = await self._update_progress("test-analysis-123", 50, "Processing...")
        print(f"Update progress response: {test_progress}")
        
    async def _get_next_bulk_job(self) -> Optional[Dict[str, Any]]:
        """Get next bulk analysis job"""
        url = f"{self.api_base_url}/internal/python/next-bulk-job"
        return await self._make_request(url, method="GET")
        
    async def _get_next_recurring_job(self) -> Optional[Dict[str, Any]]:
        """Get next recurring analysis job"""
        url = f"{self.api_base_url}/internal/python/next-recurring-job"
        return await self._make_request(url, method="GET")
        
    async def _complete_job(self, job_id: str, analysis_id: Optional[str], 
                           analysis_results: Dict[str, Any], status: str) -> Dict[str, Any]:
        """Complete a job"""
        url = f"{self.api_base_url}/internal/python/complete-job"
        data = {
            "jobId": job_id,
            "analysisResults": analysis_results,
            "status": status
        }
        if analysis_id:
            data["analysisId"] = analysis_id
            
        return await self._make_request(url, method="POST", data=data)
        
    async def _update_progress(self, analysis_id: str, progress: int, message: str) -> Dict[str, Any]:
        """Update analysis progress"""
        url = f"{self.api_base_url}/internal/python/update-progress"
        data = {
            "analysisId": analysis_id,
            "progress": progress,
            "message": message
        }
        return await self._make_request(url, method="POST", data=data)
        
    async def _make_request(self, url: str, method: str = "GET", 
                           data: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Make HTTP request using urllib"""
        try:
            # Prepare request
            req_data = None
            headers = {'Content-Type': 'application/json'}
            
            if data and method == "POST":
                req_data = json.dumps(data).encode('utf-8')
                
            request = urllib.request.Request(url, data=req_data, headers=headers, method=method)
            
            # Make request
            with urllib.request.urlopen(request) as response:
                status_code = response.getcode()
                
                if status_code == 204:  # No Content
                    return None
                    
                if status_code == 200:
                    response_data = response.read().decode('utf-8')
                    return json.loads(response_data)
                    
                print(f"Unexpected status code: {status_code}")
                return None
                
        except urllib.error.HTTPError as e:
            print(f"HTTP Error {e.code}: {e.reason}")
            if e.code == 400:
                error_data = e.read().decode('utf-8')
                print(f"Error response: {error_data}")
            return None
        except Exception as e:
            print(f"Request failed: {e}")
            return None

async def main():
    """Main function"""
    worker = SimpleWorkerTest()
    await worker.start()

if __name__ == "__main__":
    asyncio.run(main())
