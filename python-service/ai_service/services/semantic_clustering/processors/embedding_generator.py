"""
Embedding generation service for the semantic clustering pipeline.
Handles the creation of embeddings from text data with error recovery.
"""

import logging
from typing import List, Dict, Any
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.processors.embedding_validator import EmbeddingValidator


class EmbeddingGenerator:
    """Service responsible for generating embeddings from text data."""
    
    def __init__(self, embedding_model: EmbeddingModel):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.validator = EmbeddingValidator()
        
        self.logger.info("🔄 EmbeddingGenerator initialized")
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts with validation.
        
        Args:
            texts: List of text strings
            
        Returns:
            List of embedding vectors
        """
        try:
            if not texts:
                self.logger.warning("No texts provided for embedding generation")
                return []
            
            # Generate embeddings using the model
            embeddings = self.embedding_model.encode(texts)
            
            # Convert to list format if needed
            if hasattr(embeddings, 'tolist'):
                embeddings = embeddings.tolist()
            elif not isinstance(embeddings, list):
                embeddings = list(embeddings)
            
            # Validate embeddings quality
            valid_embeddings = []
            for i, embedding in enumerate(embeddings):
                if self.validator.validate_embedding_quality(embedding):
                    valid_embeddings.append(embedding)
                else:
                    self.logger.debug(f"Invalid embedding generated for text {i}, replacing with zeros")
                    valid_embeddings.append([])  # Empty list for invalid embeddings
            
            self.logger.info(f"✅ Generated {len(valid_embeddings)} embeddings from {len(texts)} texts")
            return valid_embeddings
            
        except Exception as e:
            self.logger.error(f"Error generating embeddings: {e}")
            # Return empty embeddings for all texts
            return [[]] * len(texts)
    
    def _generate_embeddings_with_recovery(self, texts: List[str], batch_size: int = 50) -> List[List[float]]:
        """
        Generate embeddings with batch processing for recovery.
        
        Args:
            texts: List of text strings
            batch_size: Size of batches for processing
            
        Returns:
            List of embedding vectors
        """
        try:
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                
                try:
                    batch_embeddings = self.embedding_model.encode(batch_texts)
                    
                    # Convert to list format if needed
                    if hasattr(batch_embeddings, 'tolist'):
                        batch_embeddings = batch_embeddings.tolist()
                    elif not isinstance(batch_embeddings, list):
                        batch_embeddings = list(batch_embeddings)
                    
                    all_embeddings.extend(batch_embeddings)
                    self.logger.debug(f"Processed batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size}")
                    
                except Exception as batch_error:
                    self.logger.warning(f"Batch {i//batch_size + 1} failed: {batch_error}, using empty embeddings")
                    # Use empty embeddings for failed batch
                    all_embeddings.extend([[]] * len(batch_texts))
            
            self.logger.info(f"✅ Recovery completed: {len(all_embeddings)} embeddings generated")
            return all_embeddings
            
        except Exception as e:
            self.logger.error(f"Recovery embedding generation failed: {e}")
            return [[]] * len(texts)

    def generate_for_profiles(self, profile_texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings specifically for profile texts with filtering.
        
        Args:
            profile_texts: List of profile text strings
            
        Returns:
            List of embedding vectors (empty list for insufficient data)
        """
        try:
            if not profile_texts:
                self.logger.warning("No profile texts provided")
                return []
            
            # Filter out empty texts and INSUFFICIENT_DATA markers
            valid_texts = []
            text_indices = []  # Track which texts are valid for mapping back
            
            for i, text in enumerate(profile_texts):
                if text and text.strip() and text != "INSUFFICIENT_DATA":
                    valid_texts.append(text)
                    text_indices.append(i)
            
            if not valid_texts:
                self.logger.warning("No valid texts after filtering")
                return [[]] * len(profile_texts)
            
            # Generate embeddings for valid texts
            valid_embeddings = self.generate_embeddings(valid_texts)
            
            # Map back to original indices
            embeddings_result = [[]] * len(profile_texts)
            for j, original_index in enumerate(text_indices):
                if j < len(valid_embeddings):
                    embeddings_result[original_index] = valid_embeddings[j]
            
            self.logger.info(f"✅ Generated embeddings for {len(valid_texts)}/{len(profile_texts)} profile texts")
            return embeddings_result
            
        except Exception as e:
            self.logger.error(f"Error generating profile embeddings: {e}")
            return [[]] * len(profile_texts)

    def get_generation_summary(self, texts: List[str], embeddings: List[List[float]]) -> Dict[str, Any]:
        """
        Get summary statistics about embedding generation.
        
        Args:
            texts: Original texts
            embeddings: Generated embeddings
            
        Returns:
            Dictionary with generation statistics
        """
        try:
            validation_summary = self.validator.get_validation_summary(embeddings)
            
            return {
                'total_texts': len(texts),
                'total_embeddings_generated': len(embeddings),
                'valid_embeddings': validation_summary['valid_embeddings'],
                'invalid_embeddings': validation_summary['invalid_embeddings'],
                'generation_success_rate': len(embeddings) / len(texts) if texts else 0.0,
                'embedding_validity_rate': validation_summary['validity_rate']
            }
        except Exception as e:
            self.logger.error(f"Error generating embedding summary: {e}")
            return {
                'total_texts': len(texts) if texts else 0,
                'total_embeddings_generated': 0,
                'valid_embeddings': 0,
                'invalid_embeddings': 0,
                'generation_success_rate': 0.0,
                'embedding_validity_rate': 0.0
            }
