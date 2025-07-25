"""
Profile processor for semantic clustering pipeline.
Handles the processing, validation, and enrichment of user profiles.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
import asyncio
import time
import numpy as np
from atproto_client.models.app.bsky.actor.defs import ProfileView
from atproto_client.models.app.bsky.feed.defs import PostView

# Import custom types and services
from ai_service.services.semantic_clustering.processors.text_cleaner import TextCleaner
from ai_service.types.profile_data import ProfileData

# Type hints for external dependencies
try:
    from bluesky.api import AccountService
except ImportError:
    AccountService = Any
from bluesky.api import AccountService

class ProfileProcessor:
    def extract_cluster_texts(self, profiles: List[Dict[str, Any]]) -> List[str]:
        """
        Extracts a single text string per profile for clustering fallback logic.
        Args:
            profiles: List of profile dicts
        Returns:
            List of text strings (bio + posts + following bios)
        """
        texts = []
        for profile in profiles:
            bio = profile.get('description', '') or ''
            posts_list = [str(x) for x in profile.get('additional_posts', []) if x is not None]
            following_bios_list = [str(x) for x in profile.get('following_bios', []) if x is not None]
            posts = ' '.join(str(x) for x in posts_list if x is not None)
            following_bios = ' '.join(str(x) for x in following_bios_list if x is not None)
            combined = f"{bio} {posts} {following_bios}".strip()
            texts.append(combined)
        return texts
    """
    Service responsible for processing and enriching user profiles in the semantic clustering pipeline.
    
    This class handles:
    - Profile validation and filtering
    - Text extraction and cleaning
    - Profile enrichment with additional metadata
    - Embedding generation for profiles
    - Async processing of large profile datasets
    """
    
    def __init__(self, 
                 embedding_model: Optional[Any] = None, 
                 text_cleaner: Optional[TextCleaner] = None, 
                 memory_manager: Optional[Any] = None, 
                 account_service: Optional[Any] = None):
        """
        Initialize the ProfileProcessor with required dependencies.
        
        Args:
            embedding_model: Model for generating embeddings from profile text
            text_cleaner: TextCleaner service for cleaning and normalizing text content
            memory_manager: Service for managing memory usage during processing
            account_service: AccountService for enriching profiles with additional account data
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.text_cleaner = text_cleaner or TextCleaner()
        self.memory_manager = memory_manager
        self.account_service = account_service
        self.authenticated = False
        
        # 🚀 OPTIMIZATION: Simple cache for API results
        self.api_cache = {
            'posts': {},      # did -> posts_text
            'following': {},  # did -> following_bios
            'cache_hits': 0,
            'cache_misses': 0
        }
        
        self.processing_stats = {
            'total_processed': 0,
            'valid_profiles': 0,
            'invalid_profiles': 0,
            'insufficient_profiles': 0,
            'profiles_with_bio': 0,
            'profiles_with_posts': 0,
            'profiles_with_following': 0,
            'filtered_posts': 0,
            'filtered_following_bios': 0,
            'errors': 0,
            'processing_time': 0.0,
            'avg_cosine_similarity': 0.0,
            'bio_only_profiles': 0,
            'posts_only_profiles': 0,
            'following_only_profiles': 0,
            'bio_posts_combined': 0,
            'noise_profiles': 0,  # Profiles with no informative sources
            'pre_filtered_count': 0,  # Profiles that passed pre-filtering
            'pre_filtered_out': 0,    # Profiles filtered out early
            'cache_hits': 0,
            'cache_misses': 0
        }
        
        # Weighting configuration for different sources (now with extreme weighting for bio)
        self.source_weights = {
            'bio_weight': 3.0,  # Bio gets 3x weight when combined
            'posts_max_weight': 1.0,  # Max weight for posts
            'following_max_weight': 0.5,  # Reduced weight for following bios
            'posts_decay_factor': 3.0,  # Posts weight = min(max_weight, decay_factor/num_posts)
            'following_decay_factor': 2.0  # Following weight = min(max_weight, decay_factor/num_following)
        }
        
        self.logger.info("ProfileProcessor initialized")
    
    def weighted_average_embeddings(self, embeddings: List[List[float]], weights: List[float]) -> List[float]:
        """
        Compute weighted average of a list of L2-normalized embeddings.
        
        Args:
            embeddings: List of embedding vectors (will be normalized)
            weights: List of weights for each embedding
            
        Returns:
            Weighted average embedding vector (L2-normalized)
        """
        try:
            if not embeddings or not weights or sum(weights) == 0:
                return []
            
            import numpy as np
            
            # L2-normalize each embedding to prevent variance domination
            normalized_embeddings = []
            for emb in embeddings:
                emb_array = np.array(emb)
                norm = np.linalg.norm(emb_array)
                if norm > 0:
                    normalized_embeddings.append(emb_array / norm)
                else:
                    self.logger.warning("Zero-norm embedding detected, skipping")
                    continue
            
            if not normalized_embeddings:
                return []
            
            # Compute weighted average of normalized embeddings
            arr = np.array(normalized_embeddings)
            w = np.array(weights[:len(normalized_embeddings)]).reshape(-1, 1)
            weighted_avg = (arr * w).sum(axis=0) / w.sum()
            
            # L2-normalize the final result
            final_norm = np.linalg.norm(weighted_avg)
            if final_norm > 0:
                return (weighted_avg / final_norm).tolist()
            else:
                return []
                
        except Exception as e:
            self.logger.error(f"Error computing weighted average: {e}")
            return []

    def _get_cache_stats(self):
        """Get cache statistics for monitoring."""
        total_requests = self.api_cache['cache_hits'] + self.api_cache['cache_misses']
        hit_rate = (self.api_cache['cache_hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'cache_hits': self.api_cache['cache_hits'],
            'cache_misses': self.api_cache['cache_misses'],
            'hit_rate_percent': round(hit_rate, 2),
            'cached_posts': len(self.api_cache['posts']),
            'cached_following': len(self.api_cache['following'])
        }

    async def _get_cached_posts(self, did: str) -> Optional[str]:
        """Get posts from cache or fetch and cache them."""
        if did in self.api_cache['posts']:
            self.api_cache['cache_hits'] += 1
            return self.api_cache['posts'][did]
        
        self.api_cache['cache_misses'] += 1
        if not self.account_service:
            return None
            
        posts = await self.account_service.get_user_posts(did, limit=20)
        posts_text = ' '.join([post['text'] for post in posts if 'text' in post])
        
        # Cache the result (even if empty)
        self.api_cache['posts'][did] = posts_text
        return posts_text

    async def _get_cached_following(self, did: str) -> Optional[str]:
        """Get following bios from cache or fetch and cache them."""
        if did in self.api_cache['following']:
            self.api_cache['cache_hits'] += 1
            return self.api_cache['following'][did]
        
        self.api_cache['cache_misses'] += 1
        if not self.account_service:
            return None
            
        following = await self.account_service.get_following(did, limit=10)
        following_bios = ' '.join([f['description'] for f in following if 'description' in f and f['description']])
        
        # Cache the result (even if empty)
        self.api_cache['following'][did] = following_bios
        return following_bios

    def clear_cache(self):
        """Clear the API cache to free memory."""
        cache_stats = self._get_cache_stats()
        self.logger.info(f"🧹 Clearing cache - had {cache_stats['cached_posts']} posts, {cache_stats['cached_following']} following cached")
        
        self.api_cache = {
            'posts': {},
            'following': {},
            'cache_hits': 0,
            'cache_misses': 0
        }

    def get_cache_size(self) -> int:
        """Get approximate cache size in number of entries."""
        return len(self.api_cache['posts']) + len(self.api_cache['following'])
    
    def encode_profile_sources(self, bio_text: str, posts_text: List[str], following_bios: List[str]) -> List[float]:
        """
        Encode profile sources with strict semantic filtering and optimized source selection.
        Only encodes the sources that will actually be used (avoids unnecessary computations).
        
        Args:
            bio_text: Profile bio text
            posts_text: List of post texts
            following_bios: List of following bio texts
            
        Returns:
            Single embedding from the most informative source(s)
        """
        try:
            # Early return if no embedding model
            if not self.embedding_model:
                return []
            
            # A. OPTIMIZED SOURCE VALIDATION AND ENCODING
            # Only check and encode sources as needed, following priority order
            
            # 1. CHECK BIO FIRST (highest priority)
            bio_informative = (
                bio_text and 
                bio_text.strip() and 
                bio_text != "INSUFFICIENT_DATA" and
                self.text_cleaner and
                self.text_cleaner.is_semantically_informative(bio_text, min_words=3)
            )
            
            if bio_informative:
                # Bio is informative - encode it immediately
                try:
                    bio_embedding = self.embedding_model.encode([bio_text])[0]
                    if bio_embedding is not None and len(bio_embedding) > 0:
                        
                        # ONLY check posts if we want to potentially combine
                        # (avoid encoding posts if we'll use bio-only strategy)
                        combine_with_posts = False
                        if posts_text:
                            valid_posts = [post for post in posts_text[:5] if post and post.strip()]
                            if valid_posts:
                                combined_posts_text = " ".join(valid_posts)
                                if (len(combined_posts_text) > 50 and 
                                    self.text_cleaner and
                                    self.text_cleaner.is_semantically_informative(combined_posts_text, min_words=5)):
                                    combine_with_posts = True
                        
                        if combine_with_posts:
                            # Only now encode posts since we'll use them
                            try:
                                post_embedding = self.embedding_model.encode([combined_posts_text])[0]
                                if post_embedding is not None and len(post_embedding) > 0:
                                    # Use bio with 3x weight (extreme weighting)
                                    final_embedding = self.weighted_average_embeddings(
                                        [bio_embedding, post_embedding],
                                        [3.0, 1.0]  # Bio gets 3x more weight
                                    )
                                    self.processing_stats['bio_posts_combined'] += 1
                                    return final_embedding
                            except Exception as e:
                                self.logger.debug(f"Error encoding posts for combination: {e}")
                        
                        # Return normalized bio embedding (posts either not informative or encoding failed)
                        import numpy as np
                        bio_array = np.array(bio_embedding)
                        norm = np.linalg.norm(bio_array)
                        if norm > 0:
                            self.processing_stats['bio_only_profiles'] += 1
                            return (bio_array / norm).tolist()
                        else:
                            return []
                except Exception as e:
                    self.logger.debug(f"Error encoding bio: {e}")
                    # Bio encoding failed, fall through to posts
            
            # 2. CHECK POSTS (only if bio was not informative or failed)
            posts_informative = False
            combined_posts_text = ""
            if posts_text:
                valid_posts = [post for post in posts_text[:5] if post and post.strip()]
                if valid_posts:
                    combined_posts_text = " ".join(valid_posts)
                    posts_informative = (
                        self.text_cleaner and
                        self.text_cleaner.is_semantically_informative(combined_posts_text, min_words=5)
                    )
            
            if posts_informative:
                # Posts are informative - encode them
                try:
                    post_embedding = self.embedding_model.encode([combined_posts_text])[0]
                    if post_embedding is not None and len(post_embedding) > 0:
                        # Return normalized post embedding
                        import numpy as np
                        post_array = np.array(post_embedding)
                        norm = np.linalg.norm(post_array)
                        if norm > 0:
                            self.processing_stats['posts_only_profiles'] += 1
                            return (post_array / norm).tolist()
                        else:
                            return []
                except Exception as e:
                    self.logger.debug(f"Error encoding posts: {e}")
                    # Posts encoding failed, fall through to following
            
            # 3. CHECK FOLLOWING (only if bio and posts were not informative or failed)
            following_informative = False
            combined_following_text = ""
            if following_bios:
                valid_following = [bio for bio in following_bios[:4] if bio and bio.strip()]
                if valid_following:
                    combined_following_text = " ".join(valid_following)
                    following_informative = (
                        self.text_cleaner and
                        self.text_cleaner.is_semantically_informative(combined_following_text, min_words=4)
                    )
            
            if following_informative:
                # Following bios are informative - encode them
                try:
                    following_embedding = self.embedding_model.encode([combined_following_text])[0]
                    if following_embedding is not None and len(following_embedding) > 0:
                        # Return normalized following embedding  
                        import numpy as np
                        following_array = np.array(following_embedding)
                        norm = np.linalg.norm(following_array)
                        if norm > 0:
                            self.processing_stats['following_only_profiles'] += 1
                            return (following_array / norm).tolist()
                        else:
                            return []
                except Exception as e:
                    self.logger.debug(f"Error encoding following bios: {e}")
            
            # 4. NO INFORMATIVE SOURCE FOUND - MARK AS NOISE
            self.logger.debug("No semantically informative sources found - marking profile as noise")
            self.processing_stats['noise_profiles'] += 1
            return []  # This profile will be filtered out during clustering
                
        except Exception as e:
            self.logger.error(f"Error encoding profile sources: {e}")
            return []

    def configure_source_weights(self, 
                                bio_weight: float = 1.0,
                                posts_max_weight: float = 1.0,
                                following_max_weight: float = 0.8,
                                posts_decay_factor: float = 3.0,
                                following_decay_factor: float = 2.0):
        """
        Configure the weights for different profile sources.
        
        Args:
            bio_weight: Weight for bio text (default: 1.0)
            posts_max_weight: Maximum weight for posts (default: 1.0)
            following_max_weight: Maximum weight for following bios (default: 0.8)
            posts_decay_factor: Decay factor for posts weight calculation (default: 3.0)
            following_decay_factor: Decay factor for following bios weight calculation (default: 2.0)
        """
        self.source_weights.update({
            'bio_weight': bio_weight,
            'posts_max_weight': posts_max_weight,
            'following_max_weight': following_max_weight,
            'posts_decay_factor': posts_decay_factor,
            'following_decay_factor': following_decay_factor
        })
        self.logger.info(f"Updated source weights: {self.source_weights}")
    
    def authenticate(self, bluesky_handle: str, bluesky_password: str) -> bool:
        """
        Authenticate with Bluesky API for profile enrichment.
        
        Args:
            bluesky_handle: Bluesky handle for authentication
            bluesky_password: Bluesky password for authentication
            
        Returns:
            bool: True if authentication successful, False otherwise
        """
        try:
            if self.account_service:
                self.account_service.login(bluesky_handle, bluesky_password)
                self.authenticated = True
                self.logger.info("Successfully authenticated with Bluesky API")
                return True
            else:
                self.logger.warning("No account service available for authentication")
                return False
        except Exception as e:
            self.logger.error(f"Authentication failed: {e}")
            self.authenticated = False
            return False
    
    async def process_profile(self, profile: ProfileView) -> Optional[ProfileData]:
        """
        Process a single profile to extract meaningful text content.
        Returns None if profile has insufficient data for clustering.
        
        Args:
            profile: ProfileView object to process
            
        Returns:
            ProfileData object with enriched content, or None if insufficient data
        """
        try:
            self.processing_stats['total_processed'] += 1
            
            # Extract text from profile using intelligent filtering
            bio_text, posts_text, following_bios = await self.extract_profile_text(profile)
            
            # Check if profile has insufficient data
            if bio_text == "INSUFFICIENT_DATA":
                self.processing_stats['empty_profiles'] += 1
                self.logger.debug(f"Skipping profile {profile.get('handle', 'unknown')} - insufficient data")
                return None
            
            # Validate content semantic sufficiency
            if not self.validate_profile_content(bio_text, posts_text, following_bios):
                self.processing_stats['semantically_empty'] += 1
                self.logger.debug(f"Skipping profile {profile.get('handle', 'unknown')} - semantically insufficient")
                return None
            
            # Create combined text for embedding
            combined_text_parts = [bio_text] if bio_text else []
            if posts_text:
                combined_text_parts.extend(posts_text)
            if following_bios:
                combined_text_parts.extend(following_bios)
            
            combined_text = " ".join(combined_text_parts).strip()
            
            # Final validation
            if not combined_text or len(combined_text) < 10:
                self.processing_stats['too_short'] += 1
                return None
            
            # Create ProfileData
            profile_data = ProfileData(
                did=profile['did'],
                handle=profile.get('handle', ''),
                display_name=profile.get('displayName', profile.get('display_name', '')),
                description=bio_text,
                posts_text=posts_text,
                following_bios=following_bios,
                combined_text=combined_text,
                followers_count=profile.get('followersCount', profile.get('followers_count', 0)),
                following_count=profile.get('followingCount', profile.get('following_count', 0)),
                posts_count=profile.get('postsCount', profile.get('posts_count', 0)),
            )
            
            self.processing_stats['successfully_processed'] += 1
            return profile_data
            
        except Exception as e:
            self.processing_stats['processing_errors'] += 1
            self.logger.error(f"Error processing profile {profile.get('handle', 'unknown')}: {e}")
            return None
    
    async def process_profiles(self, profiles: List[ProfileView]) -> Tuple[List[Dict[str, Any]], List[List[float]], Dict[str, Any]]:
        """
        Process a list of profiles with validation, enrichment, and embedding generation.
        OPTIMIZED: Pre-filtering, reduced I/O calls, batch embeddings.
        
        Args:
            profiles: List of ProfileView objects to process
            
        Returns:
            Tuple containing:
                - List of processed and validated profiles
                - List of corresponding embeddings
                - Dictionary with validation statistics
        """
        start_time = time.time()
        self.processing_stats['total_processed'] = len(profiles)
        
        try:
            # 🚀 OPTIMIZATION 1: Pre-filter profiles based on local content BEFORE any I/O
            self.logger.info(f"🔍 Pre-filtering {len(profiles)} profiles based on local content...")
            
            pre_filtered_profiles = []
            for profile in profiles:
                # Extract only local bio content (no I/O)
                local_bio = profile.get('description', '') or profile.get('displayName', '') or profile.get('display_name', '')
                
                # Quick semantic validation on local content
                if (local_bio and 
                    local_bio.strip() and 
                    len(local_bio.strip()) > 10 and
                    self.text_cleaner and
                    self.text_cleaner.is_semantically_informative(local_bio.strip(), min_words=2)):
                    pre_filtered_profiles.append(profile)
                elif profile.get('postsCount', profile.get('posts_count', 0)) > 5:
                    # Keep profiles with many posts even if bio is weak
                    pre_filtered_profiles.append(profile)
            
            self.processing_stats['pre_filtered_count'] = len(pre_filtered_profiles)
            self.processing_stats['pre_filtered_out'] = len(profiles) - len(pre_filtered_profiles)
            
            self.logger.info(f"✂️ Pre-filtered to {len(pre_filtered_profiles)} profiles ({len(profiles) - len(pre_filtered_profiles)} filtered out)")
            
            if not pre_filtered_profiles:
                self.logger.warning("No profiles passed pre-filtering")
                return [], [], self.processing_stats
            
            # 🚀 OPTIMIZATION 2: Process in smaller batches with reduced concurrent I/O
            batch_size = 25  # Much smaller batches to avoid API rate limits
            api_semaphore = asyncio.Semaphore(10)  # Much lower concurrency
            
            all_processed_profiles = []
            all_profile_texts = []  # For batch embedding generation
            
            async def process_profile_optimized(profile):
                """Optimized profile processing with minimal I/O."""
                async with api_semaphore:
                    try:
                        # Extract local content first
                        local_bio = profile.get('description', '') or profile.get('displayName', '') or profile.get('display_name', '')
                        if local_bio and self.text_cleaner:
                            local_bio = self.text_cleaner.clean(local_bio)
                        
                        bio_text = local_bio
                        posts_text = []
                        following_bios = []
                        
                        # 🚀 OPTIMIZATION 3: Only fetch additional data for profiles with weak local content
                        local_content_sufficient = (
                            bio_text and 
                            len(bio_text.strip()) > 20 and
                            self.text_cleaner and
                            self.text_cleaner.is_semantically_informative(bio_text, min_words=4)
                        )
                        
                        if not local_content_sufficient and self.account_service and self.authenticated:
                            # Only fetch additional data if local content is insufficient
                            self.logger.debug(f"Fetching additional data for {profile.get('handle', 'unknown')} (weak local content)")
                            
                            # Fetch posts and following with much shorter timeouts and limits
                            async def fetch_posts_minimal():
                                try:
                                    # 🚀 CACHE: Use cached posts method
                                    posts_text = await self._get_cached_posts(profile['did'])
                                    if posts_text:
                                        # Split and take only first few posts
                                        posts = posts_text.split(' ')[:50]  # Limit words
                                        return [' '.join(posts)] if posts else []
                                    return []
                                except Exception as e:
                                    self.logger.debug(f"Failed to fetch posts for {profile.get('handle', 'unknown')}: {e}")
                                    return []
                            
                            async def fetch_following_minimal():
                                try:
                                    # 🚀 CACHE: Use cached following method
                                    following_bios = await self._get_cached_following(profile['did'])
                                    if following_bios:
                                        # Split and limit content
                                        bios = following_bios.split(' ')[:30]  # Limit words
                                        return [' '.join(bios)] if bios else []
                                    return []
                                except Exception as e:
                                    self.logger.debug(f"Failed to fetch following for {profile.get('handle', 'unknown')}: {e}")
                                    return []
                            
                            # Execute both quickly with cache
                            try:
                                posts_text, following_bios = await asyncio.gather(
                                    fetch_posts_minimal(), 
                                    fetch_following_minimal()
                                )
                            except Exception as e:
                                self.logger.debug(f"Error enriching {profile.get('handle', 'unknown')}: {e}")
                                posts_text, following_bios = [], []
                        
                        # Create enriched profile data
                        enriched_profile = {
                            'handle': profile.get('handle', ''),
                            'display_name': profile.get('displayName', profile.get('display_name', '')),
                            'description': bio_text,
                            'followers_count': profile.get('followersCount', profile.get('followers_count', 0)),
                            'follows_count': profile.get('followsCount', profile.get('follows_count', 0)),
                            'posts_count': profile.get('postsCount', profile.get('posts_count', 0)),
                            'did': profile.get('did', ''),
                            'additional_posts': posts_text,
                            'following_bios': following_bios
                        }
                        
                        # Prepare text for batch embedding (combine all sources)
                        text_parts = []
                        if bio_text and bio_text.strip():
                            text_parts.append(bio_text.strip())
                        if posts_text:
                            text_parts.extend(posts_text)
                        if following_bios:
                            text_parts.extend(following_bios)
                        
                        combined_text = " ".join(text_parts).strip()
                        
                        # Final validation
                        if not combined_text or len(combined_text) < 15:
                            return None, None
                        
                        return enriched_profile, combined_text
                        
                    except Exception as e:
                        self.logger.error(f"Error processing profile {profile.get('handle', 'unknown')}: {e}")
                        return None, None
            
            # Process all profiles in batches
            self.logger.info(f"🔄 Processing {len(pre_filtered_profiles)} profiles in batches of {batch_size}...")
            
            for i in range(0, len(pre_filtered_profiles), batch_size):
                batch = pre_filtered_profiles[i:i + batch_size]
                self.logger.info(f"Processing batch {i//batch_size + 1}/{(len(pre_filtered_profiles) + batch_size - 1)//batch_size}")
                
                # Process batch concurrently
                batch_tasks = [process_profile_optimized(profile) for profile in batch]
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                # Collect valid results
                for result in batch_results:
                    if isinstance(result, Exception):
                        self.logger.error(f"Exception in batch processing: {result}")
                        self.processing_stats['errors'] += 1
                    elif result[0] is not None and result[1] is not None:
                        all_processed_profiles.append(result[0])
                        all_profile_texts.append(result[1])
            
            self.logger.info(f"✅ Collected {len(all_processed_profiles)} valid profiles for embedding generation")
            
            # 🚀 OPTIMIZATION 4: Batch embedding generation (HUGE performance gain)
            self.logger.info(f"🧠 Generating embeddings in batch for {len(all_profile_texts)} profiles...")
            
            embeddings = []
            if self.embedding_model and all_profile_texts:
                try:
                    # Single batch call to embedding model (much faster than individual calls)
                    # Only use supported parameters for TransformerEmbedder
                    batch_embeddings = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: self.embedding_model.encode(all_profile_texts, batch_size=32)
                    )
                    
                    # Convert to list and validate
                    if hasattr(batch_embeddings, 'tolist'):
                        batch_embeddings = batch_embeddings.tolist()
                    
                    # Validate each embedding and track indices
                    valid_embeddings = []
                    valid_embedding_indices = []
                    
                    for i, embedding in enumerate(batch_embeddings):
                        if self.validate_embedding_quality(embedding):
                            valid_embeddings.append(embedding)
                            valid_embedding_indices.append(i)
                        else:
                            self.logger.debug(f"⚠️ Removing profile with invalid embedding at index {i}")
                            self.processing_stats['errors'] += 1
                    
                    # Filter profiles to match valid embeddings
                    embeddings = valid_embeddings
                    all_processed_profiles = [all_processed_profiles[i] for i in valid_embedding_indices]
                    
                    self.logger.info(f"🔍 Embedding validation: {len(valid_embeddings)} valid out of {len(batch_embeddings)} generated")
                            
                except Exception as e:
                    self.logger.error(f"Batch embedding generation failed: {e}")
                    embeddings = []
                    all_processed_profiles = []
            else:
                self.logger.warning("No embedding model or profile texts available")
                embeddings = []
                all_processed_profiles = []
            
            # Final validation check
            if len(embeddings) != len(all_processed_profiles):
                self.logger.error(f"Mismatch between profiles ({len(all_processed_profiles)}) and embeddings ({len(embeddings)})")
                # Take minimum to ensure alignment
                min_count = min(len(embeddings), len(all_processed_profiles))
                embeddings = embeddings[:min_count]
                all_processed_profiles = all_processed_profiles[:min_count]
            
            # Return valid data only
            final_profiles = all_processed_profiles
            final_embeddings = embeddings
            
            self.processing_stats['processing_time'] = time.time() - start_time
            self.processing_stats['valid_profiles'] = len(final_profiles)
            self.processing_stats['invalid_profiles'] = len(all_processed_profiles) - len(final_profiles)
            
            # Update cache stats in processing stats
            cache_stats = self._get_cache_stats()
            self.processing_stats.update(cache_stats)
            
            self.logger.info(f"🎯 OPTIMIZED PROCESSING COMPLETE:")
            self.logger.info(f"   📊 Final profiles: {len(final_profiles)}")
            self.logger.info(f"   ⏱️ Processing time: {self.processing_stats['processing_time']:.2f}s")
            self.logger.info(f"   🚀 Pre-filtering saved {self.processing_stats['pre_filtered_out']} I/O calls")
            self.logger.info(f"   💾 Cache hit rate: {cache_stats['hit_rate_percent']}% ({cache_stats['cache_hits']}/{cache_stats['cache_hits'] + cache_stats['cache_misses']} requests)")
            
            return final_profiles, final_embeddings, self.processing_stats
            
        except Exception as e:
            self.logger.error(f"Error in optimized profile processing: {e}")
            return [], [], self.processing_stats
    
    def validate_profile(self, profile: ProfileView) -> bool:
        """
        Validate a single profile. Now always returns True (no exclusion).
        """
        return True
    
    def validate_profile_content(self, bio_text: str, posts_text: List[str], following_bios: List[str]) -> bool:
        """
        Validate that a profile has sufficient semantic content for clustering.
        Now uses strict filtering - at least one source must be semantically informative.
        
        Args:
            bio_text: Profile bio text
            posts_text: List of post texts  
            following_bios: List of following bio texts
            
        Returns:
            bool: True if at least one source is semantically informative, False otherwise
        """
        if bio_text == "INSUFFICIENT_DATA":
            self.processing_stats['insufficient_profiles'] += 1
            return False
        
        # Check each source individually for informativeness
        sources_informative = []
        
        # Check bio
        if bio_text and bio_text.strip():
            bio_informative = (
                self.text_cleaner and
                self.text_cleaner.is_semantically_informative(bio_text, min_words=3)
            )
            sources_informative.append(bio_informative)
        else:
            sources_informative.append(False)
        
        # Check posts (combine first)
        posts_informative = False
        if posts_text:
            valid_posts = [post for post in posts_text if post and post.strip()]
            if valid_posts:
                combined_posts = " ".join(valid_posts)
                posts_informative = (
                    len(combined_posts) > 20 and
                    self.text_cleaner and
                    self.text_cleaner.is_semantically_informative(combined_posts, min_words=5)
                )
        sources_informative.append(posts_informative)
        
        # Check following bios (combine first)
        following_informative = False
        if following_bios:
            valid_following = [bio for bio in following_bios if bio and bio.strip()]
            if valid_following:
                combined_following = " ".join(valid_following)
                following_informative = (
                    len(combined_following) > 15 and
                    self.text_cleaner and
                    self.text_cleaner.is_semantically_informative(combined_following, min_words=4)
                )
        sources_informative.append(following_informative)
        
        # At least one source must be semantically informative
        if not any(sources_informative):
            self.processing_stats['insufficient_profiles'] += 1
            return False
        
        return True
    
    async def enrich_profile(self, profile: ProfileView) -> Dict[str, Any]:
        """
        Enrich a profile with additional metadata and information.
        
        Args:
            profile: ProfileView object to enrich
            
        Returns:
            Dict containing enriched profile data: posts, bio, following_bio
        """
        try:
            enriched_data = {
                'handle': profile.get('handle', ''),
                'display_name': profile.get('displayName', profile.get('display_name', '')),
                'description': profile.get('description', ''),
                'followers_count': profile.get('followersCount', profile.get('followers_count', 0)),
                'follows_count': profile.get('followsCount', profile.get('follows_count', 0)),
                'posts_count': profile.get('postsCount', profile.get('posts_count', 0)),
                'did': profile.get('did', ''),
                'avatar': profile.get('avatar', ''),
                'banner': profile.get('banner', ''),
                'created_at': profile.get('createdAt', profile.get('created_at', None)),
                'labels': profile.get('labels', []),
                'viewer': profile.get('viewer', None),
                'associated': profile.get('associated', None),
                'indexed_at': profile.get('indexedAt', profile.get('indexed_at', None)),
                'additional_posts': [],
                'following_bios': []
            }
            
            # Fetch additional posts and following bios concurrently with timeout if account service is available
            if self.account_service and self.authenticated:
                
                # Create async task for fetching posts with timeout
                async def fetch_posts():
                    try:
                        # Add timeout to prevent hanging
                        author_feed = await asyncio.wait_for(
                            asyncio.get_event_loop().run_in_executor(
                                None, 
                                lambda: self.account_service.get_author_feed(profile['did'], limit=10)
                            ),
                            timeout=10.0  # 10 second timeout
                        )
                        posts_text = []
                        for feed_item in author_feed[:5]:  # Limit to 5 most recent posts
                            if hasattr(feed_item, 'post') and hasattr(feed_item.post, 'record'):
                                post_text = getattr(feed_item.post.record, 'text', '')
                                if post_text and len(post_text.strip()) > 10:
                                    posts_text.append(post_text[:200])  # Limit text length for speed
                        return posts_text
                    except asyncio.TimeoutError:
                        self.logger.warning(f"Timeout fetching posts for {profile.get('handle', 'unknown')}")
                        return []
                    except Exception as e:
                        self.logger.debug(f"Could not fetch additional posts for {profile.get('handle', 'unknown')}: {e}")
                        return []
                
                # Create async task for fetching following bios with timeout
                async def fetch_following():
                    try:
                        # Add timeout to prevent hanging
                        following = await asyncio.wait_for(
                            asyncio.get_event_loop().run_in_executor(
                                None,
                                lambda: self.account_service.get_following(profile['did'])
                            ),
                            timeout=8.0  # 8 second timeout
                        )
                        following_bios = []
                        for follow in following[:10]:  # Limit to 10 following profiles
                            if isinstance(follow, dict) and follow.get('description'):
                                desc = follow['description']
                                if len(desc.strip()) > 10:
                                    following_bios.append(desc[:150])  # Limit text length
                            elif hasattr(follow, 'description') and follow.description:
                                if len(follow.description.strip()) > 10:
                                    following_bios.append(follow.description[:150])
                        return following_bios
                    except asyncio.TimeoutError:
                        self.logger.warning(f"Timeout fetching following for {profile.get('handle', 'unknown')}")
                        return []
                    except Exception as e:
                        self.logger.debug(f"Could not fetch following bios for {profile.get('handle', 'unknown')}: {e}")
                        return []
                
                # Execute both tasks concurrently with overall timeout
                try:
                    posts_text, following_bios = await asyncio.wait_for(
                        asyncio.gather(fetch_posts(), fetch_following()),
                        timeout=15.0  # Overall 15 second timeout for both operations
                    )
                    
                    enriched_data['additional_posts'] = posts_text
                    enriched_data['following_bios'] = following_bios
                except asyncio.TimeoutError:
                    self.logger.warning(f"Overall timeout enriching profile {profile.get('handle', 'unknown')}")
                    # Use empty lists as fallback
                    enriched_data['additional_posts'] = []
                    enriched_data['following_bios'] = []
            
            return enriched_data
        except Exception as e:
            self.logger.error(f"Error enriching profile {profile.get('handle', 'unknown')}: {e}")
            return self.normalize_profile_data(profile)
    
    async def extract_profile_text(self, profile: ProfileView) -> Tuple[str, List[str], List[str]]:
        """
        Extract meaningful text content from a profile for embedding generation with intelligent filtering.
        
        Uses cosine similarity to filter relevant posts and following bios based on the main bio.
        
        Args:
            profile: ProfileView object to extract text from
            
        Returns:
            Tuple containing:
                - Cleaned profile bio text (or "INSUFFICIENT_DATA" if empty)
                - List of relevant posts text
                - List of relevant following bios text
        """
        try:
            # Extract and clean bio text
            bio_text = ""
            if 'description' in profile and profile['description']:
                bio_text = profile['description']
            elif 'displayName' in profile and profile['displayName']:
                bio_text = profile['displayName']
            elif 'display_name' in profile and profile['display_name']:
                bio_text = profile['display_name']
            
            # Clean bio text
            if bio_text and self.text_cleaner:
                bio_text = self.text_cleaner.clean(bio_text)
            
            # Check if bio is informative
            has_informative_bio = bio_text and self.text_cleaner.is_semantically_informative(bio_text)
            if has_informative_bio:
                self.processing_stats['profiles_with_bio'] += 1
            
            # Extract posts and following bios
            posts_text = []
            following_bios = []
            
            if self.account_service and self.authenticated:
                # Fetch posts and following bios concurrently
                async def fetch_posts():
                    try:
                        author_feed = await asyncio.get_event_loop().run_in_executor(
                            None,
                            lambda: self.account_service.get_author_feed(profile['did'], limit=50)
                        )
                        posts = []
                        for feed_item in author_feed[:10]:  # Increased to 10 most recent posts
                            if hasattr(feed_item, 'post') and hasattr(feed_item.post, 'record'):
                                post_text = getattr(feed_item.post.record, 'text', '')
                                if post_text and self.text_cleaner:
                                    cleaned_post = self.text_cleaner.clean(post_text)
                                    if cleaned_post:
                                        posts.append(cleaned_post)
                        return posts
                    except Exception as e:
                        self.logger.warning(f"Could not fetch posts for {profile.get('handle', 'unknown')}: {e}")
                        return []
                
                async def fetch_following_bios():
                    try:
                        following = await asyncio.get_event_loop().run_in_executor(
                            None,
                            lambda: self.account_service.get_following(profile['did'])
                        )
                        bios = []
                        for follow in following[:50]:  # Increased to 50 following profiles
                            if isinstance(follow, dict) and follow.get('description'):
                                following_bio = follow['description']
                                if self.text_cleaner:
                                    cleaned_bio = self.text_cleaner.clean(following_bio)
                                    if cleaned_bio:
                                        bios.append(cleaned_bio)
                            elif hasattr(follow, 'description') and follow.description:
                                following_bio = follow.description
                                if self.text_cleaner:
                                    cleaned_bio = self.text_cleaner.clean(following_bio)
                                    if cleaned_bio:
                                        bios.append(cleaned_bio)
                        return bios
                    except Exception as e:
                        self.logger.warning(f"Could not fetch following bios for {profile.get('handle', 'unknown')}: {e}")
                        return []
                
                # Execute both tasks concurrently
                posts_task = fetch_posts()
                following_task = fetch_following_bios()
                
                all_posts, all_following_bios = await asyncio.gather(posts_task, following_task)
                
                # Update statistics
                if all_posts:
                    self.processing_stats['profiles_with_posts'] += 1
                if all_following_bios:
                    self.processing_stats['profiles_with_following'] += 1
                
                # Filter posts and following bios based on relevance to bio
                if has_informative_bio:
                    # Use cosine similarity to filter relevant content if method available
                    if hasattr(self.text_cleaner, 'filter_relevant_texts'):
                        relevant_posts = self.text_cleaner.filter_relevant_texts(
                            bio_text, all_posts, max_texts=3, threshold=0.65
                        )
                        relevant_following = self.text_cleaner.filter_relevant_texts(
                            bio_text, all_following_bios, max_texts=2, threshold=0.65
                        )
                    else:
                        # Fallback to basic filtering if method not available
                        self.logger.warning("filter_relevant_texts method not available, using basic filtering")
                        relevant_posts = all_posts[:3]  # Take first 3 posts
                        relevant_following = all_following_bios[:2]  # Take first 2 following bios
                    
                    posts_text = relevant_posts
                    following_bios = relevant_following
                    
                    # Update filtering stats
                    self.processing_stats['filtered_posts'] += len(all_posts) - len(relevant_posts)
                    self.processing_stats['filtered_following_bios'] += len(all_following_bios) - len(relevant_following)
                    
                else:
                    # No informative bio - use fallback strategy
                    # Find the two most similar posts to each other (likely to be coherent)
                    if len(all_posts) >= 2:
                        best_posts = []
                        max_similarity = 0.0
                        
                        for i, post1 in enumerate(all_posts[:5]):  # Check first 5 posts
                            for j, post2 in enumerate(all_posts[i+1:6], i+1):
                                if hasattr(self.text_cleaner, 'compute_cosine_similarity'):
                                    similarity = self.text_cleaner.compute_cosine_similarity(post1, post2)
                                else:
                                    # Fallback: simple text overlap similarity
                                    words1 = set(post1.lower().split())
                                    words2 = set(post2.lower().split())
                                    similarity = len(words1.intersection(words2)) / len(words1.union(words2)) if words1.union(words2) else 0
                                
                                if similarity > max_similarity:
                                    max_similarity = similarity
                                    best_posts = [post1, post2]
                        
                        if max_similarity > 0.2:  # Lower threshold for fallback
                            posts_text = best_posts
                            bio_text = f"Based on posts: {' '.join(best_posts[:100])}"  # Use posts as bio
                        else:
                            posts_text = all_posts[:2]  # Just take first 2 posts
                    else:
                        posts_text = all_posts
                    
                    # Don't use following bios if no informative bio
                    following_bios = []
            
            # Handle completely empty profiles
            if not bio_text and not posts_text and not following_bios:
                self.logger.debug(f"Profile {profile.get('handle', 'unknown')} has no extractable content")
                return "INSUFFICIENT_DATA", [], []
            
            # Ensure we have at least some content
            if not bio_text and posts_text:
                bio_text = " ".join(posts_text[:2])  # Use posts as bio substitute
                posts_text = []  # Avoid duplication
            
            return bio_text, posts_text, following_bios
            
        except Exception as e:
            self.logger.error(f"Error extracting text from profile {profile.get('handle', 'unknown')}: {e}")
            # Enhanced fallback
            fallback_text = profile.get('description', '') or profile.get('displayName', '') or profile.get('display_name', '')
            if fallback_text and self.text_cleaner:
                cleaned_fallback = self.text_cleaner.clean(fallback_text)
                if cleaned_fallback and self.text_cleaner.is_semantically_informative(cleaned_fallback):
                    return cleaned_fallback, [], []
            
            return "INSUFFICIENT_DATA", [], []
    
    async def batch_generate_embeddings_async(self, processed_profiles: List[Dict]) -> List[List[float]]:
        """
        Generate embeddings asynchronously for multiple profiles in optimized batches.
        
        Args:
            processed_profiles: List of processed profile dictionaries with text sources
            
        Returns:
            List[List[float]]: List of embedding vectors
        """
        try:
            if not processed_profiles:
                return []
            
            self.logger.info(f"Generating embeddings for {len(processed_profiles)} profiles asynchronously...")
            
            # Process embeddings in parallel using asyncio
            embedding_tasks = []
            
            async def generate_single_embedding(profile_sources):
                """Generate embedding for a single profile asynchronously."""
                try:
                    # Run the CPU-intensive embedding generation in a thread pool
                    loop = asyncio.get_event_loop()
                    embedding = await loop.run_in_executor(
                        None,  # Use default thread pool
                        self.encode_profile_sources,
                        profile_sources['bio_text'],
                        profile_sources['posts_text'],
                        profile_sources['following_bios']
                    )
                    return embedding
                except Exception as e:
                    self.logger.error(f"Error generating single embedding: {e}")
                    return []
            
            # Create tasks for all profiles
            embedding_tasks = [generate_single_embedding(profile) for profile in processed_profiles]
            
            # Execute all embedding generation tasks concurrently
            embeddings = await asyncio.gather(*embedding_tasks, return_exceptions=True)
            
            # Handle exceptions and ensure we have a valid list
            final_embeddings = []
            for i, embedding in enumerate(embeddings):
                if isinstance(embedding, Exception):
                    self.logger.error(f"Exception generating embedding for profile {i}: {embedding}")
                    final_embeddings.append([])
                else:
                    final_embeddings.append(embedding)
            
            self.logger.info(f"✅ Generated {len([e for e in final_embeddings if e])} valid embeddings")
            return final_embeddings
            
        except Exception as e:
            self.logger.error(f"Error in batch embedding generation: {e}")
            return [[]] * len(processed_profiles)

    def batch_generate_embeddings(self, profile_texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple profiles in batch for efficiency.
        Handles filtered content including "INSUFFICIENT_DATA" markers.
        
        Args:
            profile_texts: List of profile text strings
            
        Returns:
            List[List[float]]: List of embedding vectors (empty list for insufficient data)
        """
        try:
            if not profile_texts:
                return []
            
            # Filter out empty texts and INSUFFICIENT_DATA markers
            valid_texts = []
            text_indices = []  # Track which texts are valid for mapping back
            
            for i, text in enumerate(profile_texts):
                if text and text.strip() and text != "INSUFFICIENT_DATA":
                    valid_texts.append(text.strip())
                    text_indices.append(i)
            
            if not valid_texts:
                self.logger.warning("No valid texts found for embedding generation")
                return [[]] * len(profile_texts)
            
            # Generate embeddings using the embedding model
            embeddings_result = [[]] * len(profile_texts)  # Initialize with empty embeddings
            
            if self.embedding_model:
                valid_embeddings = self.embedding_model.encode(valid_texts)
                
                # Convert to list if numpy array
                if hasattr(valid_embeddings, 'tolist'):
                    valid_embeddings = valid_embeddings.tolist()
                
                # Map valid embeddings back to original positions
                for j, original_index in enumerate(text_indices):
                    if j < len(valid_embeddings):
                        if self.validate_embedding_quality(valid_embeddings[j]):
                            embeddings_result[original_index] = valid_embeddings[j]
                        else:
                            self.logger.warning(f"Invalid embedding generated for text at position {original_index}")
                            embeddings_result[original_index] = []
                
                return embeddings_result
            else:
                self.logger.warning("No embedding model available")
                return [[]] * len(profile_texts)
                
        except Exception as e:
            self.logger.error(f"Error generating batch embeddings: {e}")
            return [[]] * len(profile_texts)
    
    def get_processing_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive processing statistics including filtering metrics.
        
        Returns:
            Dictionary containing processing statistics and metrics
        """
        stats = self.processing_stats.copy()
        
        # Calculate derived metrics
        if stats['total_processed'] > 0:
            stats['success_rate'] = stats['successfully_processed'] / stats['total_processed']
            stats['empty_profile_rate'] = stats['empty_profiles'] / stats['total_processed']
            stats['semantic_empty_rate'] = stats['semantically_empty'] / stats['total_processed']
            stats['error_rate'] = stats['processing_errors'] / stats['total_processed']
        
        # Text filtering efficiency
        total_posts_fetched = stats['filtered_posts'] + (stats['profiles_with_posts'] * 3)  # Assuming avg 3 kept per profile
        total_following_fetched = stats['filtered_following_bios'] + (stats['profiles_with_following'] * 2)  # Assuming avg 2 kept per profile
        
        if total_posts_fetched > 0:
            stats['posts_filtering_rate'] = stats['filtered_posts'] / total_posts_fetched
        
        if total_following_fetched > 0:
            stats['following_filtering_rate'] = stats['filtered_following_bios'] / total_following_fetched
        
        # Quality metrics
        stats['profiles_with_complete_data'] = stats['profiles_with_bio'] + stats['profiles_with_posts'] + stats['profiles_with_following']
        
        # Weighted encoding statistics
        stats['source_weights_config'] = self.source_weights
        
        return stats
    
    def reset_processing_statistics(self):
        """Reset all processing statistics to start fresh."""
        self.processing_stats = {
            'total_processed': 0,
            'successfully_processed': 0,
            'empty_profiles': 0,
            'semantically_empty': 0,
            'too_short': 0,
            'processing_errors': 0,
            'profiles_with_bio': 0,
            'profiles_with_posts': 0,
            'profiles_with_following': 0,
            'filtered_posts': 0,
            'filtered_following_bios': 0,
            'insufficient_profiles': 0,
            'bio_only_profiles': 0,
            'posts_only_profiles': 0,
            'following_only_profiles': 0,
            'bio_posts_combined': 0,
            'noise_profiles': 0
        }
    
    def normalize_profile_data(self, profile: ProfileView) -> Dict[str, Any]:
        """
        Normalize profile data into a consistent format.
        
        Args:
            profile: ProfileView object to normalize
            
        Returns:
            Dict[str, Any]: Normalized profile data
        """
        try:
            return {
                'handle': getattr(profile, 'handle', ''),
                'display_name': getattr(profile, 'display_name', ''),
                'description': getattr(profile, 'description', ''),
                'followers_count': getattr(profile, 'followers_count', 0),
                'follows_count': getattr(profile, 'follows_count', 0),
                'posts_count': getattr(profile, 'posts_count', 0),
                'did': getattr(profile, 'did', ''),
                'avatar': getattr(profile, 'avatar', ''),
                'banner': getattr(profile, 'banner', ''),
                'created_at': getattr(profile, 'created_at', None),
                'labels': getattr(profile, 'labels', []),
                'viewer': getattr(profile, 'viewer', None),
                'associated': getattr(profile, 'associated', None),
                'indexed_at': getattr(profile, 'indexed_at', None)
            }
        except Exception as e:
            self.logger.error(f"Error normalizing profile data: {e}")
            return {
                'handle': str(profile) if profile else '',
                'display_name': '',
                'description': '',
                'followers_count': 0,
                'follows_count': 0,
                'posts_count': 0,
                'did': '',
                'avatar': '',
                'banner': '',
                'created_at': None,
                'labels': [],
                'viewer': None,
                'associated': None,
                'indexed_at': None
            }
    
    def deduplicate_profiles(self, profiles: List[ProfileView]) -> List[ProfileView]:
        """
        Remove duplicate profiles from a list.
        
        Args:
            profiles: List of profiles that may contain duplicates
            
        Returns:
            List[ProfileView]: Deduplicated list of profiles
        """
        try:
            seen_handles = set()
            seen_dids = set()
            unique_profiles = []
            
            for profile in profiles:
                handle = getattr(profile, 'handle', '')
                did = getattr(profile, 'did', '')
                
                # Use DID as primary identifier, fallback to handle
                identifier = did if did else handle
                
                if identifier and identifier not in seen_dids and identifier not in seen_handles:
                    if did:
                        seen_dids.add(did)
                    if handle:
                        seen_handles.add(handle)
                    unique_profiles.append(profile)
                    
            self.logger.info(f"Deduplicated {len(profiles)} profiles to {len(unique_profiles)}")
            return unique_profiles
            
        except Exception as e:
            self.logger.error(f"Error deduplicating profiles: {e}")
            return profiles
    
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
