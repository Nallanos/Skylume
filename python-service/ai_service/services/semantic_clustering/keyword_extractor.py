"""
Semantic keyword extraction service using KeyBERT and TF-IDF.
Extracts meaningful keywords from text clusters for tag generation.
"""

import logging
import re
from collections import Counter
from typing import List, Tuple, Optional, Dict, Any
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.memory_manager import MemoryManager


class SemanticKeywordExtractor:
    """Service responsible for extracting semantic keywords from text clusters."""
    
    def __init__(self, embedding_model: EmbeddingModel, memory_manager: MemoryManager):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.memory_manager = memory_manager
        
        # Initialize KeyBERT tagger for semantic extraction
        try:
            from ai_service.services.taggers.keybert_tagger import KeyBERTTagger
            self.keybert_tagger = KeyBERTTagger(embedding_model=embedding_model)
            self.logger.info("✅ KeyBERT tagger initialized successfully")
        except Exception as e:
            self.logger.warning(f"Failed to initialize KeyBERT tagger: {e}")
            self.keybert_tagger = None
        
        self.logger.info("🔄 SemanticKeywordExtractor initialized")
    
    def extract_semantic_keywords(self, texts: List[str], top_n: int = 20) -> List[Tuple[str, float]]:
        """
        Extract semantic keywords using KeyBERT for better semantic understanding.
        
        Args:
            texts: List of text strings to extract keywords from
            top_n: Number of top keywords to return
            
        Returns:
            List of (keyword, score) tuples
        """
        try:
            if not texts or self.keybert_tagger is None:
                self.logger.warning("No texts or KeyBERT tagger unavailable, falling back to basic extraction")
                return [(kw, 1.0) for kw in self._extract_basic_keywords(texts)]
            
            combined_text = " ".join(texts)
            if len(combined_text.strip()) < 20:
                return [(kw, 1.0) for kw in self._extract_basic_keywords(texts)]
            
            # Use KeyBERT for semantic keyword extraction
            keywords, embeddings = self.keybert_tagger.generate_keywords(texts, top_n=top_n)
            
            # Validate and filter keywords
            valid_keywords = []
            for keyword, score in keywords:
                if (isinstance(keyword, str) and 
                    len(keyword.strip()) >= 3 and 
                    score > 0.1 and
                    not keyword.lower() in {'the', 'and', 'for', 'with', 'this', 'that'}):
                    valid_keywords.append((keyword.strip(), float(score)))
            
            return valid_keywords[:top_n] if valid_keywords else [("general", 1.0)]
            
        except Exception as e:
            self.logger.warning(f"Error in semantic keyword extraction: {e}, falling back to basic")
            return [(kw, 1.0) for kw in self._extract_basic_keywords(texts)]
    
    def _extract_basic_keywords(self, texts: List[str]) -> List[str]:
        """Fallback basic keyword extraction using frequency analysis."""
        try:
            if not texts:
                return ["general"]
            
            combined_text = " ".join(texts).lower()
            words = re.findall(r'\b[a-zA-Z]{3,}\b', combined_text)
            
            # Basic stopwords filtering
            stopwords_set = {
                'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
                'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
                'have', 'has', 'had', 'will', 'would', 'could', 'should', 'can', 'must',
                'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did'
            }
            
            filtered_words = [word for word in words if word not in stopwords_set and len(word) >= 3]
            word_counts = Counter(filtered_words)
            
            # Return top 10 most frequent words
            top_words = [word for word, count in word_counts.most_common(10)]
            return top_words if top_words else ["general"]
            
        except Exception as e:
            self.logger.warning(f"Error in basic keyword extraction: {e}")
            return ["general"]
    
    def extract_weighted_frequency_terms(self, texts: List[str], top_n: int = 15) -> List[Tuple[str, float]]:
        """Extract terms using weighted frequency analysis."""
        try:
            if not texts:
                return [("general", 1.0)]
            
            combined_text = " ".join(texts).lower()
            words = re.findall(r'\b[a-zA-Z]{3,}\b', combined_text)
            
            # Basic stopwords filtering
            stopwords_set = {
                'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
                'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
                'have', 'has', 'had', 'will', 'would', 'could', 'should', 'can', 'must',
                'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did'
            }
            
            filtered_words = [word for word in words if word not in stopwords_set and len(word) >= 3]
            word_counts = Counter(filtered_words)
            
            # Apply weighted scoring
            total_words = len(filtered_words)
            weighted_terms = []
            
            for word, count in word_counts.most_common(top_n):
                # Simple weight: frequency normalized by total
                frequency_score = count / total_words
                weighted_terms.append((word, frequency_score))
            
            return weighted_terms if weighted_terms else [("general", 1.0)]
            
        except Exception as e:
            self.logger.warning(f"Error in weighted frequency extraction: {e}")
            return [("general", 1.0)]
    
    def validate_keywords_semantically(self, keywords: List[Tuple[str, float]], 
                                     cluster_embeddings: List[List[float]], 
                                     threshold: float = 0.3) -> List[Tuple[str, float]]:
        """Validate keywords using semantic coherence with cluster embeddings."""
        try:
            if not keywords or not cluster_embeddings:
                return keywords
            
            # Calculate cluster centroid
            import numpy as np
            cluster_centroid = np.mean(cluster_embeddings, axis=0)
            cluster_centroid = cluster_centroid / np.linalg.norm(cluster_centroid)
            
            validated_keywords = []
            
            for keyword, score in keywords:
                try:
                    if hasattr(self, 'embedding_model'):
                        keyword_embedding = self.embedding_model.encode([keyword])[0]
                        keyword_embedding = np.array(keyword_embedding)
                        keyword_embedding = keyword_embedding / np.linalg.norm(keyword_embedding)
                        
                        # Calculate semantic coherence
                        coherence = np.dot(cluster_centroid, keyword_embedding)
                        
                        # Apply coherence threshold
                        if coherence > threshold:
                            validated_keywords.append((keyword, score * coherence))
                    else:
                        # Fallback: keep keyword with original score
                        validated_keywords.append((keyword, score))
                        
                except Exception as e:
                    self.logger.debug(f"Semantic validation failed for {keyword}: {e}")
                    validated_keywords.append((keyword, score * 0.5))  # Penalty for failed validation
            
            return validated_keywords
            
        except Exception as e:
            self.logger.warning(f"Error in semantic keyword validation: {e}")
            return keywords
    
    def combine_extraction_methods(self, texts: List[str], top_n: int = 20) -> List[Tuple[str, float]]:
        """Combine multiple keyword extraction methods for better results."""
        try:
            # Method 1: Semantic extraction (KeyBERT)
            semantic_keywords = self.extract_semantic_keywords(texts, top_n=top_n)
            
            # Method 2: Weighted frequency
            frequency_keywords = self.extract_weighted_frequency_terms(texts, top_n=top_n)
            
            # Combine scores with weights
            combined_scores = {}
            
            # Semantic keywords (weight: 0.7)
            for keyword, score in semantic_keywords:
                combined_scores[keyword] = combined_scores.get(keyword, 0) + score * 0.7
            
            # Frequency keywords (weight: 0.3)
            for keyword, score in frequency_keywords:
                combined_scores[keyword] = combined_scores.get(keyword, 0) + score * 0.3
            
            # Sort by combined score
            sorted_keywords = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
            
            return sorted_keywords[:top_n]
            
        except Exception as e:
            self.logger.warning(f"Error combining extraction methods: {e}")
            return self.extract_semantic_keywords(texts, top_n)
    
    def get_extraction_summary(self, keywords: List[Tuple[str, float]]) -> Dict[str, Any]:
        """Get summary statistics about extracted keywords."""
        if not keywords:
            return {
                'total_keywords': 0,
                'avg_score': 0,
                'top_keywords': []
            }
        
        scores = [score for _, score in keywords]
        
        return {
            'total_keywords': len(keywords),
            'score_stats': {
                'min': min(scores),
                'max': max(scores),
                'average': sum(scores) / len(scores)
            },
            'top_keywords': [kw for kw, _ in keywords[:5]],
            'keyword_lengths': {
                'min': min(len(kw) for kw, _ in keywords),
                'max': max(len(kw) for kw, _ in keywords),
                'average': sum(len(kw) for kw, _ in keywords) / len(keywords)
            }
        }
