"""
Tag generation service for creating natural language tags from keyword clusters.
Responsible for generating meaningful, human-readable tags from semantic keyword groups.
"""

import logging
from typing import List, Tuple, Optional, Dict, Any, Set
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.infrastructure import MemoryManager

# Import libraries for advanced filtering
try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

try:
    from nltk.corpus import stopwords
    import nltk
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False


class TagGeneratorService:
    """Service responsible for generating natural language tags from keyword clusters."""
    
    def __init__(self, embedding_model: EmbeddingModel, memory_manager: MemoryManager):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.memory_manager = memory_manager
        
        # Initialize the improved tag generator
        try:
            from ai_service.services.taggers.improved_tag_generator import ImprovedTagGenerator
            self.improved_tag_generator = ImprovedTagGenerator(embedding_model=embedding_model)
            self.logger.info("✅ ImprovedTagGenerator initialized successfully")
        except Exception as e:
            self.logger.warning(f"Failed to initialize ImprovedTagGenerator: {e}")
            self.improved_tag_generator = None
        
        # Initialize NLP tools for filtering
        self._init_nlp_tools()
        
        # Initialize stoplists and whitelists
        self._init_filter_lists()
        
        self.logger.info("🔄 TagGeneratorService initialized")
    
    def _init_nlp_tools(self):
        """Initialize NLP tools for POS tagging and linguistic analysis."""
        try:
            if SPACY_AVAILABLE:
                try:
                    self.nlp = spacy.load("en_core_web_sm")
                    self.logger.info("✅ SpaCy model loaded for POS tagging")
                except OSError:
                    self.logger.warning("⚠️ SpaCy en_core_web_sm model not found, installing...")
                    import subprocess
                    subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
                    self.nlp = spacy.load("en_core_web_sm")
                    self.logger.info("✅ SpaCy model installed and loaded")
            else:
                self.nlp = None
                self.logger.warning("⚠️ SpaCy not available, POS filtering disabled")
        except Exception as e:
            self.nlp = None
            self.logger.warning(f"⚠️ Failed to initialize SpaCy: {e}")
    
    def _init_filter_lists(self):
        """Initialize stoplist and whitelist for tag filtering."""
        try:
            # Extended stoplist for low-quality tags
            self.stoplist = {
                # Generic terms
                'big', 'small', 'new', 'old', 'good', 'bad', 'nice', 'cool', 'hot', 'cold',
                'red', 'blue', 'green', 'black', 'white', 'yellow', 'orange', 'purple',
                'pro', 'anti', 'super', 'mega', 'ultra', 'mini', 'micro', 'macro',
                'very', 'much', 'many', 'some', 'all', 'every', 'any', 'no', 'none',
                # Common words
                'user', 'users', 'people', 'person', 'human', 'humans', 'man', 'woman',
                'thing', 'things', 'stuff', 'item', 'items', 'object', 'objects',
                'make', 'do', 'go', 'get', 'take', 'give', 'put', 'see', 'look',
                'time', 'day', 'year', 'month', 'week', 'hour', 'minute', 'second',
                'way', 'ways', 'method', 'methods', 'type', 'types', 'kind', 'kinds',
                # Filler words
                'like', 'just', 'really', 'actually', 'basically', 'literally',
                'probably', 'maybe', 'perhaps', 'possibly', 'definitely',
                # Pronouns and articles
                'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
                'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'ours', 'theirs',
                'the', 'a', 'an', 'this', 'that', 'these', 'those'
            }
            
            # Add NLTK stopwords if available
            if NLTK_AVAILABLE:
                try:
                    nltk_stopwords = set(stopwords.words('english'))
                    self.stoplist.update(nltk_stopwords)
                    self.logger.info("✅ NLTK stopwords loaded")
                except:
                    self.logger.warning("⚠️ NLTK stopwords not available")
            
            # Professional/domain whitelist
            self.domain_whitelist = {
                # Technology
                'developer', 'engineer', 'programmer', 'coder', 'architect', 'devops',
                'frontend', 'backend', 'fullstack', 'software', 'hardware', 'tech',
                'javascript', 'python', 'java', 'react', 'node', 'cloud', 'ai', 'ml',
                # Business
                'entrepreneur', 'founder', 'ceo', 'cto', 'manager', 'consultant',
                'startup', 'business', 'marketing', 'sales', 'finance', 'strategy',
                'product', 'design', 'ux', 'ui', 'branding', 'digital',
                # Creative
                'artist', 'designer', 'creative', 'photographer', 'writer', 'author',
                'musician', 'filmmaker', 'animator', 'illustrator', 'graphic',
                # Academic/Research
                'researcher', 'scientist', 'professor', 'academic', 'student',
                'phd', 'doctor', 'analyst', 'data', 'research', 'science',
                # Professional roles
                'lawyer', 'doctor', 'teacher', 'nurse', 'journalist', 'editor',
                'chef', 'architect', 'realtor', 'broker', 'agent', 'specialist'
            }
            
            self.logger.info(f"✅ Filter lists initialized: {len(self.stoplist)} stopwords, {len(self.domain_whitelist)} domain terms")
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to initialize filter lists: {e}")
            self.stoplist = set()
            self.domain_whitelist = set()
    
    def calculate_semantic_representativity(self, tag: str, cluster_texts: List[str], 
                                          keyword_cluster: List[Tuple[str, float]]) -> Dict[str, float]:
        """
        Calculate how well a tag represents the semantic content of a cluster.
        
        Args:
            tag: Tag to evaluate
            cluster_texts: Profile descriptions/texts from the cluster
            keyword_cluster: Original keywords with scores
            
        Returns:
            Dictionary with semantic representativity scores
        """
        try:
            if not cluster_texts or not self.embedding_model:
                return {'embedding_similarity': 0.0, 'lexical_coverage': 0.0, 'keyword_relevance': 0.0, 'final_score': 0.0}
            
            # 1. Embedding similarity (tag vs cluster centroid)
            tag_embedding = self.embedding_model.encode([tag.lower().strip()])[0]
            cluster_embeddings = self.embedding_model.encode(cluster_texts)
            
            # Calculate cluster centroid
            import numpy as np
            if hasattr(cluster_embeddings, 'tolist'):
                cluster_embeddings = np.array(cluster_embeddings)
            
            cluster_centroid = np.mean(cluster_embeddings, axis=0)
            
            # Normalize vectors
            tag_norm = tag_embedding / np.linalg.norm(tag_embedding)
            centroid_norm = cluster_centroid / np.linalg.norm(cluster_centroid)
            
            # Cosine similarity
            embedding_similarity = float(np.dot(tag_norm, centroid_norm))
            embedding_similarity = max(0.0, embedding_similarity)  # Ensure non-negative
            
            # 2. Lexical coverage (how many profiles contain the tag or similar words)
            tag_words = set(tag.lower().replace('_', ' ').split())
            coverage_count = 0
            
            for text in cluster_texts:
                text_words = set(text.lower().split())
                # Check for exact matches or substring matches
                if any(tag_word in text_words or any(tag_word in text_word for text_word in text_words) 
                       for tag_word in tag_words):
                    coverage_count += 1
            
            lexical_coverage = coverage_count / len(cluster_texts)
            
            # 3. Keyword relevance (how closely tag relates to top keywords)
            keyword_relevance = 0.0
            if keyword_cluster:
                top_keywords = [kw.lower() for kw, _ in keyword_cluster[:5]]
                tag_words_lower = [w.lower() for w in tag_words]
                
                matches = sum(1 for tag_word in tag_words_lower 
                             if any(tag_word in kw or kw in tag_word for kw in top_keywords))
                keyword_relevance = matches / len(tag_words) if tag_words else 0.0
            
            # 4. Final weighted score
            final_score = (
                0.5 * embedding_similarity +  # 50% embedding similarity
                0.3 * lexical_coverage +       # 30% lexical coverage
                0.2 * keyword_relevance        # 20% keyword relevance
            )
            
            return {
                'embedding_similarity': embedding_similarity,
                'lexical_coverage': lexical_coverage,
                'keyword_relevance': keyword_relevance,
                'final_score': final_score
            }
            
        except Exception as e:
            self.logger.debug(f"Error calculating semantic representativity: {e}")
            return {'embedding_similarity': 0.0, 'lexical_coverage': 0.0, 'keyword_relevance': 0.0, 'final_score': 0.0}

    def is_semantically_specific(self, tag: str, whitelist: Optional[Set[str]] = None) -> bool:
        """
        Check if a tag is semantically specific to a domain or community.
        Now uses whitelist as bonus only, not as blocking filter.
        
        Args:
            tag: Tag to evaluate
            whitelist: Optional custom whitelist of specific terms
            
        Returns:
            True if tag appears to be domain-specific (bonus only)
        """
        try:
            tag_lower = tag.lower().strip()
            
            # Use custom whitelist if provided
            if whitelist:
                return any(term in tag_lower for term in whitelist)
            
            # Check against domain whitelist (bonus, not blocking)
            if any(term in tag_lower for term in self.domain_whitelist):
                return True
            
            # Heuristic patterns (also bonus, not blocking)
            specific_patterns = [
                'dev', 'tech', 'pro', 'expert', 'specialist', 'engineer', 'architect',
                'designer', 'creator', 'founder', 'entrepreneur', 'consultant',
                'researcher', 'analyst', 'scientist', 'writer', 'artist'
            ]
            
            return any(pattern in tag_lower for pattern in specific_patterns)
            
        except Exception as e:
            self.logger.debug(f"Error checking semantic specificity: {e}")
            return False
    
    def is_frequent_tag(self, tag: str, all_tags: List[str], max_ratio: float = 0.15) -> bool:
        """
        Check if a tag appears too frequently across all clusters.
        
        Args:
            tag: Tag to check
            all_tags: List of all tags generated for the cohort
            max_ratio: Maximum allowed frequency ratio
            
        Returns:
            True if tag is too frequent (should be filtered out)
        """
        try:
            if not all_tags:
                return False
            
            tag_lower = tag.lower().strip()
            count = sum(1 for t in all_tags if t.lower().strip() == tag_lower)
            frequency_ratio = count / len(all_tags)
            
            return frequency_ratio > max_ratio
            
        except Exception as e:
            self.logger.debug(f"Error checking tag frequency: {e}")
            return False
    
    def is_noun(self, tag: str) -> bool:
        """
        Check if a tag is primarily composed of nouns.
        
        Args:
            tag: Tag to analyze
            
        Returns:
            True if tag contains primarily nouns
        """
        try:
            if not self.nlp:
                # Fallback heuristic without SpaCy
                return self._is_noun_heuristic(tag)
            
            doc = self.nlp(tag)
            noun_count = 0
            total_words = 0
            
            for token in doc:
                if token.is_alpha:  # Skip punctuation
                    total_words += 1
                    if token.pos_ in ['NOUN', 'PROPN']:  # Noun or proper noun
                        noun_count += 1
            
            if total_words == 0:
                return False
            
            # Tag is good if >50% of words are nouns
            return (noun_count / total_words) >= 0.5
            
        except Exception as e:
            self.logger.debug(f"Error checking POS for tag '{tag}': {e}")
            return self._is_noun_heuristic(tag)
    
    def _is_noun_heuristic(self, tag: str) -> bool:
        """Heuristic noun detection when SpaCy is not available."""
        try:
            tag_lower = tag.lower().strip()
            
            # Common verb patterns to avoid
            verb_patterns = ['ing', 'ed', 'er', 'est']
            if any(tag_lower.endswith(pattern) for pattern in verb_patterns):
                return False
            
            # Common adjective patterns to avoid
            adj_patterns = ['ly', 'ful', 'less', 'ish', 'ous', 'ive']
            if any(tag_lower.endswith(pattern) for pattern in adj_patterns):
                return False
            
            # If it's in our domain whitelist, it's likely a good noun
            if any(term in tag_lower for term in self.domain_whitelist):
                return True
            
            # Default to True for simple cases
            return True
            
        except Exception as e:
            self.logger.debug(f"Error in noun heuristic: {e}")
            return True
    
    def validate_tag_quality(self, tag: str, keyword_cluster: List[Tuple[str, float]], 
                           all_tags: List[str], cluster_texts: Optional[List[str]] = None,
                           min_score: float = 0.3) -> Dict[str, Any]:
        """
        Comprehensive tag quality validation with semantic representativity.
        
        Args:
            tag: Tag to validate
            keyword_cluster: Original keyword cluster with scores
            all_tags: All tags generated for frequency analysis
            cluster_texts: Profile descriptions for semantic validation
            min_score: Minimum KeyBERT score threshold
            
        Returns:
            Dictionary with validation results and quality score
        """
        try:
            issues = []
            score = 0.0
            
            # 1. Length and form validation (0-0.1)
            if len(tag) >= 3:
                score += 0.05
                if 5 <= len(tag) <= 25:
                    score += 0.05
            else:
                issues.append(f"Tag too short ({len(tag)} chars)")
            
            # 2. Stoplist check (0-0.1)
            tag_words = tag.lower().replace('_', ' ').split()
            if not any(word in self.stoplist for word in tag_words):
                score += 0.1
            else:
                issues.append("Contains stopwords")
            
            # 3. POS filtering (0-0.1)
            if self.is_noun(tag):
                score += 0.1
            else:
                issues.append("Not primarily composed of nouns")
            
            # 4. SEMANTIC REPRESENTATIVITY (0-0.5) - Main criterion
            semantic_scores = {'embedding_similarity': 0.0, 'lexical_coverage': 0.0, 'keyword_relevance': 0.0, 'final_score': 0.0}
            if cluster_texts:
                semantic_scores = self.calculate_semantic_representativity(tag, cluster_texts, keyword_cluster)
                semantic_score = semantic_scores['final_score']
                
                if semantic_score >= 0.7:
                    score += 0.5
                elif semantic_score >= 0.5:
                    score += 0.3
                elif semantic_score >= 0.3:
                    score += 0.15
                else:
                    issues.append(f"Low semantic representativity ({semantic_score:.2f})")
            else:
                issues.append("No cluster texts provided for semantic validation")
            
            # 5. Domain specificity BONUS (0-0.1) - No longer blocking
            if self.is_semantically_specific(tag):
                score += 0.1
            
            # 6. Frequency check (0-0.1)
            if not self.is_frequent_tag(tag, all_tags):
                score += 0.1
            else:
                issues.append("Too frequent across clusters")
            
            # 7. Keyword relevance bonus (0-0.1)
            if keyword_cluster:
                keyword_words = [kw.lower() for kw, score_val in keyword_cluster[:5]]
                tag_word_found = any(
                    any(tag_word in kw or kw in tag_word for kw in keyword_words)
                    for tag_word in tag_words
                )
                if tag_word_found:
                    score += 0.05
                    # Bonus for high-scoring keywords
                    top_scores = [score_val for _, score_val in keyword_cluster[:3]]
                    if top_scores and max(top_scores) > min_score:
                        score += 0.05
                else:
                    issues.append("Tag words not found in top keywords")
            
            # Quality classification: much higher threshold for semantic representativity
            is_high_quality = (
                score >= 0.7 and 
                len(issues) <= 2 and 
                semantic_scores['final_score'] >= 0.5  # Must be semantically representative
            )
            
            return {
                'tag': tag,
                'quality_score': min(score, 1.0),
                'issues': issues,
                'is_high_quality': is_high_quality,
                'semantic_scores': semantic_scores,
                'filters_passed': {
                    'length': len(tag) >= 3,
                    'stoplist': not any(word in self.stoplist for word in tag_words),
                    'pos': self.is_noun(tag),
                    'semantic_representativity': semantic_scores['final_score'] >= 0.3,
                    'domain_specificity': self.is_semantically_specific(tag),
                    'frequency': not self.is_frequent_tag(tag, all_tags),
                    'keyword_relevance': any(
                        any(tag_word in kw or kw in tag_word 
                            for kw, _ in keyword_cluster[:5])
                        for tag_word in tag_words
                    ) if keyword_cluster else False
                }
            }
            
        except Exception as e:
            self.logger.warning(f"Error validating tag quality: {e}")
            return {
                'tag': tag,
                'quality_score': 0.0,
                'issues': ['Validation error'],
                'is_high_quality': False,
                'semantic_scores': {'embedding_similarity': 0.0, 'lexical_coverage': 0.0, 'keyword_relevance': 0.0, 'final_score': 0.0},
                'filters_passed': {}
            }
    
    def generate_and_filter_tags(self, keyword_cluster: List[Tuple[str, float]], 
                               cluster_texts: Optional[List[str]] = None,
                               all_tags: List[str] = None) -> Dict[str, Any]:
        """
        Main pipeline: Generate tag candidates and apply all quality filters.
        
        Args:
            keyword_cluster: List of (keyword, score) tuples
            cluster_texts: Optional profile descriptions/texts from the cluster for semantic validation
            all_tags: All tags generated so far (for frequency filtering)
            
        Returns:
            Dictionary with best tag and comprehensive diagnostics
        """
        try:
            if not keyword_cluster:
                return self._create_fallback_result("No keywords provided")
            
            if all_tags is None:
                all_tags = []
            
            self.logger.debug(f"🔄 Generating and filtering tags from {len(keyword_cluster)} keywords")
            
            # Step 1: Generate tag candidates
            candidates = self._generate_tag_candidates(keyword_cluster, cluster_texts)
            
            if not candidates:
                return self._create_fallback_result("No candidates generated")
            
            # Step 2: Validate and score each candidate
            validated_candidates = []
            for candidate in candidates:
                validation = self.validate_tag_quality(candidate, keyword_cluster, all_tags, cluster_texts)
                validated_candidates.append(validation)
            
            # Step 3: Sort by quality score
            validated_candidates.sort(key=lambda x: x['quality_score'], reverse=True)
            
            # Step 4: Select best high-quality tag or fallback
            best_candidate = validated_candidates[0] if validated_candidates else None
            
            if best_candidate and best_candidate['is_high_quality']:
                result = {
                    'tag': best_candidate['tag'],
                    'quality_score': best_candidate['quality_score'],
                    'issues': best_candidate['issues'],
                    'is_high_quality': True,
                    'generation_method': 'filtered_pipeline',
                    'candidates_evaluated': len(validated_candidates),
                    'filters_passed': best_candidate['filters_passed']
                }
            else:
                # Fallback to best available or default
                fallback_tag = best_candidate['tag'] if best_candidate else 'Community'
                result = {
                    'tag': fallback_tag,
                    'quality_score': best_candidate['quality_score'] if best_candidate else 0.3,
                    'issues': best_candidate['issues'] if best_candidate else ['Low quality candidates'],
                    'is_high_quality': False,
                    'generation_method': 'fallback',
                    'candidates_evaluated': len(validated_candidates),
                    'filters_passed': best_candidate['filters_passed'] if best_candidate else {}
                }
            
            self.logger.debug(f"✅ Selected tag: '{result['tag']}' (quality: {result['quality_score']:.2f})")
            return result
            
        except Exception as e:
            self.logger.warning(f"Error in tag generation pipeline: {e}")
            return self._create_fallback_result(f"Pipeline error: {e}")
    
    def _generate_tag_candidates(self, keyword_cluster: List[Tuple[str, float]], 
                               cluster_texts: Optional[List[str]] = None) -> List[str]:
        """Generate initial tag candidates from keywords."""
        try:
            candidates = []
            
            # Method 1: Use ImprovedTagGenerator if available
            if self.improved_tag_generator:
                try:
                    cluster_embeddings = self._get_cluster_embeddings(cluster_texts)
                    for i in range(min(3, len(keyword_cluster))):
                        subset = keyword_cluster[:i+3]  # Varying subset sizes
                        tag = self.improved_tag_generator.generate_tag_from_keywords(subset, cluster_embeddings)
                        if tag and tag not in candidates:
                            candidates.append(tag.strip())
                except Exception as e:
                    self.logger.debug(f"ImprovedTagGenerator failed: {e}")
            
            # Method 2: Direct keyword usage
            for keyword, score in keyword_cluster[:5]:
                clean_keyword = keyword.strip().title()
                if clean_keyword and clean_keyword not in candidates:
                    candidates.append(clean_keyword)
            
            # Method 3: Simple combinations
            if len(keyword_cluster) >= 2:
                kw1, kw2 = keyword_cluster[0][0].strip().title(), keyword_cluster[1][0].strip().title()
                combinations = [
                    f"{kw1} {kw2}",
                    f"{kw1}_{kw2}",
                    f"{kw1} & {kw2}"
                ]
                for combo in combinations:
                    if combo not in candidates and len(combo) <= 30:
                        candidates.append(combo)
            
            # Remove duplicates and empty candidates
            unique_candidates = []
            seen = set()
            for candidate in candidates:
                if candidate and candidate.strip() and candidate.lower() not in seen:
                    seen.add(candidate.lower())
                    unique_candidates.append(candidate)
            
            return unique_candidates[:10]  # Limit candidates
            
        except Exception as e:
            self.logger.warning(f"Error generating tag candidates: {e}")
            return ['Community']
    
    def _create_fallback_result(self, reason: str) -> Dict[str, Any]:
        """Create fallback result when generation fails."""
        return {
            'tag': 'Community',
            'quality_score': 0.3,
            'issues': [reason],
            'is_high_quality': False,
            'generation_method': 'fallback',
            'candidates_evaluated': 0,
            'filters_passed': {}
        }
    
    def generate_natural_tag_from_semantic_group(self, keyword_cluster: List[Tuple[str, float]], 
                                                profile_context: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Generate natural language tags from semantic keyword groups.
        
        Args:
            keyword_cluster: List of (keyword, score) tuples
            profile_context: Optional profile handles for context
            
        Returns:
            Dictionary with tag candidates and metadata
        """
        try:
            if not keyword_cluster:
                self.logger.warning("Empty keyword cluster, using robust fallback")
                return self._create_fallback_tag_candidates()
            
            self.logger.debug(f"🔄 PHASE 2: Generating up to 40 tag candidates from {len(keyword_cluster)} keywords")
            
            # Generate extensive tag candidates using multiple strategies
            tag_candidates = self._generate_extensive_tag_candidates(keyword_cluster, profile_context)
            
            # Ensure we have candidates - if not, force fallback
            if not tag_candidates:
                self.logger.warning("No tag candidates generated, using robust fallback")
                return self._create_fallback_tag_candidates()
            
            # Score each candidate
            scored_candidates = self._score_tag_candidates(tag_candidates, keyword_cluster, profile_context)
            
            # Ensure we have scored candidates
            if not scored_candidates:
                self.logger.warning("No scored candidates, using robust fallback")
                return self._create_fallback_tag_candidates()
            
            # Select the best candidate as primary
            best_candidate = scored_candidates[0] if scored_candidates else None
            
            # Final validation - ensure tag is meaningful
            if not best_candidate or not best_candidate.get('tag') or best_candidate.get('tag', '').strip() == '':
                self.logger.warning("Invalid best candidate, using robust fallback")
                return self._create_fallback_tag_candidates()
            
            return {
                'tag': best_candidate['tag'],
                'primary_score': best_candidate.get('score', 0.5),
                'candidates': scored_candidates,
                'generation_method': 'keybert_driven_approach',
                'candidate_count': len(scored_candidates)
            }
                
        except Exception as e:
            # Correction : log le type de l'objet qui a causé l'erreur
            import traceback
            self.logger.warning(f"Error generating tag candidates: {e} | Trace: {traceback.format_exc()}")
            # Si l'erreur est liée à 'replace' sur une liste, log le type des entrées
            if 'replace' in str(e):
                self.logger.warning(f"[DEBUG] Type de keyword_cluster: {type(keyword_cluster)} | profile_context: {type(profile_context)}")
                if isinstance(keyword_cluster, list):
                    for idx, item in enumerate(keyword_cluster):
                        self.logger.warning(f"[DEBUG] keyword_cluster[{idx}] type: {type(item)} value: {item}")
                if isinstance(profile_context, list):
                    for idx, item in enumerate(profile_context):
                        self.logger.warning(f"[DEBUG] profile_context[{idx}] type: {type(item)} value: {item}")
            return self._create_fallback_tag_candidates()
    
    def _generate_extensive_tag_candidates(self, keyword_cluster: List[Tuple[str, float]], 
                                          profile_context: Optional[List[str]] = None) -> List[str]:
        """
        PHASE 2: Generate tag candidates using KeyBERT-driven approach with minimal rigid patterns.
        
        Relies primarily on the ImprovedTagGenerator (KeyBERT + centroid analysis) for natural tag generation.
        """
        try:
            candidates = []
            
            if not keyword_cluster:
                return self._get_fallback_candidates()
            
            # Primary approach: Use ImprovedTagGenerator with KeyBERT
            if self.improved_tag_generator:
                try:
                    cluster_embeddings = self._get_cluster_embeddings(profile_context)
                    for i in range(min(5, len(keyword_cluster))):
                        subset_size = min(3 + i, len(keyword_cluster))
                        subset = keyword_cluster[:subset_size]
                        if subset:
                            tag = self.improved_tag_generator.generate_tag_from_keywords(subset, cluster_embeddings)
                            if tag and tag not in candidates:
                                candidates.append(tag)
                except Exception as e:
                    self.logger.debug(f"ImprovedTagGenerator failed: {e}")
            
            # Secondary approach: Use top keywords directly (minimal processing)
            for keyword, score in keyword_cluster[:10]:
                clean_keyword = keyword.strip()
                if clean_keyword and clean_keyword not in candidates:
                    candidates.append(clean_keyword.title())
            
            # Remove duplicates while preserving KeyBERT order
            unique_candidates = []
            seen = set()
            for candidate in candidates:
                if candidate and candidate.strip() and candidate.lower() not in seen:
                    if 2 <= len(candidate) <= 50:
                        seen.add(candidate.lower())
                        unique_candidates.append(candidate)
            
            # Correction : robustifier le traitement de profile_context pour éviter .replace sur une liste
            if len(unique_candidates) < 3:
                if profile_context and len(profile_context) > 0:
                    for handle in profile_context[:3]:
                        if isinstance(handle, list):
                            handle = " ".join(str(h) for h in handle)
                        if not isinstance(handle, str):
                            handle = str(handle)
                        clean_handle = handle.replace('.bsky.social', '').replace('.', ' ')
                        words = clean_handle.split()
                        for word in words:
                            if len(word) > 2 and word.isalpha() and word.title() not in unique_candidates:
                                unique_candidates.append(word.title() + " Community")
                                if len(unique_candidates) >= 5:
                                    break
                        if len(unique_candidates) >= 5:
                            break
                if len(unique_candidates) < 3:
                    fallbacks = self._get_fallback_candidates()
                    for fallback in fallbacks:
                        if fallback not in unique_candidates:
                            unique_candidates.append(fallback)
                            if len(unique_candidates) >= 5:
                                break
            self.logger.debug(f"Generated {len(unique_candidates)} tag candidates using KeyBERT-driven approach")
            return unique_candidates[:40]  # Cap at 40 candidates
            
        except Exception as e:
            self.logger.warning(f"Error generating tag candidates: {e}")
            return self._get_fallback_candidates()
    
    def _score_tag_candidates(self, candidates: List[str], keyword_cluster: List[Tuple[str, float]], 
                            profile_context: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        PHASE 2: Score and rank tag candidates using multiple criteria.
        """
        try:
            scored_candidates = []
            
            for candidate in candidates:
                score = self._calculate_candidate_score(candidate, keyword_cluster, profile_context)
                scored_candidates.append({
                    'tag': candidate,
                    'score': score,
                    'metrics': self._get_candidate_metrics(candidate, keyword_cluster)
                })
            
            # Sort by score (highest first)
            scored_candidates.sort(key=lambda x: x['score'], reverse=True)
            
            return scored_candidates
            
        except Exception as e:
            self.logger.warning(f"Error scoring tag candidates: {e}")
            return [{'tag': candidates[0] if candidates else 'Community', 'score': 0.5, 'metrics': {}}]
    
    def _calculate_candidate_score(self, candidate: str, keyword_cluster: List[Tuple[str, float]], 
                                 profile_context: Optional[List[str]] = None) -> float:
        """Calculate comprehensive score for a tag candidate."""
        try:
            score = 0.0
            
            # Length appropriateness (0-0.2)
            length = len(candidate)
            if 5 <= length <= 25:
                score += 0.2
            elif 3 <= length <= 30:
                score += 0.1
            
            # Keyword relevance (0-0.4)
            if keyword_cluster:
                keywords = [kw.lower() for kw, _ in keyword_cluster[:3]]
                candidate_words = candidate.lower().replace('_', ' ').split()
                
                relevance = sum(1 for word in candidate_words if any(word in kw or kw in word for kw in keywords))
                score += min(relevance / len(candidate_words), 1.0) * 0.4
            
            # Quality indicators (0-0.3)
            if candidate.replace('_', '').replace(' ', '').isalpha():
                score += 0.1
            
            if candidate[0].isupper() and not candidate.isupper():
                score += 0.1
            
            if not any(generic in candidate.lower() for generic in ['general', 'misc', 'other', 'mixed']):
                score += 0.1
            
            # Semantic coherence bonus (0-0.1)
            if profile_context and self.embedding_model:
                try:
                    coherence_bonus = self._calculate_semantic_coherence_bonus(candidate, profile_context)
                    score += coherence_bonus * 0.1
                except Exception:
                    pass
            
            return min(score, 1.0)
            
        except Exception as e:
            self.logger.debug(f"Error calculating candidate score: {e}")
            return 0.5
    
    def _create_fallback_tag_candidates(self) -> Dict[str, Any]:
        """Create extensive fallback tag candidates when generation fails."""
        fallback_candidates = [
            {'tag': 'Community', 'score': 0.5, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'General', 'score': 0.4, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Mixed', 'score': 0.3, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Network', 'score': 0.45, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Group', 'score': 0.42, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Professional', 'score': 0.38, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Enthusiast', 'score': 0.36, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Collective', 'score': 0.34, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Circle', 'score': 0.32, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Hub', 'score': 0.30, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Alliance', 'score': 0.28, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Guild', 'score': 0.26, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Society', 'score': 0.24, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Assembly', 'score': 0.22, 'metrics': {'format_type': 'single_word'}},
            {'tag': 'Federation', 'score': 0.20, 'metrics': {'format_type': 'single_word'}}
        ]
        
        return {
            'tag': 'Community',
            'primary_score': 0.5,
            'candidates': fallback_candidates,
            'generation_method': 'extensive_fallback',
            'candidate_count': len(fallback_candidates),
            'generation_strategies_used': {'fallback': len(fallback_candidates)}
        }
    
    def _get_cluster_embeddings(self, cluster_texts: Optional[List[str]] = None) -> Optional[List[List[float]]]:
        """Get cluster embeddings from cluster texts."""
        try:
            if not cluster_texts or not self.embedding_model:
                return None
            
            embeddings = self.embedding_model.encode(cluster_texts)
            if hasattr(embeddings, 'tolist'):
                return embeddings.tolist()
            return embeddings
            
        except Exception as e:
            self.logger.debug(f"Error getting cluster embeddings: {e}")
            return None
    
    def _get_candidate_metrics(self, candidate: str, keyword_cluster: List[Tuple[str, float]]) -> Dict[str, Any]:
        """Get detailed metrics for a tag candidate."""
        try:
            metrics = {
                'length': len(candidate),
                'word_count': len(candidate.replace('_', ' ').split()),
                'has_underscores': '_' in candidate,
                'has_spaces': ' ' in candidate,
                'is_alphabetic': candidate.replace('_', '').replace(' ', '').isalpha(),
                'capitalization': 'proper' if candidate[0].isupper() and not candidate.isupper() else 'other'
            }
            
            # Keyword relevance metrics
            if keyword_cluster:
                keywords = [kw.lower() for kw, _ in keyword_cluster[:5]]
                candidate_words = candidate.lower().replace('_', ' ').split()
                
                metrics['keyword_matches'] = sum(1 for word in candidate_words 
                                               if any(word in kw or kw in word for kw in keywords))
                metrics['keyword_coverage'] = metrics['keyword_matches'] / len(candidate_words) if candidate_words else 0
            
            return metrics
            
        except Exception as e:
            self.logger.debug(f"Error getting candidate metrics: {e}")
            return {}
    
    def _calculate_semantic_coherence_bonus(self, candidate: str, profile_context: List[str]) -> float:
        """Calculate semantic coherence bonus for a candidate."""
        try:
            import numpy as np
            
            # Get candidate embedding
            candidate_embedding = self.embedding_model.encode([candidate])[0]
            candidate_embedding = np.array(candidate_embedding)
            candidate_embedding = candidate_embedding / np.linalg.norm(candidate_embedding)
            
            # Get profile embeddings and calculate centroid
            profile_embeddings = self.embedding_model.encode(profile_context[:10])  # Limit for performance
            profile_centroid = np.mean(profile_embeddings, axis=0)
            profile_centroid = profile_centroid / np.linalg.norm(profile_centroid)
            
            # Calculate similarity
            similarity = np.dot(candidate_embedding, profile_centroid)
            return max(0, float(similarity))  # Ensure non-negative
            
        except Exception as e:
            self.logger.debug(f"Error calculating semantic coherence bonus: {e}")
            return 0.0
        """Generate tag using the improved tag generator."""
        try:
            # Convert profile context to embeddings if available
            cluster_embeddings = None
            if profile_context and self.embedding_model:
                try:
                    cluster_embeddings = self.embedding_model.encode(profile_context)
                    if hasattr(cluster_embeddings, 'tolist'):
                        cluster_embeddings = cluster_embeddings.tolist()
                except Exception as e:
                    self.logger.debug(f"Error encoding profile context: {e}")
            
            # Generate tag using hybrid approach
            tag = self.improved_tag_generator.generate_tag_from_keywords(
                keyword_cluster[:5], cluster_embeddings
            )
            return tag
            
        except Exception as e:
            self.logger.warning(f"Error with improved tag generator: {e}")
            return self._generate_fallback_tag(keyword_cluster)
    
    # _generate_fallback_tag supprimée - remplacée par le nouveau pipeline de validation
    
    # generate_tag_variations supprimée - remplacée par le nouveau pipeline
    
    # select_best_tag supprimée - remplacée par le nouveau pipeline
    
    # _score_tag_variations supprimée - remplacée par le nouveau pipeline
    
    # Ancienne validate_tag_quality supprimée - remplacée par la nouvelle API
    
    def get_generation_summary(self, generated_tags: List[str], 
                             keyword_clusters: List[List[Tuple[str, float]]]) -> Dict[str, Any]:
        """Get summary statistics about tag generation results."""
        try:
            if not generated_tags:
                return {
                    'total_tags': 0,
                    'average_quality': 0,
                    'high_quality_count': 0
                }
            
            # Validate each tag using the new API
            validations = []
            for i, tag in enumerate(generated_tags):
                cluster = keyword_clusters[i] if i < len(keyword_clusters) else []
                validation = self.validate_tag_quality(tag, cluster, generated_tags)
                validations.append(validation)
            
            quality_scores = [v['quality_score'] for v in validations]
            high_quality_count = sum(1 for v in validations if v['is_high_quality'])
            
            return {
                'total_tags': len(generated_tags),
                'quality_stats': {
                    'average': sum(quality_scores) / len(quality_scores),
                    'min': min(quality_scores),
                    'max': max(quality_scores)
                },
                'high_quality_count': high_quality_count,
                'high_quality_percentage': (high_quality_count / len(generated_tags)) * 100,
                'sample_tags': generated_tags[:5],
                'common_issues': self._analyze_common_issues(validations)
            }
            
        except Exception as e:
            self.logger.warning(f"Error generating tag summary: {e}")
            return {
                'total_tags': len(generated_tags),
                'error': str(e)
            }
    
    def _analyze_common_issues(self, validations: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze common issues across tag validations."""
        try:
            issue_counts = {}
            
            for validation in validations:
                for issue in validation.get('issues', []):
                    issue_counts[issue] = issue_counts.get(issue, 0) + 1
            
            return dict(sorted(issue_counts.items(), key=lambda x: x[1], reverse=True))
            
        except Exception as e:
            self.logger.debug(f"Error analyzing common issues: {e}")
            return {}
    

    

    

    
    def _get_fallback_candidates(self) -> List[str]:
        """Get intelligent fallback candidates when all else fails."""
        return [
            "Tech Community",
            "Creative Circle", 
            "Professional Network",
            "Interest Group",
            "Enthusiast Hub",
            "Knowledge Collective",
            "Innovation Guild",
            "Digital Community",
            "Thought Leaders",
            "Expert Network"
        ]
