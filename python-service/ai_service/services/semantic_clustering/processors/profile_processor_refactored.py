"""
Refactored Profile processing service for the semantic clustering pipeline.
This version follows single responsibility principle by delegating tasks to specialized services.
"""

import logging
from typing import List, Dict, Any, Optional
from ai_service.utils.text_cleaner import TextCleaner
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.infrastructure import MemoryManager
from ai_service.services.semantic_clustering.processors.profile_enricher import ProfileEnricher
from ai_service.services.semantic_clustering.processors.embedding_generator import EmbeddingGenerator
from ai_service.services.semantic_clustering.processors.embedding_validator import EmbeddingValidator
from ai_service.services.semantic_clustering.processors.processing_stats_manager import ProcessingStatsManager
from ai_service.services.semantic_clustering.processors.profile_deduplicator import ProfileDeduplicator


class ProfileProcessor:
    """
    Refactored service responsible for processing and preparing profile data.
    
    This version delegates specialized responsibilities to focused services:
    - ProfileEnricher: Handles profile enrichment with additional context
    - EmbeddingGenerator: Manages embedding creation with error recovery
    - EmbeddingValidator: Validates embedding quality and cleans datasets
    - ProcessingStatsManager: Tracks and reports processing metrics
    - ProfileDeduplicator: Removes duplicate profiles
    """
    
    def __init__(self, embedding_model: EmbeddingModel, text_cleaner: TextCleaner, memory_manager: MemoryManager, account_service: Optional[Any] = None):
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Core dependencies
        self.embedding_model = embedding_model
        self.text_cleaner = text_cleaner
        self.memory_manager = memory_manager
        self.account_service = account_service
        
        # Initialize specialized services
        self.enricher = ProfileEnricher(text_cleaner, account_service)
        self.embedding_generator = EmbeddingGenerator(embedding_model)
        self.validator = EmbeddingValidator()
        self.stats_manager = ProcessingStatsManager()
        self.deduplicator = ProfileDeduplicator()
        
        self.logger.info("🔄 Refactored ProfileProcessor initialized with specialized services")
    
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
        Complete profile processing pipeline using specialized services.
        
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
            self.stats_manager.increment_stat('total_processed', len(followers))
            
            # Step 1: Remove duplicates using ProfileDeduplicator
            unique_followers = self.deduplicator.deduplicate_profiles(followers)
            dedup_stats = self.deduplicator.get_deduplication_stats(followers, unique_followers)
            self.logger.info(f"🔄 Removed {dedup_stats['duplicates_removed']} duplicates")
            
            # Step 2: Extract text from all profiles
            all_profile_texts = self.extract_profile_texts(unique_followers)
            
            # Step 3: Filter to keep only profiles with meaningful text
            valid_profiles, valid_texts = self.filter_valid_profiles(unique_followers, all_profile_texts)
            
            if len(valid_profiles) < 2:
                self.logger.warning("Insufficient valid profiles for clustering")
                self.stats_manager.increment_stat('insufficient_profiles', len(unique_followers))
                return {
                    'valid_profiles': [],
                    'profile_texts': [],
                    'profile_embeddings': []
                }
            
            self.logger.info(f"✅ Prepared {len(valid_profiles)} valid profiles from {len(unique_followers)} total")
            self.stats_manager.increment_stat('successfully_processed', len(valid_profiles))
            
            # Step 4: Generate embeddings using EmbeddingGenerator
            profile_embeddings = self.embedding_generator.generate_embeddings(valid_texts)
            
            # Step 5: Update statistics
            self.stats_manager.update_stats_from_processing({
                'profiles_with_bio': len([p for p in valid_profiles if self._get_profile_field(p, 'description')]),
                'empty_profiles': len(unique_followers) - len(valid_profiles)
            })
            
            return {
                'valid_profiles': valid_profiles,
                'profile_texts': valid_texts,
                'profile_embeddings': profile_embeddings
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error in profile processing: {e}")
            self.stats_manager.increment_stat('processing_errors')
            return {
                'valid_profiles': [],
                'profile_texts': [],
                'profile_embeddings': []
            }
    
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
    
    # Delegation methods for backward compatibility
    async def enrich_profile(self, profile: Any) -> Dict[str, Any]:
        """Delegate to ProfileEnricher."""
        return await self.enricher.enrich_profile(profile)
    
    def validate_embedding_quality(self, embedding: List[float]) -> bool:
        """Delegate to EmbeddingValidator."""
        return self.validator.validate_embedding_quality(embedding)
    
    def clean_embeddings_data(self, profiles_with_embeddings: List[Dict]) -> List[Dict]:
        """Delegate to EmbeddingValidator."""
        return self.validator.clean_embeddings_data(profiles_with_embeddings)
    
    def get_processing_statistics(self) -> Dict[str, Any]:
        """Delegate to ProcessingStatsManager."""
        return self.stats_manager.get_processing_statistics()
    
    def reset_processing_statistics(self):
        """Delegate to ProcessingStatsManager."""
        self.stats_manager.reset_processing_statistics()
    
    def deduplicate_profiles(self, profiles: List[Any]) -> List[Any]:
        """Delegate to ProfileDeduplicator."""
        return self.deduplicator.deduplicate_profiles(profiles)
    
    def normalize_profile_data(self, profile: Any) -> Dict[str, Any]:
        """Delegate to ProfileEnricher."""
        return self.enricher.normalize_profile_data(profile)
