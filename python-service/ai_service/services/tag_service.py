import asyncio
import time
import re
import math
import hashlib
import gc  # Add garbage collector for memory management
import psutil  # Add process monitoring
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict, Counter
import numpy as np
import logging
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Import additional dependencies for enhanced functionality
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.cluster import HDBSCAN
    from nltk.corpus import stopwords
    import nltk
    # Download required NLTK data if not present
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)
except ImportError as e:
    # Graceful degradation if optional dependencies are missing
    logging.warning(f"Optional dependencies not available: {e}. Some advanced features may be limited.")

from ai_service.clients.adonis_api_client import AdonisApiClient
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.models.interfaces.clustering_model import ClusteringModel
from ai_service.models.interfaces.tag_generator import TagGenerator
from ai_service.utils.text_cleaner import TextCleaner
from ai_service.models.transformer_embedder import TransformerEmbedder
from ai_service.services.taggers.keybert_tagger import KeyBERTTagger
from ai_service.services.clustering.hdbscan_clusterer import HDBSCANClusterer
from ai_service.services.improved_tag_generator import ImprovedTagGenerator
from bluesky.api import AccountService

# Type definitions for ProfileView and other Bluesky types
from typing import Optional, Any, Dict, Union, TypeVar, TYPE_CHECKING, Protocol

# Define ProfileView as a proper protocol for type safety
class ProfileView(Protocol):
    """Protocol defining the structure of a ProfileView object"""
    handle: str
    did: Optional[str] = None
    description: Optional[str] = None

# Mock Client class for graceful degradation when atproto is not available
class MockClient:
    """Mock client for when atproto is not available"""
    def login( self, handle: str, password: str) -> None:
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.warning("atproto not available - client functionality disabled")
        raise NotImplementedError("atproto not available - client functionality disabled")

# Set Client to MockClient by default (graceful degradation)
Client = MockClient
ATPROTO_AVAILABLE = False

# Try to import real dependencies if available
try:
    from atproto import Client as AtprotoClient
    try:
        from atproto_client.models.app.bsky.actor.defs import ProfileView as ActualProfileView
        # Override our protocol with the real type if available
        ProfileView = ActualProfileView  # type: ignore
    except ImportError:
        # Keep our protocol as the ProfileView type
        pass
    Client = AtprotoClient
    ATPROTO_AVAILABLE = True
    logging.info("atproto dependencies successfully imported")
except ImportError:
    logging.warning("atproto dependencies not available - using fallback implementations")


class TagService:
    """
    Service principal pour la génération de tags de clusters.
    Orchestre tout le processus de génération de tags.
    """
    
    def __init__(self, 
                 api_client: AdonisApiClient,
                 embedding_model: Optional[EmbeddingModel] = None,
                 clusterer: Optional[ClusteringModel] = None,
                 tag_generator: Optional[TagGenerator] = None,
                 text_cleaner: Optional[TextCleaner] = None,
                 config: dict = None):
        """
        Initialise le service de tags avec chargement optimisé des modèles
        
        Args:
            api_client: Client API pour communiquer avec AdonisJS
            embedding_model: Modèle pour générer des embeddings
            clusterer: Modèle de clustering
            tag_generator: Générateur de tags
            text_cleaner: Nettoyeur de texte
        """
        # Logger pour le suivi
        self.logger = logging.getLogger(self.__class__.__name__)
        self.api_client = api_client
        
        # Configuration de performance et de résilience
        self.config = config or {}
        self.max_timeout = self.config.get('max_timeout', 300)  # 5 minutes max
        self.max_retries = self.config.get('max_retries', 3)
        self.cache_ttl = self.config.get('cache_ttl', 3600)  # 1 hour
        self.max_workers = self.config.get('max_workers', 4)
        
        # Initialisation des modèles avec gestion des erreurs et logs
        self.logger.info("🔄 Initialisation du TagService...")
        start_time = time.time()
        
        try:
            # Modèles ML - devraient être pré-chargés par le script de démarrage
            self.embedding_model = embedding_model or self._init_embedding_model()
            self.clusterer = clusterer or self._init_clusterer() 
            self.tag_generator = tag_generator or self._init_tag_generator()
            self.text_cleaner = text_cleaner or TextCleaner()
            
            elapsed = time.time() - start_time
            self.logger.info(f"✅ TagService initialisé avec succès en {elapsed:.1f}s")
            
        except Exception as e:
            self.logger.error(f"❌ Erreur lors de l'initialisation du TagService: {e}")
            raise
        
        # Thread-safe caches
        self._embedding_cache = {}
        self._keyword_cache = {}
        self._cache_lock = threading.RLock()
        self._cache_timestamps = {}
        
        # Performance metrics
        self._performance_metrics = {
            'total_requests': 0,
            'cache_hits': 0,
            'timeouts': 0,
            'errors': 0,
            'avg_processing_time': 0
        }
        
        # Add missing attributes for 7-step pipeline
        self.clustering_model = self.clusterer  # Alias for consistency
        self.keybert_tagger = self.tag_generator  # Alias for semantic clustering
        
        # Initialize improved tag generator for better quality tags
        self.improved_tag_generator = ImprovedTagGenerator(embedding_model=self.embedding_model)
        
        # Memory management settings
        self.memory_threshold_mb = 2048  # 2GB memory threshold
        self.gc_interval = 100  # Run garbage collection every 100 operations
        self._operation_count = 0

    def _check_memory_usage(self) -> Dict[str, float]:
        """Monitor current memory usage"""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024  # Convert to MB
            
            memory_stats = {
                'current_mb': memory_mb,
                'percent': process.memory_percent(),
                'threshold_mb': self.memory_threshold_mb
            }
            
            # Log warning if memory usage is high
            if memory_mb > self.memory_threshold_mb:
                self.logger.warning(f"🚨 High memory usage: {memory_mb:.1f}MB (>{self.memory_threshold_mb}MB threshold)")
            
            return memory_stats
        except Exception as e:
            self.logger.debug(f"Failed to check memory usage: {e}")
            return {'current_mb': 0, 'percent': 0, 'threshold_mb': self.memory_threshold_mb}

    def _manage_memory(self):
        """Perform memory management if needed"""
        try:
            self._operation_count += 1
            
            # Check memory every gc_interval operations
            if self._operation_count % self.gc_interval == 0:
                memory_stats = self._check_memory_usage()
                
                # Force garbage collection if memory usage is high
                if memory_stats['current_mb'] > self.memory_threshold_mb * 0.8:  # 80% of threshold
                    self.logger.info(f"🧹 Running garbage collection (memory: {memory_stats['current_mb']:.1f}MB)")
                    gc.collect()
                    
                    # Check memory again after GC
                    new_memory = self._check_memory_usage()
                    freed_mb = memory_stats['current_mb'] - new_memory['current_mb']
                    if freed_mb > 0:
                        self.logger.info(f"✅ Freed {freed_mb:.1f}MB of memory")
                        
        except Exception as e:
            self.logger.debug(f"Memory management error: {e}")

    def _check_memory_usage(self) -> Dict[str, float]:
        """Monitor current memory usage"""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024  # Convert to MB
            
            memory_stats = {
                'current_mb': memory_mb,
                'percent': process.memory_percent(),
                'threshold_mb': self.memory_threshold_mb
            }
            
            # Log warning if memory usage is high
            if memory_mb > self.memory_threshold_mb:
                self.logger.warning(f"🚨 High memory usage: {memory_mb:.1f}MB (>{self.memory_threshold_mb}MB threshold)")
            
            return memory_stats
        except Exception as e:
            self.logger.debug(f"Failed to check memory usage: {e}")
            return {'current_mb': 0, 'percent': 0, 'threshold_mb': self.memory_threshold_mb}

    def _manage_memory(self):
        """Perform memory management if needed"""
        try:
            self._operation_count += 1
            
            # Check memory every gc_interval operations
            if self._operation_count % self.gc_interval == 0:
                memory_stats = self._check_memory_usage()
                
                # Force garbage collection if memory usage is high
                if memory_stats['current_mb'] > self.memory_threshold_mb * 0.8:  # 80% of threshold
                    self.logger.info(f"🧹 Running garbage collection (memory: {memory_stats['current_mb']:.1f}MB)")
                    gc.collect()
                    
                    # Check memory again after GC
                    new_memory = self._check_memory_usage()
                    freed_mb = memory_stats['current_mb'] - new_memory['current_mb']
                    if freed_mb > 0:
                        self.logger.info(f"✅ Freed {freed_mb:.1f}MB of memory")
                        
        except Exception as e:
            self.logger.debug(f"Memory management error: {e}")
    
    def _get_profile_field(self, profile, field: str, default=''):
        """Safely extract field from profile (dict or object)"""
        if isinstance(profile, dict):
            return profile.get(field, default)
        return getattr(profile, field, default)
    
    def _extract_profile_handles(self, profiles):
        """Extract handles from profiles (safe for both dict and object)"""
        return [self._get_profile_field(p, 'handle', 'unknown') for p in profiles]
        
    def _init_embedding_model(self):
        """Initialise le modèle d'embedding avec gestion d'erreur"""
        try:
            self.logger.info("📥 Chargement du modèle d'embedding...")
            model = TransformerEmbedder("sentence-transformers/all-MiniLM-L6-v2")
            self.logger.info("✅ Modèle d'embedding chargé avec succès")
            return model
        except Exception as e:
            self.logger.error(f"❌ Échec du chargement du modèle d'embedding: {e}")
            raise

    def _init_clusterer(self):
        """Initialise le clusterer avec gestion d'erreur"""
        try:
            self.logger.info("📥 Chargement du clusterer...")
            clusterer = HDBSCANClusterer(
                min_cluster_size=5,  # Increased from 3 to 5 for better clustering quality
                metric="cosine", 
                cluster_selection_method="leaf"
            )
            self.logger.info("✅ Clusterer chargé avec succès (min_cluster_size=5)")
            return clusterer
        except Exception as e:
            self.logger.error(f"❌ Échec du chargement du clusterer: {e}")
            raise

    def _init_tag_generator(self):
        """Initialise le générateur de tags avec gestion d'erreur"""
        try:
            self.logger.info("📥 Chargement du générateur de tags...")
            generator = KeyBERTTagger()
            self.logger.info("✅ Générateur de tags chargé avec succès")
            return generator
        except Exception as e:
            self.logger.error(f"❌ Échec du chargement du générateur de tags: {e}")
            raise

    def _get_cached_embedding(self, text: str) -> Optional[np.ndarray]:
        """Get cached embedding with TTL check"""
        with self._cache_lock:
            if text in self._embedding_cache:
                timestamp = self._cache_timestamps.get(text, 0)
                if time.time() - timestamp < self.cache_ttl:
                    self._performance_metrics['cache_hits'] += 1
                    return self._embedding_cache[text]
                else:
                    # Cache expired
                    del self._embedding_cache[text]
                    del self._cache_timestamps[text]
        return None

    def _cache_embedding(self, text: str, embedding: np.ndarray) -> None:
        """Cache embedding with timestamp"""
        with self._cache_lock:
            # Implement LRU-like cache with size limit
            if len(self._embedding_cache) > 1000:  # Max cache size
                # Remove oldest entries
                oldest_items = sorted(self._cache_timestamps.items(), key=lambda x: x[1])[:100]
                for old_text, _ in oldest_items:
                    self._embedding_cache.pop(old_text, None)
                    self._cache_timestamps.pop(old_text, None)
            
            self._embedding_cache[text] = embedding
            self._cache_timestamps[text] = time.time()

    def _execute_with_timeout(self, func, *args, timeout: int = None, **kwargs):
        """Execute function with timeout and retry logic"""
        timeout = timeout or self.max_timeout
        start_time = time.time()
        
        for attempt in range(self.max_retries):
            try:
                with ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(func, *args, **kwargs)
                    result = future.result(timeout=timeout)
                    
                    # Update performance metrics
                    processing_time = time.time() - start_time
                    self._update_performance_metrics(processing_time, success=True)
                    return result
                    
            except asyncio.TimeoutError:
                self._performance_metrics['timeouts'] += 1
                self.logger.warning(f"Timeout in attempt {attempt + 1} for function {func.__name__}")
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(0.5 * (attempt + 1))  # Exponential backoff
                
            except Exception as e:
                self._performance_metrics['errors'] += 1
                self.logger.error(f"Error in attempt {attempt + 1} for function {func.__name__}: {e}")
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(0.5 * (attempt + 1))
        
        raise Exception(f"Failed after {self.max_retries} attempts")

    def _update_performance_metrics(self, processing_time: float, success: bool = True):
        """Update performance metrics"""
        self._performance_metrics['total_requests'] += 1
        if success:
            # Update rolling average
            current_avg = self._performance_metrics['avg_processing_time']
            total_requests = self._performance_metrics['total_requests']
            new_avg = ((current_avg * (total_requests - 1)) + processing_time) / total_requests
            self._performance_metrics['avg_processing_time'] = new_avg

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        metrics = self._performance_metrics.copy()
        metrics['cache_hit_rate'] = (
            metrics['cache_hits'] / max(metrics['total_requests'], 1) * 100
        )
        return metrics

    def _get_cluster_embeddings_hash(self, cluster_embeddings: List[List[float]]) -> str:
        """Generate a hash for cluster embeddings to enable caching"""
        try:
            # Convert to numpy array and create a hash from the array content
            embeddings_array = np.array(cluster_embeddings)
            # Use a stable hash of the array content
            return hashlib.md5(embeddings_array.tobytes()).hexdigest()
        except Exception as e:
            self.logger.warning(f"Erreur lors du calcul du hash des embeddings: {e}")
            # Fallback: use string representation
            return hashlib.md5(str(cluster_embeddings).encode()).hexdigest()

    @lru_cache(maxsize=128)
    def _get_cached_cluster_centroid(self, cluster_hash: str, embeddings_tuple: tuple) -> np.ndarray:
        """Cached cluster centroid calculation using hash for immutable inputs"""
        try:
            # Convert tuple back to list for processing
            cluster_embeddings = [list(emb) for emb in embeddings_tuple]
            return self._calculate_cluster_centroid(cluster_embeddings)
        except Exception as e:
            self.logger.warning(f"Erreur lors du calcul du centroïde mis en cache: {e}")
            # Return empty array as fallback
            return np.array([])

    def _calculate_cluster_centroid(self, cluster_embeddings: List[List[float]]) -> np.ndarray:
        """
        Calculate the centroid (mean) of cluster embeddings
        
        Args:
            cluster_embeddings: List of embedding vectors for the cluster
            
        Returns:
            Normalized centroid vector as numpy array
        """
        try:
            if not cluster_embeddings:
                return np.array([])
            
            # Convert to numpy array and calculate mean
            embeddings_array = np.array(cluster_embeddings)
            centroid = np.mean(embeddings_array, axis=0)
            
            # Normalize the centroid
            norm = np.linalg.norm(centroid)
            if norm > 0:
                centroid = centroid / norm
            
            return centroid
            
        except Exception as e:
            self.logger.warning(f"Error calculating cluster centroid: {e}")
            return np.array([])

    def _generate_tag_from_keywords(self, keywords: List[str], cluster_embeddings: List[List[float]]) -> str:
        """
        Generate a coherent tag from keywords using semantic clustering and embedding similarity
        
        Args:
            keywords: List of candidate keywords for the cluster
            cluster_embeddings: Embeddings of profiles in the cluster
            
        Returns:
            A coherent, natural-sounding tag
        """
        try:
            if not keywords:
                return "Unknown Group"
            
            # If only one keyword, use it directly with proper capitalization
            if len(keywords) == 1:
                return keywords[0].strip().title()
            
            # Calculate cluster centroid for semantic comparison
            cluster_centroid = self._calculate_cluster_centroid(cluster_embeddings)
            
            # Score keywords by their semantic relevance to the cluster
            keyword_scores = []
            for keyword in keywords[:10]:  # Limit to top 10 for efficiency
                try:
                    # Get keyword embedding
                    keyword_embedding = self.embedding_model.encode([keyword])[0]
                    
                    # Calculate similarity to cluster centroid
                    if len(cluster_centroid) > 0 and len(keyword_embedding) > 0:
                        similarity = np.dot(keyword_embedding, cluster_centroid)
                        keyword_scores.append((keyword, similarity))
                    else:
                        keyword_scores.append((keyword, 0.0))
                        
                except Exception as e:
                    self.logger.debug(f"Error scoring keyword '{keyword}': {e}")
                    keyword_scores.append((keyword, 0.0))
            
            # Sort by relevance score
            keyword_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Generate tag using top-scored keywords
            top_keywords = [kw for kw, _ in keyword_scores[:3]]
            
            # Try to create a natural combination
            tag = self._create_natural_tag(top_keywords)
            
            return tag
            
        except Exception as e:
            self.logger.warning(f"Error in enhanced tag generation: {e}")
            # Fallback to simple keywords
            return keywords[0].title() if keywords else "Community"

    def _create_natural_tag(self, keywords: List[str], cluster_embeddings: Optional[List[List[float]]] = None) -> str:
        """Create a natural-sounding tag using ImprovedTagGenerator with hybrid KeyBERT + centroid approach"""
        try:
            if not keywords:
                return "Community"
            
            # Delegate to ImprovedTagGenerator for clean, single keywords
            if hasattr(self, 'improved_tag_generator') and self.improved_tag_generator:
                # Convert keywords to the format expected by improved generator
                keyword_tuples = [(kw, 1.0) for kw in keywords[:5]]  # Top 5 keywords
                return self.improved_tag_generator.generate_tag_from_keywords(
                    keyword_tuples, cluster_embeddings
                )
            
            # Simple fallback if generator not available
            return keywords[0].strip().title() if keywords else "Community"
            
        except Exception as e:
            self.logger.debug(f"Error creating natural tag: {e}")
            return keywords[0].title() if keywords else "Unknown"

    def _select_best_keyword_cluster(self, keyword_clusters: List[List[Tuple[str, float]]], 
                                   cluster_embeddings: List[List[float]]) -> List[Tuple[str, float]]:
        """
        Select the most representative keyword cluster for the profile cluster.
        This prevents duplicate clusters by choosing only the best semantic group.
        
        Args:
            keyword_clusters: List of keyword clusters (each is a list of (keyword, score) tuples)
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
                
            cluster_centroid = self._calculate_cluster_centroid(cluster_embeddings)
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

    # ===== MAIN ORCHESTRATOR METHOD =====
    async def generate_tags(self, account_handle: str, followers: List[Any], max_concurrent: int = 1) -> List[Dict[str, Any]]:
        """
        Main orchestrator method for the revolutionary 7-step semantic clustering pipeline.
        Transforms nonsensical tags like "Trump & Taco" into meaningful community labels like "Political_Discussion".
        
        This implements the world's first cross-validation semantic tagging system with:
        - Profile clustering (HDBSCAN with cosine metric)
        - Semantic keyword extraction (KeyBERT)
        - Semantic keyword clustering
        - Profile-keyword coherence validation
        - Natural tag generation
        - Multi-scale optimization
        - Final ranking and validation
        
        Args:
            account_handle: Handle of the account being analyzed
            followers: List of follower profiles to analyze
            max_concurrent: Maximum concurrent processing (for future scalability)
            
        Returns:
            List of cluster dictionaries with semantic tags and metadata
        """
        try:
            start_time = time.time()
            self.logger.info(f"🚀 Starting revolutionary 7-step semantic clustering for {account_handle}")
            self.logger.info(f"📊 Processing {len(followers)} followers through semantic pipeline")
            
            # Check initial memory usage and set process limits
            initial_memory = self._check_memory_usage()
            self.logger.info(f"💾 Initial memory usage: {initial_memory['current_mb']:.1f}MB")
            
            # Set process priority to prevent system overload
            try:
                import os
                os.nice(5)  # Lower priority to prevent system lock-up
                self.logger.debug("Process priority lowered for stability")
            except:
                pass  # Ignore if not supported on system

            if not followers:
                self.logger.warning("No followers provided for analysis")
                return []
            
            # Extract profile descriptions for analysis
            profile_texts = []
            valid_profiles = []
            
            for follower in followers:
                # Handle both object attributes and dictionary access for ProfileView data
                description = self._get_profile_field(follower, 'description')
                handle = self._get_profile_field(follower, 'handle')
                
                # Process description if available
                if description and isinstance(description, str) and description.strip():
                    # Clean and prepare text
                    cleaned_text = self.text_cleaner.clean(description, aggressive=False)
                    if cleaned_text and len(cleaned_text.strip()) > 10:  # Minimum meaningful text
                        profile_texts.append(cleaned_text)
                        valid_profiles.append(follower)
                        continue
                
                # Fallback to handle if no description or description too short
                if handle and isinstance(handle, str) and handle.strip():
                    # Clean up handle for better text extraction
                    handle_text = handle.replace('.bsky.social', '').replace('.', ' ')
                    if handle_text.strip():
                        profile_texts.append(handle_text)
                        valid_profiles.append(follower)
            
            if len(valid_profiles) < 2:
                self.logger.warning("Insufficient valid profiles for clustering")
                return []
            
            self.logger.info(f"✅ Prepared {len(valid_profiles)} valid profiles for analysis")
            
            # Generate embeddings for all profiles
            self.logger.info("🔄 Step 0: Generating profile embeddings...")
            
            # Memory management before intensive operation
            self._manage_memory()
            
            try:
                # Use timeout to prevent hanging on embedding generation
                import signal
                
                def timeout_handler(signum, frame):
                    raise TimeoutError("Embedding generation timed out")
                
                # Set 5-minute timeout for embedding generation
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(300)  # 5 minutes
                
                profile_embeddings = self.embedding_model.encode(profile_texts)
                
                # Clear timeout
                signal.alarm(0)
                
            except TimeoutError as e:
                self.logger.error(f"❌ Embedding generation timed out: {e}")
                return []
            except Exception as e:
                self.logger.error(f"❌ Error during embedding generation: {e}")
                # Try to recover with smaller batch size
                try:
                    self.logger.info("🔄 Attempting recovery with smaller batch processing...")
                    profile_embeddings = []
                    batch_size = min(50, len(profile_texts))  # Process in smaller batches
                    
                    for i in range(0, len(profile_texts), batch_size):
                        batch = profile_texts[i:i+batch_size]
                        batch_embeddings = self.embedding_model.encode(batch)
                        if isinstance(batch_embeddings, np.ndarray):
                            profile_embeddings.extend(batch_embeddings.tolist())
                        else:
                            profile_embeddings.extend(batch_embeddings)
                        
                        # Memory management between batches
                        self._manage_memory()
                        
                    self.logger.info(f"✅ Recovery successful: processed {len(profile_embeddings)} embeddings")
                except Exception as recovery_error:
                    self.logger.error(f"❌ Recovery failed: {recovery_error}")
                    return []
            
            # Memory check after embeddings generation
            memory_stats = self._check_memory_usage()
            self.logger.info(f"💾 Memory after embeddings: {memory_stats['current_mb']:.1f}MB")
            
            if not profile_embeddings or len(profile_embeddings) == 0:
                self.logger.error("Failed to generate profile embeddings")
                return []
            
            # Convert to list format if needed
            if isinstance(profile_embeddings, np.ndarray):
                profile_embeddings = profile_embeddings.tolist()
            
            self.logger.info(f"✅ Generated {len(profile_embeddings)} profile embeddings")
            
            # STEP 1: Profile clustering using HDBSCAN with cosine metric
            self.logger.info("🔄 Step 1: Generating profile clusters (HDBSCAN + cosine)")
            
            # Memory management before clustering
            self._manage_memory()
            
            try:
                # Use timeout for clustering to prevent hanging
                import signal
                
                def clustering_timeout_handler(signum, frame):
                    raise TimeoutError("Clustering operation timed out")
                
                # Set 10-minute timeout for clustering
                signal.signal(signal.SIGALRM, clustering_timeout_handler)
                signal.alarm(600)  # 10 minutes
                
                profile_clusters = self._generate_profile_clusters(profile_embeddings, valid_profiles)
                
                # Clear timeout
                signal.alarm(0)
                
            except TimeoutError as e:
                self.logger.error(f"❌ Clustering timed out: {e}")
                return []
            except Exception as e:
                self.logger.error(f"❌ Error during clustering: {e}")
                # Try with more conservative clustering parameters
                try:
                    self.logger.info("🔄 Attempting recovery with conservative clustering...")
                    # Increase min_cluster_size to reduce computational load
                    original_params = self.clusterer.get_parameters()
                    self.clusterer.set_parameters(min_cluster_size=max(8, original_params['min_cluster_size']))
                    
                    profile_clusters = self._generate_profile_clusters(profile_embeddings, valid_profiles)
                    
                    # Restore original parameters
                    self.clusterer.set_parameters(**original_params)
                    
                    self.logger.info(f"✅ Recovery successful with conservative parameters")
                except Exception as recovery_error:
                    self.logger.error(f"❌ Clustering recovery failed: {recovery_error}")
                    return []
            
            # Memory check after clustering
            memory_stats = self._check_memory_usage()
            self.logger.info(f"💾 Memory after clustering: {memory_stats['current_mb']:.1f}MB")
            
            if not profile_clusters:
                self.logger.warning("No profile clusters generated")
                return []
            
            self.logger.info(f"✅ Step 1: Generated {len(profile_clusters)} profile clusters")
            
            # Process each cluster through the remaining 6 steps
            final_clusters = []
            
            for i, cluster_data in enumerate(profile_clusters):
                try:
                    # Memory management per cluster
                    self._manage_memory()
                    
                    cluster_profiles = cluster_data['profiles']
                    cluster_embeddings = cluster_data['embeddings']
                    
                    # Extract text from profiles with proper handling of both object and dict access
                    cluster_texts = []
                    for profile in cluster_profiles:
                        # Get description and handle using helper method
                        description = self._get_profile_field(profile, 'description')
                        handle = self._get_profile_field(profile, 'handle')
                        
                        # Use description if available, otherwise handle
                        if description and isinstance(description, str) and description.strip():
                            cluster_texts.append(description)
                        elif handle and isinstance(handle, str) and handle.strip():
                            cluster_texts.append(handle.replace('.bsky.social', '').replace('.', ' '))
                        else:
                            # Fallback to empty string if no text available
                            cluster_texts.append("")
                    
                    self.logger.info(f"🔄 Processing cluster {i+1}/{len(profile_clusters)} with {len(cluster_profiles)} profiles")
                    
                    # STEP 2: Semantic keyword extraction
                    semantic_keywords = self._extract_semantic_keywords(cluster_texts, top_n=20)
                    
                    if not semantic_keywords:
                        self.logger.warning(f"No keywords extracted for cluster {i+1}")
                        continue
                    
                    # STEP 3: Semantic keyword clustering
                    keyword_embeddings = self.embedding_model.encode([kw for kw, _ in semantic_keywords])
                    if isinstance(keyword_embeddings, np.ndarray):
                        keyword_embeddings = keyword_embeddings.tolist()
                    
                    keyword_clusters = self._cluster_keywords_semantically(
                        semantic_keywords, keyword_embeddings, min_cluster_size=2
                    )
                    
                    # STEP 4: Profile-keyword coherence validation
                    validated_clusters = self._validate_profile_keyword_coherence(
                        cluster_embeddings, keyword_clusters, threshold=0.6
                    )
                    
                    # STEP 5: Natural tag generation - Choose BEST keyword cluster to avoid duplicates
                    if validated_clusters:
                        # Select the most representative keyword cluster for this profile cluster
                        best_keyword_cluster = self._select_best_keyword_cluster(
                            validated_clusters, cluster_embeddings
                        )
                        
                        tag = self._generate_natural_tag_from_semantic_group(
                            best_keyword_cluster, 
                            profile_context=self._extract_profile_handles(cluster_profiles)
                        )
                        
                        # Create ONE cluster result per profile cluster
                        cluster_result = {
                            'tag': tag,
                            'profiles': cluster_profiles,
                            'embeddings': cluster_embeddings,
                            'keywords': [kw for kw, _ in best_keyword_cluster[:5]],  # Top 5 keywords
                            'size': len(cluster_profiles),
                            'cohesion': self._calculate_cluster_cohesion(cluster_embeddings),
                            'handles': self._extract_profile_handles(cluster_profiles)
                        }
                        final_clusters.append(cluster_result)
                    
                    # If no validated clusters, create a single tag from the best keywords
                    elif semantic_keywords:
                        tag = self._generate_natural_tag_from_semantic_group(
                            semantic_keywords[:3],  # Top 3 keywords
                            profile_context=self._extract_profile_handles(cluster_profiles)
                        )
                        
                        cluster_result = {
                            'tag': tag,
                            'profiles': cluster_profiles,
                            'embeddings': cluster_embeddings,
                            'keywords': [kw for kw, _ in semantic_keywords[:5]],
                            'size': len(cluster_profiles),
                            'cohesion': self._calculate_cluster_cohesion(cluster_embeddings),
                            'handles': self._extract_profile_handles(cluster_profiles)
                        }
                        final_clusters.append(cluster_result)
                    
                except Exception as e:
                    self.logger.error(f"Error processing cluster {i+1}: {e}")
                    continue
            
            if not final_clusters:
                self.logger.warning("No final clusters generated")
                return []
            
            # STEP 6: Multi-scale optimization
            self.logger.info("🔄 Step 6: Multi-scale optimization")
            optimized_clusters = self._optimize_tags_multi_scale(final_clusters, profile_embeddings)
            
            # STEP 7: Final ranking and validation
            self.logger.info("🔄 Step 7: Final ranking and validation")
            validated_clusters = self._rank_and_validate_final_tags(optimized_clusters)
            
            # Calculate final statistics
            processing_time = time.time() - start_time
            total_profiles = sum(cluster['size'] for cluster in validated_clusters)
            
            # Final memory cleanup
            final_memory = self._check_memory_usage()
            self.logger.info(f"💾 Final memory usage: {final_memory['current_mb']:.1f}MB")
            
            # Force garbage collection at the end
            gc.collect()
            
            self.logger.info(f"🎉 Semantic clustering completed successfully!")
            self.logger.info(f"📊 Results: {len(validated_clusters)} clusters, {total_profiles} profiles, {processing_time:.2f}s")
            self.logger.info(f"🏷️  Generated tags: {[c['tag'] for c in validated_clusters]}")
            
            return validated_clusters
            
        except Exception as e:
            self.logger.error(f"❌ Critical error in generate_tags: {e}", exc_info=True)
            
            # Emergency cleanup on error
            try:
                gc.collect()
                self.logger.info("🧹 Emergency garbage collection completed")
            except:
                pass
                
            return []

    # ===== STEP 1: PROFILE CLUSTERING (HDBSCAN + COSINE) =====
    def _generate_profile_clusters(self, profile_embeddings: List[List[float]], 
                                 profiles: List[Any]) -> List[Dict[str, Any]]:
        """
        Step 1: Generate profile clusters using HDBSCAN with cosine metric.
        This is the foundation of the semantic clustering pipeline.
        
        Args:
            profile_embeddings: List of embedding vectors for profiles
            profiles: List of profile objects corresponding to embeddings
            
        Returns:
            List of cluster dictionaries with profiles and embeddings
        """
        try:
            if not profile_embeddings or not profiles:
                self.logger.warning("No profile embeddings or profiles provided for clustering")
                return []
            
            if len(profile_embeddings) != len(profiles):
                self.logger.error("Mismatch between embeddings and profiles count")
                return []
            
            # Adjust clustering parameters based on dataset size
            dataset_size = len(profile_embeddings)
            self.clusterer.adjust_for_dataset_size(dataset_size)
            
            self.logger.info(f"🔄 Clustering {dataset_size} profiles with HDBSCAN (cosine metric)")
            self.logger.info(f"📊 Parameters: min_cluster_size={self.clusterer.min_cluster_size}, min_samples={self.clusterer.min_samples}")
            
            # Perform clustering with cosine metric
            cluster_labels, clusterer_instance = self.clusterer.fit_predict(profile_embeddings)
            
            # Organize profiles by cluster
            clusters = {}
            noise_profiles = []
            
            for i, label in enumerate(cluster_labels):
                if label == -1:  # Noise/outlier
                    noise_profiles.append({
                        'profile': profiles[i],
                        'embedding': profile_embeddings[i]
                    })
                else:
                    if label not in clusters:
                        clusters[label] = {
                            'profiles': [],
                            'embeddings': []
                        }
                    clusters[label]['profiles'].append(profiles[i])
                    clusters[label]['embeddings'].append(profile_embeddings[i])
            
            # Convert to list format and add metadata
            cluster_list = []
            for cluster_id, cluster_data in clusters.items():
                cluster_size = len(cluster_data['profiles'])
                
                # Calculate cluster cohesion
                cohesion = self._calculate_cluster_cohesion(cluster_data['embeddings'])
                
                cluster_result = {
                    'cluster_id': cluster_id,
                    'profiles': cluster_data['profiles'],
                    'embeddings': cluster_data['embeddings'],
                    'size': cluster_size,
                    'cohesion': cohesion,
                    'centroid': self._calculate_cluster_centroid(cluster_data['embeddings'])
                }
                
                cluster_list.append(cluster_result)
            
            # Handle noise profiles - create small clusters or merge with existing ones
            if noise_profiles and len(noise_profiles) >= 2:
                # Create a noise cluster if we have enough noise profiles
                noise_cluster = {
                    'cluster_id': -1,
                    'profiles': [item['profile'] for item in noise_profiles],
                    'embeddings': [item['embedding'] for item in noise_profiles],
                    'size': len(noise_profiles),
                    'cohesion': self._calculate_cluster_cohesion([item['embedding'] for item in noise_profiles]),
                    'centroid': self._calculate_cluster_centroid([item['embedding'] for item in noise_profiles])
                }
                cluster_list.append(noise_cluster)
            
            # Sort clusters by size (largest first)
            cluster_list.sort(key=lambda x: x['size'], reverse=True)
            
            # Log cluster statistics
            total_clustered = sum(c['size'] for c in cluster_list)
            noise_count = len(noise_profiles) if len(noise_profiles) < 2 else 0
            
            self.logger.info(f"✅ Profile clustering complete:")
            self.logger.info(f"   📊 {len(cluster_list)} clusters generated")
            self.logger.info(f"   👥 {total_clustered} profiles clustered")
            self.logger.info(f"   🔇 {noise_count} noise profiles")
            self.logger.info(f"   📈 Cluster sizes: {[c['size'] for c in cluster_list]}")
            
            return cluster_list
            
        except Exception as e:
            self.logger.error(f"❌ Error in profile clustering (Step 1): {e}", exc_info=True)
            return []

    def _calculate_cluster_cohesion(self, cluster_embeddings: List[List[float]]) -> float:
        """
        Calculate the cohesion score for a cluster based on internal similarity.
        
        Args:
            cluster_embeddings: List of embedding vectors in the cluster
            
        Returns:
            Cohesion score between 0 and 1 (higher = more cohesive)
        """
        try:
            if not cluster_embeddings or len(cluster_embeddings) < 2:
                return 1.0  # Perfect cohesion for single items
            
            embeddings_array = np.array(cluster_embeddings)
            
            # Normalize embeddings for cosine similarity
            norms = np.linalg.norm(embeddings_array, axis=1)
            normalized_embeddings = embeddings_array / norms[:, np.newaxis]
            
            # Calculate pairwise cosine similarities
            similarities = []
            n = len(normalized_embeddings)
            
            for i in range(n):
                for j in range(i + 1, n):
                    similarity = np.dot(normalized_embeddings[i], normalized_embeddings[j])
                    similarities.append(similarity)
            
            # Return average similarity as cohesion score
            return float(np.mean(similarities)) if similarities else 0.0
            
        except Exception as e:
            self.logger.warning(f"Error calculating cluster cohesion: {e}")
            return 0.0

    # ===== STEP 2: ENHANCED SEMANTIC KEYWORD EXTRACTION =====
    def _extract_semantic_keywords(self, texts: List[str], top_n: int = 20) -> List[Tuple[str, float]]:
        """
        Step 2: Extract semantic keywords using KeyBERT for better semantic understanding
        """
        try:
            if not texts or not hasattr(self, 'keybert_tagger'):
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

    # ===== STEP 3: SEMANTIC KEYWORD CLUSTERING =====
    def _cluster_keywords_semantically(self, keywords: List[Tuple[str, float]], 
                                     keyword_embeddings: List[List[float]], 
                                     min_cluster_size: int = 2) -> List[List[Tuple[str, float]]]:
        """
        Step 3: Cluster keywords semantically to identify coherent concept groups
        """
        try:
            if len(keywords) < 3 or not keyword_embeddings:
                return [keywords[:5]]  # Single cluster for small sets
            
            # Ensure we have valid embeddings
            valid_embeddings = []
            valid_keywords = []
            
            for i, (kw, score) in enumerate(keywords):
                if i < len(keyword_embeddings) and keyword_embeddings[i]:
                    valid_embeddings.append(keyword_embeddings[i])
                    valid_keywords.append((kw, score))
            
            if len(valid_embeddings) < 3:
                return [valid_keywords[:5]]
            
            # Use HDBSCAN for keyword clustering with semantic embeddings
            embeddings_array = np.array(valid_embeddings)
            
            # Configure the clusterer for keyword clustering
            self.clustering_model.set_parameters(
                min_cluster_size=max(2, min_cluster_size),
                metric='cosine'
            )
            
            keyword_labels, clusterer = self.clustering_model.fit_predict(embeddings_array)
            
            # Group keywords by cluster
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
            
            # Convert to list and sort by cluster size
            semantic_clusters = []
            for cluster_id in sorted(clusters.keys(), key=lambda k: len(clusters[k]), reverse=True):
                cluster_keywords = sorted(clusters[cluster_id], key=lambda x: x[1], reverse=True)
                semantic_clusters.append(cluster_keywords[:5])  # Top 5 per cluster
            
            return semantic_clusters if semantic_clusters else [valid_keywords[:5]]
            
        except Exception as e:
            self.logger.warning(f"Error in semantic keyword clustering: {e}")
            return [keywords[:5]]  # Fallback to single cluster

    # ===== STEP 4: PROFILE-KEYWORD COHERENCE VALIDATION =====
    def _validate_profile_keyword_coherence(self, profile_embeddings: List[List[float]], 
                                          keyword_clusters: List[List[Tuple[str, float]]],
                                          threshold: float = 0.6) -> List[List[Tuple[str, float]]]:
        """
        Step 4: Validate coherence between profile clusters and keyword clusters
        """
        try:
            if not profile_embeddings or not keyword_clusters:
                return keyword_clusters
            
            # Calculate profile centroid
            profile_centroid = np.mean(profile_embeddings, axis=0)
            profile_centroid = profile_centroid / np.linalg.norm(profile_centroid)
            
            coherent_clusters = []
            
            for keyword_cluster in keyword_clusters:
                cluster_coherence_scores = []
                
                for keyword, score in keyword_cluster:
                    try:
                        # Get keyword embedding
                        keyword_embedding = self.embedding_model.encode([keyword])[0]
                        keyword_embedding = np.array(keyword_embedding)
                        keyword_embedding = keyword_embedding / np.linalg.norm(keyword_embedding)
                        
                        # Calculate coherence with profile centroid
                        coherence = np.dot(keyword_embedding, profile_centroid)
                        cluster_coherence_scores.append(coherence)
                        
                    except Exception as e:
                        self.logger.debug(f"Error calculating coherence for keyword '{keyword}': {e}")
                        cluster_coherence_scores.append(0.0)
                
                # Check if cluster meets coherence threshold
                avg_coherence = np.mean(cluster_coherence_scores) if cluster_coherence_scores else 0.0
                
                if avg_coherence >= threshold:
                    coherent_clusters.append(keyword_cluster)
                else:
                    # If coherence is low, keep only highest scoring keywords
                    filtered_cluster = keyword_cluster[:2]  # Keep top 2 keywords
                    if filtered_cluster:
                        coherent_clusters.append(filtered_cluster)
            
            return coherent_clusters if coherent_clusters else keyword_clusters
            
        except Exception as e:
            self.logger.warning(f"Error in coherence validation: {e}")
            return keyword_clusters

    # ===== STEP 5: NATURAL TAG GENERATION =====
    def _generate_natural_tag_from_semantic_group(self, keyword_cluster: List[Tuple[str, float]], 
                                                 profile_context: Optional[List[str]] = None) -> str:
        """
        Step 5: Generate natural language tags from semantic keyword groups using ImprovedTagGenerator
        """
        try:
            if not keyword_cluster:
                return "Community"
            
            # Use improved tag generator with hybrid KeyBERT + centroid approach
            if hasattr(self, 'improved_tag_generator') and self.improved_tag_generator:
                # Convert profile context to embeddings if available
                cluster_embeddings = None
                if profile_context and hasattr(self, 'embedding_model'):
                    try:
                        cluster_embeddings = self.embedding_model.encode(profile_context)
                        if isinstance(cluster_embeddings, np.ndarray):
                            cluster_embeddings = cluster_embeddings.tolist()
                    except Exception as e:
                        self.logger.debug(f"Error encoding profile context: {e}")
                
                # Generate tag using hybrid approach
                tag = self.improved_tag_generator.generate_tag_from_keywords(
                    keyword_cluster[:5], cluster_embeddings
                )
                return tag
            
            # Simple fallback if ImprovedTagGenerator not available
            keywords = [kw for kw, _ in keyword_cluster[:3]]
            return keywords[0].title() if keywords else "Community"
                
        except Exception as e:
            self.logger.warning(f"Error generating natural tag: {e}")
            return "Community"

    # Removed _detect_concept_type - using ImprovedTagGenerator instead
    # Removed _create_single_keyword_tag - using ImprovedTagGenerator instead  
    # Removed _create_dual_keyword_tag - using ImprovedTagGenerator instead
    # Removed _create_multi_keyword_tag - using ImprovedTagGenerator instead

    # ===== STEP 6: MULTI-SCALE OPTIMIZATION =====
    def _optimize_tags_multi_scale(self, preliminary_tags: List[Dict[str, Any]], 
                                 all_profile_embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Step 6: Simplified optimization - just sort by quality and size
        """
        try:
            if len(preliminary_tags) <= 1:
                return preliminary_tags
            
            # Simple sorting by size and coherence - no rigid transformations
            preliminary_tags.sort(key=lambda x: (
                x.get('size', 0),
                x.get('cohesion', 0)
            ), reverse=True)
            
            return preliminary_tags
            
        except Exception as e:
            self.logger.warning(f"Error in multi-scale optimization: {e}")
            return preliminary_tags

    def _calculate_inter_cluster_distances(self, clusters: List[Dict[str, Any]]) -> Dict[tuple, float]:
        """Calculate distances between cluster centroids"""
        distances = {}
        
        for i, cluster1 in enumerate(clusters):
            for j, cluster2 in enumerate(clusters[i+1:], i+1):
                try:
                    embedding1 = np.array(cluster1.get('embedding', []))
                    embedding2 = np.array(cluster2.get('embedding', []))
                    
                    if len(embedding1) > 0 and len(embedding2) > 0:
                        # Cosine distance
                        norm1 = np.linalg.norm(embedding1)
                        norm2 = np.linalg.norm(embedding2)
                        
                        if norm1 > 0 and norm2 > 0:
                            similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)
                            distance = 1 - similarity
                            distances[(i, j)] = distance
                        else:
                            distances[(i, j)] = 1.0
                    else:
                        distances[(i, j)] = 1.0
                except Exception as e:
                    self.logger.debug(f"Error calculating cluster distance: {e}")
                    distances[(i, j)] = 1.0
        
        return distances

    # Removed _ensure_tag_uniqueness - using ImprovedTagGenerator instead

    # Removed _apply_hierarchical_optimization - using ImprovedTagGenerator instead

    # ===== STEP 7: FINAL RANKING AND VALIDATION =====
    def _rank_and_validate_final_tags(self, optimized_tags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Step 7: Final ranking and validation of generated tags
        """
        try:
            if not optimized_tags:
                return []
            
            # Calculate comprehensive quality scores
            for tag_data in optimized_tags:
                quality_score = self._calculate_tag_quality_score(tag_data)
                tag_data['quality_score'] = quality_score
            
            # Sort by composite ranking score
            optimized_tags.sort(key=lambda x: (
                x.get('quality_score', 0) * 0.4 +  # Quality weight
                x.get('cohesion', 0) * 0.3 +        # Cohesion weight
                (x.get('size', 0) / 100) * 0.3      # Size weight (normalized)
            ), reverse=True)
            
            # Final validation and cleanup
            validated_tags = []
            for tag_data in optimized_tags:
                if self._validate_final_tag(tag_data):
                    validated_tags.append(tag_data)
            
            return validated_tags
            
        except Exception as e:
            self.logger.error(f"Error in final ranking: {e}")
            return optimized_tags

    def _calculate_tag_quality_score(self, tag_data: Dict[str, Any]) -> float:
        """Calculate comprehensive quality score for a tag"""
        score = 0.0
        
        # Tag name quality (no generic terms, proper length)
        tag_name = tag_data.get('tag', '')
        if tag_name and not any(generic in tag_name.lower() for generic in 
                               ['general', 'misc', 'unknown', 'other', 'mixed']):
            score += 0.3
        
        if 10 <= len(tag_name) <= 30:  # Optimal length
            score += 0.2
        
        # Keyword quality
        keywords = tag_data.get('keywords', [])
        if len(keywords) >= 3:
            score += 0.2
        
        # Cluster properties
        cohesion = tag_data.get('cohesion', 0)
        if cohesion > 0.7:
            score += 0.2
        elif cohesion > 0.5:
            score += 0.1
        
        # Size appropriateness
        size = tag_data.get('size', 0)
        if 5 <= size <= 100:  # Good size range
            score += 0.1
        
        return min(score, 1.0)

    def _validate_final_tag(self, tag_data: Dict[str, Any]) -> bool:
        """Final validation of tag data"""
        try:
            # Required fields
            if not all(key in tag_data for key in ['tag', 'size', 'keywords']):
                return False
            
            # Minimum quality thresholds
            if tag_data.get('size', 0) < 2:
                return False
            
            if not tag_data.get('tag', '').strip():
                return False
            
            if not tag_data.get('keywords', []):
                return False
            
            return True
            
        except Exception:
            return False

    def _extract_weighted_frequency_terms(self, texts: List[str]) -> List[Tuple[str, float]]:
        """Extract terms using weighted frequency analysis"""
        try:
            if not texts:
                return []
            
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
            
            # Apply weighted scoring (frequency * inverse document frequency approximation)
            total_words = len(filtered_words)
            weighted_terms = []
            
            for word, count in word_counts.most_common(15):
                # Simple weight: frequency normalized by total, with bonus for rarer words
                frequency_score = count / total_words
                rarity_bonus = 1.0 / (1.0 + math.log(count))  # Bonus for less frequent words
                weight = frequency_score * (1.0 + rarity_bonus)
                weighted_terms.append((word, weight))
            
            return weighted_terms
            
        except Exception as e:
            self.logger.warning(f"Error in weighted frequency extraction: {e}")
            return []

    def _validate_keywords_semantically(self, keywords: List[Tuple[str, float]], 
                                      cluster_embeddings: List[List[float]]) -> List[Tuple[str, float]]:
        """Validate keywords using semantic coherence with cluster embeddings"""
        try:
            if not keywords or not cluster_embeddings:
                return keywords
            
            # Calculate cluster centroid
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
                        if coherence > 0.3:  # Minimum coherence threshold
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

    def _combine_keyword_scores(self, tfidf_keywords: List[Tuple[str, float]], 
                              frequency_keywords: List[Tuple[str, float]], 
                              semantic_keywords: List[Tuple[str, float]]) -> List[Tuple[str, float]]:
        """Combine different keyword scoring methods"""
        try:
            # Create a unified scoring dictionary
            combined_scores = defaultdict(float)
            
            # TF-IDF scores (weight: 0.4)
            for keyword, score in tfidf_keywords:
                combined_scores[keyword] += score * 0.4
            
            # Frequency scores (weight: 0.3)
            for keyword, score in frequency_keywords:
                combined_scores[keyword] += score * 0.3
            
            # Semantic scores (weight: 0.3)
            for keyword, score in semantic_keywords:
                combined_scores[keyword] += score * 0.3
            
            # Sort by combined score
            sorted_keywords = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
            
            return sorted_keywords
            
        except Exception as e:
            self.logger.warning(f"Error combining keyword scores: {e}")
            return tfidf_keywords  # Fallback to TF-IDF

    def _filter_embeddings_by_similarity(self, 
                                        embeddings: List[np.ndarray], 
                                        reference_embedding: np.ndarray, 
                                        threshold: float) -> List[np.ndarray]:
        """
        Filtre les embeddings basés sur leur similarité avec un embedding de référence
        
        Args:
            embeddings: Liste des embeddings à filtrer
            reference_embedding: Embedding de référence (généralement bio)
            threshold: Seuil de similarité (0.0 à 1.0)
            
        Returns:
            Liste des embeddings qui dépassent le seuil de similarité
        """
        if not embeddings or reference_embedding is None:
            return embeddings
        
        filtered_embeddings = []
        try:
            # Normaliser l'embedding de référence
            ref_norm = np.linalg.norm(reference_embedding)
            if ref_norm == 0:
                return embeddings  # Éviter division par zéro
            
            ref_normalized = reference_embedding / ref_norm
            
            for emb in embeddings:
                # Normaliser l'embedding courant
                emb_norm = np.linalg.norm(emb)
                if emb_norm == 0:
                    continue  # Skip les embeddings vides
                
                emb_normalized = emb / emb_norm
                
                # Calculer la similarité cosinus
                similarity = np.dot(emb_normalized, ref_normalized)
                
                if similarity >= threshold:
                    filtered_embeddings.append(emb)
                    
        except Exception as e:
            self.logger.warning(f"Erreur filtrage similarité: {e}")
            # En cas d'erreur, retourner tous les embeddings
            return embeddings
        
        return filtered_embeddings

    async def _analyze_audience_core(self, followers_data: List[Dict[str, Any]], 
                                   account_service) -> Dict[str, Any]:
        """Core audience analysis logic without resilience wrapper"""
        try:
            # Extract profiles and validate data
            profiles = []
            for follower in followers_data:
                if 'profile' in follower:
                    profiles.append(follower['profile'])
            
            if not profiles:
                self.logger.warning("No valid profiles found in followers_data")
                return self._generate_empty_analysis_result()
            
            # Process profiles through the main tag generation pipeline
            cluster_tags = await self.generate_tags(
                account_service.account.handle if hasattr(account_service, 'account') else 'unknown',
                profiles,
                max_concurrent=1
            )
            
            if not cluster_tags:
                self.logger.warning("No clusters generated from tag analysis")
                return self._generate_empty_analysis_result()
            
            # Generate account insights based on clusters
            account_insights = self._generate_account_insights(cluster_tags, profiles)
            
            # Generate content suggestions
            content_suggestions = self._generate_content_suggestions(cluster_tags)
            
            return {
                "clusters": cluster_tags,
                "account_insights": account_insights,
                "content_suggestions": content_suggestions,
                "metadata": {
                    "status": "success",
                    "total_followers": len(profiles),
                    "total_clusters": len(cluster_tags),
                    "processing_time": time.time()
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error in _analyze_audience_core: {e}")
            raise

    def _generate_empty_analysis_result(self) -> Dict[str, Any]:
        """Generate a valid empty analysis result"""
        return {
            "clusters": [],
            "account_insights": [{
                "category": "Analysis Status",
                "insights": {
                    "message": "No meaningful clusters could be generated",
                    "recommendation": "Try again with more followers or check data quality"
                }
            }],
            "content_suggestions": [],
            "metadata": {
                "status": "empty",
                "total_followers": 0,
                "total_clusters": 0
            }
        }

    def _generate_account_insights(self, clusters: List[Dict[str, Any]], 
                                 profiles: List[Any]) -> List[Dict[str, Any]]:
        """Generate meaningful insights from cluster analysis"""
        insights = []
        
        if not clusters:
            return [{
                "category": "Analysis Summary",
                "insights": {
                    "message": "No clusters identified",
                    "total_followers": len(profiles)
                }
            }]
        
        # Audience Demographics Insight
        total_clustered = sum(cluster.get('size', 0) for cluster in clusters)
        top_interests = []
        for cluster in clusters[:3]:  # Top 3 clusters
            keywords = cluster.get('keywords', [])
            top_interests.extend(keywords[:2])  # Top 2 keywords per cluster
        
        insights.append({
            "category": "Audience Demographics",
            "insights": {
                "topInterests": list(set(top_interests[:6])),  # Unique top 6 interests
                "totalClustered": total_clustered,
                "clusterCount": len(clusters),
                "demographicTrends": f"Audience shows {len(clusters)} distinct interest groups with primary focus on {top_interests[0] if top_interests else 'general content'}"
            }
        })
        
        # Engagement Patterns Insight
        largest_cluster = max(clusters, key=lambda x: x.get('size', 0))
        insights.append({
            "category": "Engagement Patterns", 
            "insights": {
                "dominantGroup": largest_cluster.get('tag', 'Unknown'),
                "groupSize": largest_cluster.get('size', 0),
                "cohesionScore": largest_cluster.get('cohesion', 0.0),
                "recommendedFocus": f"Target content towards {largest_cluster.get('tag', 'general audience')} for maximum reach"
            }
        })
        
        return insights

    def _generate_content_suggestions(self, clusters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate actionable content suggestions based on clusters"""
        suggestions = []
        
        for i, cluster in enumerate(clusters[:3]):  # Top 3 clusters
            tag = cluster.get('tag', f'Group_{i+1}')
            keywords = cluster.get('keywords', [])
            size = cluster.get('size', 0)
            
            # Generate content title and description based on keywords
            if keywords:
                primary_theme = keywords[0] if keywords else 'general'
                secondary_themes = keywords[1:3] if len(keywords) > 1 else []
                
                description = f"Create content around {primary_theme}"
                if secondary_themes:
                    description += f" and {', '.join(secondary_themes)}"
                
                suggestions.append({
                    "title": f"Content for {tag}",
                    "description": description,
                    "contentTypes": self._suggest_content_types(keywords),
                        "targetAudience": tag,
                    "expectedReach": size
                })
        
        return suggestions

    def _suggest_content_types(self, keywords: List[str]) -> List[str]:
        """Suggest content types based on keywords"""
        suggestions = []
        keyword_set = {keyword.lower() for keyword in keywords}
        
        # Define keyword categories
        tech_terms = {'tech', 'programming', 'code', 'development', 'software', 'ai', 'data'}
        creative_terms = {'art', 'design', 'creative', 'music', 'photography', 'video'}
        business_terms = {'business', 'marketing', 'entrepreneur', 'startup', 'finance'}
        educational_terms = {'education', 'learning', 'tutorial', 'guide', 'tips'}
        
        # Suggest content types based on keyword overlap
        if keyword_set & tech_terms:
            suggestions.extend(['code snippets', 'technical tutorials', 'tool reviews'])
        if keyword_set & creative_terms:
            suggestions.extend(['design showcases', 'creative process videos', 'inspiration boards'])
        if keyword_set & business_terms:
            suggestions.extend(['case studies', 'industry insights', 'success stories'])
        if keyword_set & educational_terms:
            suggestions.extend(['how-to guides', 'educational content', 'explainer videos'])
        
        # Default suggestions if no specific categories match
        if not suggestions:
            suggestions = ['general posts', 'community discussions', 'personal insights']
        
        return suggestions[:3]  # Return top 3 suggestions