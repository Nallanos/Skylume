"""
Coherence validation service for the semantic clustering pipeline.
Validates the semantic coherence between profile clusters and keyword clusters.
"""

import logging
import numpy as np
from typing import List, Tuple, Dict, Any
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.infrastructure import MemoryManager


class CoherenceValidator:
    """Service responsible for validating profile-keyword coherence."""
    
    def __init__(self, embedding_model: EmbeddingModel, memory_manager: MemoryManager):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.memory_manager = memory_manager
        
        self.logger.info("🔄 CoherenceValidator initialized")
    
    def validate_profile_keyword_coherence(self, profile_embeddings: List[List[float]], 
                                         keyword_clusters: List[List[Tuple[str, float]]],
                                         threshold: float = 0.6) -> List[List[Tuple[str, float]]]:
        """
        Validate coherence between profile clusters and keyword clusters.
        
        Args:
            profile_embeddings: Embeddings of profiles in the cluster
            keyword_clusters: List of keyword clusters to validate
            threshold: Minimum coherence threshold for acceptance
            
        Returns:
            List of validated keyword clusters
        """
        try:
            if not profile_embeddings or not keyword_clusters:
                return keyword_clusters
            
            self.logger.info(f"🔄 Validating coherence for {len(keyword_clusters)} keyword clusters")
            
            # Calculate profile centroid
            profile_centroid = self._calculate_profile_centroid(profile_embeddings)
            if len(profile_centroid) == 0:
                self.logger.warning("Could not calculate profile centroid, skipping validation")
                return keyword_clusters
            
            coherent_clusters = []
            
            for i, keyword_cluster in enumerate(keyword_clusters):
                avg_coherence = self._calculate_cluster_coherence(keyword_cluster, profile_centroid)
                
                self.logger.debug(f"Keyword cluster {i+1} coherence: {avg_coherence:.3f}")
                
                if avg_coherence >= threshold:
                    coherent_clusters.append(keyword_cluster)
                    self.logger.debug(f"✅ Cluster {i+1} passed coherence validation")
                else:
                    # If coherence is low, keep only highest scoring keywords
                    filtered_cluster = keyword_cluster[:2]  # Keep top 2 keywords
                    if filtered_cluster:
                        coherent_clusters.append(filtered_cluster)
                        self.logger.debug(f"⚠️ Cluster {i+1} partially validated (top 2 keywords only)")
            
            self.logger.info(f"✅ Coherence validation complete: {len(coherent_clusters)} clusters validated")
            
            return coherent_clusters if coherent_clusters else keyword_clusters
            
        except Exception as e:
            self.logger.warning(f"Error in coherence validation: {e}")
            return keyword_clusters
    
    def _calculate_profile_centroid(self, profile_embeddings: List[List[float]]) -> np.ndarray:
        """Calculate normalized centroid of profile embeddings."""
        try:
            if not profile_embeddings:
                return np.array([])
            
            profile_centroid = np.mean(profile_embeddings, axis=0)
            norm = np.linalg.norm(profile_centroid)
            if norm > 0:
                profile_centroid = profile_centroid / norm
            
            return profile_centroid
            
        except Exception as e:
            self.logger.warning(f"Error calculating profile centroid: {e}")
            return np.array([])
    
    def _calculate_cluster_coherence(self, keyword_cluster: List[Tuple[str, float]], 
                                   profile_centroid: np.ndarray) -> float:
        """Calculate average coherence between keyword cluster and profile centroid."""
        try:
            cluster_coherence_scores = []
            
            for keyword, score in keyword_cluster:
                try:
                    # Get keyword embedding
                    keyword_embedding = self.embedding_model.encode([keyword])[0]
                    keyword_embedding = np.array(keyword_embedding)
                    
                    # Normalize keyword embedding
                    norm = np.linalg.norm(keyword_embedding)
                    if norm > 0:
                        keyword_embedding = keyword_embedding / norm
                    
                    # Calculate coherence with profile centroid
                    coherence = np.dot(keyword_embedding, profile_centroid)
                    cluster_coherence_scores.append(coherence)
                    
                except Exception as e:
                    self.logger.debug(f"Error calculating coherence for keyword '{keyword}': {e}")
                    cluster_coherence_scores.append(0.0)
            
            # Return average coherence score
            return np.mean(cluster_coherence_scores) if cluster_coherence_scores else 0.0
            
        except Exception as e:
            self.logger.warning(f"Error calculating cluster coherence: {e}")
            return 0.0
    
    def calculate_keyword_profile_similarity(self, keyword: str, 
                                           profile_embeddings: List[List[float]]) -> float:
        """Calculate similarity between a single keyword and profile cluster."""
        try:
            # Get keyword embedding
            keyword_embedding = self.embedding_model.encode([keyword])[0]
            keyword_embedding = np.array(keyword_embedding)
            keyword_embedding = keyword_embedding / np.linalg.norm(keyword_embedding)
            
            # Calculate profile centroid
            profile_centroid = self._calculate_profile_centroid(profile_embeddings)
            if len(profile_centroid) == 0:
                return 0.0
            
            # Calculate similarity
            similarity = np.dot(keyword_embedding, profile_centroid)
            return float(similarity)
            
        except Exception as e:
            self.logger.debug(f"Error calculating keyword-profile similarity for '{keyword}': {e}")
            return 0.0
    
    def rank_keywords_by_coherence(self, keywords: List[Tuple[str, float]], 
                                 profile_embeddings: List[List[float]]) -> List[Tuple[str, float]]:
        """Rank keywords by their coherence with the profile cluster."""
        try:
            if not keywords or not profile_embeddings:
                return keywords
            
            profile_centroid = self._calculate_profile_centroid(profile_embeddings)
            if len(profile_centroid) == 0:
                return keywords
            
            # Calculate coherence for each keyword
            keyword_coherence = []
            for keyword, original_score in keywords:
                coherence = self.calculate_keyword_profile_similarity(keyword, profile_embeddings)
                # Combine original score with coherence
                combined_score = original_score * 0.7 + coherence * 0.3
                keyword_coherence.append((keyword, combined_score))
            
            # Sort by combined score
            keyword_coherence.sort(key=lambda x: x[1], reverse=True)
            
            return keyword_coherence
            
        except Exception as e:
            self.logger.warning(f"Error ranking keywords by coherence: {e}")
            return keywords
    
    def filter_keywords_by_coherence(self, keywords: List[Tuple[str, float]], 
                                   profile_embeddings: List[List[float]],
                                   threshold: float = 0.3) -> List[Tuple[str, float]]:
        """Filter keywords that meet minimum coherence threshold."""
        try:
            if not keywords or not profile_embeddings:
                return keywords
            
            profile_centroid = self._calculate_profile_centroid(profile_embeddings)
            if len(profile_centroid) == 0:
                return keywords
            
            filtered_keywords = []
            
            for keyword, score in keywords:
                coherence = self.calculate_keyword_profile_similarity(keyword, profile_embeddings)
                
                if coherence >= threshold:
                    # Boost score based on coherence
                    adjusted_score = score * (1 + coherence)
                    filtered_keywords.append((keyword, adjusted_score))
                else:
                    # Keep with penalty if below threshold
                    penalized_score = score * 0.5
                    filtered_keywords.append((keyword, penalized_score))
            
            return filtered_keywords
            
        except Exception as e:
            self.logger.warning(f"Error filtering keywords by coherence: {e}")
            return keywords
    
    def get_validation_summary(self, original_clusters: List[List[Tuple[str, float]]], 
                             validated_clusters: List[List[Tuple[str, float]]],
                             profile_embeddings: List[List[float]]) -> Dict[str, Any]:
        """Get summary of coherence validation results."""
        try:
            profile_centroid = self._calculate_profile_centroid(profile_embeddings)
            
            original_coherences = []
            validated_coherences = []
            
            # Calculate coherences for original clusters
            for cluster in original_clusters:
                if len(profile_centroid) > 0:
                    coherence = self._calculate_cluster_coherence(cluster, profile_centroid)
                    original_coherences.append(coherence)
            
            # Calculate coherences for validated clusters
            for cluster in validated_clusters:
                if len(profile_centroid) > 0:
                    coherence = self._calculate_cluster_coherence(cluster, profile_centroid)
                    validated_coherences.append(coherence)
            
            return {
                'original_clusters': len(original_clusters),
                'validated_clusters': len(validated_clusters),
                'clusters_filtered': len(original_clusters) - len(validated_clusters),
                'original_coherence': {
                    'average': np.mean(original_coherences) if original_coherences else 0,
                    'min': min(original_coherences) if original_coherences else 0,
                    'max': max(original_coherences) if original_coherences else 0
                },
                'validated_coherence': {
                    'average': np.mean(validated_coherences) if validated_coherences else 0,
                    'min': min(validated_coherences) if validated_coherences else 0,
                    'max': max(validated_coherences) if validated_coherences else 0
                },
                'improvement': {
                    'coherence_gain': (np.mean(validated_coherences) - np.mean(original_coherences)) if (original_coherences and validated_coherences) else 0
                }
            }
            
        except Exception as e:
            self.logger.warning(f"Error generating validation summary: {e}")
            return {
                'original_clusters': len(original_clusters),
                'validated_clusters': len(validated_clusters),
                'error': str(e)
            }
