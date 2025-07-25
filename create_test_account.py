#!/usr/bin/env python3
"""
Script pour créer un compte de test
"""
import asyncio
import sys
import os
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def create_test_account():
    """Créer un compte de test via l'API AdonisJS"""
    try:
        base_url = os.getenv('ADONISJS_API_URL', 'http://localhost:8081')
        api_key = os.getenv('INTERNAL_API_KEY')
        
        if not api_key:
            print("❌ INTERNAL_API_KEY manquant dans .env")
            return
        
        headers = {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        }
        
        # Données du compte de test
        test_account = {
            'handle': 'test.bsky.social',
            'appPassword': 'test-app-password-123',
            'userId': 'test-user-id',
            'id': 'test-account-id',
            'seenNotificationAt': '2025-07-15T09:00:00.000Z'
        }
        
        print("🔄 Création d'un compte de test...")
        
        async with httpx.AsyncClient() as client:
            # Essayer de créer directement dans la base de données
            # D'abord, vérifions si on peut insérer via une requête directe
            response = await client.post(
                f"{base_url}/internal/python/test-account",
                json=test_account,
                headers=headers
            )
            
            if response.status_code == 200:
                print("✅ Compte de test créé avec succès")
                return True
            else:
                print(f"❌ Erreur création compte: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(create_test_account())
