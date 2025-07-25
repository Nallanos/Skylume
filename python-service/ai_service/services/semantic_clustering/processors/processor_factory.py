"""
Updated dependency factory to include the new ProfileProcessor and TextCleaner integration.
"""

from ai_service.services.semantic_clustering.processors.profile_processor import ProfileProcessor
from ai_service.services.semantic_clustering.processors.text_cleaner import TextCleaner

def create_enhanced_profile_processor(embedding_model=None, memory_manager=None, account_service=None):
    """
    Factory method to create a ProfileProcessor with enhanced TextCleaner.
    
    Args:
        embedding_model: Model for generating embeddings
        memory_manager: Service for managing memory usage
        account_service: Service for account-related operations
        
    Returns:
        ProfileProcessor: Configured ProfileProcessor instance
    """
    # Create enhanced TextCleaner with optimal settings for ML
    text_cleaner = TextCleaner(
        language='english',
        remove_stopwords=True,
        lemmatize=True,
        remove_urls=True,
        remove_emails=True,
        remove_mentions=True,
        remove_hashtags=False,  # Keep hashtags as they provide context
        normalize_whitespace=True,
        min_word_length=2,
        max_word_length=50
    )
    
    # Create ProfileProcessor with enhanced text cleaning
    profile_processor = ProfileProcessor(
        embedding_model=embedding_model,
        text_cleaner=text_cleaner,
        memory_manager=memory_manager,
        account_service=account_service
    )
    
    return profile_processor

def create_lda_optimized_text_cleaner():
    """
    Factory method to create a TextCleaner optimized for LDA topic modeling.
    
    Returns:
        TextCleaner: Configured TextCleaner instance optimized for LDA
    """
    return TextCleaner(
        language='english',
        remove_stopwords=True,
        lemmatize=True,
        remove_urls=True,
        remove_emails=True,
        remove_mentions=True,
        remove_hashtags=False,  # Keep hashtags for topic modeling
        normalize_whitespace=True,
        min_word_length=3,  # Slightly longer minimum for LDA
        max_word_length=50
    )

def create_semantic_clustering_text_cleaner():
    """
    Factory method to create a TextCleaner optimized for semantic clustering.
    
    Returns:
        TextCleaner: Configured TextCleaner instance optimized for semantic clustering
    """
    return TextCleaner(
        language='english',
        remove_stopwords=True,
        lemmatize=True,
        remove_urls=True,
        remove_emails=True,
        remove_mentions=True,
        remove_hashtags=True,  # Remove hashtags for cleaner embeddings
        normalize_whitespace=True,
        min_word_length=2,
        max_word_length=50
    )
