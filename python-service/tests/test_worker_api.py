#!/usr/bin/env python3
"""
Test simple pour vérifier le bon fonctionnement du worker Python avec la nouvelle architecture API.
Ce script valide que :
1. Le client API peut se connecter à AdonisJS avec la clé API
2. Les endpoints API nécessaires sont disponibles et répondent correctement
3. Le worker peut récupérer les données de compte
"""

import asyncio
import logging
from dotenv import load_dotenv
from ai_service.clients.adonis_api_client import AdonisApiClient

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_api_connectivity():
    """Test de connectivité à l'API AdonisJS"""
    try:
        client = AdonisApiClient()
        
        # Afficher l'URL de base pour le débogage
        logger.info(f"Connexion à l'API AdonisJS à l'adresse: {client.base_url}")
        
        # Test du endpoint de santé
        logger.info("Test du endpoint de santé...")
        health_ok = await client.health_check()
        
        if health_ok:
            logger.info("✅ API AdonisJS accessible et fonctionnelle")
        else:
            logger.error("❌ API AdonisJS inaccessible")
            return False
        
        # Test de récupération de compte (simulé)
        logger.info("Test de récupération d'un compte (peut échouer si le compte n'existe pas)...")
        test_handle = "test.bsky.app"  # Remplacer par un compte existant dans votre base de données
        
        try:
            account = await client.get_account(test_handle)
            if account:
                logger.info(f"✅ Compte récupéré avec succès: {test_handle}")
            else:
                logger.warning(f"⚠️ Compte non trouvé: {test_handle}")
        except Exception as e:
            logger.error(f"❌ Erreur lors de la récupération du compte: {e}")
        
        # Fermer proprement le client API
        await client.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur lors des tests API: {e}")
        return False

async def main():
    """Fonction principale pour exécuter les tests"""
    logger.info("Démarrage des tests d'API du worker Python...")
    
    # Charger les variables d'environnement
    load_dotenv()
    
    # Tester la connectivité API
    api_ok = await test_api_connectivity()
    
    if api_ok:
        logger.info("✅ Tests API réussis")
    else:
        logger.error("❌ Tests API échoués")

if __name__ == "__main__":
    asyncio.run(main())
