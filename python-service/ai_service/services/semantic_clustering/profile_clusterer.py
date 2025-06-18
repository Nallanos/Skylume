"""
Profile clustering service using HDBSCAN with cosine metric.
Handles the grouping of similar profiles based on their embeddings.
"""

import logging
import numpy as np
from typing import List, Dict, Any
from ai_service.models.interfaces.clustering_model import ClusteringModel
from ai_service.services.semantic_clustering.memory_manager import MemoryManager


class ProfileClusterer:
    """Service responsible for clustering profiles using HDBSCAN."""
    
    def __init__(self, clusterer: ClusteringModel, memory_manager: MemoryManager):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.clusterer = clusterer
        self.memory_manager = memory_manager
        
        self.logger.info("🔄 ProfileClusterer initialized")
    
    def cluster_profiles(self, profile_embeddings: List[List[float]], profiles: List[Any]) -> List[Dict[str, Any]]:
        """
        Cluster profiles using HDBSCAN with cosine metric.
        
        Args:
            profile_embeddings: List of embedding vectors for profiles
            profiles: List of profile objects corresponding to embeddings
            
        Returns:
            List of cluster dictionaries with profiles and embeddings
        """
        try:
            if not profile_embeddings or not profiles:
                self.logger.warning("No profile embeddings or profiles provided for clustering")
                return []
            
            if len(profile_embeddings) != len(profiles):
                self.logger.error("Mismatch between embeddings and profiles count")
                return []
            
            # Memory management before clustering
            self.memory_manager.manage_memory()
            
            # Adjust clustering parameters based on dataset size
            dataset_size = len(profile_embeddings)
            self.clusterer.adjust_for_dataset_size(dataset_size)
            
            self.logger.info(f"🔄 Clustering {dataset_size} profiles with HDBSCAN (cosine metric)")
            self.logger.info(f"📊 Parameters: min_cluster_size={self.clusterer.min_cluster_size}, min_samples={self.clusterer.min_samples}")
            
            # Perform clustering with cosine metric
            cluster_labels, clusterer_instance = self.clusterer.fit_predict(profile_embeddings)
            
            # Organize profiles by cluster
            clusters = {}
            noise_profiles = []
            
            for i, label in enumerate(cluster_labels):
                if label == -1:  # Noise/outlier
                    noise_profiles.append({
                        'profile': profiles[i],
                        'embedding': profile_embeddings[i]
                    })
                else:
                    if label not in clusters:
                        clusters[label] = {
                            'profiles': [],
                            'embedding': []  # Fixed: Use singular 'embedding' to match AdonisJS expectations
                        }
                    clusters[label]['profiles'].append(profiles[i])
                    clusters[label]['embedding'].append(profile_embeddings[i])
            
            # Convert to list format and add metadata
            cluster_list = self._build_cluster_results(clusters, noise_profiles)
            
            # Log cluster statistics
            self._log_clustering_stats(cluster_list, noise_profiles)
            
            return cluster_list
            
        except Exception as e:
            self.logger.error(f"❌ Error in profile clustering: {e}", exc_info=True)
            return []
    
    def _build_cluster_results(self, clusters: Dict, noise_profiles: List[Dict]) -> List[Dict[str, Any]]:
        """Build cluster result objects with metadata."""
        cluster_list = []
        
        # Process regular clusters
        for cluster_id, cluster_data in clusters.items():
            cluster_size = len(cluster_data['profiles'])
            
            # Calculate cluster cohesion
            cohesion = self._calculate_cluster_cohesion(cluster_data['embedding'])  # Fixed: Use singular 'embedding'
            
            cluster_result = {
                'cluster_id': cluster_id,
                'profiles': cluster_data['profiles'],
                'embedding': cluster_data['embedding'],  # Fixed: Use singular 'embedding' to match AdonisJS expectations
                'size': cluster_size,
                'cohesion': cohesion,
                'centroid': self._calculate_cluster_centroid(cluster_data['embedding'])  # Fixed: Use singular 'embedding'
            }
            
            cluster_list.append(cluster_result)
        
        # Handle noise profiles - create small clusters or merge with existing ones
        if noise_profiles and len(noise_profiles) >= 2:
            # Create a noise cluster if we have enough noise profiles
            noise_cluster = {
                'cluster_id': -1,
                'profiles': [item['profile'] for item in noise_profiles],
                'embedding': [item['embedding'] for item in noise_profiles],
                'size': len(noise_profiles),
                'cohesion': self._calculate_cluster_cohesion([item['embedding'] for item in noise_profiles]),
                'centroid': self._calculate_cluster_centroid([item['embedding'] for item in noise_profiles])
            }
            cluster_list.append(noise_cluster)
        
        # Sort clusters by size (largest first)
        cluster_list.sort(key=lambda x: x['size'], reverse=True)
        
        return cluster_list
    
    def _calculate_cluster_cohesion(self, cluster_embeddings: List[List[float]]) -> float:
        """
        Calculate the cohesion score for a cluster based on internal similarity.
        
        Args:
            cluster_embeddings: List of embedding vectors in the cluster
            
        Returns:
            Cohesion score between 0 and 1 (higher = more cohesive)
        """
        try:
            if not cluster_embeddings or len(cluster_embeddings) < 2:
                return 1.0  # Perfect cohesion for single items
            
            embeddings_array = np.array(cluster_embeddings)
            
            # Normalize embeddings for cosine similarity
            norms = np.linalg.norm(embeddings_array, axis=1)
            normalized_embeddings = embeddings_array / norms[:, np.newaxis]
            
            # Calculate pairwise cosine similarities
            similarities = []
            n = len(normalized_embeddings)
            
            for i in range(n):
                for j in range(i + 1, n):
                    similarity = np.dot(normalized_embeddings[i], normalized_embeddings[j])
                    similarities.append(similarity)
            
            # Return average similarity as cohesion score
            return float(np.mean(similarities)) if similarities else 0.0
            
        except Exception as e:
            self.logger.warning(f"Error calculating cluster cohesion: {e}")
            return 0.0
    
    def _calculate_cluster_centroid(self, cluster_embeddings: List[List[float]]) -> np.ndarray:
        """
        Calculate the centroid (mean) of cluster embeddings.
        
        Args:
            cluster_embeddings: List of embedding vectors for the cluster
            
        Returns:
            Normalized centroid vector as numpy array
        """
        try:
            if not cluster_embeddings:
                return np.array([])
            
            # Convert to numpy array and calculate mean
            embeddings_array = np.array(cluster_embeddings)
            centroid = np.mean(embeddings_array, axis=0)
            
            # Normalize the centroid
            norm = np.linalg.norm(centroid)
            if norm > 0:
                centroid = centroid / norm
            
            return centroid
            
        except Exception as e:
            self.logger.warning(f"Error calculating cluster centroid: {e}")
            return np.array([])
    
    def _log_clustering_stats(self, cluster_list: List[Dict], noise_profiles: List[Dict]):
        """Log clustering statistics."""
        total_clustered = sum(c['size'] for c in cluster_list)
        noise_count = len(noise_profiles) if len(noise_profiles) < 2 else 0
        
        self.logger.info(f"✅ Profile clustering complete:")
        self.logger.info(f"   📊 {len(cluster_list)} clusters generated")
        self.logger.info(f"   👥 {total_clustered} profiles clustered")
        self.logger.info(f"   🔇 {noise_count} noise profiles")
        self.logger.info(f"   📈 Cluster sizes: {[c['size'] for c in cluster_list]}")
    
    def get_clustering_summary(self, clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get summary statistics about clustering results."""
        if not clusters:
            return {
                'total_clusters': 0,
                'total_profiles': 0,
                'average_cluster_size': 0,
                'cohesion_stats': {}
            }
        
        sizes = [c['size'] for c in clusters]
        cohesions = [c.get('cohesion', 0) for c in clusters]
        
        return {
            'total_clusters': len(clusters),
            'total_profiles': sum(sizes),
            'cluster_sizes': {
                'min': min(sizes),
                'max': max(sizes),
                'average': sum(sizes) / len(sizes),
                'distribution': sizes
            },
            'cohesion_stats': {
                'min': min(cohesions) if cohesions else 0,
                'max': max(cohesions) if cohesions else 0,
                'average': sum(cohesions) / len(cohesions) if cohesions else 0
            }
        }
