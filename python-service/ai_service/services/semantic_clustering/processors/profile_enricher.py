"""
Profile enrichment service for the semantic clustering pipeline.
Handles profile data enrichment with additional context from posts and following.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.utils.text_cleaner import TextCleaner


class ProfileEnricher:
    """Service responsible for enriching profile data with additional context."""
    
    def __init__(self, text_cleaner: TextCleaner, account_service: Optional[Any] = None):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.text_cleaner = text_cleaner
        self.account_service = account_service
        
        self.logger.info("🔄 ProfileEnricher initialized")
    

    async def extract_profile_text(self, profile: Any) -> Tuple[str, List[str], List[str]]:
        """
        Extract comprehensive text data from a profile including posts and following.
        
        Args:
            profile: ProfileView object
            
        Returns:
            Tuple of (bio_text, posts_text, following_bios)
        """
        try:
            # Basic profile text (bio/description)
            bio_text = getattr(profile, 'description', '') or ''
            if bio_text and self.text_cleaner:
                bio_text = self.text_cleaner.clean(bio_text, aggressive=False)
            
            
        except Exception as e:
            self.logger.error(f"Error extracting text from profile {getattr(profile, 'handle', 'unknown')}: {e}")
            # Enhanced fallback
            return bio_text, [], []
    
    async def _fetch_additional_profile_data(self, profile: Any) -> Dict[str, Any]:
        """
        Fetch additional profile data using AccountService.
        
        Args:
            profile: ProfileView object
            
        Returns:
            Dictionary with additional profile data
        """
        if not self.account_service:
            return {}
        
        try:
            # This would be implemented based on the AccountService interface
            # For now, return empty data as a placeholder
            return {
            }
        except Exception as e:
            self.logger.debug(f"Error fetching additional data: {e}")
            return {}
    
    def normalize_profile_data(self, profile: Any) -> Dict[str, Any]:
        """
        Normalize profile data into a consistent format.
        
        Args:
            profile: ProfileView object to normalize
            
        Returns:
            Dict[str, Any]: Normalized profile data
        """
        try:
            return {
                'handle': getattr(profile, 'handle', ''),
                'display_name': getattr(profile, 'display_name', ''),
                'description': getattr(profile, 'description', ''),
                'followers_count': getattr(profile, 'followers_count', 0),
                'follows_count': getattr(profile, 'follows_count', 0),
                'posts_count': getattr(profile, 'posts_count', 0),
                'did': getattr(profile, 'did', ''),
                'avatar': getattr(profile, 'avatar', ''),
                'banner': getattr(profile, 'banner', ''),
                'created_at': getattr(profile, 'created_at', None),
                'labels': getattr(profile, 'labels', []),
                'viewer': getattr(profile, 'viewer', None),
                'associated': getattr(profile, 'associated', None),
                'indexed_at': getattr(profile, 'indexed_at', None)
            }
        except Exception as e:
            self.logger.error(f"Error normalizing profile data: {e}")
            return {
                'handle': str(profile) if profile else '',
                'display_name': '',
                'description': '',
                'followers_count': 0,
                'follows_count': 0,
                'posts_count': 0,
                'did': '',
                'avatar': '',
                'banner': '',
                'created_at': None,
                'labels': [],
                'viewer': None,
                'associated': None,
                'indexed_at': None
            }
