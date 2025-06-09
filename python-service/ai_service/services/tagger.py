"""
Module principal pour la génération de tags pour les followers Bluesky.
Ce fichier sert de point d'entrée et délègue le travail à des classes spécialisées.
"""

import os
import warnings
import logging
import asyncio
from typing import List, Dict, Any

# Configuration des variables d'environnement pour les modèles
os.environ.setdefault('TRANSFORMERS_OFFLINE', '0')
if 'HF_HOME' in os.environ and 'TRANSFORMERS_CACHE' not in os.environ:
    os.environ['TRANSFORMERS_CACHE'] = os.environ['HF_HOME']

# Suppression des avertissements de dépréciation
warnings.filterwarnings('ignore', category=FutureWarning, message='.*TRANSFORMERS_CACHE.*')
warnings.filterwarnings('ignore', category=FutureWarning, module='transformers.utils.hub')

print("📥 Import de ProfileView...")
from atproto_client.models.app.bsky.actor.defs import ProfileView
print("✅ ProfileView importé")

print("📥 Import du TagService...")
from ai_service.services.tag_service import TagService
print("✅ TagService importé")

print("📥 Import des autres composants...")
from ai_service.models.transformer_embedder import TransformerEmbedder
from ai_service.services.clustering.hdbscan_clusterer import HDBSCANClusterer
from ai_service.services.taggers.keybert_tagger import KeyBERTTagger
from ai_service.utils.text_cleaner import TextCleaner
from ai_service.clients.adonis_api_client import AdonisApiClient
print("✅ Tous les composants importés")

# Configuration du logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Instance singleton du service de tags
_tag_service = None

def _get_tag_service() -> TagService:
    """
    Récupère ou crée l'instance du service de tags
    
    Returns:
        L'instance du service de tags
    """
    global _tag_service
    if _tag_service is None:
        # Créer les composants
        api_client = AdonisApiClient()
        embedding_model = TransformerEmbedder("sentence-transformers/all-mpnet-base-v2")
        clusterer = HDBSCANClusterer()
        tag_generator = KeyBERTTagger(embedding_model=embedding_model)
        text_cleaner = TextCleaner()
        
        # Créer le service de tags
        _tag_service = TagService(
            api_client=api_client,
            embedding_model=embedding_model,
            clusterer=clusterer,
            tag_generator=tag_generator,
            text_cleaner=text_cleaner
        )
        logger.info("Service de tags initialisé")
    
    return _tag_service

async def generate_tags(account_handle: str, followers: List[ProfileView], max_concurrent: int = 1) -> List[Dict[str, Any]]:
    """
    Génère des tags pour regrouper les followers d'un compte.
    Cette fonction est le point d'entrée principal du module.
    
    Args:
        account_handle: Le handle du compte
        followers: Liste des followers à analyser
        max_concurrent: Nombre maximal de requêtes concurrentes
        
    Returns:
        Liste de clusters avec leurs métadonnées
    """
    try:
        tag_service = _get_tag_service()
        return await tag_service.generate_tags(account_handle, followers, max_concurrent)
    except Exception as e:
        logger.critical(f"Erreur critique dans generate_tags: {e}", exc_info=True)
        return []

__all__ = ['generate_tags']