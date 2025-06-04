#!/usr/bin/env python3

import asyncio
import logging
import sys
import os
from dotenv import load_dotenv

# Configuration des logs détaillés
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Chargement des variables d'environnement
load_dotenv()

async def test_connection():
    try:
        from ai_service.clients.adonis_api_client import AdonisApiClient
        
        print('=== Test de connexion AdonisApiClient ===')
        client = AdonisApiClient()
        print('✓ Client créé avec succès')
        
        # Test de health check
        print('\n--- Test de health check ---')
        health_ok = await client.health_check()
        print(f'Health check result: {health_ok}')
        
        # Test de récupération de job bulk
        print('\n--- Test de récupération de job bulk ---')
        bulk_job = await client.get_next_bulk_job()
        print(f'Bulk job result: {bulk_job}')
        
        # Test de récupération de job récurrent
        print('\n--- Test de récupération de job récurrent ---')
        recurring_job = await client.get_next_recurring_job()
        print(f'Recurring job result: {recurring_job}')
        
        await client.close()
        print('\n✓ Test terminé avec succès')
        
    except Exception as e:
        print(f'❌ Erreur pendant le test: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print('Démarrage du test...')
    asyncio.run(test_connection())
    print('Test terminé.')
