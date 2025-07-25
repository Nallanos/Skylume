"""
Semantic clustering services for the Bluesky audience analysis pipeline.

This module provides modular semantic clustering services organized by responsibility:
- processors: Profile processing and data preparation
- clustering: Clustering algorithms and related utilities
- keywords: Keyword extraction and tag generation
- validators: Coherence and tag validation
- optimization: Multi-scale optimization
- infrastructure: Memory management and utilities
"""

# Infrastructure services
from .infrastructure import MemoryManager

# Processing services
from .processors.profile_processor import ProfileProcessor

# Clustering services
from .clustering import ProfileClusterer, KeywordClusterer

# Keyword and tag services
from .keywords import SemanticKeywordExtractor, TagGeneratorService

# Validation services
from .validators import CoherenceValidator, TagValidator

# Optimization services
from .optimization import MultiScaleOptimizer

__all__ = [
    # Infrastructure
    'MemoryManager',
    # Processing
    'ProfileProcessor',
    # Clustering
    'ProfileClusterer', 'KeywordClusterer',
    # Keywords & Tags
    'SemanticKeywordExtractor', 'TagGeneratorService',
    # Validation
    'CoherenceValidator', 'TagValidator',
    # Optimization
    'MultiScaleOptimizer'
]
