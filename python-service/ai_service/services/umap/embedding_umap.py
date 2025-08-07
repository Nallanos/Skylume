"""
UMAP Embedding Visualization Service

This module provides visualization capabilities for embeddings using UMAP,
including support for both pre-clustering and post-clustering visualizations.
"""

import json
import os
import logging
import subprocess
from typing import List, Dict, Any, Optional
import numpy as np


class EmbeddingUMAPVisualizer:
    """
    Service for generating UMAP visualizations of embeddings and clusters.
    
    This class handles:
    1. Exporting user embeddings for UMAP visualization
    2. Running UMAP visualization scripts
    3. Exporting clustered data for colored visualizations
    4. Profile handle extraction utilities
    """
    
    def __init__(self, output_dir: str = None, logger: logging.Logger = None):
        """
        Initialize the UMAP visualizer.
        
        Args:
            output_dir: Directory for output files (defaults to current working directory)
            logger: Logger instance (creates new one if not provided)
        """
        self.logger = logger or logging.getLogger(self.__class__.__name__)
        self.output_dir = output_dir or os.getcwd()
        self.user_embeddings_file = os.path.join(self.output_dir, "user_embeddings.json")
        self.clustered_data_file = os.path.join(self.output_dir, "clustered_data_for_adonisjs.json")
    
    def export_user_embeddings_for_umap(self, profiles: List[Dict], embeddings: List[Any]) -> int:
        """
        Export user embeddings and profiles for UMAP visualization.
        
        This method prepares data for pre-clustering UMAP visualization by exporting
        profile information with their corresponding embeddings.
        
        Args:
            profiles: List of user profiles with handle/display_name information
            embeddings: List of embedding vectors (numpy arrays or lists)
            
        Returns:
            Number of profiles exported
        """
        try:
            if not profiles or not embeddings:
                self.logger.warning("No profiles or embeddings provided for UMAP export")
                return 0
            
            if len(profiles) != len(embeddings):
                self.logger.warning(f"Mismatch: {len(profiles)} profiles vs {len(embeddings)} embeddings")
                # Use the minimum length to avoid index errors
                min_length = min(len(profiles), len(embeddings))
                profiles = profiles[:min_length]
                embeddings = embeddings[:min_length]
            
            export_data = []
            
            for i, (profile, embedding) in enumerate(zip(profiles, embeddings)):
                try:
                    # Convert numpy array to list if needed
                    if hasattr(embedding, 'tolist'):
                        embedding_list = embedding.tolist()
                    elif isinstance(embedding, list):
                        embedding_list = embedding
                    else:
                        self.logger.warning(f"Unknown embedding type for profile {i}: {type(embedding)}")
                        continue
                    
                    # Extract profile information
                    handle = self._extract_single_profile_handle(profile)
                    display_name = profile.get('display_name', '') or profile.get('displayName', '') or handle
                    bio = profile.get('description', '') or profile.get('bio', '') or ''
                    
                    profile_data = {
                        'handle': handle,
                        'display_name': display_name,
                        'bio': bio[:200] + ('...' if len(bio) > 200 else ''),  # Truncate long bios
                        'embedding': embedding_list
                    }
                    
                    export_data.append(profile_data)
                    
                except Exception as e:
                    self.logger.warning(f"Error processing profile {i}: {e}")
                    continue
            
            # Write to JSON file
            with open(self.user_embeddings_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"📊 Exported {len(export_data)} user embeddings to {self.user_embeddings_file}")
            return len(export_data)
            
        except Exception as e:
            self.logger.error(f"❌ Error exporting user embeddings for UMAP: {e}")
            return 0
    
    def run_umap_visualization(self) -> bool:
        """
        Run UMAP visualization script for pre-clustering embeddings.
        
        This method executes an external Python script to generate UMAP visualization
        of user embeddings before clustering.
        
        Returns:
            True if visualization was successful, False otherwise
        """
        try:
            if not os.path.exists(self.user_embeddings_file):
                self.logger.warning(f"User embeddings file not found: {self.user_embeddings_file}")
                return False
            
            # Look for UMAP visualization script
            script_paths = [
                os.path.join(self.output_dir, "test_lda_pca_visualization.py"),
                os.path.join(self.output_dir, "scripts", "umap_visualization.py"),
                os.path.join(self.output_dir, "ai_service", "scripts", "umap_visualization.py")
            ]
            
            umap_script = None
            for script_path in script_paths:
                if os.path.exists(script_path):
                    umap_script = script_path
                    break
            
            if not umap_script:
                self.logger.warning("UMAP visualization script not found, skipping visualization")
                return False
            
            self.logger.info(f"🎨 Running UMAP visualization with script: {umap_script}")
            
            # Run the UMAP script
            result = subprocess.run(
                ["python", umap_script],
                cwd=self.output_dir,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                self.logger.info("✅ UMAP visualization completed successfully")
                return True
            else:
                self.logger.warning(f"⚠️ UMAP visualization script returned non-zero exit code: {result.returncode}")
                if result.stderr:
                    self.logger.warning(f"UMAP script stderr: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            self.logger.warning("⚠️ UMAP visualization script timed out")
            return False
        except Exception as e:
            self.logger.warning(f"⚠️ Error running UMAP visualization: {e}")
            return False
    
    def export_clustered_data_for_umap(self, final_clusters: List[Dict]) -> int:
        """
        Export clustered data for colored UMAP visualization.
        
        This method prepares final cluster data for post-clustering UMAP visualization
        with color-coded clusters and tags.
        
        Args:
            final_clusters: List of final clusters with profiles and tags
            
        Returns:
            Number of profiles exported across all clusters
        """
        try:
            if not final_clusters:
                self.logger.warning("No final clusters provided for UMAP export")
                return 0
            
            export_data = []
            total_profiles = 0
            
            for cluster_idx, cluster in enumerate(final_clusters):
                try:
                    profiles = cluster.get('profiles', [])
                    cluster_tag = cluster.get('tag', f'Cluster_{cluster_idx}')
                    cluster_embedding = cluster.get('embedding', [])
                    
                    # Convert cluster embedding if it's a numpy array
                    if hasattr(cluster_embedding, 'tolist'):
                        cluster_embedding = cluster_embedding.tolist()
                    
                    for profile_idx, profile in enumerate(profiles):
                        try:
                            handle = self._extract_single_profile_handle(profile)
                            display_name = profile.get('display_name', '') or profile.get('displayName', '') or handle
                            bio = profile.get('description', '') or profile.get('bio', '') or ''
                            
                            # Try to get individual profile embedding, fallback to cluster embedding
                            profile_embedding = None
                            if hasattr(profile, 'get') and profile.get('embedding'):
                                profile_embedding = profile['embedding']
                            elif cluster_embedding:
                                profile_embedding = cluster_embedding
                            else:
                                continue  # Skip profiles without embeddings
                            
                            # Convert embedding to list if needed
                            if hasattr(profile_embedding, 'tolist'):
                                profile_embedding = profile_embedding.tolist()
                            
                            profile_data = {
                                'handle': handle,
                                'display_name': display_name,
                                'bio': bio[:200] + ('...' if len(bio) > 200 else ''),
                                'cluster_tag': cluster_tag,
                                'cluster_id': cluster_idx,
                                'embedding': profile_embedding,
                                'cluster_size': cluster.get('size', len(profiles)),
                                'cohesion': cluster.get('cohesion', 0.0)
                            }
                            
                            export_data.append(profile_data)
                            total_profiles += 1
                            
                        except Exception as e:
                            self.logger.warning(f"Error processing profile {profile_idx} in cluster {cluster_idx}: {e}")
                            continue
                            
                except Exception as e:
                    self.logger.warning(f"Error processing cluster {cluster_idx}: {e}")
                    continue
            
            # Write clustered data to JSON file
            with open(self.clustered_data_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"📊 Exported {total_profiles} clustered profiles to {self.clustered_data_file}")
            return total_profiles
            
        except Exception as e:
            self.logger.error(f"❌ Error exporting clustered data for UMAP: {e}")
            return 0
    
    def run_clustered_umap_visualization(self) -> bool:
        """
        Run UMAP visualization script for clustered data.
        
        This method executes an external Python script to generate colored UMAP
        visualization of clustered data with tags.
        
        Returns:
            True if visualization was successful, False otherwise
        """
        try:
            if not os.path.exists(self.clustered_data_file):
                self.logger.warning(f"Clustered data file not found: {self.clustered_data_file}")
                return False
            
            # Look for clustered UMAP visualization script
            script_paths = [
                os.path.join(self.output_dir, "clustered_umap_visualization.py"),
                os.path.join(self.output_dir, "scripts", "clustered_umap_visualization.py"),
                os.path.join(self.output_dir, "ai_service", "scripts", "clustered_umap_visualization.py")
            ]
            
            umap_script = None
            for script_path in script_paths:
                if os.path.exists(script_path):
                    umap_script = script_path
                    break
            
            if not umap_script:
                self.logger.warning("Clustered UMAP visualization script not found, skipping visualization")
                return False
            
            self.logger.info(f"🎨 Running clustered UMAP visualization with script: {umap_script}")
            
            # Run the clustered UMAP script
            result = subprocess.run(
                ["python", umap_script],
                cwd=self.output_dir,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                self.logger.info("✅ Clustered UMAP visualization completed successfully")
                return True
            else:
                self.logger.warning(f"⚠️ Clustered UMAP visualization script returned non-zero exit code: {result.returncode}")
                if result.stderr:
                    self.logger.warning(f"Clustered UMAP script stderr: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            self.logger.warning("⚠️ Clustered UMAP visualization script timed out")
            return False
        except Exception as e:
            self.logger.warning(f"⚠️ Error running clustered UMAP visualization: {e}")
            return False
    
    def _extract_single_profile_handle(self, profile: Dict) -> str:
        """
        Extract handle from a single profile dictionary.
        
        Args:
            profile: Profile dictionary containing handle information
            
        Returns:
            Profile handle as string
        """
        try:
            # Try different possible handle fields
            handle_fields = ['handle', 'did', 'actor', 'uri', 'user_handle', 'username']
            
            for field in handle_fields:
                if field in profile and profile[field]:
                    handle = profile[field]
                    # Clean up handle format
                    if isinstance(handle, str):
                        # Remove 'at://' prefix if present
                        if handle.startswith('at://'):
                            handle = handle.replace('at://', '')
                        # Remove 'did:plc:' prefix if present  
                        if handle.startswith('did:plc:'):
                            handle = handle.replace('did:plc:', '')
                        # Ensure handle starts with @
                        if not handle.startswith('@') and '.' in handle:
                            handle = f"@{handle}"
                        return handle
            
            # Fallback to string representation of the profile
            return str(profile.get('handle', 'unknown'))
            
        except Exception as e:
            self.logger.warning(f"Error extracting handle from profile: {e}")
            return 'unknown'
    
    def extract_profile_handles(self, profiles: List[Dict]) -> List[str]:
        """
        Extract handles from a list of profiles.
        
        Args:
            profiles: List of profile dictionaries
            
        Returns:
            List of handles as strings
        """
        try:
            handles = []
            for profile in profiles:
                handle = self._extract_single_profile_handle(profile)
                handles.append(handle)
            
            self.logger.debug(f"Extracted {len(handles)} handles from {len(profiles)} profiles")
            return handles
            
        except Exception as e:
            self.logger.error(f"Error extracting profile handles: {e}")
            return []
