#!/usr/bin/env python3
"""
Script de test direct pour reproduire le problème d'authentification
"""

import os
import httpx
import asyncio
from pathlib import Path

# Charger les variables d'environnement depuis le fichier .env
def load_env_file():
    env_file = Path(__file__).parent / '.env'
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print(f"Loaded environment variables from {env_file}")
    else:
        print(f"No .env file found at {env_file}")

load_env_file()

async def test_api():
    api_key = os.getenv('INTERNAL_API_KEY')
    base_url = os.getenv('ADONISJS_API_URL', 'http://localhost:8081')
    
    print(f"Testing API with:")
    print(f"  Base URL: {base_url}")
    print(f"  API Key length: {len(api_key) if api_key else 0}")
    print(f"  API Key first 10 chars: {api_key[:10] if api_key else 'None'}...")
    
    headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json',
        'User-Agent': 'Python-AI-Service/1.0'
    }
    
    print(f"  Headers: {headers}")
    
    client = httpx.AsyncClient(
        base_url=base_url,
        headers=headers,
        timeout=30.0
    )
    
    try:
        # Test health check first
        print("\n1. Testing health endpoint...")
        response = await client.get('/internal/python/health')
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
        # Test next-bulk-job
        print("\n2. Testing next-bulk-job endpoint...")
        response = await client.get('/internal/python/next-bulk-job')
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await client.aclose()

if __name__ == "__main__":
    asyncio.run(test_api())
