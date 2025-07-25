"""
Tag validation service for final quality assessment and ranking.
Handles final validation, ranking, and quality assessment of generated tags.
"""

import logging
from typing import List, Dict, Any
from ai_service.models.interfaces.embedding_model import EmbeddingModel
from ai_service.services.semantic_clustering.infrastructure import MemoryManager


class TagValidator:
    """Service responsible for final tag validation and ranking."""
    
    def __init__(self, embedding_model: EmbeddingModel, memory_manager: MemoryManager):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.memory_manager = memory_manager
        self.logger.info("🔄 TagValidator initialized")
    
    def rank_and_validate_final_tags(self, optimized_tags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        PHASE 1: Replace binary validation with scoring and ranking system.
        
        This method now uses a comprehensive scoring approach instead of binary pass/fail.
        All tags are scored, ranked, and returned - no tags are completely rejected.
        
        Args:
            optimized_tags: List of optimized tag cluster dictionaries
            
        Returns:
            All tags ranked by comprehensive scoring (no rejection)
        """
        try:
            if not optimized_tags:
                return []
            
            self.logger.info(f"🔄 PHASE 1: Scoring and ranking {len(optimized_tags)} tags (no binary rejection)")
            
            # Calculate comprehensive quality scores for all tags
            for tag_data in optimized_tags:
                if 'quality_score' not in tag_data:
                    quality_score = self._calculate_tag_quality_score(tag_data)
                    tag_data['quality_score'] = quality_score
                
                # Add comprehensive scoring metrics
                tag_data['ranking_score'] = self._calculate_comprehensive_ranking_score(tag_data)
                tag_data['validation_status'] = 'scored'  # All tags get scored
            
            # Sort by comprehensive ranking score (best first)
            ranked_tags = self._rank_by_comprehensive_score(optimized_tags)
            
            # Apply quality improvements instead of rejection
            improved_tags = []
            for tag_data in ranked_tags:
                improved_tag = self._improve_tag_quality(tag_data)
                improved_tags.append(improved_tag)
            
            self.logger.info(f"✅ PHASE 1 complete: {len(improved_tags)} tags scored and ranked")
            
            return improved_tags
            
        except Exception as e:
            self.logger.error(f"Error in scoring and ranking: {e}")
            return optimized_tags
    
    def _calculate_comprehensive_ranking_score(self, tag_data: Dict[str, Any]) -> float:
        """
        PHASE 1: Calculate comprehensive ranking score using multiple weighted factors.
        
        This replaces binary validation with nuanced scoring across multiple dimensions.
        """
        try:
            score = 0.0
            
            # 1. Tag Quality Factor (40% weight)
            quality_score = tag_data.get('quality_score', 0)
            score += quality_score * 0.4
            
            # 2. Semantic Coherence Factor (25% weight)
            cohesion = tag_data.get('cohesion', 0.5)  # Default middle value
            score += cohesion * 0.25
            
            # 3. Cluster Size Factor (20% weight) - Balanced scoring
            size = tag_data.get('size', 0)
            if size > 0:
                # Optimal range: 5-50 profiles, with diminishing returns beyond
                size_score = min(size / 50, 1.0) if size <= 50 else max(0.8 - (size - 50) / 1000, 0.3)
                score += size_score * 0.2
            
            # 4. Keyword Richness Factor (10% weight)
            keywords = tag_data.get('keywords', [])
            keyword_score = min(len(keywords) / 10, 1.0)  # Up to 10 keywords is optimal
            score += keyword_score * 0.1
            
            # 5. Uniqueness Factor (5% weight) - Bonus for distinctive tags
            tag_name = tag_data.get('tag', '').lower()
            if tag_name and not any(generic in tag_name for generic in 
                                   ['general', 'misc', 'community', 'other', 'mixed']):
                score += 0.05
            
            return min(score, 1.0)
            
        except Exception as e:
            self.logger.warning(f"Error calculating comprehensive ranking score: {e}")
            return 0.5  # Default middle score
    
    def _rank_by_comprehensive_score(self, tags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        PHASE 1: Rank tags by comprehensive scoring system.
        
        Replaces binary pass/fail with sophisticated ranking.
        """
        try:
            # Sort by ranking score (highest first)
            ranked_tags = sorted(tags, key=lambda x: x.get('ranking_score', 0), reverse=True)
            
            # Add ranking metadata
            for i, tag_data in enumerate(ranked_tags):
                tag_data['rank'] = i + 1
                tag_data['score_percentile'] = ((len(ranked_tags) - i) / len(ranked_tags)) * 100
            
            return ranked_tags
            
        except Exception as e:
            self.logger.warning(f"Error ranking by comprehensive score: {e}")
            return tags
    
    def _improve_tag_quality(self, tag_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        PHASE 1: Improve tag quality instead of rejecting tags.
        
        Apply quality improvements to low-scoring tags rather than discarding them.
        """
        try:
            improved_data = tag_data.copy()
            ranking_score = tag_data.get('ranking_score', 0)
            
            # If score is very low, attempt improvements
            if ranking_score < 0.3:
                tag_name = tag_data.get('tag', '')
                keywords = tag_data.get('keywords', [])
                
                # Try to generate a better tag from keywords
                if keywords:
                    # Use the highest-scoring keyword as fallback
                    best_keyword = keywords[0] if isinstance(keywords[0], str) else keywords[0][0]
                    improved_tag = best_keyword.strip().title()
                    
                    if improved_tag and improved_tag != tag_name:
                        improved_data['tag'] = improved_tag
                        improved_data['improvement_applied'] = f"Replaced '{tag_name}' with keyword-based '{improved_tag}'"
                        # Recalculate scores
                        improved_data['quality_score'] = self._calculate_tag_quality_score(improved_data)
                        improved_data['ranking_score'] = self._calculate_comprehensive_ranking_score(improved_data)
            
            return improved_data
            
        except Exception as e:
            self.logger.debug(f"Error improving tag quality: {e}")
            return tag_data
    
    def _calculate_tag_quality_score(self, tag_data: Dict[str, Any]) -> float:
        """Calculate comprehensive quality score for a tag."""
        try:
            score = 0.0
            
            # Tag name quality (no generic terms, proper length)
            tag_name = tag_data.get('tag', '')
            if tag_name and not any(generic in tag_name.lower() for generic in 
                                   ['general', 'misc', 'unknown', 'other', 'mixed']):
                score += 0.3
            
            if 5 <= len(tag_name) <= 30:  # Optimal length
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
            
        except Exception as e:
            self.logger.warning(f"Error calculating tag quality: {e}")
            return 0.0
    
    def _rank_by_composite_score(self, tags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Rank tags by composite score combining multiple factors."""
        try:
            # Calculate composite ranking score for each tag
            for tag_data in tags:
                quality_score = tag_data.get('quality_score', 0)
                cohesion = tag_data.get('cohesion', 0)
                size = tag_data.get('size', 0)
                
                # Composite score with weights
                composite_score = (
                    quality_score * 0.4 +       # Quality weight
                    cohesion * 0.3 +             # Cohesion weight
                    (min(size / 50, 1.0)) * 0.3  # Size weight (normalized, capped at 50)
                )
                
                tag_data['composite_score'] = composite_score
            
            # Sort by composite score (highest first)
            ranked_tags = sorted(tags, key=lambda x: x.get('composite_score', 0), reverse=True)
            
            return ranked_tags
            
        except Exception as e:
            self.logger.warning(f"Error ranking by composite score: {e}")
            return tags
    
    def _validate_final_tag(self, tag_data: Dict[str, Any]) -> bool:
        """Perform final validation of tag data."""
        try:
            # Required fields check
            required_fields = ['tag', 'size', 'keywords']
            if not all(key in tag_data for key in required_fields):
                return False
            
            # Minimum quality thresholds
            if tag_data.get('size', 0) < 2:
                return False
            
            tag_name = tag_data.get('tag', '').strip()
            if not tag_name:
                return False
            
            if not tag_data.get('keywords', []):
                return False
            
            # Quality score threshold
            quality_score = tag_data.get('quality_score', 0)
            if quality_score < 0.1:  # Very low quality threshold
                return False
            
            return True
            
        except Exception as e:
            self.logger.debug(f"Error in tag validation: {e}")
            return False
    
    def validate_tag_uniqueness(self, tags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ensure tag names are unique, keeping the highest quality version."""
        try:
            if len(tags) <= 1:
                return tags
            
            # Group tags by normalized name
            tag_groups = {}
            for tag_data in tags:
                tag_name = tag_data.get('tag', '').lower().strip()
                if tag_name not in tag_groups:
                    tag_groups[tag_name] = []
                tag_groups[tag_name].append(tag_data)
            
            # Keep only the best version of each tag
            unique_tags = []
            for tag_name, group in tag_groups.items():
                if len(group) == 1:
                    unique_tags.append(group[0])
                else:
                    # Sort by quality and keep the best one
                    best_tag = max(group, key=lambda x: x.get('quality_score', 0))
                    unique_tags.append(best_tag)
                    
                    self.logger.debug(f"Kept best version of duplicate tag '{tag_name}' (quality: {best_tag.get('quality_score', 0):.3f})")
            
            removed_count = len(tags) - len(unique_tags)
            if removed_count > 0:
                self.logger.info(f"Removed {removed_count} duplicate tags during uniqueness validation")
            
            return unique_tags
            
        except Exception as e:
            self.logger.warning(f"Error validating tag uniqueness: {e}")
            return tags
    
    def filter_low_quality_tags(self, tags: List[Dict[str, Any]], 
                              quality_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Filter out tags that don't meet minimum quality standards."""
        try:
            if not tags:
                return []
            
            high_quality_tags = []
            
            for tag_data in tags:
                quality_score = tag_data.get('quality_score', 0)
                
                if quality_score >= quality_threshold:
                    high_quality_tags.append(tag_data)
                else:
                    self.logger.debug(f"Filtered low-quality tag '{tag_data.get('tag', 'unknown')}' (quality: {quality_score:.3f})")
            
            filtered_count = len(tags) - len(high_quality_tags)
            if filtered_count > 0:
                self.logger.info(f"Filtered {filtered_count} low-quality tags (threshold: {quality_threshold})")
            
            return high_quality_tags
            
        except Exception as e:
            self.logger.warning(f"Error filtering low-quality tags: {e}")
            return tags
    
    def apply_business_rules(self, tags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply business-specific validation rules."""
        try:
            validated_tags = []
            
            for tag_data in tags:
                tag_name = tag_data.get('tag', '').lower()
                
                # Skip inappropriate or problematic tags
                forbidden_terms = {
                    'spam', 'nsfw', 'adult', 'xxx', 'porn', 'hate', 'violence',
                    'illegal', 'drugs', 'weapon', 'scam', 'fraud'
                }
                
                if any(term in tag_name for term in forbidden_terms):
                    self.logger.debug(f"Filtered inappropriate tag: {tag_data.get('tag')}")
                    continue
                
                # Ensure minimum meaningful content
                if len(tag_name.replace('_', '').replace(' ', '')) < 3:
                    self.logger.debug(f"Filtered too short tag: {tag_data.get('tag')}")
                    continue
                
                # Check for reasonable size
                size = tag_data.get('size', 0)
                if size > 1000:  # Very large clusters might be too general
                    self.logger.debug(f"Large cluster detected: {tag_data.get('tag')} (size: {size})")
                    # Don't filter, just log
                
                validated_tags.append(tag_data)
            
            return validated_tags
            
        except Exception as e:
            self.logger.warning(f"Error applying business rules: {e}")
            return tags
    
    def get_validation_summary(self, original_tags: List[Dict[str, Any]], 
                             final_tags: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get comprehensive validation summary."""
        try:
            if not original_tags:
                return {
                    'original_count': 0,
                    'final_count': 0,
                    'validation_rate': 0
                }
            
            original_count = len(original_tags)
            final_count = len(final_tags)
            
            # Quality statistics
            original_qualities = [t.get('quality_score', 0) for t in original_tags]
            final_qualities = [t.get('quality_score', 0) for t in final_tags]
            
            # Size statistics
            original_sizes = [t.get('size', 0) for t in original_tags]
            final_sizes = [t.get('size', 0) for t in final_tags]
            
            return {
                'original_count': original_count,
                'final_count': final_count,
                'filtered_count': original_count - final_count,
                'validation_rate': (final_count / original_count) * 100 if original_count > 0 else 0,
                'quality_stats': {
                    'original_avg': sum(original_qualities) / len(original_qualities) if original_qualities else 0,
                    'final_avg': sum(final_qualities) / len(final_qualities) if final_qualities else 0,
                    'improvement': (sum(final_qualities) / len(final_qualities) - sum(original_qualities) / len(original_qualities)) if (original_qualities and final_qualities) else 0
                },
                'size_stats': {
                    'original_total': sum(original_sizes),
                    'final_total': sum(final_sizes),
                    'average_cluster_size': sum(final_sizes) / len(final_sizes) if final_sizes else 0
                },
                'final_tags': [t.get('tag', 'unknown') for t in final_tags[:10]],  # Top 10 tags
                'validation_steps': [
                    'quality_scoring',
                    'composite_ranking',
                    'final_validation',
                    'uniqueness_check',
                    'business_rules'
                ]
            }
            
        except Exception as e:
            self.logger.warning(f"Error generating validation summary: {e}")
            return {
                'original_count': len(original_tags),
                'final_count': len(final_tags),
                'error': str(e)
            }
