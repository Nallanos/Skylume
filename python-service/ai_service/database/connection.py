"""
Module de connexion à la base de données pour le service AI.
Fournit une fonction d'aide pour obtenir une instance de base de données configurée.
"""

import logging
from ai_service.database.database import Database

logger = logging.getLogger(__name__)

async def get_database() -> Database:
    """
    Obtient une instance de base de données configurée et initialisée.
    
    Returns:
        Database: Instance de base de données prête à l'utilisation
        
    Raises:
        Exception: En cas d'erreur de connexion à la base de données
    """
    try:
        database = Database()
        await database.init()
        logger.info("Connexion à la base de données établie avec succès")
        return database
    except Exception as e:
        logger.error(f"Erreur lors de la connexion à la base de données: {e}")
        raise Exception(f"Impossible de se connecter à la base de données: {e}")
