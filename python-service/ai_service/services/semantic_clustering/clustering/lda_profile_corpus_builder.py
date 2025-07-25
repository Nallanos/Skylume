"""
LDA Profile Corpus Builder for optimal LDA topic modeling.
Builds dense, keyword-rich text documents from profile data sources.
"""

import logging
import re
from typing import List, Dict, Any, Optional, Union
import numpy as np
from ai_service.services.semantic_clustering.keywords.keyword_extractor import SemanticKeywordExtractor 

class LDAProfileCorpusBuilder:
    """
    Builder for creating optimal LDA corpus from profile data.
    
    Follows LDA best practices:
    - One long, dense text per profile (document)
    - Keyword extraction from multiple sources
    - Text cleaning and normalization
    - Stopword removal and lemmatization
    - Minimum token requirements
    """

    def __init__(self, profiles: List[Any], keyword_extractor: SemanticKeywordExtractor, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the LDA corpus builder.
        
        Args:
            profiles: List of profile objects/dicts
            keyword_extractor: Service for extracting keywords (KeyBERT, etc.)
            config: Configuration options
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self.profiles = profiles
        self.keyword_extractor = keyword_extractor
        
        # Default configuration
        default_config = {
            'keywords_per_bio': 10,
            'keywords_per_posts': 15,
            'keywords_per_followings': 10,
            'min_tokens_per_document': 10,
            'enable_lemmatization': False,
            'remove_proper_nouns': True,
            'sources_to_include': ['bio', 'posts', 'followings'],
            'min_keyword_score': 0.1,
            'max_keywords_total': 50
        }
        
        self.config = {**default_config, **(config or {})}
        self.logger.info(f"🔄 LDAProfileCorpusBuilder initialized with {len(profiles)} profiles")
    
    def build_corpus(self) -> List[str]:
        """
        Build optimized LDA corpus from profiles.
        
        Returns:
            List of text documents, one per profile
        """
        self.logger.info(f"🔄 Building LDA corpus from {len(self.profiles)} profiles")
        
        corpus = []
        valid_profiles = 0
        
        for i, profile in enumerate(self.profiles):
            try:
                # Build document for this profile
                document_text = self._build_profile_document(profile)
                
                if document_text and len(document_text.split()) >= self.config['min_tokens_per_document']:
                    corpus.append(document_text)
                    valid_profiles += 1
                else:
                    self.logger.warning(f"Profile {i}: Document too short ({len(document_text.split()) if document_text else 0} tokens), skipping")
                    
            except Exception as e:
                self.logger.warning(f"Profile {i}: Error building document: {e}")
                continue
        
        self.logger.info(f"✅ LDA corpus built: {valid_profiles}/{len(self.profiles)} valid documents")
        
        if len(corpus) < 3:
            self.logger.warning(f"⚠️ Very few valid documents ({len(corpus)}) for LDA - consider adjusting config")
        
        return corpus
    
    def _build_profile_document(self, profile: Any) -> str:
        """
        Build a single dense document from profile sources.
        
        Args:
            profile: Profile object/dict
            
        Returns:
            Cleaned, keyword-rich text document
        """
        all_keywords = []
        
        # Extract keywords from each configured source
        for source in self.config['sources_to_include']:
            keywords = self._extract_keywords_from_source(profile, source)
            if keywords:
                all_keywords.extend(keywords)
        
        if not all_keywords:
            return ""
        
        # Limit total keywords
        if len(all_keywords) > self.config['max_keywords_total']:
            # Keep the highest scoring keywords
            all_keywords = sorted(all_keywords, key=lambda x: x.get('score', 0), reverse=True)
            all_keywords = all_keywords[:self.config['max_keywords_total']]
        
        # Extract just the keyword text
        keyword_texts = [kw['keyword'] if isinstance(kw, dict) else str(kw) for kw in all_keywords]
        
        # Join into document
        document = " ".join(keyword_texts)
        
        # Clean and normalize
        document = self._clean_document(document)
        
        return document
    
    def _extract_keywords_from_source(self, profile: Any, source: str) -> List[Dict[str, Any]]:
        """
        Extract keywords from a specific profile source.
        
        Args:
            profile: Profile object/dict
            source: Source type ('bio', 'posts', 'followings')
            
        Returns:
            List of keyword dicts with 'keyword' and 'score'
        """
        try:
            # Get text from source
            source_text = self._get_source_text(profile, source)
            if not source_text or len(source_text.strip()) < 5:
                return []
            
            # Get keyword count for this source
            max_keywords = self.config.get(f'keywords_per_{source}', 10)
            
            # Extract keywords using SemanticKeywordExtractor
            keywords = self._extract_keywords_with_semantic_extractor(source_text, max_keywords)
            
            return keywords
            
        except Exception as e:
            self.logger.warning(f"Error extracting keywords from {source}: {e}")
            return []
    
    def _extract_keywords_with_semantic_extractor(self, text: str, max_keywords: int) -> List[Dict[str, Any]]:
        """
        Helper method to extract keywords using SemanticKeywordExtractor.
        
        Args:
            text: Source text
            max_keywords: Maximum number of keywords to extract
            
        Returns:
            List of keyword dicts with 'keyword' and 'score'
        """
        try:
            # Use the combine_extraction_methods for best results
            keywords = self.keyword_extractor.combine_extraction_methods(
                [text], 
                top_n=max_keywords
            )
            
            # Convert to expected format
            normalized_keywords = []
            for kw in keywords:
                if isinstance(kw, (list, tuple)) and len(kw) >= 2:
                    keyword_text, score = kw[0], kw[1]
                    # Filter by minimum score
                    if score >= self.config['min_keyword_score']:
                        normalized_keywords.append({'keyword': keyword_text, 'score': score})
                elif isinstance(kw, dict) and 'keyword' in kw:
                    if kw.get('score', 0) >= self.config['min_keyword_score']:
                        normalized_keywords.append(kw)
                else:
                    # Fallback for unknown format
                    normalized_keywords.append({'keyword': str(kw), 'score': 1.0})
            
            return normalized_keywords
            
        except Exception as e:
            self.logger.warning(f"Error with combine_extraction_methods: {e}, trying semantic extraction")
            try:
                # Fallback to semantic extraction
                keywords = self.keyword_extractor.extract_semantic_keywords(
                    [text], 
                    top_n=max_keywords
                )
                
                # Convert to expected format
                normalized_keywords = []
                for kw in keywords:
                    if isinstance(kw, (list, tuple)) and len(kw) >= 2:
                        keyword_text, score = kw[0], kw[1]
                        if score >= self.config['min_keyword_score']:
                            normalized_keywords.append({'keyword': keyword_text, 'score': score})
                
                return normalized_keywords
                
            except Exception as e2:
                self.logger.warning(f"Error with semantic extraction: {e2}, trying frequency extraction")
                try:
                    # Last fallback to frequency extraction
                    keywords = self.keyword_extractor.extract_weighted_frequency_terms(
                        [text], 
                        top_n=max_keywords
                    )
                    
                    # Convert to expected format
                    normalized_keywords = []
                    for kw in keywords:
                        if isinstance(kw, (list, tuple)) and len(kw) >= 2:
                            keyword_text, score = kw[0], kw[1]
                            if score >= self.config['min_keyword_score']:
                                normalized_keywords.append({'keyword': keyword_text, 'score': score})
                    
                    return normalized_keywords
                    
                except Exception as e3:
                    self.logger.warning(f"All keyword extraction methods failed: {e3}")
                    return []

    def _get_source_text(self, profile: Any, source: str) -> str:
        """
        Extract text from a specific profile source.
        
        Args:
            profile: Profile object/dict
            source: Source type
            
        Returns:
            Raw text from source
        """
        try:
            if isinstance(profile, dict):
                # Dictionary access
                if source == 'bio':
                    return profile.get('description', '') or profile.get('bio', '')
                elif source == 'posts':
                    posts = profile.get('recent_posts', []) or profile.get('posts', [])
                    if posts:
                        return " ".join([post.get('text', '') or post.get('content', '') for post in posts[:10]])
                elif source == 'followings':
                    followings = profile.get('top_followings', []) or profile.get('followings', [])
                    if followings:
                        return " ".join([f.get('description', '') or f.get('bio', '') for f in followings[:20]])
            else:
                # Object attribute access
                if source == 'bio':
                    return getattr(profile, 'description', '') or getattr(profile, 'bio', '')
                elif source == 'posts':
                    posts = getattr(profile, 'recent_posts', []) or getattr(profile, 'posts', [])
                    if posts:
                        return " ".join([getattr(post, 'text', '') or getattr(post, 'content', '') for post in posts[:10]])
                elif source == 'followings':
                    followings = getattr(profile, 'top_followings', []) or getattr(profile, 'followings', [])
                    if followings:
                        return " ".join([getattr(f, 'description', '') or getattr(f, 'bio', '') for f in followings[:20]])
            
            return ""
            
        except Exception as e:
            self.logger.warning(f"Error getting text from {source}: {e}")
            return ""
    
    def _clean_document(self, document: str) -> str:
        """
        Clean and normalize document text for LDA.
        
        Args:
            document: Raw document text
            
        Returns:
            Cleaned text
        """
        if not document:
            return ""
        
        # Convert to lowercase
        document = document.lower()
        
        # Remove URLs
        document = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', document)
        
        # Remove email addresses
        document = re.sub(r'\S+@\S+', '', document)
        
        # Remove numbers (unless you want to keep them)
        document = re.sub(r'\d+', '', document)
        
        # Remove punctuation except spaces
        document = re.sub(r'[^\w\s]', ' ', document)
        
        # Remove extra whitespace
        document = re.sub(r'\s+', ' ', document)
        
        # Remove very short words (< 3 chars) that are often noise
        words = document.split()
        words = [word for word in words if len(word) >= 3]
        
        # Optional: Remove proper nouns (basic heuristic)
        if self.config['remove_proper_nouns']:
            # Remove words that are likely proper nouns (all caps or title case in original)
            # This is a simple heuristic, could be improved with NLP
            words = [word for word in words if not word.istitle()]
        
        # Optional: Lemmatization
        if self.config['enable_lemmatization']:
            words = self._lemmatize_words(words)
        
        return " ".join(words).strip()
    
    def _lemmatize_words(self, words: List[str]) -> List[str]:
        """
        Apply lemmatization to words.
        
        Args:
            words: List of words
            
        Returns:
            List of lemmatized words
        """
        try:
            # Try to use spacy or nltk for lemmatization
            try:
                import spacy
                # Try to load a spacy model
                nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])
                doc = nlp(" ".join(words))
                return [token.lemma_ for token in doc if not token.is_space]
            except:
                pass
            
            try:
                from nltk.stem import WordNetLemmatizer
                from nltk.corpus import wordnet
                lemmatizer = WordNetLemmatizer()
                return [lemmatizer.lemmatize(word) for word in words]
            except:
                pass
            
            # Fallback: return original words
            self.logger.warning("No lemmatization library available, skipping lemmatization")
            return words
            
        except Exception as e:
            self.logger.warning(f"Error in lemmatization: {e}")
            return words
    
    def get_corpus_stats(self, corpus: List[str]) -> Dict[str, Any]:
        """
        Get statistics about the built corpus.
        
        Args:
            corpus: Built corpus
            
        Returns:
            Statistics dictionary
        """
        if not corpus:
            return {'total_documents': 0, 'avg_tokens': 0, 'total_tokens': 0}
        
        token_counts = [len(doc.split()) for doc in corpus]
        
        return {
            'total_documents': len(corpus),
            'total_tokens': sum(token_counts),
            'avg_tokens': np.mean(token_counts),
            'min_tokens': min(token_counts),
            'max_tokens': max(token_counts),
            'median_tokens': np.median(token_counts),
            'documents_below_min': sum(1 for count in token_counts if count < self.config['min_tokens_per_document'])
        }
