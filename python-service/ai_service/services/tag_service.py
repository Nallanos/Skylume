import asyncio
import time
import signal
import threading
import logging
from typing import List, Dict, Any, Optional, Protocol, Tuple

from ai_service.clients.adonis_api_client import AdonisApiClient
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.models.interfaces.clustering_model import ClusteringModel
from ai_service.models.interfaces.tag_generator import TagGenerator
from ai_service.utils.text_cleaner import TextCleaner
from ai_service.models.transformer_embedder import TransformerEmbedder
from ai_service.services.taggers.keybert_tagger import KeyBERTTagger
from ai_service.services.clustering.hdbscan_clusterer import HDBSCANClusterer
from ai_service.services.improved_tag_generator import ImprovedTagGenerator

# Import modular semantic clustering services
from ai_service.services.semantic_clustering import (
    MemoryManager,
    ProfileProcessor,
    ProfileClusterer,
    SemanticKeywordExtractor,
    KeywordClusterer,
    CoherenceValidator,
    TagGeneratorService,
    MultiScaleOptimizer,
    TagValidator
)

# Type definitions for ProfileView and other Bluesky types
class ProfileView(Protocol):
    """Protocol defining the structure of a ProfileView object"""
    handle: str
    did: Optional[str] = None
    description: Optional[str] = None

# Mock Client class for graceful degradation when atproto is not available
class MockClient:
    """Mock client for when atproto is not available"""
    def login(self, handle: str, password: str) -> None:
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
    Lightweight orchestrator for the 7-step semantic clustering pipeline.
    
    This refactored service follows the single responsibility principle by delegating
    specific tasks to specialized services
    
    1. Profile Processing → ProfileProcessor
    2. Profile Clustering → ProfileClusterer  
    3. Keyword Extraction → SemanticKeywordExtractor
    4. Keyword Clustering → KeywordClusterer
    5. Coherence Validation → CoherenceValidator
    6. Tag Generation → TagGeneratorService
    7. Multi-Scale Optimization → MultiScaleOptimizer + TagValidator
    
    The orchestrator coordinates these services through dependency injection.
    """
    
    def __init__(self, 
                 api_client: AdonisApiClient,
                 embedding_model: Optional[EmbeddingModel] = None,
                 clusterer: Optional[ClusteringModel] = None,
                 tag_generator: Optional[TagGenerator] = None,
                 text_cleaner: Optional[TextCleaner] = None,
                 config: dict = None):
        """
        Initialize the TagService orchestrator with dependency injection.
        
        Args:
            api_client: Client API for communicating with AdonisJS
            embedding_model: Model for generating embeddings
            clusterer: Model for clustering
            tag_generator: Generator for tags
            text_cleaner: Text cleaning utility
            config: Configuration dictionary
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self.api_client = api_client
        self.config = config or {}
        
        self.logger.info("🔄 Initializing modular TagService orchestrator...")
        start_time = time.time()
        
        try:
            # Initialize base models (for backward compatibility)
            self.embedding_model = embedding_model or self._init_embedding_model()
            self.clusterer = clusterer or self._init_clusterer() 
            self.tag_generator = tag_generator or self._init_tag_generator()
            self.text_cleaner = text_cleaner or TextCleaner()
            
            # Initialize specialized services through dependency injection
            self._init_specialized_services()
            
            # Initialize the working ImprovedTagGenerator implementation
            self.improved_tag_generator = ImprovedTagGenerator()
            
            elapsed = time.time() - start_time
            self.logger.info(f"✅ Modular TagService orchestrator initialized in {elapsed:.1f}s")
            
        except Exception as e:
            self.logger.error(f"❌ Error initializing TagService orchestrator: {e}")
            raise
    
    def _init_specialized_services(self):
        """Initialize all specialized services with proper dependency injection."""
        try:
            # Core infrastructure services
            self.memory_manager = MemoryManager(
                memory_threshold_mb=self.config.get('memory_threshold_mb', 2048),
                gc_interval=self.config.get('gc_interval', 100)
            )
            
            # Step 1: Profile processing
            self.profile_processor = ProfileProcessor(
                embedding_model=self.embedding_model,
                text_cleaner=self.text_cleaner,
                memory_manager=self.memory_manager
            )
            
            # Step 2: Profile clustering  
            self.profile_clusterer = ProfileClusterer(
                clusterer=self.clusterer,
                memory_manager=self.memory_manager
            )
            
            # Step 3: Keyword extraction
            self.keyword_extractor = SemanticKeywordExtractor(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            # Step 4: Keyword clustering
            self.keyword_clusterer = KeywordClusterer(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            # Step 5: Coherence validation
            self.coherence_validator = CoherenceValidator(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            # Step 6: Tag generation
            self.tag_generator_service = TagGeneratorService(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            # Step 7: Multi-scale optimization and validation
            self.multi_scale_optimizer = MultiScaleOptimizer(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            self.tag_validator = TagValidator(
                embedding_model=self.embedding_model,
                memory_manager=self.memory_manager
            )
            
            self.logger.info("✅ All specialized services initialized successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Error initializing specialized services: {e}")
            raise
    
    async def generate_tags(self, account_handle: str, followers: List[Any], max_concurrent: int = 1) -> List[Dict[str, Any]]:
        """
        Main orchestrator for the 7-step semantic clustering pipeline.
        
        This method coordinates all specialized services to transform raw follower data
        into meaningful semantic clusters with high-quality tags.
        
        Args:
            account_handle: Handle of the account being analyzed
            followers: List of follower profiles to analyze
            max_concurrent: Maximum concurrent processing (for future scalability)
            
        Returns:
            List of cluster dictionaries with semantic tags and metadata
        """
        try:
            start_time = time.time()
            self.logger.info(f"🚀 Starting modular 7-step semantic clustering for {account_handle}")
            self.logger.info(f"📊 Processing {len(followers)} followers through modular pipeline")
            
            # Initialize memory monitoring
            self.memory_manager.check_memory_usage()
            
            if not followers:
                self.logger.warning("No followers provided for analysis")
                return []

            # STEP 1: Profile Processing
            self.logger.info("🔄 Step 1: Processing profiles through ProfileProcessor...")
            processed_data = await self.profile_processor.process_profiles(followers)
            
            if not processed_data['valid_profiles']:
                self.logger.warning("No valid profiles for clustering")
                return []
            
            # STEP 2: Profile Clustering  
            self.logger.info("🔄 Step 2: Clustering profiles through ProfileClusterer...")
            profile_clusters = self.profile_clusterer.cluster_profiles(
                processed_data['profile_embeddings'], 
                processed_data['valid_profiles']
            )
            
            if not profile_clusters:
                self.logger.warning("No profile clusters generated")
                return []
            
            self.logger.info(f"✅ Generated {len(profile_clusters)} profile clusters")
            
            # Process each cluster through steps 3-7
            final_clusters = []
            
            for i, cluster_data in enumerate(profile_clusters):
                try:
                    self.logger.info(f"🔄 Processing cluster {i+1}/{len(profile_clusters)}")
                    
                    # STEP 3: PHASE 4 Enhanced Keyword Extraction for Maximum Tag Candidates
                    cluster_texts = self._extract_cluster_texts(cluster_data['profiles'])
                    
                    # TIMEOUT PROTECTION: Add timeout for keyword extraction
                    def timeout_handler(signum, frame):
                        raise TimeoutError("Keyword extraction timeout")
                    
                    # Extract more keywords to feed the extensive tag generation with timeout protection
                    try:
                        self.logger.info(f"🔄 Starting keyword extraction for cluster {i+1} ({len(cluster_texts)} texts)")
                        
                        # Set 30-second timeout for keyword extraction
                        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
                        signal.alarm(30)
                        
                        keywords = self.keyword_extractor.extract_semantic_keywords(cluster_texts, top_n=50)
                        
                        # Clear timeout
                        signal.alarm(0)
                        signal.signal(signal.SIGALRM, old_handler)
                        
                        self.logger.info(f"✅ Extracted {len(keywords)} keywords for cluster {i+1}")
                        
                    except (TimeoutError, Exception) as e:
                        # Clear timeout and restore handler
                        signal.alarm(0)
                        if 'old_handler' in locals():
                            signal.signal(signal.SIGALRM, old_handler)
                        
                        self.logger.warning(f"⚠️ Keyword extraction failed for cluster {i+1}: {e}")
                        
                        # FALLBACK: Generate minimal keywords from profile text
                        keywords = self._generate_fallback_keywords(cluster_texts)
                        self.logger.info(f"🔄 Using {len(keywords)} fallback keywords for cluster {i+1}")
                    
                    # PHASE 4: Supplement with additional keyword sources
                    if len(keywords) < 30:  # If we don't have enough keywords, extract more
                        self.logger.info(f"🔄 PHASE 4: Supplementing keywords (current: {len(keywords)}, target: 30+)")
                        
                        # Extract from profile descriptions with different parameters
                        supplemental_keywords = self._extract_supplemental_keywords(cluster_data['profiles'])
                        
                        # Merge and deduplicate keywords
                        keyword_dict = {kw: score for kw, score in keywords}
                        for kw, score in supplemental_keywords:
                            if kw not in keyword_dict:
                                keyword_dict[kw] = score
                            else:
                                # Take the higher score
                                keyword_dict[kw] = max(keyword_dict[kw], score)
                        
                        # Convert back to list and sort by score
                        keywords = sorted(keyword_dict.items(), key=lambda x: x[1], reverse=True)[:50]
                        self.logger.info(f"✅ PHASE 4: Enhanced to {len(keywords)} keywords for richer tag generation")
                    
                    if not keywords:
                        self.logger.warning(f"No keywords extracted for cluster {i+1}")
                        continue
                    
                    # STEP 4: Keyword Clustering with timeout protection
                    try:
                        self.logger.info(f"🔄 Starting keyword clustering for cluster {i+1}")
                        
                        # Generate embeddings for keywords first
                        keyword_texts = [kw for kw, _ in keywords]
                        keyword_embeddings = self.embedding_model.encode(keyword_texts)
                        if hasattr(keyword_embeddings, 'tolist'):
                            keyword_embeddings = keyword_embeddings.tolist()
                        
                        keyword_clusters = self.keyword_clusterer.cluster_keywords_semantically(keywords, keyword_embeddings)
                        self.logger.info(f"✅ Keyword clustering complete for cluster {i+1}")
                        
                    except Exception as e:
                        self.logger.warning(f"⚠️ Keyword clustering failed for cluster {i+1}: {e}")
                        # Fallback: treat all keywords as one cluster
                        keyword_clusters = [keywords]
                    
                    # STEP 5: Coherence Validation
                    try:
                        self.logger.info(f"🔄 Starting coherence validation for cluster {i+1}")
                        validated_clusters = self.coherence_validator.validate_profile_keyword_coherence(
                            cluster_data['embedding'], keyword_clusters
                        )
                        self.logger.info(f"✅ Coherence validation complete for cluster {i+1}")
                    except Exception as e:
                        self.logger.warning(f"⚠️ Coherence validation failed for cluster {i+1}: {e}")
                        # Fallback: use keyword clusters as-is
                        validated_clusters = keyword_clusters
                    
                    # STEP 6: Tag Generation
                    try:
                        self.logger.info(f"🔄 Starting tag generation for cluster {i+1}")
                        cluster_tags = []
                        for j, validated_cluster in enumerate(validated_clusters):
                            try:
                                tag = self.tag_generator_service.generate_natural_tag_from_semantic_group(
                                    validated_cluster, cluster_data['embedding']
                                )
                                cluster_tags.append(tag)
                                self.logger.debug(f"Generated tag {j+1}/{len(validated_clusters)} for cluster {i+1}")
                            except Exception as tag_error:
                                self.logger.warning(f"Tag generation failed for sub-cluster {j+1}: {tag_error}")
                                # IMPROVED: Use TagGeneratorService fallback instead of generic Group_X
                                try:
                                    # Extract handles from profiles for context
                                    profile_handles = self._extract_profile_handles(cluster_data.get('profiles', []))
                                    fallback_result = self.tag_generator_service._create_fallback_tag_candidates()
                                    fallback_tag = {
                                        "tag": fallback_result['tag'], 
                                        "keywords": validated_cluster[:5],
                                        "handles": profile_handles
                                    }
                                    cluster_tags.append(fallback_tag)
                                except Exception as fallback_error:
                                    self.logger.warning(f"Even fallback failed: {fallback_error}")
                                    # Ultimate fallback using first keyword
                                    primary_keyword = validated_cluster[0][0] if validated_cluster else "Community"
                                    fallback_tag = {"tag": primary_keyword.title(), "keywords": validated_cluster[:5]}
                                    cluster_tags.append(fallback_tag)
                        
                        self.logger.info(f"✅ Tag generation complete for cluster {i+1}: {len(cluster_tags)} tags")
                    except Exception as e:
                        self.logger.warning(f"⚠️ Tag generation failed for cluster {i+1}: {e}")
                        # IMPROVED: Use TagGeneratorService fallback instead of generic Group_X
                        try:
                            profile_handles = self._extract_profile_handles(cluster_data.get('profiles', []))
                            fallback_result = self.tag_generator_service._create_fallback_tag_candidates()
                            cluster_tags = [{
                                "tag": fallback_result['tag'], 
                                "keywords": keywords[:5],
                                "handles": profile_handles
                            }]
                        except Exception as fallback_error:
                            self.logger.warning(f"Ultimate fallback failed: {fallback_error}")
                            # Use first keyword if available
                            primary_keyword = keywords[0][0] if keywords else "Community"
                            cluster_tags = [{"tag": primary_keyword.title(), "keywords": keywords[:5]}]
                    
                    # STEP 7: Multi-Scale Optimization and Final Validation
                    try:
                        self.logger.info(f"🔄 Starting multi-scale optimization for cluster {i+1}")
                        optimized_clusters = self.multi_scale_optimizer.optimize_tags_multi_scale([{
                            'profiles': cluster_data['profiles'],
                            'embedding': cluster_data['embedding'],  # Fixed: Use singular 'embedding' to match AdonisJS expectations
                            'keywords': keywords,
                            'keyword_clusters': keyword_clusters,
                            'raw_tags': cluster_tags
                        }], processed_data['profile_embeddings'])
                        self.logger.info(f"✅ Multi-scale optimization complete for cluster {i+1}")
                    except Exception as e:
                        self.logger.warning(f"⚠️ Multi-scale optimization failed for cluster {i+1}: {e}")
                        # Fallback: use cluster_tags as optimized_clusters
                        optimized_clusters = cluster_tags
                    
                    # PHASE 3: Conditional validation - Skip validation for single tags
                    try:
                        if len(optimized_clusters) == 1:
                            self.logger.info("🔄 PHASE 3: Single tag detected, skipping validation pipeline")
                            single_cluster = optimized_clusters[0]
                            
                            # Apply minimal scoring for consistency with proper error handling
                            try:
                                if 'quality_score' not in single_cluster:
                                    single_cluster['quality_score'] = self.tag_validator._calculate_tag_quality_score(single_cluster)
                            except Exception as score_error:
                                self.logger.warning(f"Quality score calculation failed: {score_error}")
                                single_cluster['quality_score'] = 0.5  # Default score
                            
                            single_cluster['ranking_score'] = single_cluster.get('quality_score', 0.5)
                            single_cluster['validation_status'] = 'single_tag_skip'
                            single_cluster['rank'] = 1
                            single_cluster['score_percentile'] = 100
                            
                            final_validated_clusters = optimized_clusters  # Use as-is
                        else:
                            # Multiple tags - use full validation pipeline
                            self.logger.info(f"🔄 PHASE 3: Multiple tags ({len(optimized_clusters)}), using full validation")
                            try:
                                final_validated_clusters = self.tag_validator.rank_and_validate_final_tags(optimized_clusters)
                            except Exception as validation_error:
                                self.logger.warning(f"Full validation failed: {validation_error}")
                                # Fallback: apply basic scoring
                                for cluster in optimized_clusters:
                                    cluster['quality_score'] = 0.5
                                    cluster['ranking_score'] = 0.5
                                    cluster['validation_status'] = 'fallback'
                                final_validated_clusters = optimized_clusters
                    except Exception as e:
                        self.logger.warning(f"⚠️ Validation step failed for cluster {i+1}: {e}")
                        # Ultimate fallback
                        final_validated_clusters = optimized_clusters
                    
                    # CRITICAL FIX: Ensure final clusters have complete data structure
                    for final_cluster in final_validated_clusters:
                        # Fix 1: Extract and add handles from profiles
                        profiles = cluster_data.get('profiles', [])
                        handles = self._extract_profile_handles(profiles)
                        final_cluster['handles'] = handles
                        
                        # Fix 2: Ensure size is properly set
                        final_cluster['size'] = len(profiles)
                        
                        # Fix 3: Ensure embeddings are properly formatted (flatten if needed)
                        embeddings = cluster_data.get('embedding', [])
                        if embeddings and len(embeddings) > 0:
                            if isinstance(embeddings[0], list):
                                # Calculate centroid if we have multiple embeddings
                                final_cluster['embeddings'] = self._calculate_centroid_embedding(embeddings)
                            else:
                                final_cluster['embeddings'] = embeddings
                        else:
                            final_cluster['embeddings'] = []
                        
                        # Fix 4: Ensure tag comes from TagGeneratorService, not fallback
                        if not final_cluster.get('tag') or final_cluster.get('tag', '').startswith('Group_'):
                            try:
                                # Use TagGeneratorService to generate meaningful tag
                                tag_result = self.tag_generator_service.generate_natural_tag_from_semantic_group(
                                    keywords[:5], handles[:5]
                                )
                                final_cluster['tag'] = tag_result.get('tag', 'Community')
                            except Exception as tag_fix_error:
                                self.logger.warning(f"Tag fix failed: {tag_fix_error}")
                                # Use first keyword if available
                                if keywords:
                                    final_cluster['tag'] = keywords[0][0].title() if isinstance(keywords[0], tuple) else str(keywords[0]).title()
                                else:
                                    final_cluster['tag'] = f"Community {len(handles)}" if handles else "Community"
                    
                    final_clusters.extend(final_validated_clusters)
                    
                    # Log cluster details for debugging
                    for idx, final_cluster in enumerate(final_validated_clusters):
                        cluster_size = final_cluster.get('size', 0)
                        handles_count = len(final_cluster.get('handles', []))
                        embeddings_status = "OK" if final_cluster.get('embeddings') else "NULL"
                        self.logger.info(f"Final cluster {idx+1}: size={cluster_size}, handles={handles_count}, embeddings={embeddings_status}, tag='{final_cluster.get('tag', 'unknown')}'")
                    
                except Exception as e:
                    self.logger.error(f"❌ Error processing cluster {i+1}: {e}")
                    continue
            
            # Generate insights and suggestions
            total_time = time.time() - start_time
            self.logger.info(f"✅ Completed modular pipeline in {total_time:.1f}s")
            self.logger.info(f"📈 Generated {len(final_clusters)} final semantic clusters")
            
            return final_clusters
            
        except Exception as e:
            self.logger.error(f"❌ Critical error in modular pipeline: {e}")
            return []
    
    def _extract_cluster_texts(self, cluster_profiles: List[Any]) -> List[str]:
        """Extract text content from cluster profiles."""
        cluster_texts = []
        for profile in cluster_profiles:
            description = self._get_profile_field(profile, 'description')
            handle = self._get_profile_field(profile, 'handle')
            
            if description and isinstance(description, str) and description.strip():
                cluster_texts.append(description)
            elif handle and isinstance(handle, str) and handle.strip():
                cluster_texts.append(handle.replace('.bsky.social', '').replace('.', ' '))
            else:
                cluster_texts.append("")
        
        return cluster_texts
    
    def _get_profile_field(self, profile: Any, field: str) -> Optional[str]:
        """Safely extract field from profile object or dictionary."""
        try:
            # Try object attribute access first
            if hasattr(profile, field):
                return getattr(profile, field)
            # Try dictionary access
            elif isinstance(profile, dict) and field in profile:
                return profile[field]
            else:
                return None
        except Exception:
            return None
    
    def _extract_profile_handles(self, profiles: List[Any]) -> List[str]:
        """Extract handles from cluster profiles."""
        handles = []
        for profile in profiles:
            handle = self._get_profile_field(profile, 'handle')
            if handle and isinstance(handle, str):
                handles.append(handle)
        return handles
    
    def _calculate_centroid_embedding(self, embeddings: List[List[float]]) -> List[float]:
        """Calculate centroid embedding from multiple embeddings."""
        try:
            if not embeddings or not embeddings[0]:
                return []
            
            # Calculate mean for each dimension
            num_dimensions = len(embeddings[0])
            centroid = [0.0] * num_dimensions
            
            for embedding in embeddings:
                for i, value in enumerate(embedding):
                    if i < num_dimensions:
                        centroid[i] += value
            
            # Divide by number of embeddings to get mean
            num_embeddings = len(embeddings)
            centroid = [value / num_embeddings for value in centroid]
            
            return centroid
            
        except Exception as e:
            self.logger.warning(f"Error calculating centroid embedding: {e}")
            return embeddings[0] if embeddings else []
    
    def _generate_fallback_keywords(self, cluster_texts: List[str]) -> List[Tuple[str, float]]:
        """Generate basic fallback keywords from profile text when extraction fails."""
        keywords = []
        if not cluster_texts:
            return [("community", 0.5)]
        
        # Extract simple keywords from text
        all_text = " ".join(cluster_texts).lower()
        words = all_text.split()
        
        # Count word frequency
        word_counts = {}
        for word in words:
            # Simple filtering
            word = word.strip().strip('.,!?@#$%^&*()[]{}":;')
            if len(word) > 2 and word.isalpha():
                word_counts[word] = word_counts.get(word, 0) + 1
        
        # Convert to keywords with scores
        for word, count in sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            score = min(count / len(words), 1.0)  # Normalize score
            keywords.append((word, score))
        
        return keywords if keywords else [("community", 0.5)]
    
    def _extract_supplemental_keywords(self, profiles: List[Any]) -> List[Tuple[str, float]]:
        """Extract supplemental keywords from profile descriptions."""
        keywords = []
        
        for profile in profiles:
            description = self._get_profile_field(profile, 'description')
            if description and isinstance(description, str):
                words = description.lower().split()
                for word in words:
                    word = word.strip().strip('.,!?@#$%^&*()[]{}":;')
                    if len(word) > 3 and word.isalpha():
                        keywords.append((word, 0.3))  # Lower score for supplemental
        
        # Deduplicate and return top keywords
        keyword_dict = {}
        for word, score in keywords:
            keyword_dict[word] = max(keyword_dict.get(word, 0), score)
        
        return sorted(keyword_dict.items(), key=lambda x: x[1], reverse=True)[:20]
    
    # Backward compatibility methods for model initialization
    def _init_embedding_model(self):
        """Initialize embedding model with error handling"""
        try:
            self.logger.info("📥 Loading embedding model...")
            model = TransformerEmbedder("sentence-transformers/all-MiniLM-L6-v2")
            self.logger.info("✅ Embedding model loaded successfully")
            return model
        except Exception as e:
            self.logger.error(f"❌ Failed to load embedding model: {e}")
            raise

    def _init_clusterer(self):
        """Initialize clusterer with error handling"""
        try:
            self.logger.info("📥 Loading clusterer...")
            # FUNCTIONAL CHANGE: Hardcoded min_cluster_size to 4
            # This is a business requirement - DO NOT CHANGE without approval  
            # This will be dynamically adjusted in adjust_for_dataset_size()
            clusterer = HDBSCANClusterer(
                min_cluster_size=4,  # Increased from 3 to 4 for better cluster quality
                metric="cosine", 
                cluster_selection_method="leaf"
            )
            self.logger.info("✅ Clusterer loaded successfully with min_cluster_size=4")
            return clusterer
        except Exception as e:
            self.logger.error(f"❌ Failed to load clusterer: {e}")
            raise

    def _init_tag_generator(self):
        """Initialize tag generator with error handling"""
        try:
            self.logger.info("📥 Loading tag generator...")
            generator = KeyBERTTagger()
            self.logger.info("✅ Tag generator loaded successfully")
            return generator
        except Exception as e:
            self.logger.error(f"❌ Failed to load tag generator: {e}")
            raise
