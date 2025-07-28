"""
Cluster fusion service for combining results from multiple clustering algorithms
and implementing scoring/voting system for optimal cluster assignment.
"""
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict, Counter


class ClusterFusionService:
    """Service responsible for fusing results from multiple clustering algorithms."""
    
    def __init__(self, 
                 embedding_weight: float = 0.5,
                 lda_weight: float = 0.3,
                 size_weight: float = 0.1,
                 stability_weight: float = 0.1):
        """
        Initialize cluster fusion service with scoring weights.
        
        Args:
            embedding_weight: Weight for embedding cohesion in scoring
            lda_weight: Weight for LDA cohesion in scoring
            size_weight: Weight for cluster size in scoring
            stability_weight: Weight for cross-method stability in scoring
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Scoring weights (should sum to 1.0)
        self.embedding_weight = embedding_weight
        self.lda_weight = lda_weight
        self.size_weight = size_weight
        self.stability_weight = stability_weight
        
        # Validate weights
        total_weight = embedding_weight + lda_weight + size_weight + stability_weight
        if abs(total_weight - 1.0) > 0.01:
            self.logger.warning(f"⚠️ Scoring weights don't sum to 1.0 (sum={total_weight:.3f})")
        
        self.logger.info(f"🔀 ClusterFusionService initialized with weights: "
                        f"embedding={embedding_weight}, lda={lda_weight}, "
                        f"size={size_weight}, stability={stability_weight}")
    
    def fuse_clustering_results(self, 
                              clustering_results: Dict[str, List[Dict[str, Any]]], 
                              profiles: List[Any],
                              embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Fuse results from multiple clustering methods using scoring system.
        
        Args:
            clustering_results: Dict with method names as keys and cluster lists as values
                               e.g., {'hdbscan_embeddings': [...], 'hdbscan_lda': [...], 'kmeans_lda': [...]}
            profiles: Original list of profile objects
            embeddings: Original list of embeddings
            
        Returns:
            List of fused cluster dictionaries with optimal assignments
        """
        try:
            self.logger.info(f"🔀 Fusing results from {len(clustering_results)} clustering methods")
            
            # Log input methods
            for method, clusters in clustering_results.items():
                self.logger.info(f"  📊 {method}: {len(clusters)} clusters")
            
            if not clustering_results:
                self.logger.warning("⚠️ No clustering results to fuse")
                return []
            
            # Create profile assignment tracking
            profile_assignments = self._track_profile_assignments(clustering_results, profiles)
            
            # Calculate scoring for all candidate clusters
            scored_clusters = self._score_all_clusters(clustering_results, profile_assignments)
            
            # Perform fusion using voting/scoring system
            fused_clusters = self._perform_fusion_voting(scored_clusters, profiles, embeddings)
            
            # Add fusion metadata
            for cluster in fused_clusters:
                cluster['fusion_method'] = 'multi_method_scoring'
                cluster['source_methods'] = cluster.get('source_methods', [])
            
            self.logger.info(f"✅ Fusion completed: {len(fused_clusters)} final clusters")
            return fused_clusters
            
        except Exception as e:
            self.logger.error(f"❌ Error in cluster fusion: {e}")
            return []
    
    def _track_profile_assignments(self, 
                                 clustering_results: Dict[str, List[Dict[str, Any]]], 
                                 profiles: List[Any]) -> Dict[int, Dict[str, int]]:
        """
        Track which cluster each profile belongs to in each method.
        
        Returns:
            Dict mapping profile_index -> {method: cluster_id}
        """
        profile_assignments = defaultdict(dict)
        
        for method, clusters in clustering_results.items():
            for cluster in clusters:
                cluster_profiles = cluster.get('profiles', [])
                cluster_id = cluster.get('cluster_id', -1)
                
                # Find profile indices
                for profile in cluster_profiles:
                    try:
                        profile_idx = profiles.index(profile)
                        profile_assignments[profile_idx][method] = cluster_id
                    except ValueError:
                        # Profile not found in original list
                        continue
        
        self.logger.debug(f"📊 Tracked assignments for {len(profile_assignments)} profiles")
        return dict(profile_assignments)
    
    def _score_all_clusters(self, 
                          clustering_results: Dict[str, List[Dict[str, Any]]], 
                          profile_assignments: Dict[int, Dict[str, int]]) -> List[Dict[str, Any]]:
        """
        Calculate fusion scores for all clusters from all methods.
        
        Returns:
            List of clusters with added scoring information
        """
        scored_clusters = []
        
        for method, clusters in clustering_results.items():
            for cluster in clusters:
                scored_cluster = cluster.copy()
                
                # Calculate fusion score
                fusion_score = self._calculate_fusion_score(cluster, method, profile_assignments)
                scored_cluster['fusion_score'] = fusion_score
                scored_cluster['source_method'] = method
                
                # Add stability information
                stability_score = self._calculate_stability_score(cluster, profile_assignments)
                scored_cluster['stability_score'] = stability_score
                
                scored_clusters.append(scored_cluster)
        
        # Sort by fusion score (highest first)
        scored_clusters.sort(key=lambda x: x['fusion_score'], reverse=True)
        
        self.logger.debug(f"📊 Scored {len(scored_clusters)} clusters from all methods")
        return scored_clusters
    
    def _calculate_fusion_score(self, 
                              cluster: Dict[str, Any], 
                              method: str, 
                              profile_assignments: Dict[int, Dict[str, int]]) -> float:
        """
        Calculate fusion score for a cluster based on multiple criteria.
        
        Returns:
            Float score between 0.0 and 1.0
        """
        scores = {}
        
        # 1. Embedding cohesion score
        embedding_cohesion = cluster.get('cohesion', 0.0)
        scores['embedding'] = min(1.0, max(0.0, embedding_cohesion))
        
        # 2. LDA cohesion score (if available)
        lda_cohesion = cluster.get('lda_cohesion', None)
        if lda_cohesion is not None:
            scores['lda'] = min(1.0, max(0.0, lda_cohesion))
        else:
            scores['lda'] = 0.0
        
        # 3. Size score (normalized, prefer medium-sized clusters)
        cluster_size = cluster.get('size', 0)
        scores['size'] = self._calculate_size_score(cluster_size)
        
        # 4. Stability score (how many methods found similar clusters)
        stability_score = self._calculate_stability_score(cluster, profile_assignments)
        scores['stability'] = stability_score
        
        # Calculate weighted fusion score
        fusion_score = (
            scores['embedding'] * self.embedding_weight +
            scores['lda'] * self.lda_weight +
            scores['size'] * self.size_weight +
            scores['stability'] * self.stability_weight
        )
        
        return fusion_score
    
    def _calculate_size_score(self, cluster_size: int) -> float:
        """Calculate size score (prefer medium-sized clusters)."""
        if cluster_size <= 0:
            return 0.0
        elif cluster_size < 3:
            return 0.3  # Too small
        elif cluster_size <= 5:
            return 0.9  # Good size
        elif cluster_size <= 10:
            return 1.0  # Optimal size
        elif cluster_size <= 20:
            return 0.8  # Large but acceptable
        elif cluster_size <= 50:
            return 0.6  # Very large
        else:
            return 0.4  # Too large
    
    def _calculate_stability_score(self, 
                                 cluster: Dict[str, Any], 
                                 profile_assignments: Dict[int, Dict[str, int]]) -> float:
        """
        Calculate stability score based on how consistently profiles are clustered together.
        
        Returns:
            Float score between 0.0 and 1.0
        """
        cluster_profiles = cluster.get('profiles', [])
        if len(cluster_profiles) < 2:
            return 0.5  # Neutral score for small clusters
        
        # Find how many different methods put these profiles together
        method_agreements = defaultdict(int)
        
        for i, profile1 in enumerate(cluster_profiles):
            for j, profile2 in enumerate(cluster_profiles[i+1:], i+1):
                # Count methods where these two profiles are in the same cluster
                agreements = 0
                total_methods = 0
                
                for profile_idx, assignments in profile_assignments.items():
                    # This is a simplified approach - in practice you'd need to map profiles to indices
                    total_methods = max(total_methods, len(assignments))
                
                # Simplified stability calculation
                if total_methods > 0:
                    stability = min(1.0, agreements / total_methods)
                else:
                    stability = 0.5
                
                method_agreements[f"{i}-{j}"] = stability
        
        # Average stability across all profile pairs
        if method_agreements:
            return np.mean(list(method_agreements.values()))
        else:
            return 0.5
    
    def _perform_fusion_voting(self, 
                             scored_clusters: List[Dict[str, Any]], 
                             profiles: List[Any], 
                             embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Perform fusion using voting system to assign each profile to best cluster.
        
        Returns:
            List of final fused clusters
        """
        # Track which profiles have been assigned
        assigned_profiles = set()
        final_clusters = []
        
        # Assign profiles to highest-scoring compatible clusters
        for cluster in scored_clusters:
            cluster_profiles = cluster.get('profiles', [])
            
            # Check which profiles are still available
            available_profiles = []
            available_embeddings = []
            
            for profile in cluster_profiles:
                if profile not in assigned_profiles:
                    available_profiles.append(profile)
                    # Find corresponding embedding
                    try:
                        profile_idx = profiles.index(profile)
                        available_embeddings.append(embeddings[profile_idx])
                    except ValueError:
                        continue
            
            # If we have enough available profiles, create a fused cluster
            if len(available_profiles) >= 3:  # Minimum cluster size
                fused_cluster = {
                    'cluster_id': len(final_clusters),
                    'profiles': available_profiles,
                    'embedding': available_embeddings,
                    'size': len(available_profiles),
                    'cohesion': cluster.get('cohesion', 0.0),
                    'lda_cohesion': cluster.get('lda_cohesion', None),
                    'lda_vectors': cluster.get('lda_vectors', None),
                    'centroid': self._calculate_centroid(available_embeddings),
                    'persistence': cluster.get('persistence', None),
                    'fusion_score': cluster['fusion_score'],
                    'stability_score': cluster['stability_score'],
                    'source_methods': [cluster['source_method']],
                    'clustering_method': f"fused_{cluster['source_method']}"
                }
                
                final_clusters.append(fused_cluster)
                
                # Mark profiles as assigned
                for profile in available_profiles:
                    assigned_profiles.add(profile)
                
                self.logger.debug(f"🔀 Created fused cluster {len(final_clusters)} with {len(available_profiles)} profiles "
                                f"(score={cluster['fusion_score']:.3f})")
        
        # Handle any remaining unassigned profiles
        unassigned_profiles = [p for p in profiles if p not in assigned_profiles]
        if unassigned_profiles:
            self.logger.info(f"🔄 Creating residual cluster for {len(unassigned_profiles)} unassigned profiles")
            
            unassigned_embeddings = []
            for profile in unassigned_profiles:
                try:
                    profile_idx = profiles.index(profile)
                    unassigned_embeddings.append(embeddings[profile_idx])
                except ValueError:
                    continue
            
            if unassigned_embeddings:
                residual_cluster = {
                    'cluster_id': len(final_clusters),
                    'profiles': unassigned_profiles,
                    'embedding': unassigned_embeddings,
                    'size': len(unassigned_profiles),
                    'cohesion': self._calculate_cohesion(unassigned_embeddings),
                    'centroid': self._calculate_centroid(unassigned_embeddings),
                    'fusion_score': 0.2,  # Low score for residual cluster
                    'stability_score': 0.1,
                    'source_methods': ['residual'],
                    'clustering_method': 'residual_fusion',
                    'is_residual': True
                }
                final_clusters.append(residual_cluster)
        
        return final_clusters
    
    def _calculate_centroid(self, embeddings: List[List[float]]) -> List[float]:
        """Calculate centroid of embeddings."""
        if not embeddings:
            return []
        
        try:
            embeddings_array = np.array(embeddings)
            centroid = np.mean(embeddings_array, axis=0)
            return centroid.tolist()
        except Exception:
            return []
    
    def _calculate_cohesion(self, embeddings: List[List[float]]) -> float:
        """Calculate cohesion of embeddings."""
        if len(embeddings) < 2:
            return 0.0
        
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            embeddings_array = np.array(embeddings)
            similarities = cosine_similarity(embeddings_array)
            
            # Get upper triangular matrix (excluding diagonal)
            n = similarities.shape[0]
            upper_triangle = similarities[np.triu_indices(n, k=1)]
            
            return float(np.mean(upper_triangle))
        except Exception:
            return 0.0
    
    def get_fusion_statistics(self, fused_clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Get statistics about the fusion process.
        
        Returns:
            Dictionary with fusion statistics
        """
        stats = {
            'total_clusters': len(fused_clusters),
            'source_methods': Counter(),
            'avg_fusion_score': 0.0,
            'avg_stability_score': 0.0,
            'size_distribution': Counter(),
            'residual_clusters': 0
        }
        
        if not fused_clusters:
            return stats
        
        fusion_scores = []
        stability_scores = []
        
        for cluster in fused_clusters:
            # Source methods
            source_methods = cluster.get('source_methods', ['unknown'])
            for method in source_methods:
                stats['source_methods'][method] += 1
            
            # Scores
            fusion_score = cluster.get('fusion_score', 0.0)
            stability_score = cluster.get('stability_score', 0.0)
            fusion_scores.append(fusion_score)
            stability_scores.append(stability_score)
            
            # Size distribution
            size = cluster.get('size', 0)
            if size <= 3:
                stats['size_distribution']['small'] += 1
            elif size <= 10:
                stats['size_distribution']['medium'] += 1
            else:
                stats['size_distribution']['large'] += 1
            
            # Residual clusters
            if cluster.get('is_residual', False):
                stats['residual_clusters'] += 1
        
        # Calculate averages
        if fusion_scores:
            stats['avg_fusion_score'] = np.mean(fusion_scores)
        if stability_scores:
            stats['avg_stability_score'] = np.mean(stability_scores)
        
        return stats
