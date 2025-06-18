"""
Tag generation service for creating natural language tags from keyword clusters.
Responsible for generating meaningful, human-readable tags from semantic keyword groups.
"""

import logging
from typing import List, Tuple, Optional, Dict, Any
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.memory_manager import MemoryManager


class TagGeneratorService:
    """Service responsible for generating natural language tags from keyword clusters."""
    
    def __init__(self, embedding_model: EmbeddingModel, memory_manager: MemoryManager):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.memory_manager = memory_manager
        
        # Initialize the improved tag generator
        try:
            from ai_service.services.improved_tag_generator import ImprovedTagGenerator
            self.improved_tag_generator = ImprovedTagGenerator(embedding_model=embedding_model)
            self.logger.info("✅ ImprovedTagGenerator initialized successfully")
        except Exception as e:
            self.logger.warning(f"Failed to initialize ImprovedTagGenerator: {e}")
            self.improved_tag_generator = None
        
        self.logger.info("🔄 TagGeneratorService initialized")
    
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
            self.logger.warning(f"Error generating tag candidates: {e}")
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
                    
                    # Generate multiple variations using different keyword subsets from KeyBERT results
                    # This leverages the semantic ranking from KeyBERT rather than hardcoded patterns
                    for i in range(min(5, len(keyword_cluster))):
                        # Use sliding windows of KeyBERT results for diversity
                        subset_size = min(3 + i, len(keyword_cluster))
                        subset = keyword_cluster[:subset_size]
                        
                        if subset:
                            tag = self.improved_tag_generator.generate_tag_from_keywords(subset, cluster_embeddings)
                            if tag and tag not in candidates:
                                candidates.append(tag)
                except Exception as e:
                    self.logger.debug(f"ImprovedTagGenerator failed: {e}")
            
            # Secondary approach: Use top keywords directly (minimal processing)
            # This respects KeyBERT's semantic ranking without rigid transformations
            for keyword, score in keyword_cluster[:10]:  # Use more keywords from KeyBERT
                clean_keyword = keyword.strip()
                if clean_keyword and clean_keyword not in candidates:
                    # Simple capitalization - no rigid patterns
                    candidates.append(clean_keyword.title())
            
            # Remove duplicates while preserving KeyBERT order
            unique_candidates = []
            seen = set()
            for candidate in candidates:
                if candidate and candidate.strip() and candidate.lower() not in seen:
                    # Basic quality filter only
                    if 2 <= len(candidate) <= 50:
                        seen.add(candidate.lower())
                        unique_candidates.append(candidate)
            
            # Ensure we have enough candidates
            if len(unique_candidates) < 3:
                # Generate additional candidates from profile context if available
                if profile_context and len(profile_context) > 0:
                    for handle in profile_context[:3]:
                        # Extract meaningful parts from handles
                        clean_handle = handle.replace('.bsky.social', '').replace('.', ' ')
                        words = clean_handle.split()
                        for word in words:
                            if len(word) > 2 and word.isalpha() and word.title() not in unique_candidates:
                                unique_candidates.append(word.title() + " Community")
                                if len(unique_candidates) >= 5:
                                    break
                        if len(unique_candidates) >= 5:
                            break
                
                # Add intelligent fallbacks if still not enough
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
    
    def _get_cluster_embeddings(self, profile_context: Optional[List[str]] = None) -> Optional[List[List[float]]]:
        """Get cluster embeddings from profile context."""
        try:
            if not profile_context or not self.embedding_model:
                return None
            
            embeddings = self.embedding_model.encode(profile_context)
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
    
    def _generate_fallback_tag(self, keyword_cluster: List[Tuple[str, float]]) -> str:
        """Generate intelligent fallback tag using keywords."""
        try:
            if not keyword_cluster:
                return "Tech Community"  # More descriptive default
            
            # Extract keywords and prioritize by score
            keywords = [kw for kw, _ in keyword_cluster[:3]]  # Top 3 keywords
            
            if len(keywords) == 1:
                keyword = keywords[0].strip().title()
                # Add context to single keywords
                if len(keyword) > 0:
                    return f"{keyword} Enthusiasts" if len(keyword) < 8 else keyword
                else:
                    return "Tech Community"
            elif len(keywords) == 2:
                kw1, kw2 = keywords[0].title(), keywords[1].title()
                # Create meaningful combinations
                return f"{kw1} & {kw2}" if len(f"{kw1} & {kw2}") < 20 else kw1
            else:
                # For multiple keywords, use the highest scoring one with context
                primary = keywords[0].strip().title()
                return f"{primary} Community" if len(primary) < 12 else primary
                
        except Exception as e:
            self.logger.warning(f"Error in fallback tag generation: {e}")
            return "Tech Community"
    
    def generate_tag_variations(self, keyword_cluster: List[Tuple[str, float]]) -> List[str]:
        """Generate multiple tag variations for a keyword cluster."""
        try:
            if not keyword_cluster:
                return ["Community"]
            
            keywords = [kw for kw, _ in keyword_cluster[:5]]
            variations = []
            
            # Single keyword variations
            if keywords:
                primary = keywords[0].strip()
                variations.extend([
                    primary.title(),
                    primary.replace(' ', '_').title(),
                    primary.replace('_', ' ').title()
                ])
            
            # Compound variations for multiple keywords
            if len(keywords) >= 2:
                secondary = keywords[1].strip()
                variations.extend([
                    f"{primary.title()}_{secondary.title()}",
                    f"{primary.title()} & {secondary.title()}",
                    f"{primary.title()}-{secondary.title()}"
                ])
            
            # Remove duplicates while preserving order
            seen = set()
            unique_variations = []
            for var in variations:
                if var not in seen and var.strip():
                    seen.add(var)
                    unique_variations.append(var)
            
            return unique_variations[:5] if unique_variations else ["Community"]
            
        except Exception as e:
            self.logger.warning(f"Error generating tag variations: {e}")
            return ["Community"]
    
    def select_best_tag(self, keyword_cluster: List[Tuple[str, float]], 
                       profile_embeddings: Optional[List[List[float]]] = None) -> str:
        """Select the best tag from available options using semantic analysis."""
        try:
            # Generate variations
            variations = self.generate_tag_variations(keyword_cluster)
            
            if not variations:
                return "Community"
            
            if len(variations) == 1:
                return variations[0]
            
            # If we have profile embeddings, score variations by semantic similarity
            if profile_embeddings and self.embedding_model:
                return self._score_tag_variations(variations, profile_embeddings)
            
            # Otherwise, return the first (primary) variation
            return variations[0]
            
        except Exception as e:
            self.logger.warning(f"Error selecting best tag: {e}")
            return self._generate_fallback_tag(keyword_cluster)
    
    def _score_tag_variations(self, variations: List[str], 
                            profile_embeddings: List[List[float]]) -> str:
        """Score tag variations by semantic similarity to profile cluster."""
        try:
            import numpy as np
            
            # Calculate profile centroid
            profile_centroid = np.mean(profile_embeddings, axis=0)
            profile_centroid = profile_centroid / np.linalg.norm(profile_centroid)
            
            best_tag = variations[0]
            best_score = -1
            
            for tag in variations:
                try:
                    # Get tag embedding
                    tag_embedding = self.embedding_model.encode([tag])[0]
                    tag_embedding = np.array(tag_embedding)
                    tag_embedding = tag_embedding / np.linalg.norm(tag_embedding)
                    
                    # Calculate similarity
                    similarity = np.dot(tag_embedding, profile_centroid)
                    
                    if similarity > best_score:
                        best_score = similarity
                        best_tag = tag
                        
                except Exception as e:
                    self.logger.debug(f"Error scoring tag '{tag}': {e}")
                    continue
            
            return best_tag
            
        except Exception as e:
            self.logger.warning(f"Error scoring tag variations: {e}")
            return variations[0] if variations else "Community"
    
    def validate_tag_quality(self, tag: str, keyword_cluster: List[Tuple[str, float]]) -> Dict[str, Any]:
        """Validate the quality of a generated tag."""
        try:
            quality_score = 0.0
            issues = []
            
            # Check tag length
            if 5 <= len(tag) <= 30:
                quality_score += 0.2
            else:
                issues.append(f"Tag length ({len(tag)}) not optimal (5-30 chars)")
            
            # Check for generic terms
            generic_terms = {'general', 'misc', 'unknown', 'other', 'mixed', 'community'}
            if not any(generic in tag.lower() for generic in generic_terms):
                quality_score += 0.3
            else:
                issues.append("Contains generic terms")
            
            # Check keyword relevance
            if keyword_cluster:
                keywords = [kw.lower() for kw, _ in keyword_cluster[:3]]
                tag_words = tag.lower().replace('_', ' ').split()
                
                if any(word in keywords for word in tag_words):
                    quality_score += 0.3
                else:
                    issues.append("Tag words not found in top keywords")
            
            # Check formatting
            if tag.replace('_', '').replace(' ', '').isalpha():
                quality_score += 0.1
            else:
                issues.append("Contains non-alphabetic characters")
            
            # Check capitalization
            if tag[0].isupper() and not tag.isupper():
                quality_score += 0.1
            else:
                issues.append("Improper capitalization")
            
            return {
                'tag': tag,
                'quality_score': min(quality_score, 1.0),
                'issues': issues,
                'is_high_quality': quality_score >= 0.7,
                'keyword_count': len(keyword_cluster),
                'primary_keywords': [kw for kw, _ in keyword_cluster[:3]]
            }
            
        except Exception as e:
            self.logger.warning(f"Error validating tag quality: {e}")
            return {
                'tag': tag,
                'quality_score': 0.0,
                'issues': ['Validation error'],
                'is_high_quality': False
            }
    
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
            
            # Validate each tag
            validations = []
            for i, tag in enumerate(generated_tags):
                cluster = keyword_clusters[i] if i < len(keyword_clusters) else []
                validation = self.validate_tag_quality(tag, cluster)
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
    
    def _generate_semantic_variations(self, keywords: List[str]) -> List[str]:
        """Generate semantic variations using related terms and synonyms."""
        try:
            variations = []
            
            # Common semantic patterns for different domains
            semantic_patterns = {
                'tech': ['Tech', 'Digital', 'Innovation', 'Solutions'],
                'business': ['Pro', 'Enterprise', 'Commercial', 'Industry'],
                'creative': ['Artists', 'Creators', 'Designers', 'Visuals'],
                'social': ['Community', 'Network', 'Circle', 'Group'],
                'academic': ['Research', 'Study', 'Academic', 'Science']
            }
            
            for keyword in keywords[:3]:  # Limit to top 3 keywords
                keyword_lower = keyword.lower()
                
                # Generate variations based on keyword content
                for domain, suffixes in semantic_patterns.items():
                    if any(term in keyword_lower for term in [domain, domain[:-1]]):  # Match domain
                        for suffix in suffixes:
                            variations.extend([
                                f"{keyword.title()}_{suffix}",
                                f"{suffix}_{keyword.title()}",
                                f"{keyword.title()}{suffix}"
                            ])
                
                # Generic semantic variations
                variations.extend([
                    f"{keyword.title()}_Experts",
                    f"{keyword.title()}_Enthusiasts", 
                    f"{keyword.title()}_Collective",
                    f"Modern_{keyword.title()}",
                    f"Digital_{keyword.title()}",
                    f"{keyword.title()}_Hub"
                ])
            
            return variations[:15]  # Limit semantic variations
            
        except Exception as e:
            self.logger.debug(f"Error generating semantic variations: {e}")
            return []
    
    def _generate_contextual_variations(self, keywords: List[str], profile_context: List[str]) -> List[str]:
        """Generate contextual variations based on profile context."""
        try:
            variations = []
            
            # Analyze profile context for common themes
            context_text = ' '.join(profile_context[:20]).lower()  # Limit for performance
            
            # Context-based modifiers
            if 'entrepreneur' in context_text or 'startup' in context_text:
                modifiers = ['Startup', 'Entrepreneur', 'Innovation']
            elif 'developer' in context_text or 'programming' in context_text:
                modifiers = ['Dev', 'Code', 'Tech']
            elif 'design' in context_text or 'creative' in context_text:
                modifiers = ['Design', 'Creative', 'Visual']
            elif 'research' in context_text or 'academic' in context_text:
                modifiers = ['Research', 'Academic', 'Study']
            else:
                modifiers = ['Professional', 'Community', 'Network']
            
            for keyword in keywords:
                for modifier in modifiers:
                    variations.extend([
                        f"{modifier}_{keyword.title()}",
                        f"{keyword.title()}_{modifier}",
                        f"{modifier}{keyword.title()}"
                    ])
            
            return variations[:12]  # Limit contextual variations
            
        except Exception as e:
            self.logger.debug(f"Error generating contextual variations: {e}")
            return []
    
    # Legacy methods for backward compatibility
    def _generate_with_improved_generator(self, keyword_cluster: List[Tuple[str, float]], 
                                        profile_context: Optional[List[str]] = None) -> str:
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
