"""
Profile deduplication service for the semantic clustering pipeline.
Handles removal of duplicate profiles based on various identifiers.
"""

import logging
from typing import List, Any


class ProfileDeduplicator:
    """Service responsible for removing duplicate profiles from lists."""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info("🔄 ProfileDeduplicator initialized")
    
    def deduplicate_profiles(self, profiles: List[Any]) -> List[Any]:
        """
        Remove duplicate profiles from a list.
        
        Args:
            profiles: List of profiles that may contain duplicates
            
        Returns:
            List: Deduplicated list of profiles
        """
        try:
            if not profiles:
                self.logger.info("No profiles to deduplicate")
                return []
                
            seen_handles = set()
            seen_dids = set()
            unique_profiles = []
            
            # Log sample profile structure for debugging
            if profiles:
                sample_profile = profiles[0]
                self.logger.debug(f"Sample profile type: {type(sample_profile)}")
                if hasattr(sample_profile, '__dict__'):
                    self.logger.debug(f"Sample profile attributes: {list(sample_profile.__dict__.keys())}")
                elif isinstance(sample_profile, dict):
                    self.logger.debug(f"Sample profile keys: {list(sample_profile.keys())}")
            
            for i, profile in enumerate(profiles):
                # Essayez d'accéder aux attributs via getattr ET via dict
                handle = getattr(profile, 'handle', None) or (profile.get('handle') if isinstance(profile, dict) else None)
                did = getattr(profile, 'did', None) or (profile.get('did') if isinstance(profile, dict) else None)
                
                # Debug logging pour les premiers profils
                if len(unique_profiles) < 3:
                    self.logger.debug(f"Profile {i+1}: handle='{handle}', did='{did}', type={type(profile)}")
                
                # Si ni handle ni did, on accepte le profil (pas de déduplication possible)
                if not handle and not did:
                    self.logger.debug(f"Profile {i+1} has no identifiers, keeping it")
                    unique_profiles.append(profile)
                    continue
                
                # Marquer comme dupliqué si on a déjà vu cet identificateur
                is_duplicate = False
                
                if did and did in seen_dids:
                    is_duplicate = True
                    self.logger.debug(f"Duplicate DID found: {did}")
                elif handle and handle in seen_handles:
                    is_duplicate = True
                    self.logger.debug(f"Duplicate handle found: {handle}")
                
                if not is_duplicate:
                    # Ajouter aux sets vus
                    if did:
                        seen_dids.add(did)
                    if handle:
                        seen_handles.add(handle)
                    unique_profiles.append(profile)
                else:
                    # Log les profils qui sont considérés comme des doublons
                    if i < 5:  # Log seulement les premiers pour éviter le spam
                        self.logger.debug(f"Duplicate profile {i+1}: handle='{handle}', did='{did}'")
                    
            self.logger.info(f"Deduplicated {len(profiles)} profiles to {len(unique_profiles)}")
            
            # Si aucun profil unique trouvé, c'est suspect
            if len(unique_profiles) == 0 and len(profiles) > 0:
                self.logger.warning("⚠️  No unique profiles found! This might indicate a problem with deduplication logic.")
                self.logger.warning(f"First profile sample: handle='{getattr(profiles[0], 'handle', None) or (profiles[0].get('handle') if isinstance(profiles[0], dict) else None)}', did='{getattr(profiles[0], 'did', None) or (profiles[0].get('did') if isinstance(profiles[0], dict) else None)}'")
            
            return unique_profiles
            
        except Exception as e:
            self.logger.error(f"Error deduplicating profiles: {e}")
            return profiles

    def deduplicate_by_handle(self, profiles: List[Any]) -> List[Any]:
        """
        Remove duplicate profiles using handle as the primary identifier.
        
        Args:
            profiles: List of profiles that may contain duplicates
            
        Returns:
            List: Deduplicated list of profiles
        """
        try:
            seen_handles = set()
            unique_profiles = []
            
            for profile in profiles:
                handle = getattr(profile, 'handle', '')
                
                if handle and handle not in seen_handles:
                    seen_handles.add(handle)
                    unique_profiles.append(profile)
                    
            self.logger.info(f"Deduplicated by handle: {len(profiles)} profiles to {len(unique_profiles)}")
            return unique_profiles
            
        except Exception as e:
            self.logger.error(f"Error deduplicating profiles by handle: {e}")
            return profiles

    def deduplicate_by_did(self, profiles: List[Any]) -> List[Any]:
        """
        Remove duplicate profiles using DID as the primary identifier.
        
        Args:
            profiles: List of profiles that may contain duplicates
            
        Returns:
            List: Deduplicated list of profiles
        """
        try:
            seen_dids = set()
            unique_profiles = []
            
            for profile in profiles:
                did = getattr(profile, 'did', '')
                
                if did and did not in seen_dids:
                    seen_dids.add(did)
                    unique_profiles.append(profile)
                elif not did:
                    # Keep profiles without DID (fallback)
                    unique_profiles.append(profile)
                    
            self.logger.info(f"Deduplicated by DID: {len(profiles)} profiles to {len(unique_profiles)}")
            return unique_profiles
            
        except Exception as e:
            self.logger.error(f"Error deduplicating profiles by DID: {e}")
            return profiles

    def get_deduplication_stats(self, original_profiles: List[Any], deduplicated_profiles: List[Any]) -> dict:
        """
        Get statistics about the deduplication process.
        
        Args:
            original_profiles: Original list of profiles
            deduplicated_profiles: Deduplicated list of profiles
            
        Returns:
            Dictionary with deduplication statistics
        """
        try:
            original_count = len(original_profiles)
            deduplicated_count = len(deduplicated_profiles)
            duplicates_removed = original_count - deduplicated_count
            
            return {
                'original_count': original_count,
                'deduplicated_count': deduplicated_count,
                'duplicates_removed': duplicates_removed,
                'duplicate_rate': duplicates_removed / original_count if original_count > 0 else 0.0,
                'retention_rate': deduplicated_count / original_count if original_count > 0 else 0.0
            }
        except Exception as e:
            self.logger.error(f"Error calculating deduplication stats: {e}")
            return {
                'original_count': 0,
                'deduplicated_count': 0,
                'duplicates_removed': 0,
                'duplicate_rate': 0.0,
                'retention_rate': 0.0
            }

    def find_duplicates(self, profiles: List[Any]) -> dict:
        """
        Find and categorize duplicates without removing them.
        
        Args:
            profiles: List of profiles to analyze
            
        Returns:
            Dictionary categorizing duplicate profiles
        """
        try:
            handle_groups = {}
            did_groups = {}
            
            for i, profile in enumerate(profiles):
                handle = getattr(profile, 'handle', '')
                did = getattr(profile, 'did', '')
                
                # Group by handle
                if handle:
                    if handle not in handle_groups:
                        handle_groups[handle] = []
                    handle_groups[handle].append(i)
                
                # Group by DID
                if did:
                    if did not in did_groups:
                        did_groups[did] = []
                    did_groups[did].append(i)
            
            # Find actual duplicates
            handle_duplicates = {k: v for k, v in handle_groups.items() if len(v) > 1}
            did_duplicates = {k: v for k, v in did_groups.items() if len(v) > 1}
            
            return {
                'handle_duplicates': handle_duplicates,
                'did_duplicates': did_duplicates,
                'total_handle_duplicate_groups': len(handle_duplicates),
                'total_did_duplicate_groups': len(did_duplicates),
                'total_duplicate_profiles': sum(len(v) - 1 for v in handle_duplicates.values()) +
                                         sum(len(v) - 1 for v in did_duplicates.values())
            }
            
        except Exception as e:
            self.logger.error(f"Error finding duplicates: {e}")
            return {
                'handle_duplicates': {},
                'did_duplicates': {},
                'total_handle_duplicate_groups': 0,
                'total_did_duplicate_groups': 0,
                'total_duplicate_profiles': 0
            }
