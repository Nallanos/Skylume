"""
Cluster validation service for assessing cluster cohesion using embeddings and LDA vectors.
Handles validation logic with multiple criteria and scoring.
"""
import numpy as np
import logging
from typing import List, Dict, Any, Optional, Tuple
from sklearn.metrics.pairwise import cosine_similarity


class ClusterValidator:
    """Service responsible for validating cluster cohesion using multiple criteria."""
    
    def __init__(self, 
                 embedding_cohesion_threshold: float = 0.45,
                 lda_cohesion_threshold: float = 0.35,
                 min_embedding_threshold: float = 0.30,
                 min_lda_threshold: float = 0.20):
        """
        Initialize cluster validator with configurable thresholds.
        
        Args:
            embedding_cohesion_threshold: Minimum threshold for valid embedding cohesion
            lda_cohesion_threshold: Minimum threshold for valid LDA cohesion
            min_embedding_threshold: Below this, embedding cohesion is considered invalid
            min_lda_threshold: Below this, LDA cohesion is considered invalid
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Validation thresholds
        self.embedding_cohesion_threshold = embedding_cohesion_threshold
        self.lda_cohesion_threshold = lda_cohesion_threshold
        self.min_embedding_threshold = min_embedding_threshold
        self.min_lda_threshold = min_lda_threshold
        
        self.logger.info(f"🔍 ClusterValidator initialized with thresholds: "
                        f"embedding≥{embedding_cohesion_threshold}, LDA≥{lda_cohesion_threshold}")
    
    def validate_cluster_cohesion(self, 
                                 embeddings: List[List[float]], 
                                 lda_vectors: Optional[List[List[float]]] = None) -> Dict[str, Any]:
        """
        Evaluate cluster validity based on embedding and LDA cohesion.
        
        Args:
            embeddings: List of embedding vectors for cluster members
            lda_vectors: Optional list of LDA topic vectors for cluster members
            
        Returns:
            Dictionary with validation results:
            - status: 'valid', 'invalid', 'cannot_determine'
            - embedding_cohesion: float or None
            - lda_cohesion: float or None
            - reason: str explaining the decision
            - scores: dict with detailed scoring
        """
        try:
            result = {
                'status': 'cannot_determine',
                'embedding_cohesion': None,
                'lda_cohesion': None,
                'reason': '',
                'scores': {}
            }
            
            # Validate embeddings cohesion
            embedding_cohesion = None
            if embeddings and len(embeddings) > 1:
                embedding_cohesion = self._calculate_mean_pairwise_similarity(embeddings)
                result['embedding_cohesion'] = embedding_cohesion
                result['scores']['embedding_cohesion'] = embedding_cohesion
                
                self.logger.debug(f"📊 Embedding cohesion calculated: {embedding_cohesion:.3f}")
            
            # Validate LDA cohesion
            lda_cohesion = None
            if lda_vectors and len(lda_vectors) > 1:
                lda_cohesion = self._calculate_mean_pairwise_similarity(lda_vectors)
                result['lda_cohesion'] = lda_cohesion
                result['scores']['lda_cohesion'] = lda_cohesion
                
                self.logger.debug(f"📊 LDA cohesion calculated: {lda_cohesion:.3f}")
            
            # Decision logic
            status, reason = self._determine_validation_status(embedding_cohesion, lda_cohesion)
            result['status'] = status
            result['reason'] = reason
            
            # Add detailed scoring for fusion service
            result['scores']['overall_score'] = self._calculate_overall_score(embedding_cohesion, lda_cohesion)
            result['scores']['confidence'] = self._calculate_confidence(embedding_cohesion, lda_cohesion)
            
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Error in cluster validation: {e}")
            return {
                'status': 'cannot_determine',
                'embedding_cohesion': None,
                'lda_cohesion': None,
                'reason': f'Validation error: {str(e)}',
                'scores': {'overall_score': 0.0, 'confidence': 0.0}
            }
    
    def _calculate_mean_pairwise_similarity(self, vectors: List[List[float]]) -> float:
        """Calculate mean pairwise cosine similarity for a list of vectors."""
        if len(vectors) < 2:
            return 0.0
        
        try:
            # Convert to numpy array
            vectors_array = np.array(vectors)
            
            # Calculate pairwise cosine similarities
            similarities = cosine_similarity(vectors_array)
            
            # Get upper triangular matrix (excluding diagonal)
            n = similarities.shape[0]
            upper_triangle = similarities[np.triu_indices(n, k=1)]
            
            # Return mean similarity
            return float(np.mean(upper_triangle))
            
        except Exception as e:
            self.logger.error(f"❌ Error calculating pairwise similarity: {e}")
            return 0.0
    
    def _determine_validation_status(self, 
                                   embedding_cohesion: Optional[float], 
                                   lda_cohesion: Optional[float]) -> Tuple[str, str]:
        """
        Determine validation status based on cohesion scores.
        
        Returns:
            Tuple of (status, reason)
        """
        reasons = []
        
        # Check embedding cohesion
        embedding_valid = False
        embedding_invalid = False
        
        if embedding_cohesion is not None:
            if embedding_cohesion >= self.embedding_cohesion_threshold:
                embedding_valid = True
                reasons.append(f"embedding_cohesion={embedding_cohesion:.3f}≥{self.embedding_cohesion_threshold}")
            elif embedding_cohesion < self.min_embedding_threshold:
                embedding_invalid = True
                reasons.append(f"embedding_cohesion={embedding_cohesion:.3f}<{self.min_embedding_threshold}")
            else:
                reasons.append(f"embedding_cohesion={embedding_cohesion:.3f} (intermediate)")
        
        # Check LDA cohesion
        lda_valid = False
        lda_invalid = False
        
        if lda_cohesion is not None:
            if lda_cohesion >= self.lda_cohesion_threshold:
                lda_valid = True
                reasons.append(f"lda_cohesion={lda_cohesion:.3f}≥{self.lda_cohesion_threshold}")
            elif lda_cohesion < self.min_lda_threshold:
                lda_invalid = True
                reasons.append(f"lda_cohesion={lda_cohesion:.3f}<{self.min_lda_threshold}")
            else:
                reasons.append(f"lda_cohesion={lda_cohesion:.3f} (intermediate)")
        
        # Decision logic
        if embedding_valid or lda_valid:
            return 'valid', f"Valid cluster: {', '.join(reasons)}"
        elif embedding_invalid and lda_invalid:
            return 'invalid', f"Invalid cluster: {', '.join(reasons)}"
        elif not embedding_cohesion and not lda_cohesion:
            return 'cannot_determine', "No valid cohesion metrics available"
        else:
            return 'cannot_determine', f"Uncertain cluster: {', '.join(reasons)}"
    
    def _calculate_overall_score(self, 
                               embedding_cohesion: Optional[float], 
                               lda_cohesion: Optional[float]) -> float:
        """Calculate overall score for cluster fusion (0.0 to 1.0)."""
        scores = []
        weights = []
        
        if embedding_cohesion is not None:
            scores.append(min(1.0, max(0.0, embedding_cohesion)))
            weights.append(0.6)  # Higher weight for embeddings
        
        if lda_cohesion is not None:
            scores.append(min(1.0, max(0.0, lda_cohesion)))
            weights.append(0.4)  # Lower weight for LDA
        
        if not scores:
            return 0.0
        
        # Weighted average
        weighted_sum = sum(score * weight for score, weight in zip(scores, weights))
        total_weight = sum(weights)
        
        return weighted_sum / total_weight if total_weight > 0 else 0.0
    
    def _calculate_confidence(self, 
                            embedding_cohesion: Optional[float], 
                            lda_cohesion: Optional[float]) -> float:
        """Calculate confidence score based on availability and agreement of metrics."""
        if not embedding_cohesion and not lda_cohesion:
            return 0.0
        
        # Base confidence on metric availability
        if embedding_cohesion and lda_cohesion:
            # Both metrics available - check agreement
            agreement = 1.0 - abs(embedding_cohesion - lda_cohesion)
            return min(1.0, max(0.5, agreement))  # At least 0.5 if both available
        else:
            # Only one metric available
            return 0.7  # Moderate confidence
    
    def validate_multiple_clusters(self, 
                                 clusters_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate multiple clusters and add validation results.
        
        Args:
            clusters_data: List of cluster dictionaries with embeddings and optional LDA vectors
            
        Returns:
            List of clusters with added validation information
        """
        validated_clusters = []
        
        for i, cluster in enumerate(clusters_data):
            try:
                # Extract embeddings and LDA vectors
                embeddings = cluster.get('embedding', [])
                lda_vectors = cluster.get('lda_vectors', None)
                
                # Validate cluster
                validation_result = self.validate_cluster_cohesion(embeddings, lda_vectors)
                
                # Add validation info to cluster
                validated_cluster = cluster.copy()
                validated_cluster['validation'] = validation_result
                validated_cluster['is_valid'] = validation_result['status'] == 'valid'
                validated_cluster['validation_score'] = validation_result['scores']['overall_score']
                validated_cluster['validation_confidence'] = validation_result['scores']['confidence']
                
                validated_clusters.append(validated_cluster)
                
                # Log validation result
                size = cluster.get('size', 0)
                status = validation_result['status']
                score = validation_result['scores']['overall_score']
                self.logger.info(f"🔍 Cluster {i+1} (size={size}): {status} (score={score:.3f})")
                
            except Exception as e:
                self.logger.error(f"❌ Error validating cluster {i+1}: {e}")
                # Add failed validation
                validated_cluster = cluster.copy()
                validated_cluster['validation'] = {
                    'status': 'cannot_determine',
                    'reason': f'Validation failed: {str(e)}',
                    'scores': {'overall_score': 0.0, 'confidence': 0.0}
                }
                validated_cluster['is_valid'] = False
                validated_cluster['validation_score'] = 0.0
                validated_cluster['validation_confidence'] = 0.0
                validated_clusters.append(validated_cluster)
        
        # Summary statistics
        total_clusters = len(validated_clusters)
        valid_clusters = sum(1 for c in validated_clusters if c['is_valid'])
        invalid_clusters = sum(1 for c in validated_clusters if c['validation']['status'] == 'invalid')
        uncertain_clusters = total_clusters - valid_clusters - invalid_clusters
        
        self.logger.info(f"📊 Validation summary: {valid_clusters} valid, {invalid_clusters} invalid, "
                        f"{uncertain_clusters} uncertain out of {total_clusters} clusters")
        
        return validated_clusters
