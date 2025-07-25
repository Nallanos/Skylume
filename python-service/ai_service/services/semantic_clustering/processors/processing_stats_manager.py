"""
Processing statistics management service for the semantic clustering pipeline.
Handles tracking and reporting of processing metrics.
"""

import logging
from typing import Dict, Any


class ProcessingStatsManager:
    """Service responsible for managing processing statistics and metrics."""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.processing_stats = self._initialize_stats()
        
        self.logger.info("🔄 ProcessingStatsManager initialized")
    
    def _initialize_stats(self) -> Dict[str, Any]:
        """Initialize processing statistics dictionary."""
        return {
            'total_processed': 0,
            'successfully_processed': 0,
            'empty_profiles': 0,
            'semantically_empty': 0,
            'too_short': 0,
            'processing_errors': 0,
            'profiles_with_bio': 0,
            'profiles_with_posts': 0,
            'profiles_with_following': 0,
            'filtered_posts': 0,
            'filtered_following_bios': 0,
            'insufficient_profiles': 0,
            'bio_only_profiles': 0,
            'noise_profiles': 0
        }
    
    def get_processing_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive processing statistics including filtering metrics.
        
        Returns:
            Dictionary containing processing statistics and metrics
        """
        stats = self.processing_stats.copy()
        
        # Calculate derived metrics
        if stats['total_processed'] > 0:
            stats['success_rate'] = stats['successfully_processed'] / stats['total_processed']
            stats['empty_profile_rate'] = stats['empty_profiles'] / stats['total_processed']
            stats['semantic_empty_rate'] = stats['semantically_empty'] / stats['total_processed']
            stats['error_rate'] = stats['processing_errors'] / stats['total_processed']
        else:
            stats['success_rate'] = 0.0
            stats['empty_profile_rate'] = 0.0
            stats['semantic_empty_rate'] = 0.0
            stats['error_rate'] = 0.0
        
        # Text filtering efficiency
        total_posts_fetched = stats['filtered_posts'] + (stats['profiles_with_posts'] * 3)  # Assuming avg 3 kept per profile
        total_following_fetched = stats['filtered_following_bios'] + (stats['profiles_with_following'] * 2)  # Assuming avg 2 kept per profile
        
        if total_posts_fetched > 0:
            stats['posts_filtering_rate'] = 0.0
            stats['following_filtering_rate'] = 0.0
        return stats

        stats['profiles_with_complete_data'] = stats['profiles_with_bio'] + stats.get('profiles_with_following', 0)
        """Reset all processing statistics to start fresh."""
        self.processing_stats = self._initialize_stats()
        self.logger.info("📊 Processing statistics reset")

    def increment_stat(self, stat_name: str, amount: int = 1):
        """
        Increment a specific statistic.
        
        Args:
            stat_name: Name of the statistic to increment
            amount: Amount to increment by (default: 1)
        """
        if stat_name in self.processing_stats:
            self.processing_stats[stat_name] += amount
        else:
            self.logger.warning(f"Unknown statistic: {stat_name}")

    def set_stat(self, stat_name: str, value: Any):
        """
        Set a specific statistic value.
        
        Args:
            stat_name: Name of the statistic to set
            value: Value to set
        """
        if stat_name in self.processing_stats:
            self.processing_stats[stat_name] = value
        else:
            self.logger.warning(f"Unknown statistic: {stat_name}")

    def get_stat(self, stat_name: str) -> Any:
        """
        Get a specific statistic value.
        
        Args:
            stat_name: Name of the statistic to get
            
        Returns:
            Statistic value or 0 if not found
        """
        return self.processing_stats.get(stat_name, 0)

    def log_summary(self):
        """Log a summary of current processing statistics."""
        stats = self.get_processing_statistics()
        
        self.logger.info("📊 Processing Statistics Summary:")
        self.logger.info(f"   Total Processed: {stats['total_processed']}")
        self.logger.info(f"   Successfully Processed: {stats['successfully_processed']}")
        self.logger.info(f"   Success Rate: {stats['success_rate']:.2%}")
        self.logger.info(f"   Empty Profiles: {stats['empty_profiles']} ({stats['empty_profile_rate']:.2%})")
        self.logger.info(f"   Processing Errors: {stats['processing_errors']} ({stats['error_rate']:.2%})")
        
        if stats['profiles_with_bio'] > 0 or stats['profiles_with_posts'] > 0 or stats['profiles_with_following'] > 0:
            self.logger.info("   Data Sources:")
            self.logger.info(f"     Bio: {stats['profiles_with_bio']}")
            self.logger.info(f"     Posts: {stats['profiles_with_posts']}")
            self.logger.info(f"     Following: {stats['profiles_with_following']}")

    def update_stats_from_processing(self, processing_result: Dict[str, Any]):
        """
        Update statistics from a processing result.
        
        Args:
            processing_result: Dictionary containing processing results and metrics
        """
        try:
            # Update basic counts
            if 'total_processed' in processing_result:
                self.increment_stat('total_processed', processing_result['total_processed'])
            
            if 'successfully_processed' in processing_result:
                self.increment_stat('successfully_processed', processing_result['successfully_processed'])
            
            if 'empty_profiles' in processing_result:
                self.increment_stat('empty_profiles', processing_result['empty_profiles'])
            
            if 'processing_errors' in processing_result:
                self.increment_stat('processing_errors', processing_result['processing_errors'])
            
            # Update source-specific counts
            for stat_key in ['profiles_with_bio', 'profiles_with_posts', 'profiles_with_following',
                           'filtered_posts', 'filtered_following_bios', 'insufficient_profiles']:
                if stat_key in processing_result:
                    self.increment_stat(stat_key, processing_result[stat_key])
            
            self.logger.debug("📊 Statistics updated from processing result")
            
        except Exception as e:
            self.logger.error(f"Error updating statistics from processing result: {e}")
