"""
Keyword clustering service for grouping semantically related keywords.
Groups keywords into coherent thematic clusters for better tag generation.
"""

import logging
import numpy as np
from collections import defaultdict
from typing import List, Tuple, Dict, Any
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.memory_manager import MemoryManager


class KeywordClusterer:
    """Service responsible for clustering keywords semantically."""
    
    def __init__(self, embedding_model: EmbeddingModel, memory_manager: MemoryManager):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.memory_manager = memory_manager
        
        # Initialize clustering model for keyword clustering
        from ai_service.services.clustering.hdbscan_clusterer import HDBSCANClusterer
        self.clustering_model = HDBSCANClusterer(
            min_cluster_size=2,  # Smaller clusters for keywords
            metric="cosine",
            cluster_selection_method="leaf"
        )
        
        self.logger.info("🔄 KeywordClusterer initialized")
    
    def cluster_keywords_semantically(self, keywords: List[Tuple[str, float]], 
                                   keyword_embeddings: List[List[float]], 
                                   min_cluster_size: int = 2) -> List[List[Tuple[str, float]]]:
        """
        Cluster keywords semantically to identify coherent concept groups.
        
        Args:
            keywords: List of (keyword, score) tuples
            keyword_embeddings: Corresponding embeddings for each keyword
            min_cluster_size: Minimum size for a valid cluster
            
        Returns:
            List of keyword clusters (each is a list of (keyword, score) tuples)
        """
        try:
            if len(keywords) < 3 or not keyword_embeddings:
                return [keywords[:5]]  # Single cluster for small sets
            
            # Ensure we have valid embeddings
            valid_embeddings, valid_keywords = self._filter_valid_embeddings(keywords, keyword_embeddings)
            
            if len(valid_embeddings) < 3:
                return [valid_keywords[:5]]
            
            self.logger.info(f"🔄 Clustering {len(valid_keywords)} keywords semantically")
            
            # Use HDBSCAN for keyword clustering with semantic embeddings
            embeddings_array = np.array(valid_embeddings)
            
            # Configure the clusterer for keyword clustering
            self.clustering_model.set_parameters(
                min_cluster_size=max(2, min_cluster_size),
                metric='cosine'
            )
            
            keyword_labels, clusterer = self.clustering_model.fit_predict(embeddings_array)
            
            # Group keywords by cluster
            clusters = self._group_keywords_by_cluster(valid_keywords, keyword_labels)
            
            # Convert to list and sort by cluster size
            semantic_clusters = self._build_cluster_results(clusters)
            
            self.logger.info(f"✅ Generated {len(semantic_clusters)} keyword clusters")
            
            return semantic_clusters if semantic_clusters else [valid_keywords[:5]]
            
        except Exception as e:
            self.logger.warning(f"Error in semantic keyword clustering: {e}")
            return [keywords[:5]]  # Fallback to single cluster
    
    def _filter_valid_embeddings(self, keywords: List[Tuple[str, float]], 
                                keyword_embeddings: List[List[float]]) -> Tuple[List[List[float]], List[Tuple[str, float]]]:
        """Filter out keywords without valid embeddings."""
        valid_embeddings = []
        valid_keywords = []
        
        for i, (kw, score) in enumerate(keywords):
            if i < len(keyword_embeddings) and keyword_embeddings[i]:
                valid_embeddings.append(keyword_embeddings[i])
                valid_keywords.append((kw, score))
        
        return valid_embeddings, valid_keywords
    
    def _group_keywords_by_cluster(self, valid_keywords: List[Tuple[str, float]], 
                                 keyword_labels: List[int]) -> Dict[int, List[Tuple[str, float]]]:
        """Group keywords by their assigned cluster labels."""
        clusters = defaultdict(list)
        
        for i, label in enumerate(keyword_labels):
            if label >= 0:  # Valid cluster
                clusters[label].append(valid_keywords[i])
            else:  # Noise - add to largest cluster or create separate
                if clusters:
                    largest_cluster = max(clusters.keys(), key=lambda k: len(clusters[k]))
                    clusters[largest_cluster].append(valid_keywords[i])
                else:
                    clusters[0].append(valid_keywords[i])
        
        return clusters
    
    def _build_cluster_results(self, clusters: Dict[int, List[Tuple[str, float]]]) -> List[List[Tuple[str, float]]]:
        """Build final cluster results sorted by size and keyword scores."""
        semantic_clusters = []
        
        for cluster_id in sorted(clusters.keys(), key=lambda k: len(clusters[k]), reverse=True):
            # Sort keywords within cluster by score
            cluster_keywords = sorted(clusters[cluster_id], key=lambda x: x[1], reverse=True)
            semantic_clusters.append(cluster_keywords[:5])  # Top 5 per cluster
        
        return semantic_clusters
    
    def generate_keyword_embeddings(self, keywords: List[Tuple[str, float]]) -> List[List[float]]:
        """Generate embeddings for a list of keywords."""
        try:
            keyword_texts = [kw for kw, _ in keywords]
            keyword_embeddings = self.embedding_model.encode(keyword_texts)
            
            if isinstance(keyword_embeddings, np.ndarray):
                return keyword_embeddings.tolist()
            return list(keyword_embeddings)
            
        except Exception as e:
            self.logger.error(f"Error generating keyword embeddings: {e}")
            return []
    
    def calculate_cluster_coherence(self, keyword_cluster: List[Tuple[str, float]]) -> float:
        """Calculate semantic coherence within a keyword cluster."""
        try:
            if len(keyword_cluster) < 2:
                return 1.0  # Perfect coherence for single keywords
            
            # Get embeddings for keywords in cluster
            keyword_texts = [kw for kw, _ in keyword_cluster]
            embeddings = self.embedding_model.encode(keyword_texts)
            
            if isinstance(embeddings, np.ndarray):
                embeddings = embeddings.tolist()
            
            # Calculate pairwise similarities
            similarities = []
            n = len(embeddings)
            
            for i in range(n):
                for j in range(i + 1, n):
                    emb1 = np.array(embeddings[i])
                    emb2 = np.array(embeddings[j])
                    
                    # Normalize embeddings
                    emb1 = emb1 / np.linalg.norm(emb1)
                    emb2 = emb2 / np.linalg.norm(emb2)
                    
                    # Calculate cosine similarity
                    similarity = np.dot(emb1, emb2)
                    similarities.append(similarity)
            
            return float(np.mean(similarities)) if similarities else 0.0
            
        except Exception as e:
            self.logger.warning(f"Error calculating keyword cluster coherence: {e}")
            return 0.0
    
    def select_best_keyword_cluster(self, keyword_clusters: List[List[Tuple[str, float]]], 
                                  cluster_embeddings: List[List[float]]) -> List[Tuple[str, float]]:
        """
        Select the most representative keyword cluster for the profile cluster.
        This prevents duplicate clusters by choosing only the best semantic group.
        
        Args:
            keyword_clusters: List of keyword clusters
            cluster_embeddings: Embeddings of profiles in the cluster
            
        Returns:
            The best keyword cluster as list of (keyword, score) tuples
        """
        try:
            if not keyword_clusters:
                return []
            
            if len(keyword_clusters) == 1:
                return keyword_clusters[0]
            
            # Calculate profile centroid for comparison
            if not cluster_embeddings:
                return keyword_clusters[0]  # Fallback to first cluster
                
            cluster_centroid = self._calculate_profile_centroid(cluster_embeddings)
            if len(cluster_centroid) == 0:
                return keyword_clusters[0]  # Fallback if centroid calculation fails
            
            best_cluster = None
            best_score = -1
            
            # Score each keyword cluster by semantic similarity to profile cluster
            for keyword_cluster in keyword_clusters:
                if not keyword_cluster:
                    continue
                    
                coherence_scores = []
                for keyword, _ in keyword_cluster[:5]:  # Top 5 keywords for efficiency
                    try:
                        # Get keyword embedding
                        keyword_embedding = self.embedding_model.encode([keyword])[0]
                        keyword_embedding = np.array(keyword_embedding)
                        
                        # Normalize keyword embedding
                        norm = np.linalg.norm(keyword_embedding)
                        if norm > 0:
                            keyword_embedding = keyword_embedding / norm
                        
                        # Calculate similarity to cluster centroid
                        coherence = np.dot(keyword_embedding, cluster_centroid)
                        coherence_scores.append(coherence)
                        
                    except Exception as e:
                        self.logger.debug(f"Error calculating coherence for keyword '{keyword}': {e}")
                        coherence_scores.append(0.0)
                
                # Average coherence score for this keyword cluster
                avg_coherence = np.mean(coherence_scores) if coherence_scores else 0.0
                
                if avg_coherence > best_score:
                    best_score = avg_coherence
                    best_cluster = keyword_cluster
            
            return best_cluster or keyword_clusters[0]
            
        except Exception as e:
            self.logger.warning(f"Error selecting best keyword cluster: {e}")
            # Fallback to first cluster
            return keyword_clusters[0] if keyword_clusters else []
    
    def _calculate_profile_centroid(self, cluster_embeddings: List[List[float]]) -> np.ndarray:
        """Calculate normalized centroid of profile cluster embeddings."""
        try:
            if not cluster_embeddings:
                return np.array([])
            
            cluster_centroid = np.mean(cluster_embeddings, axis=0)
            norm = np.linalg.norm(cluster_centroid)
            if norm > 0:
                cluster_centroid = cluster_centroid / norm
            
            return cluster_centroid
            
        except Exception as e:
            self.logger.warning(f"Error calculating profile centroid: {e}")
            return np.array([])
    
    def get_clustering_summary(self, keyword_clusters: List[List[Tuple[str, float]]]) -> Dict[str, Any]:
        """Get summary statistics about keyword clustering results."""
        if not keyword_clusters:
            return {
                'total_clusters': 0,
                'total_keywords': 0,
                'average_cluster_size': 0,
                'cluster_themes': []
            }
        
        cluster_sizes = [len(cluster) for cluster in keyword_clusters]
        total_keywords = sum(cluster_sizes)
        
        # Extract representative themes (top keyword from each cluster)
        cluster_themes = []
        for cluster in keyword_clusters:
            if cluster:
                # Get the highest scoring keyword as theme
                top_keyword = max(cluster, key=lambda x: x[1])
                cluster_themes.append(top_keyword[0])
        
        return {
            'total_clusters': len(keyword_clusters),
            'total_keywords': total_keywords,
            'cluster_sizes': {
                'min': min(cluster_sizes) if cluster_sizes else 0,
                'max': max(cluster_sizes) if cluster_sizes else 0,
                'average': sum(cluster_sizes) / len(cluster_sizes) if cluster_sizes else 0,
                'distribution': cluster_sizes
            },
            'cluster_themes': cluster_themes
        }
