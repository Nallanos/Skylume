"""
Point d'entrée unique pour l'analyse d'audience Bluesky (API stable).
Ce module expose analyze_audience, qui utilise TagService (orchestrateur principal).
"""

import logging
from typing import List, Dict, Any, Optional

from ai_service.clients.adonis_api_client import AdonisApiClient
from ai_service.models.transformer_embedder import TransformerEmbedder
from ai_service.services.clustering.hdbscan_clusterer import HDBSCANClusterer
from ai_service.services.taggers.keybert_tagger import KeyBERTTagger
from ai_service.utils.text_cleaner import TextCleaner
from ai_service.services.main_orchestrator import MainOrchestrator

# Optionally import ProfileView for type hints
try:
    from atproto_client.models.app.bsky.actor.defs import ProfileView
except ImportError:
    ProfileView = Any

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

_tag_service: Optional[MainOrchestrator] = None

def _get_tag_main_orchestrator_instance() -> MainOrchestrator:
    global _tag_service
    if _tag_service is None:
        api_client = AdonisApiClient()
        embedding_model = TransformerEmbedder("sentence-transformers/all-mpnet-base-v2")
        clusterer = HDBSCANClusterer()
        tag_generator = KeyBERTTagger(embedding_model=embedding_model, model_name="all-mpnet-base-v2")
        text_cleaner = TextCleaner()
        _tag_service = MainOrchestrator(
            api_client=api_client,
            embedding_model=embedding_model,
            clusterer=clusterer,
            tag_generator=tag_generator,
            text_cleaner=text_cleaner
        )
        logger.info("TagService initialisé (singleton)")
    return _tag_service

async def analyze_audience(account_handle: str, followers: List[Any], max_concurrent: int = 1) -> List[Dict[str, Any]]:
    """
    Analyse l'audience d'un compte Bluesky (clustering + tags).
    Args:
        account_handle: handle du compte à analyser
        followers: liste de profils à analyser
        max_concurrent: nombre max de traitements concurrents
    Returns:
        Liste de clusters avec tags et métadonnées
    """
    try:
        main_orchestrator = _get_tag_main_orchestrator_instance()
        return await main_orchestrator.analyze_audience(account_handle, followers, max_concurrent)
    except Exception as e:
        logger.critical(f"Critical error in analyze_audience: {e}", exc_info=True)
        return []

__all__ = ['analyze_audience']