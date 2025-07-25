#!/usr/bin/env python3
"""
Simplified tag generator with hybrid KeyBERT + centroid approach for optimal tag selection
"""
import logging
import numpy as np
from typing import List, Tuple, Optional
from nltk.corpus import stopwords
import nltk

logger = logging.getLogger(__name__)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class ImprovedTagGenerator:
    """
    Simplified tag generator that combines KeyBERT keyword extraction with semantic centroid analysis
    for optimal tag selection. Uses NLTK stopwords and minimal domain filtering.
    """
    
    def __init__(self, embedding_model=None):
        self.embedding_model = embedding_model
        
        # Use NLTK stopwords + minimal domain-specific excludes
        try:
            nltk_stopwords = set(stopwords.words('english'))
            domain_excludes = {
                'user', 'users', 'member', 'members', 'group', 'groups', 'people', 'person',
                'community', 'general', 'misc', 'other', 'mixed', 'various'
            }
            self.stopwords = nltk_stopwords.union(domain_excludes)
        except Exception as e:
            logger.warning(f"Could not load NLTK stopwords, using minimal set: {e}")
            # Fallback minimal stopwords if NLTK not available
            self.stopwords = {
                'i', 'me', 'my', 'you', 'your', 'we', 'our', 'they', 'them', 'their',
                'he', 'she', 'it', 'his', 'her', 'its', 'the', 'a', 'an', 'and', 'or', 'but',
                'are', 'is', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did',
                'user', 'users', 'member', 'members', 'group', 'groups', 'people', 'person',
                'community', 'general', 'misc', 'other', 'mixed', 'various'
            }

    def select_optimal_keyword_via_centroid(self, keywords: List[Tuple[str, float]], 
                                           cluster_embeddings: Optional[List[List[float]]] = None) -> str:
        """
        Hybrid KeyBERT + centroid approach: Select the best single keyword using semantic centroids.
        
        This method implements the final improvement by:
        1. Using KeyBERT scores for initial ranking (semantic relevance)
        2. Calculating semantic centroid from cluster embeddings (representativeness)
        3. Finding the keyword closest to the centroid (optimal balance)
        
        Args:
            keywords: List of (keyword, keybert_score) tuples
            cluster_embeddings: Profile embeddings from the cluster
            
        Returns:
            Single best keyword for tag generation
        """
        try:
            if not keywords:
                return "community"
            
            # If no embedding model or cluster embeddings, fall back to highest KeyBERT score
            if not self.embedding_model or not cluster_embeddings:
                return keywords[0][0]  # Highest scored keyword
            
            # Calculate cluster centroid
            centroid = self._calculate_centroid(cluster_embeddings)
            if centroid is None:
                return keywords[0][0]
            
            # Get embeddings for all keywords
            keyword_texts = [kw for kw, _ in keywords]  
            keyword_embeddings = self.embedding_model.encode(keyword_texts)
            
            # Find keyword closest to centroid, weighted by KeyBERT score
            best_keyword = self._find_optimal_keyword(keywords, keyword_embeddings, centroid)
            
            return best_keyword
            
        except Exception as e:
            logger.warning(f"Error in centroid-based keyword selection: {e}")
            return keywords[0][0] if keywords else "community"
    
    def _calculate_centroid(self, embeddings: List[List[float]]) -> Optional[np.ndarray]:
        """Calculate normalized centroid from embeddings"""
        try:
            if not embeddings:
                return None
            
            centroid = np.mean(embeddings, axis=0)
            norm = np.linalg.norm(centroid)
            
            if norm > 0:
                return centroid / norm
            else:
                return None
                
        except Exception as e:
            logger.debug(f"Error calculating centroid: {e}")
            return None
    
    def _find_optimal_keyword(self, keywords: List[Tuple[str, float]], 
                             keyword_embeddings: List[List[float]], 
                             centroid: np.ndarray) -> str:
        """Find the keyword that best balances KeyBERT score with centroid similarity"""
        try:
            best_score = -1
            best_keyword = keywords[0][0]
            
            for i, (keyword, keybert_score) in enumerate(keywords):
                if i >= len(keyword_embeddings):
                    continue
                    
                # Calculate similarity to centroid
                kw_embedding = np.array(keyword_embeddings[i])
                kw_norm = np.linalg.norm(kw_embedding)
                
                if kw_norm > 0:
                    kw_embedding = kw_embedding / kw_norm
                    centroid_similarity = float(np.dot(kw_embedding, centroid))
                    
                    # Ensure keybert_score is a float
                    keybert_score = float(keybert_score)
                    
                    # Hybrid score: balance KeyBERT relevance with centroid representativeness
                    # 70% semantic relevance (KeyBERT) + 30% representativeness (centroid)
                    hybrid_score = 0.7 * keybert_score + 0.3 * centroid_similarity
                    
                    if hybrid_score > best_score:
                        best_score = hybrid_score
                        best_keyword = keyword
                        
            return best_keyword
            
        except Exception as e:
            logger.debug(f"Error finding optimal keyword: {e}")
            return keywords[0][0]

    def generate_tag_from_keywords(self, keywords: List[Tuple[str, float]], 
                                  cluster_embeddings: Optional[List[List[float]]] = None) -> str:
        """
        Generate a single, clean keyword tag using the hybrid KeyBERT + centroid approach.
        
        Simply picks the best keyword and returns it cleaned - no complex logic needed.
        
        Args:
            keywords: List of (keyword, score) tuples from KeyBERT
            cluster_embeddings: Profile embeddings for centroid calculation
            
        Returns:
            A clean, single keyword tag
        """
        try:
            if not keywords:
                return "Community"
            
            # Filter out stopwords and low-quality keywords
            filtered_keywords = self._filter_blacklisted_keywords(keywords)
            if not filtered_keywords:
                return "Community"
            
            # Pick the best keyword using hybrid KeyBERT + centroid selection
            best_keyword = self.select_optimal_keyword_via_centroid(filtered_keywords, cluster_embeddings)
            
            # Return it cleaned (just proper capitalization)
            return best_keyword.strip().title()
            
        except Exception as e:
            logger.warning(f"Error in tag generation: {e}")
            return "Community"
    
    def _filter_blacklisted_keywords(self, keywords: List[Tuple[str, float]]) -> List[Tuple[str, float]]:
        """Filter out stopwords and low-quality keywords using NLTK stopwords"""
        filtered = []
        
        for keyword, score in keywords:
            clean_kw = keyword.strip().lower()
            
            # Simple quality checks: length, not in stopwords, alphanumeric
            if (len(clean_kw) >= 2 and 
                clean_kw not in self.stopwords and
                clean_kw.replace(' ', '').isalnum()):
                
                filtered.append((keyword, score))
                
        return filtered 
    
    def validate_tag_quality(self, tag: str) -> bool:
        """
        Validate if a tag meets quality standards
        """
        if not tag or len(tag.strip()) < 2:
            return False
        
        tag_lower = tag.lower().strip()
        
        # Accept "Community" as a valid fallback tag
        if tag_lower == "community":
            return True
        
        # Check if it's in our stopwords (including domain excludes)
        if tag_lower in self.stopwords:
            return False
        
        # Check for proper structure (no excessive underscores)
        if tag.count('_') > 2 or '__' in tag:
            return False
        
        return True
