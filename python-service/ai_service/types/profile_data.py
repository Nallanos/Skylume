"""
Data structures for profile information used in semantic clustering.
"""
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ProfileData:
    """
    Represents processed profile data for semantic clustering.
    
    Contains all necessary information extracted and cleaned from a Bluesky profile,
    including bio, posts, following information, and metadata for clustering analysis.
    """
    
    # Core identification
    did: str
    handle: str
    display_name: str
    
    # Text content for embedding generation
    description: str  # Main bio text
    posts_text: List[str]  # Recent posts content
    following_bios: List[str]  # Bios of followed accounts
    combined_text: str  # All text combined for embedding
    
    # Profile statistics
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    
    # Processing metadata
    embedding: Optional[List[float]] = None
    cluster_id: Optional[int] = None
    confidence_score: Optional[float] = None
    
    def __post_init__(self):
        """Validate and normalize data after initialization."""
        # Ensure lists are not None
        if self.posts_text is None:
            self.posts_text = []
        if self.following_bios is None:
            self.following_bios = []
        
        # Ensure strings are not None
        if self.description is None:
            self.description = ""
        if self.combined_text is None:
            self.combined_text = ""
        if self.display_name is None:
            self.display_name = ""
        if self.handle is None:
            self.handle = ""
    
    @property
    def has_sufficient_content(self) -> bool:
        """Check if profile has sufficient content for meaningful clustering."""
        return (
            len(self.combined_text.strip()) >= 10 and
            (self.description.strip() or self.posts_text or self.following_bios)
        )
    
    @property
    def content_quality_score(self) -> float:
        """
        Calculate a quality score for the profile content.
        
        Returns:
            Float between 0 and 1 indicating content quality
        """
        score = 0.0
        
        # Bio quality (40% of score)
        if self.description and len(self.description.strip()) > 10:
            score += 0.4 * min(len(self.description.strip()) / 100, 1.0)
        
        # Posts quality (40% of score)
        if self.posts_text:
            posts_length = sum(len(post.strip()) for post in self.posts_text)
            score += 0.4 * min(posts_length / 300, 1.0)
        
        # Following bios quality (20% of score)
        if self.following_bios:
            following_length = sum(len(bio.strip()) for bio in self.following_bios)
            score += 0.2 * min(following_length / 200, 1.0)
        
        return min(score, 1.0)
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            'did': self.did,
            'handle': self.handle,
            'display_name': self.display_name,
            'description': self.description,
            'posts_text': self.posts_text,
            'following_bios': self.following_bios,
            'combined_text': self.combined_text,
            'followers_count': self.followers_count,
            'following_count': self.following_count,
            'posts_count': self.posts_count,
            'cluster_id': self.cluster_id,
            'confidence_score': self.confidence_score,
            'content_quality_score': self.content_quality_score
        }
