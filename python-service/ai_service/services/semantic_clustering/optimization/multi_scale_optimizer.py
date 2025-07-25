"""
Multi-scale optimization service for refining cluster results.
Handles optimization and ranking of generated clusters and tags.
"""

import logging
from typing import List, Dict, Any
import numpy as np
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.infrastructure import MemoryManager


class MultiScaleOptimizer:
    """Service responsible for multi-scale optimization of clusters and tags."""
    
    def __init__(self, embedding_model: EmbeddingModel, memory_manager: MemoryManager):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.memory_manager = memory_manager
        self.logger.info("🔄 MultiScaleOptimizer initialized")
    
    def optimize_tags_multi_scale(self, preliminary_tags: List[Dict[str, Any]], 
                                all_profile_embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Perform multi-scale optimization on preliminary tag results.
        
        Args:
            preliminary_tags: List of preliminary tag cluster dictionaries
            all_profile_embeddings: All profile embeddings for global context
            
        Returns:
            Optimized list of tag clusters
        """
        try:
            if len(preliminary_tags) <= 1:
                return preliminary_tags
            
            self.logger.info(f"🔄 Optimizing {len(preliminary_tags)} preliminary tags")
            
            # Step 1: Calculate quality scores for each cluster
            self._calculate_quality_scores(preliminary_tags)
            
            # Step 2: Remove low-quality duplicates
            deduplicated_tags = self._remove_duplicates(preliminary_tags)
            
            # Step 3: Optimize cluster sizes
            balanced_tags = self._balance_cluster_sizes(deduplicated_tags)
            
            # Step 4: Sort by composite quality score
            optimized_tags = self._sort_by_quality(balanced_tags)
            
            self.logger.info(f"✅ Optimization complete: {len(optimized_tags)} tags optimized")
            
            return optimized_tags
            
        except Exception as e:
            self.logger.warning(f"Error in multi-scale optimization: {e}")
            return preliminary_tags
    
    def _calculate_quality_scores(self, clusters: List[Dict[str, Any]]):
        """Calculate comprehensive quality scores for clusters."""
        try:
            for cluster in clusters:
                quality_score = 0.0
                
                # Size score (prefer medium-sized clusters)
                size = cluster.get('size', 0)
                if 5 <= size <= 50:
                    quality_score += 0.3
                elif 3 <= size <= 100:
                    quality_score += 0.2
                else:
                    quality_score += 0.1
                
                # Cohesion score
                cohesion = cluster.get('cohesion', 0)
                quality_score += cohesion * 0.3
                
                # Tag quality score
                tag = cluster.get('tag', '')
                if tag and not any(generic in tag.lower() for generic in 
                                 ['general', 'misc', 'unknown', 'other', 'mixed']):
                    quality_score += 0.2
                
                # Keyword quality score
                keywords = cluster.get('keywords', [])
                if len(keywords) >= 3:
                    quality_score += 0.2
                
                cluster['quality_score'] = min(quality_score, 1.0)
                
        except Exception as e:
            self.logger.warning(f"Error calculating quality scores: {e}")
    
    def _remove_duplicates(self, clusters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate or very similar clusters."""
        try:
            if len(clusters) <= 1:
                return clusters
            
            unique_clusters = []
            seen_tags = set()
            
            # Sort by quality score (highest first) to prefer better clusters
            sorted_clusters = sorted(clusters, key=lambda x: x.get('quality_score', 0), reverse=True)
            
            for cluster in sorted_clusters:
                tag = cluster.get('tag', '').lower()
                
                # Check for exact duplicates
                if tag in seen_tags:
                    self.logger.debug(f"Removing duplicate tag: {tag}")
                    continue
                
                # Check for similar tags (simple similarity check)
                is_similar = any(self._are_tags_similar(tag, seen_tag) for seen_tag in seen_tags)
                
                if not is_similar:
                    seen_tags.add(tag)
                    unique_clusters.append(cluster)
                else:
                    self.logger.debug(f"Removing similar tag: {tag}")
            
            self.logger.info(f"Removed {len(clusters) - len(unique_clusters)} duplicate/similar clusters")
            return unique_clusters
            
        except Exception as e:
            self.logger.warning(f"Error removing duplicates: {e}")
            return clusters
    
    def _are_tags_similar(self, tag1: str, tag2: str, threshold: float = 0.7) -> bool:
        """Check if two tags are similar using simple string similarity."""
        try:
            # Simple Jaccard similarity for words
            words1 = set(tag1.replace('_', ' ').split())
            words2 = set(tag2.replace('_', ' ').split())
            
            if not words1 or not words2:
                return tag1 == tag2
            
            intersection = len(words1.intersection(words2))
            union = len(words1.union(words2))
            
            similarity = intersection / union if union > 0 else 0
            return similarity >= threshold
            
        except Exception as e:
            self.logger.debug(f"Error calculating tag similarity: {e}")
            return False
    
    def _balance_cluster_sizes(self, clusters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Optimize cluster sizes by merging very small clusters or splitting large ones."""
        try:
            if len(clusters) <= 1:
                return clusters
            
            balanced_clusters = []
            small_clusters = []
            
            # Separate small clusters (size < 3) from others
            for cluster in clusters:
                size = cluster.get('size', 0)
                if size < 3 and len(clusters) > 3:  # Only merge if we have enough clusters
                    small_clusters.append(cluster)
                else:
                    balanced_clusters.append(cluster)
            
            # If we have small clusters, try to merge them
            if small_clusters and len(balanced_clusters) > 0:
                # Find the best cluster to merge small ones into
                target_cluster = max(balanced_clusters, key=lambda x: x.get('quality_score', 0))
                
                # Merge small clusters into the best target
                merged_size = target_cluster.get('size', 0) + sum(c.get('size', 0) for c in small_clusters)
                target_cluster['size'] = merged_size
                target_cluster['merged_small_clusters'] = len(small_clusters)
                
                self.logger.debug(f"Merged {len(small_clusters)} small clusters into '{target_cluster.get('tag', 'unknown')}'")
            else:
                # If no target for merging, keep small clusters
                balanced_clusters.extend(small_clusters)
            
            return balanced_clusters
            
        except Exception as e:
            self.logger.warning(f"Error balancing cluster sizes: {e}")
            return clusters
    
    def _sort_by_quality(self, clusters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sort clusters by composite quality score."""
        try:
            # Calculate composite ranking score
            for cluster in clusters:
                quality_score = cluster.get('quality_score', 0)
                cohesion = cluster.get('cohesion', 0)
                size = cluster.get('size', 0)
                
                # Composite score: quality (40%) + cohesion (30%) + normalized size (30%)
                size_score = min(size / 100, 1.0)  # Normalize size to 0-1
                composite_score = (quality_score * 0.4 + cohesion * 0.3 + size_score * 0.3)
                
                cluster['composite_score'] = composite_score
            
            # Sort by composite score (highest first)
            sorted_clusters = sorted(clusters, key=lambda x: x.get('composite_score', 0), reverse=True)
            
            return sorted_clusters
            
        except Exception as e:
            self.logger.warning(f"Error sorting by quality: {e}")
            return clusters
    
    def calculate_inter_cluster_distances(self, clusters: List[Dict[str, Any]]) -> Dict[tuple, float]:
        """Calculate semantic distances between cluster centroids."""
        try:
            distances = {}
            
            for i, cluster1 in enumerate(clusters):
                for j, cluster2 in enumerate(clusters[i+1:], i+1):
                    try:
                        centroid1 = cluster1.get('centroid', [])
                        centroid2 = cluster2.get('centroid', [])
                        
                        if len(centroid1) > 0 and len(centroid2) > 0:
                            # Convert to numpy arrays
                            emb1 = np.array(centroid1)
                            emb2 = np.array(centroid2)
                            
                            # Calculate cosine distance
                            norm1 = np.linalg.norm(emb1)
                            norm2 = np.linalg.norm(emb2)
                            
                            if norm1 > 0 and norm2 > 0:
                                similarity = np.dot(emb1, emb2) / (norm1 * norm2)
                                distance = 1 - similarity
                                distances[(i, j)] = distance
                            else:
                                distances[(i, j)] = 1.0
                        else:
                            distances[(i, j)] = 1.0
                    except Exception as e:
                        self.logger.debug(f"Error calculating cluster distance: {e}")
                        distances[(i, j)] = 1.0
            
            return distances
            
        except Exception as e:
            self.logger.warning(f"Error calculating inter-cluster distances: {e}")
            return {}
    
    def merge_similar_clusters(self, clusters: List[Dict[str, Any]], 
                             similarity_threshold: float = 0.8) -> List[Dict[str, Any]]:
        """Merge clusters that are too similar to each other."""
        try:
            if len(clusters) <= 1:
                return clusters
            
            # Calculate distances between clusters
            distances = self.calculate_inter_cluster_distances(clusters)
            
            # Find pairs of clusters that are very similar
            merge_candidates = []
            for (i, j), distance in distances.items():
                similarity = 1 - distance
                if similarity >= similarity_threshold:
                    merge_candidates.append((i, j, similarity))
            
            if not merge_candidates:
                return clusters
            
            # Sort by similarity (highest first)
            merge_candidates.sort(key=lambda x: x[2], reverse=True)
            
            merged_clusters = clusters.copy()
            merged_indices = set()
            
            for i, j, similarity in merge_candidates:
                if i in merged_indices or j in merged_indices:
                    continue  # Already merged
                
                # Merge cluster j into cluster i
                cluster_i = merged_clusters[i]
                cluster_j = merged_clusters[j]
                
                # Combine sizes
                cluster_i['size'] = cluster_i.get('size', 0) + cluster_j.get('size', 0)
                
                # Average cohesion
                cohesion_i = cluster_i.get('cohesion', 0)
                cohesion_j = cluster_j.get('cohesion', 0)
                cluster_i['cohesion'] = (cohesion_i + cohesion_j) / 2
                
                # Combine keywords
                keywords_i = cluster_i.get('keywords', [])
                keywords_j = cluster_j.get('keywords', [])
                combined_keywords = list(set(keywords_i + keywords_j))
                cluster_i['keywords'] = combined_keywords[:5]  # Keep top 5
                
                # Mark as merged
                merged_indices.add(j)
                
                self.logger.debug(f"Merged clusters '{cluster_i.get('tag')}' and '{cluster_j.get('tag')}' (similarity: {similarity:.3f})")
            
            # Remove merged clusters
            final_clusters = [cluster for i, cluster in enumerate(merged_clusters) if i not in merged_indices]
            
            if len(merge_candidates) > 0:
                self.logger.info(f"Merged {len(merge_candidates)} similar cluster pairs")
            
            return final_clusters
            
        except Exception as e:
            self.logger.warning(f"Error merging similar clusters: {e}")
            return clusters
    
    def get_optimization_summary(self, original_clusters: List[Dict[str, Any]], 
                               optimized_clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get summary of optimization results."""
        try:
            original_count = len(original_clusters)
            optimized_count = len(optimized_clusters)
            
            # Calculate quality improvements
            original_qualities = [c.get('quality_score', 0) for c in original_clusters]
            optimized_qualities = [c.get('quality_score', 0) for c in optimized_clusters]
            
            return {
                'clusters_before': original_count,
                'clusters_after': optimized_count,
                'clusters_removed': original_count - optimized_count,
                'quality_improvement': {
                    'original_avg': np.mean(original_qualities) if original_qualities else 0,
                    'optimized_avg': np.mean(optimized_qualities) if optimized_qualities else 0,
                    'improvement': (np.mean(optimized_qualities) - np.mean(original_qualities)) if (original_qualities and optimized_qualities) else 0
                },
                'size_distribution': {
                    'original': [c.get('size', 0) for c in original_clusters],
                    'optimized': [c.get('size', 0) for c in optimized_clusters]
                },
                'optimization_methods_applied': [
                    'quality_scoring',
                    'duplicate_removal',
                    'size_balancing',
                    'quality_sorting'
                ]
            }
            
        except Exception as e:
            self.logger.warning(f"Error generating optimization summary: {e}")
            return {
                'clusters_before': len(original_clusters),
                'clusters_after': len(optimized_clusters),
                'error': str(e)
            }
