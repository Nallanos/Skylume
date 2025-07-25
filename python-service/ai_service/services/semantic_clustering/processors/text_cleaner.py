"""
Text cleaner for profile processing in semantic clustering pipeline.
Handles comprehensive text cleaning and normalization for ML applications.
"""
import re
import logging
from typing import List, Dict, Any, Optional, Set
import unicodedata
import html
from urllib.parse import urlparse
import numpy as np

# Import NLTK components
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    from nltk.stem import WordNetLemmatizer
    from nltk.corpus import wordnet
    nltk.download('stopwords', quiet=True)
    nltk.download('punkt', quiet=True)
    nltk.download('wordnet', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False
    nltk = None
    stopwords = None
    word_tokenize = None
    WordNetLemmatizer = None
    wordnet = None

# Import spaCy if available
try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    spacy = None

# Import sentence transformers for cosine similarity
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None


class TextCleaner:
    """
    Comprehensive text cleaner for ML applications with multiple cleaning strategies.
    
    Features:
    - HTML entity decoding
    - URL removal and normalization
    - Emoji handling
    - Stopword removal
    - Lemmatization
    - Unicode normalization
    - Social media specific cleaning
    - Multiple regex patterns for comprehensive cleaning
    """
    
    def __init__(self, 
                 language: str = 'english',
                 remove_stopwords: bool = True,
                 lemmatize: bool = True,
                 remove_urls: bool = True,
                 remove_emails: bool = True,
                 remove_mentions: bool = True,
                 remove_hashtags: bool = False,
                 normalize_whitespace: bool = True,
                 min_word_length: int = 2,
                 max_word_length: int = 50):
        """
        Initialize the TextCleaner with configurable options.
        
        Args:
            language: Language for stopwords (default: 'english')
            remove_stopwords: Whether to remove stopwords
            lemmatize: Whether to lemmatize words
            remove_urls: Whether to remove URLs
            remove_emails: Whether to remove email addresses
            remove_mentions: Whether to remove @mentions
            remove_hashtags: Whether to remove #hashtags
            normalize_whitespace: Whether to normalize whitespace
            min_word_length: Minimum word length to keep
            max_word_length: Maximum word length to keep
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self.language = language
        self.remove_stopwords = remove_stopwords
        self.lemmatize = lemmatize
        self.remove_urls = remove_urls
        self.remove_emails = remove_emails
        self.remove_mentions = remove_mentions
        self.remove_hashtags = remove_hashtags
        self.normalize_whitespace = normalize_whitespace
        self.min_word_length = min_word_length
        self.max_word_length = max_word_length
        
        # Initialize components
        self._init_stopwords()
        self._init_lemmatizer()
        self._init_spacy()
        self._init_regex_patterns()
        self._init_similarity_model()
        
        self.logger.info("✅ TextCleaner initialized with comprehensive cleaning capabilities")
    
    def _init_stopwords(self) -> None:
        """Initialize stopwords set."""
        self.stopwords_set: Set[str] = set()
        if NLTK_AVAILABLE and self.remove_stopwords:
            try:
                # Ensure NLTK data is available
                nltk.data.find('corpora/stopwords')
            except LookupError:
                self.logger.info("Downloading NLTK 'stopwords' model...")
                nltk.download('stopwords', quiet=True)
            
            try:
                self.stopwords_set = set(stopwords.words(self.language))
                # Add common social media stopwords
                self.stopwords_set.update({
                    'rt', 'via', 'dm', 'pm', 'am', 'im', 'lol', 'lmao', 'omg', 'wtf',
                    'tbh', 'imo', 'imho', 'fyi', 'btw', 'aka', 'asap', 'tl;dr', 'tldr',
                    'follow', 'following', 'followers', 'tweet', 'retweet', 'like', 'share'
                })
                self.logger.info(f"✅ Loaded {len(self.stopwords_set)} stopwords for {self.language}")
            except Exception as e:
                self.logger.warning(f"⚠️ Could not load stopwords: {e}")
        else:
            self.logger.warning("⚠️ NLTK not available or stopword removal disabled")
    
    def _init_lemmatizer(self) -> None:
        """Initialize lemmatizer."""
        self.lemmatizer = None
        if NLTK_AVAILABLE and self.lemmatize:
            try:
                # Ensure NLTK data is available
                nltk.data.find('corpora/wordnet')
            except LookupError:
                self.logger.info("Downloading NLTK 'wordnet' model...")
                nltk.download('wordnet', quiet=True)
            
            try:
                self.lemmatizer = WordNetLemmatizer()
                self.logger.info("✅ Lemmatizer initialized")
            except Exception as e:
                self.logger.warning(f"⚠️ Could not initialize lemmatizer: {e}")
        else:
            self.logger.warning("⚠️ NLTK not available or lemmatization disabled")
    
    def _init_spacy(self) -> None:
        """Initialize spaCy model if available."""
        self.nlp = None
        if SPACY_AVAILABLE:
            try:
                # Try to load English model
                self.nlp = spacy.load('en_core_web_sm')
                self.logger.info("✅ spaCy model loaded")
            except OSError:
                self.logger.warning("⚠️ spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
            except Exception as e:
                self.logger.warning(f"⚠️ Could not load spaCy: {e}")
        else:
            self.logger.warning("⚠️ spaCy not available")
    
    def _init_regex_patterns(self) -> None:
        """Initialize comprehensive regex patterns for text cleaning."""
        self.patterns = {
            # URLs (comprehensive pattern)
            'url': re.compile(
                r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
                r'|www\.(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
                r'|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}'
                r'(?:\/[^\s]*)?',
                re.IGNORECASE
            ),
            
            # Email addresses
            'email': re.compile(
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                re.IGNORECASE
            ),
            
            # Social media mentions
            'mention': re.compile(r'@[A-Za-z0-9_]+'),
            
            # Hashtags
            'hashtag': re.compile(r'#[A-Za-z0-9_]+'),
            
            # Phone numbers (various formats)
            'phone': re.compile(
                r'(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}'
                r'|(?:\+?[1-9]\d{0,3}[-.\s]?)?\(?[0-9]{1,4}\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}'
            ),
            
            # Emojis (comprehensive pattern)
            'emoji': re.compile(
                r'[\U0001F600-\U0001F64F]|[\U0001F300-\U0001F5FF]|[\U0001F680-\U0001F6FF]'
                r'|[\U0001F1E0-\U0001F1FF]|[\U00002702-\U000027B0]|[\U000024C2-\U0001F251]'
                r'|[\U0001F900-\U0001F9FF]|[\U0001FA70-\U0001FAFF]',
                re.UNICODE
            ),
            
            # HTML tags
            'html_tag': re.compile(r'<[^>]+>'),
            
            # Excessive punctuation
            'excess_punct': re.compile(r'[.!?]{2,}'),
            
            # Excessive whitespace
            'excess_space': re.compile(r'\s{2,}'),
            
            # Numbers (standalone)
            'numbers': re.compile(r'\b\d+\b'),
            
            # Special characters (keep some for context)
            'special_chars': re.compile(r'[^\w\s\-.,!?;:]'),
            
            # Repeated characters (e.g., "hellooooo")
            'repeated_chars': re.compile(r'(.)\1{2,}'),
            
            # Currency symbols
            'currency': re.compile(r'[$£€¥₹₽¢]'),
            
            # Time expressions
            'time': re.compile(r'\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?\b'),
            
            # Dates (various formats)
            'date': re.compile(
                r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b'
                r'|\b\d{2,4}[/-]\d{1,2}[/-]\d{1,2}\b'
                r'|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b',
                re.IGNORECASE
            ),
            
            # Common abbreviations to expand
            'contractions': {
                r"\b(can't|cannot)\b": "can not",
                r"\b(won't|will not)\b": "will not",
                r"\b(n't)\b": " not",
                r"\b('re|are)\b": " are",
                r"\b('ve|have)\b": " have",
                r"\b('ll|will)\b": " will",
                r"\b('d|would)\b": " would",
                r"\b('m|am)\b": " am",
                r"\b(it's|its)\b": "it is",
                r"\b(that's)\b": "that is",
                r"\b(what's)\b": "what is",
                r"\b(where's)\b": "where is",
                r"\b(who's)\b": "who is",
                r"\b(how's)\b": "how is",
                r"\b(let's)\b": "let us",
                r"\b(there's)\b": "there is",
                r"\b(here's)\b": "here is",
            }
        }
        
        self.logger.info("✅ Comprehensive regex patterns initialized")
    
    def _init_similarity_model(self) -> None:
        """Initialize lightweight sentence transformer for cosine similarity."""
        self.similarity_model = None
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                # Use a lightweight model for similarity computation
                self.similarity_model = SentenceTransformer('all-MiniLM-L6-v2')
                self.logger.info("✅ Similarity model initialized (all-MiniLM-L6-v2)")
            except Exception as e:
                self.logger.warning(f"⚠️ Could not initialize similarity model: {e}")
        else:
            self.logger.warning("⚠️ sentence-transformers not available - cosine similarity disabled")
    
    def clean(self, text: str) -> str:
        """
        Main cleaning method that applies all cleaning strategies.
        
        Args:
            text: Raw text to clean
            
        Returns:
            str: Cleaned and normalized text
        """
        if not text or not isinstance(text, str):
            return ""
        
        try:
            # Step 1: Initial preprocessing
            cleaned = self._preprocess_text(text)
            
            # Step 2: Remove specific patterns
            cleaned = self._remove_patterns(cleaned)
            
            # Step 3: Normalize and decode
            cleaned = self._normalize_text(cleaned)
            
            # Step 4: Tokenize, filter, and lemmatize
            cleaned = self._process_tokens(cleaned)
            
            # Step 5: Final cleanup
            cleaned = self._final_cleanup(cleaned)
            
            return cleaned.strip()
            
        except Exception as e:
            self.logger.error(f"Error cleaning text: {e}")
            return text  # Return original text if cleaning fails
    
    def _preprocess_text(self, text: str) -> str:
        """Initial preprocessing steps."""
        # Decode HTML entities
        text = html.unescape(text)
        
        # Normalize Unicode characters
        text = unicodedata.normalize('NFKD', text)
        
        # Convert to lowercase
        text = text.lower()
        
        # Expand contractions
        for pattern, replacement in self.patterns['contractions'].items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text
    
    def _remove_patterns(self, text: str) -> str:
        """Remove specific patterns based on configuration."""
        # Remove URLs
        if self.remove_urls:
            text = self.patterns['url'].sub('', text)
        
        # Remove emails
        if self.remove_emails:
            text = self.patterns['email'].sub('', text)
        
        # Remove mentions
        if self.remove_mentions:
            text = self.patterns['mention'].sub('', text)
        
        # Remove hashtags (but preserve the word)
        if self.remove_hashtags:
            text = self.patterns['hashtag'].sub(lambda m: m.group(0)[1:], text)
        
        # Remove HTML tags
        text = self.patterns['html_tag'].sub('', text)
        
        # Remove phone numbers
        text = self.patterns['phone'].sub('', text)
        
        # Remove emojis
        text = self.patterns['emoji'].sub('', text)
        
        # Remove currency symbols
        text = self.patterns['currency'].sub('', text)
        
        # Remove time expressions
        text = self.patterns['time'].sub('', text)
        
        # Remove dates
        text = self.patterns['date'].sub('', text)
        
        # Remove standalone numbers
        text = self.patterns['numbers'].sub('', text)
        
        return text
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text formatting."""
        # Fix repeated characters (e.g., "hellooooo" -> "hello")
        text = self.patterns['repeated_chars'].sub(r'\1\1', text)
        
        # Normalize excessive punctuation
        text = self.patterns['excess_punct'].sub('.', text)
        
        # Remove special characters (keep basic punctuation)
        text = self.patterns['special_chars'].sub(' ', text)
        
        # Normalize whitespace
        if self.normalize_whitespace:
            text = self.patterns['excess_space'].sub(' ', text)
        
        return text
    
    def _process_tokens(self, text: str) -> str:
        """Tokenize, filter, and lemmatize text."""
        try:
            # Tokenize - Use simple splitting to avoid NLTK punkt issues
            tokens = text.split()
            
            processed_tokens = []
            
            for token in tokens:
                # Filter by length
                if len(token) < self.min_word_length or len(token) > self.max_word_length:
                    continue
                
                # Remove stopwords
                if self.remove_stopwords and token in self.stopwords_set:
                    continue
                
                # Skip if only punctuation
                if not any(c.isalnum() for c in token):
                    continue
                
                # Lemmatize only if lemmatizer is available
                if self.lemmatize and self.lemmatizer and NLTK_AVAILABLE:
                    try:
                        # Get part of speech for better lemmatization
                        pos = self._get_wordnet_pos(token)
                        token = self.lemmatizer.lemmatize(token, pos)
                    except Exception:
                        # If lemmatization fails, keep original token
                        pass
                
                processed_tokens.append(token)
            
            return ' '.join(processed_tokens)
            
        except Exception as e:
            self.logger.warning(f"Error processing tokens: {e}")
            # Fallback to basic tokenization if everything fails
            tokens = text.split()
            # Filter basic tokens
            filtered_tokens = [
                token for token in tokens 
                if len(token) >= self.min_word_length 
                and len(token) <= self.max_word_length
                and any(c.isalnum() for c in token)
            ]
            return ' '.join(filtered_tokens)
    
    def _get_wordnet_pos(self, word: str) -> str:
        """Get WordNet POS tag for better lemmatization."""
        if not NLTK_AVAILABLE:
            return wordnet.NOUN
        
        try:
            tag = nltk.pos_tag([word])[0][1][0].upper()
            tag_dict = {
                'J': wordnet.ADJ,
                'N': wordnet.NOUN,
                'V': wordnet.VERB,
                'R': wordnet.ADV
            }
            return tag_dict.get(tag, wordnet.NOUN)
        except Exception:
            return wordnet.NOUN
    
    def _final_cleanup(self, text: str) -> str:
        """Final cleanup steps."""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        # Remove empty parentheses, brackets, etc.
        text = re.sub(r'\(\s*\)|\[\s*\]|\{\s*\}', '', text)
        
        # Remove standalone punctuation
        text = re.sub(r'\s+[.,;:!?]+\s+', ' ', text)
        
        return text
    
    def clean_batch(self, texts: List[str]) -> List[str]:
        """
        Clean multiple texts in batch.
        
        Args:
            texts: List of texts to clean
            
        Returns:
            List[str]: List of cleaned texts
        """
        return [self.clean(text) for text in texts]
    
    def extract_keywords(self, text: str, top_n: int = 10) -> List[str]:
        """
        Extract keywords from cleaned text.
        
        Args:
            text: Text to extract keywords from
            top_n: Number of top keywords to return
            
        Returns:
            List[str]: List of extracted keywords
        """
        cleaned = self.clean(text)
        
        if not cleaned:
            return []
        
        # Simple keyword extraction by frequency
        words = cleaned.split()
        word_freq = {}
        
        for word in words:
            if len(word) >= 3:  # Only consider words with 3+ characters
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency and return top_n
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:top_n]]
    
    def get_cleaning_stats(self, original_text: str, cleaned_text: str) -> Dict[str, Any]:
        """
        Get statistics about the cleaning process.
        
        Args:
            original_text: Original text before cleaning
            cleaned_text: Text after cleaning
            
        Returns:
            Dict[str, Any]: Cleaning statistics
        """
        return {
            'original_length': len(original_text),
            'cleaned_length': len(cleaned_text),
            'length_reduction': len(original_text) - len(cleaned_text),
            'reduction_percentage': ((len(original_text) - len(cleaned_text)) / len(original_text)) * 100 if original_text else 0,
            'original_words': len(original_text.split()),
            'cleaned_words': len(cleaned_text.split()),
            'words_removed': len(original_text.split()) - len(cleaned_text.split()),
            'words_removal_percentage': ((len(original_text.split()) - len(cleaned_text.split())) / len(original_text.split())) * 100 if original_text.split() else 0
        }
    
    def is_valid_text(self, text: str, min_length: int = 10) -> bool:
        """
        Check if cleaned text is valid for further processing.
        
        Args:
            text: Text to validate
            min_length: Minimum length for valid text
            
        Returns:
            bool: True if text is valid, False otherwise
        """
        if not text or not isinstance(text, str):
            return False
        
        # Check minimum length
        if len(text.strip()) < min_length:
            return False
        
        # Check if text has enough alphabetic characters
        alpha_chars = sum(1 for c in text if c.isalpha())
        if alpha_chars < min_length // 2:
            return False
        
        return True
    
    def compute_cosine_similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two texts using sentence embeddings.
        
        Args:
            text1: First text to compare
            text2: Second text to compare
            
        Returns:
            float: Cosine similarity score between 0 and 1
        """
        if not self.similarity_model:
            self.logger.warning("Similarity model not available - returning default similarity of 0.5")
            return 0.5
        
        if not text1 or not text2:
            return 0.0
        
        try:
            # Clean texts first
            clean_text1 = self.clean(text1)
            clean_text2 = self.clean(text2)
            
            if not clean_text1 or not clean_text2:
                return 0.0
            
            # Generate embeddings
            embeddings = self.similarity_model.encode([clean_text1, clean_text2])
            
            # Calculate cosine similarity
            from sklearn.metrics.pairwise import cosine_similarity
            similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
            
            # Ensure similarity is between 0 and 1
            return max(0.0, min(1.0, float(similarity)))
            
        except Exception as e:
            self.logger.error(f"Error computing cosine similarity: {e}")
            return 0.0
    
    def is_text_relevant_to_bio(self, bio: str, text: str, threshold: float = 0.65) -> bool:
        """
        Check if a text (post or following bio) is semantically relevant to the main bio.
        
        Args:
            bio: Main profile bio text
            text: Text to compare (post or following bio)
            threshold: Minimum cosine similarity threshold (default: 0.3)
            
        Returns:
            bool: True if text is relevant to bio, False otherwise
        """
        if not bio or not text:
            return False
        
        # Quick length check - very short texts are likely not informative
        if len(text.strip()) < 10:
            return False
        
        try:
            similarity = self.compute_cosine_similarity(bio, text)
            is_relevant = similarity >= threshold
            
            if is_relevant:
                self.logger.debug(f"Text relevant to bio (similarity: {similarity:.3f}): {text[:50]}...")
            else:
                self.logger.debug(f"Text not relevant to bio (similarity: {similarity:.3f}): {text[:50]}...")
            
            return is_relevant
            
        except Exception as e:
            self.logger.error(f"Error checking text relevance: {e}")
            return False
    
    def is_semantically_informative(self, text: str, min_words: int = 5) -> bool:
        """
        Enhanced method to evaluate if a text contains sufficiently informative semantic content.
        
        Args:
            text: The text to evaluate
            min_words: Minimum number of meaningful words required
            
        Returns:
            bool: True if the text is sufficiently informative, False otherwise
        """
        if not text or not text.strip():
            return False
        
        # Clean the text first
        cleaned = self.clean(text)
        if not cleaned:
            return False
        
        # Check minimum length
        if len(cleaned.split()) < min_words:
            return False
        
        # Check for generic/bot-like patterns
        generic_patterns = [
            r'^(follow me|follow back|dm me|check out|link in bio).*',
            r'^(hello|hi|hey)[\s\.,!]*$',
            r'^(thanks|thank you)[\s\.,!]*$',
            r'^\d+[\s\.,!]*$',  # Just numbers
            r'^[^a-zA-Z]*$',    # No letters
        ]
        
        for pattern in generic_patterns:
            if re.match(pattern, cleaned.lower()):
                return False
        
        # Check word diversity - avoid repetitive texts
        words = cleaned.split()
        unique_words = set(words)
        
        # If more than 50% of words are repeated, it's likely spam/bot
        if len(unique_words) < len(words) * 0.5:
            return False
        
        # Check for meaningful content words (not just stopwords)
        meaningful_words = [
            word for word in unique_words 
            if len(word) > 2 and word not in self.stopwords_set
        ]
        
        return len(meaningful_words) >= min_words
    
    def filter_relevant_texts(self, bio: str, texts: List[str], max_texts: int = 5, threshold: float = 0.65) -> List[str]:
        """
        Filter a list of texts to keep only those relevant to the bio.
        
        Args:
            bio: Main profile bio text
            texts: List of texts to filter (posts or following bios)
            max_texts: Maximum number of relevant texts to return
            threshold: Minimum cosine similarity threshold
            
        Returns:
            List[str]: List of relevant texts, sorted by relevance
        """
        if not bio or not texts:
            return []
        
        relevant_texts = []
        
        for text in texts:
            if not text or not self.is_semantically_informative(text):
                continue
            
            similarity = self.compute_cosine_similarity(bio, text)
            if similarity >= threshold:
                relevant_texts.append((text, similarity))
        
        # Sort by similarity (descending) and return top texts
        relevant_texts.sort(key=lambda x: x[1], reverse=True)
        return [text for text, _ in relevant_texts[:max_texts]]
