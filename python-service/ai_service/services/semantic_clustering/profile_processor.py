"""
Profile processing service for the semantic clustering pipeline.
Handles profile text extraction, cleaning, and preparation for embedding.
"""

import logging
from typing import List, Dict, Any, Optional
from ai_service.utils.text_cleaner import TextCleaner
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.memory_manager import MemoryManager


class ProfileProcessor:
    """Service responsible for processing and preparing profile data."""
    
    def __init__(self, embedding_model: EmbeddingModel, text_cleaner: TextCleaner, memory_manager: MemoryManager):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.text_cleaner = text_cleaner
        self.memory_manager = memory_manager
        
        self.logger.info("🔄 ProfileProcessor initialized")
    
    def _get_profile_field(self, profile: Any, field: str, default: str = '') -> str:
        """Safely extract field from profile (dict or object)."""
        if isinstance(profile, dict):
            return profile.get(field, default)
        return getattr(profile, field, default)
    
    def _extract_profile_handles(self, profiles: List[Any]) -> List[str]:
        """Extract handles from profiles (safe for both dict and object)."""
        return [self._get_profile_field(p, 'handle', 'unknown') for p in profiles]
    
    def extract_profile_texts(self, profiles: List[Any]) -> List[str]:
        """Extract and clean text from profiles for analysis."""
        profile_texts = []
        
        for profile in profiles:
            # Handle both object attributes and dictionary access for ProfileView data
            description = self._get_profile_field(profile, 'description')
            handle = self._get_profile_field(profile, 'handle')
            
            # Process description if available
            if description and isinstance(description, str) and description.strip():
                # Clean and prepare text
                cleaned_text = self.text_cleaner.clean(description, aggressive=False)
                if cleaned_text and len(cleaned_text.strip()) > 10:  # Minimum meaningful text
                    profile_texts.append(cleaned_text)
                    continue
            
            # Fallback to handle if no description or description too short
            if handle and isinstance(handle, str) and handle.strip():
                # Clean up handle for better text extraction
                handle_text = handle.replace('.bsky.social', '').replace('.', ' ')
                if handle_text.strip():
                    profile_texts.append(handle_text)
                    continue
            
            # Add empty string as fallback
            profile_texts.append("")
        
        return profile_texts
    
    def filter_valid_profiles(self, profiles: List[Any], profile_texts: List[str]) -> tuple[List[Any], List[str]]:
        """Filter profiles that have meaningful text content."""
        valid_profiles = []
        valid_texts = []
        
        for profile, text in zip(profiles, profile_texts):
            if text and text.strip():  # Has meaningful text
                valid_profiles.append(profile)
                valid_texts.append(text)
        
        return valid_profiles, valid_texts
    
    async def process_profiles(self, followers: List[Any]) -> Dict[str, Any]:
        """
        Complete profile processing pipeline.
        
        Args:
            followers: Raw follower profile data
            
        Returns:
            Dict containing processed profiles, texts, and embeddings
        """
        try:
            if not followers:
                self.logger.warning("No followers provided for processing")
                return {
                    'valid_profiles': [],
                    'profile_texts': [],
                    'profile_embeddings': []
                }
            
            self.logger.info(f"🔄 Processing {len(followers)} profiles")
            
            # Extract text from all profiles
            all_profile_texts = self.extract_profile_texts(followers)
            
            # Filter to keep only profiles with meaningful text
            valid_profiles, valid_texts = self.filter_valid_profiles(followers, all_profile_texts)
            
            if len(valid_profiles) < 2:
                self.logger.warning("Insufficient valid profiles for clustering")
                return {
                    'valid_profiles': [],
                    'profile_texts': [],
                    'profile_embeddings': []
                }
            
            self.logger.info(f"✅ Prepared {len(valid_profiles)} valid profiles from {len(followers)} total")
            
            # Generate embeddings for valid profile texts
            try:
                profile_embeddings = self.embedding_model.encode(valid_texts)
                
                # Convert to list format if needed
                if hasattr(profile_embeddings, 'tolist'):
                    profile_embeddings = profile_embeddings.tolist()
                elif not isinstance(profile_embeddings, list):
                    profile_embeddings = list(profile_embeddings)
                
                self.logger.info(f"✅ Generated {len(profile_embeddings)} profile embeddings")
                
            except Exception as e:
                self.logger.error(f"❌ Error generating embeddings: {e}")
                # Try recovery with smaller batches
                profile_embeddings = self._generate_embeddings_with_recovery(valid_texts)
            
            return {
                'valid_profiles': valid_profiles,
                'profile_texts': valid_texts,
                'profile_embeddings': profile_embeddings
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error in profile processing: {e}")
            return {
                'valid_profiles': [],
                'profile_texts': [],
                'profile_embeddings': []
            }
    
    def _generate_embeddings_with_recovery(self, texts: List[str], batch_size: int = 50) -> List[List[float]]:
        """Generate embeddings with batch processing for recovery."""
        try:
            self.logger.info(f"🔄 Attempting embedding recovery with batch size {batch_size}")
            profile_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i+batch_size]
                batch_embeddings = self.embedding_model.encode(batch)
                
                if hasattr(batch_embeddings, 'tolist'):
                    profile_embeddings.extend(batch_embeddings.tolist())
                else:
                    profile_embeddings.extend(batch_embeddings)
            
            self.logger.info(f"✅ Recovery successful: processed {len(profile_embeddings)} embeddings")
            return profile_embeddings
            
        except Exception as recovery_error:
            self.logger.error(f"❌ Recovery failed: {recovery_error}")
            return []
    
    def extract_cluster_texts(self, cluster_profiles: List[Any]) -> List[str]:
        """Extract text from profiles within a cluster."""
        cluster_texts = []
        
        for profile in cluster_profiles:
            # Get description and handle using helper method
            description = self._get_profile_field(profile, 'description')
            handle = self._get_profile_field(profile, 'handle')
            
            # Use description if available, otherwise handle
            if description and isinstance(description, str) and description.strip():
                cluster_texts.append(description)
            elif handle and isinstance(handle, str) and handle.strip():
                cluster_texts.append(handle.replace('.bsky.social', '').replace('.', ' '))
            else:
                # Fallback to empty string if no text available
                cluster_texts.append("")
        
        return cluster_texts
    
    def get_profile_summary(self, profiles: List[Any]) -> Dict[str, Any]:
        """Get summary statistics about processed profiles."""
        handles = self._extract_profile_handles(profiles)
        texts = self.extract_profile_texts(profiles)
        
        text_lengths = [len(text.strip()) for text in texts if text.strip()]
        
        return {
            'total_profiles': len(profiles),
            'profiles_with_text': len([t for t in texts if t.strip()]),
            'average_text_length': sum(text_lengths) / len(text_lengths) if text_lengths else 0,
            'sample_handles': handles[:5],  # First 5 handles as sample
            'text_distribution': {
                'empty': len([t for t in texts if not t.strip()]),
                'short': len([t for t in texts if 0 < len(t.strip()) <= 50]),
                'medium': len([t for t in texts if 50 < len(t.strip()) <= 200]),
                'long': len([t for t in texts if len(t.strip()) > 200])
            }
        }
