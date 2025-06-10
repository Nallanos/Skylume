#!/usr/bin/env python3
"""
Debug test to identify the type comparison error
"""
import numpy as np
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_service.services.improved_tag_generator import ImprovedTagGenerator

class MockEmbeddingModel:
    """Mock embedding model for testing"""
    
    def encode(self, texts):
        """Generate mock embeddings based on text content"""
        embeddings = []
        for text in texts:
            # Simple hash-based embedding for consistent results
            text_lower = text.lower()
            if 'javascript' in text_lower or 'react' in text_lower:
                embeddings.append([0.9, 0.1, 0.0])  # Tech cluster
            elif 'design' in text_lower or 'creative' in text_lower:
                embeddings.append([0.1, 0.9, 0.0])  # Creative cluster
            elif 'business' in text_lower or 'entrepreneur' in text_lower:
                embeddings.append([0.0, 0.1, 0.9])  # Business cluster
            else:
                embeddings.append([0.3, 0.3, 0.4])  # Generic
        return embeddings

def debug_tag_generation():
    """Debug the tag generation process step by step"""
    print("🐛 Debugging Tag Generation Process")
    
    try:
        # Initialize with mock embedding model
        embedding_model = MockEmbeddingModel()
        tag_generator = ImprovedTagGenerator(embedding_model=embedding_model)
        
        # Test case: JavaScript developers cluster
        keywords = [
            ("javascript", 0.8),
            ("react", 0.7),
            ("frontend", 0.6)
        ]
        
        print(f"Input keywords: {keywords}")
        print(f"Keywords type: {type(keywords)}")
        print(f"First keyword: {keywords[0]}, type: {type(keywords[0])}")
        print(f"First keyword score: {keywords[0][1]}, type: {type(keywords[0][1])}")
        
        # Simulate cluster embeddings for JavaScript developers
        cluster_texts = [
            "JavaScript developer building React applications",
            "Frontend engineer specializing in web development"
        ]
        cluster_embeddings = embedding_model.encode(cluster_texts)
        
        print(f"Cluster embeddings: {cluster_embeddings}")
        print(f"Cluster embeddings type: {type(cluster_embeddings)}")
        
        # Step 1: Test filtering
        print("\n--- Step 1: Filtering ---")
        filtered_keywords = tag_generator._filter_blacklisted_keywords(keywords)
        print(f"Filtered keywords: {filtered_keywords}")
        
        # Step 2: Test optimal keyword selection
        print("\n--- Step 2: Optimal Keyword Selection ---")
        optimal_keyword = tag_generator.select_optimal_keyword_via_centroid(filtered_keywords, cluster_embeddings)
        print(f"Optimal keyword: {optimal_keyword}")
        
        # Step 3: Test theme detection
        print("\n--- Step 3: Theme Detection ---")
        theme = tag_generator.detect_primary_theme([optimal_keyword])
        print(f"Detected theme: {theme}")
        
        # Step 4: Test tag creation
        print("\n--- Step 4: Tag Creation ---")
        tag = tag_generator._create_single_concept_tag(optimal_keyword, theme)
        print(f"Generated tag: {tag}")
        
        # Step 5: Full generation
        print("\n--- Step 5: Full Generation ---")
        final_tag = tag_generator.generate_tag_from_keywords(keywords, cluster_embeddings)
        print(f"Final tag: {final_tag}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during debugging: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    debug_tag_generation()
