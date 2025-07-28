import logging
from typing import List, Optional

class LDATopicModeler:
    """
    Encapsulates LDA topic modeling logic for profile clustering.
    Optimized for better perplexity and topic coherence using advanced text cleaning.
    """
    def __init__(self, logger: Optional[logging.Logger] = None, text_cleaner=None):
        self.logger = logger or logging.getLogger(self.__class__.__name__)
        self.text_cleaner = text_cleaner
        
        # Initialize TextCleaner if not provided
        if self.text_cleaner is None:
            try:
                from ai_service.services.semantic_clustering.processors.text_cleaner import TextCleaner
                # Configure TextCleaner optimally for LDA
                self.text_cleaner = TextCleaner(
                    language='english',
                    remove_stopwords=True,
                    lemmatize=True,
                    remove_urls=True,
                    remove_emails=True,
                    remove_mentions=True,
                    remove_hashtags=False,  # Keep hashtags for topic coherence
                    normalize_whitespace=True,
                    min_word_length=3,  # Increased for LDA quality
                    max_word_length=50
                )
                self.logger.info("✅ TextCleaner initialized for optimal LDA preprocessing")
            except Exception as e:
                self.logger.warning(f"⚠️ Could not initialize TextCleaner: {e}")
                self.text_cleaner = None

    def build_topic_matrix(self, texts: List[str], n_topics: int = None, return_model_info: bool = False):
        """
        Build LDA topic distribution matrix from profile texts with advanced preprocessing.
        Optimized for lower perplexity using TextCleaner and best practices.
        
        Args:
            texts: List of profile texts
            n_topics: Number of topics (auto-determined if None)
            return_model_info: If True, returns tuple with (matrix, model_info)
        Returns:
            Topic distribution matrix (n_profiles x n_topics) or None if failed
            Or tuple (matrix, model_info) if return_model_info=True
        """
        try:
            from sklearn.feature_extraction.text import CountVectorizer
            from sklearn.decomposition import LatentDirichletAllocation

            if len(texts) < 3:
                self.logger.warning("Too few texts for LDA")
                return None

            # Step 1: Advanced text preprocessing using TextCleaner
            self.logger.info("🧹 Preprocessing texts with TextCleaner for optimal LDA performance")
            cleaned_texts = self._preprocess_texts_for_lda(texts)
            
            # Filter out texts that are too short after cleaning
            valid_texts = []
            for i, text in enumerate(cleaned_texts):
                if self._is_valid_for_lda(text):
                    valid_texts.append(text)
                else:
                    self.logger.debug(f"Filtered out text {i}: too short or uninformative after cleaning")
            
            if len(valid_texts) < 3:
                self.logger.warning(f"Too few valid texts after cleaning: {len(valid_texts)}/{len(texts)}")
                return None
            
            self.logger.info(f"📊 Using {len(valid_texts)}/{len(texts)} texts after cleaning and validation")

            # Step 2: Optimized vectorization for LDA
            vectorizer = CountVectorizer(
                max_features=300,  # Increased from 200 for richer vocabulary
                stop_words='english',
                min_df=2,  # Back to 2 for better quality with cleaned texts
                max_df=0.7,  # Reduced from 0.8 to filter very common terms
                ngram_range=(1, 2),  # Keep bigrams for better topic coherence
                lowercase=True,
                strip_accents='unicode',
                token_pattern=r'\b[a-zA-Z]{3,}\b'  # Minimum 3 characters (matches TextCleaner)
            )
            
            text_matrix = vectorizer.fit_transform(valid_texts)
            feature_names = vectorizer.get_feature_names_out()
            
            self.logger.info(f"📊 Vocabulary size: {len(feature_names)} features")
            self.logger.debug(f"Sample features: {list(feature_names[:20])}")

            if text_matrix.shape[1] < 5:  # Back to 5 for quality
                self.logger.warning(f"Too few features for LDA: {text_matrix.shape[1]}")
                return None

            # Step 3: Optimized topic number selection
            if n_topics is None:
                # More conservative topic calculation for better coherence
                base_topics = len(valid_texts) // 4  # Changed from //3 to //4
                n_topics = max(3, min(8, base_topics))  # Increased max to 8 for flexibility
                self.logger.info(f"🎯 Auto-selected {n_topics} topics for {len(valid_texts)} documents")

            # Step 4: Enhanced LDA with optimized parameters for lower perplexity
            self.logger.info(f"🔄 Building LDA model with {n_topics} topics from {len(valid_texts)} preprocessed texts")
            lda = LatentDirichletAllocation(
                n_components=n_topics,
                random_state=42,
                max_iter=500,  # Increased from 300 for better convergence
                learning_method='online',  # Optimal for medium-sized datasets
                doc_topic_prior=0.01,  # Reduced from 0.05 for sparser topic distributions
                topic_word_prior=0.01,  # Keep consistent with doc_topic_prior
                learning_offset=10.0,  # Reduced from 50.0 for faster initial learning
                learning_decay=0.51,  # Optimized value between 0.5-1.0
                evaluate_every=5,  # More frequent evaluation
                n_jobs=1,  # Ensure reproducibility
                verbose=0
            )
            
            # Fit the model and get topic distributions
            topic_distributions = lda.fit_transform(text_matrix)
            
            # Step 5: Enhanced logging and evaluation
            self.logger.info(f"✅ LDA topic matrix built: {topic_distributions.shape} (profiles x topics)")
            
            # Extract topic words
            feature_names = vectorizer.get_feature_names_out()
            topic_words = self.get_topic_words(lda, feature_names, top_words=50)
            
            try:
                # Calculate and log perplexity
                perplexity = lda.perplexity(text_matrix)
                self.logger.info(f"📊 LDA perplexity: {perplexity:.3f} (lower is better)")
                
                # Log topic coherence information
                self._log_topic_info(lda, feature_names, n_topics)
                
            except Exception as e:
                self.logger.warning(f"Could not calculate perplexity: {e}")
            
            if return_model_info:
                model_info = {
                    'n_topics': n_topics,
                    'topic_words': topic_words,
                    'feature_names': feature_names.tolist(),
                    'lda_model': lda,
                    'vectorizer': vectorizer
                }
                return topic_distributions, model_info
                
            return topic_distributions
            
        except ImportError:
            self.logger.error("sklearn not available for LDA")
            if return_model_info:
                return None, None
            return None
        except Exception as e:
            self.logger.error(f"LDA topic matrix creation failed: {e}")
            if return_model_info:
                return None, None
            return None

    def _preprocess_texts_for_lda(self, texts: List[str]) -> List[str]:
        """
        Preprocess texts using TextCleaner for optimal LDA performance.
        
        Args:
            texts: Raw texts to preprocess
            
        Returns:
            List of cleaned and optimized texts for LDA
        """
        if not self.text_cleaner:
            self.logger.warning("⚠️ TextCleaner not available, using minimal preprocessing")
            return [text.lower().strip() for text in texts if text and text.strip()]
        
        cleaned_texts = []
        
        for i, text in enumerate(texts):
            if not text or not text.strip():
                continue
                
            try:
                # Use TextCleaner for comprehensive cleaning
                cleaned = self.text_cleaner.clean(text)
                
                # Additional LDA-specific optimizations
                if cleaned and len(cleaned.strip()) > 0:
                    # Ensure semantic informativeness for LDA
                    if self.text_cleaner.is_semantically_informative(cleaned, min_words=3):
                        cleaned_texts.append(cleaned)
                    else:
                        self.logger.debug(f"Text {i} filtered: not semantically informative")
                else:
                    self.logger.debug(f"Text {i} filtered: empty after cleaning")
                    
            except Exception as e:
                self.logger.warning(f"Error cleaning text {i}: {e}")
                # Fallback to minimal cleaning
                fallback = text.lower().strip()
                if len(fallback.split()) >= 3:
                    cleaned_texts.append(fallback)
        
        return cleaned_texts

    def _is_valid_for_lda(self, text: str, min_words: int = 5, min_chars: int = 20) -> bool:
        """
        Validate if a text is suitable for LDA modeling.
        
        Args:
            text: Text to validate
            min_words: Minimum number of words required
            min_chars: Minimum number of characters required
            
        Returns:
            bool: True if text is valid for LDA, False otherwise
        """
        if not text or not text.strip():
            return False
        
        # Check minimum length requirements
        if len(text.strip()) < min_chars:
            return False
        
        words = text.split()
        if len(words) < min_words:
            return False
        
        # Check for sufficient alphabetic content
        alpha_chars = sum(1 for c in text if c.isalpha())
        if alpha_chars < min_chars // 2:
            return False
        
        # Use TextCleaner validation if available
        if self.text_cleaner and hasattr(self.text_cleaner, 'is_valid_text'):
            return self.text_cleaner.is_valid_text(text, min_length=min_chars)
        
        return True

    def _log_topic_info(self, lda_model, feature_names: List[str], n_topics: int, top_words: int = 5):
        """
        Log information about discovered topics for debugging and validation.
        
        Args:
            lda_model: Fitted LDA model
            feature_names: List of feature names from vectorizer
            n_topics: Number of topics
            top_words: Number of top words to show per topic
        """
        try:
            self.logger.info(f"🎯 Topic Analysis ({n_topics} topics):")
            
            for topic_idx, topic in enumerate(lda_model.components_):
                # Get top words for this topic
                top_words_idx = topic.argsort()[-top_words:][::-1]
                top_words_list = [feature_names[i] for i in top_words_idx]
                
                self.logger.info(f"  Topic {topic_idx}: {', '.join(top_words_list)}")
            
        except Exception as e:
            self.logger.warning(f"Could not log topic information: {e}")

    def get_topic_words(self, lda_model, feature_names: List[str], top_words: int = 10) -> List[List[str]]:
        """
        Extract top words for each topic from a fitted LDA model.
        
        Args:
            lda_model: Fitted LDA model
            feature_names: List of feature names from vectorizer
            top_words: Number of top words to extract per topic
            
        Returns:
            List of lists containing top words for each topic
        """
        try:
            topics_words = []
            
            for topic_idx, topic in enumerate(lda_model.components_):
                top_words_idx = topic.argsort()[-top_words:][::-1]
                top_words_list = [feature_names[i] for i in top_words_idx]
                topics_words.append(top_words_list)
            
            return topics_words
            
        except Exception as e:
            self.logger.error(f"Error extracting topic words: {e}")
            return []
