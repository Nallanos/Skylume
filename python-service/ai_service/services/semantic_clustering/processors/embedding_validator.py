"""
Embedding validation service for the semantic clustering pipeline.
Handles validation and quality checking of embedding vectors.
"""

import logging
import numpy as np
from typing import List, Dict, Any


class EmbeddingValidator:
    """Service responsible for validating embedding quality and cleaning datasets."""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info("🔄 EmbeddingValidator initialized")
    
    def validate_embedding_quality(self, embedding: List[float]) -> bool:
        """
        Validate that an embedding meets quality standards.
        
        Args:
            embedding: Embedding vector to validate
            
        Returns:
            bool: True if embedding is valid, False otherwise
        """
        try:
            if not embedding or not isinstance(embedding, (list, np.ndarray)):
                self.logger.debug(f"❌ Invalid embedding type or empty: {type(embedding)}")
                return False
            
            # Check if embedding has reasonable length
            if len(embedding) < 10:  # Minimum reasonable embedding size
                self.logger.debug(f"❌ Embedding too short: {len(embedding)} < 10")
                return False
            
            # Check for all zeros
            if all(x == 0 for x in embedding):
                self.logger.debug("❌ Embedding is all zeros")
                return False
            
            # Check for NaN or infinite values
            if any(not isinstance(x, (int, float)) or np.isnan(x) or np.isinf(x) for x in embedding):
                self.logger.debug("❌ Embedding contains NaN or infinite values")
                return False
            
            # Check if embedding has reasonable magnitude
            magnitude = np.linalg.norm(embedding)
            if magnitude < 1e-6 or magnitude > 1e6:
                self.logger.debug(f"❌ Embedding magnitude out of range: {magnitude}")
                return False
            
            # All checks passed
            self.logger.debug(f"✅ Valid embedding: shape={len(embedding)}, magnitude={magnitude:.6f}")
            return True
            
        except Exception as e:
            self.logger.warning(f"Error validating embedding quality: {e}")
            return False

    def clean_embeddings_data(self, profiles_with_embeddings: List[Dict]) -> List[Dict]:
        """
        Clean a dataset by removing profiles with invalid embeddings.
        Useful for post-processing saved data.
        
        Args:
            profiles_with_embeddings: List of dicts with 'embedding' key
            
        Returns:
            List of profiles with only valid embeddings
        """
        try:
            cleaned = []
            removed_count = 0
            
            for profile in profiles_with_embeddings:
                embedding = profile.get('embedding', [])
                
                if self.validate_embedding_quality(embedding):
                    cleaned.append(profile)
                else:
                    removed_count += 1
                    self.logger.debug(f"Removed invalid embedding for {profile.get('handle', 'unknown')}")
            
            self.logger.info(f"🧹 Cleaned embeddings: {len(cleaned)} valid, {removed_count} removed")
            return cleaned
            
        except Exception as e:
            self.logger.error(f"Error cleaning embeddings data: {e}")
            return profiles_with_embeddings  # Return original on error

    def validate_embeddings_batch(self, embeddings: List[List[float]]) -> List[bool]:
        """
        Validate a batch of embeddings for quality.
        
        Args:
            embeddings: List of embedding vectors to validate
            
        Returns:
            List of booleans indicating validity of each embedding
        """
        try:
            return [self.validate_embedding_quality(emb) for emb in embeddings]
        except Exception as e:
            self.logger.error(f"Error validating embeddings batch: {e}")
            return [False] * len(embeddings)

    def get_validation_summary(self, embeddings: List[List[float]]) -> Dict[str, Any]:
        """
        Get a summary of embedding validation results.
        
        Args:
            embeddings: List of embedding vectors
            
        Returns:
            Dictionary with validation statistics
        """
        try:
            validations = self.validate_embeddings_batch(embeddings)
            total = len(validations)
            valid_count = sum(validations)
            invalid_count = total - valid_count
            
            return {
                'total_embeddings': total,
                'valid_embeddings': valid_count,
                'invalid_embeddings': invalid_count,
                'validity_rate': valid_count / total if total > 0 else 0.0,
                'validation_details': validations
            }
        except Exception as e:
            self.logger.error(f"Error generating validation summary: {e}")
            return {
                'total_embeddings': 0,
                'valid_embeddings': 0,
                'invalid_embeddings': 0,
                'validity_rate': 0.0,
                'validation_details': []
            }
