"""
LDA UMAP Visualization Service

This module provides specialized visualization capabilities for LDA topic spaces using UMAP,
allowing visualization of topic distributions and clustering in the semantic topic space.
"""

import json
import os
import logging
import subprocess
from typing import List, Dict, Any, Optional, Tuple
import numpy as np


class LDAUMAPVisualizer:
    """
    Service for generating UMAP visualizations of LDA topic spaces.
    
    This class handles:
    1. Exporting LDA topic matrices and metadata for visualization
    2. Running UMAP visualization scripts for topic spaces
    3. Managing topic distribution analysis and export
    4. Generating pre-clustering and post-clustering LDA visualizations
    """
    
    def __init__(self, output_dir: str = None, logger: logging.Logger = None):
        """
        Initialize the LDA UMAP visualizer.
        
        Args:
            output_dir: Directory for output files (defaults to current working directory)
            logger: Logger instance (creates new one if not provided)
        """
        self.logger = logger or logging.getLogger(self.__class__.__name__)
        self.output_dir = output_dir or os.getcwd()
        self.lda_pre_clustering_file = os.path.join(self.output_dir, "lda_space_pre_clustering.json")
        self.lda_post_clustering_file = os.path.join(self.output_dir, "lda_space_post_clustering.json")
    
    def export_lda_data_for_visualization(self, 
                                        lda_matrix: np.ndarray, 
                                        topic_words: List[List[str]], 
                                        filename: str = None) -> int:
        """
        Export LDA topic matrix and metadata for UMAP visualization.
        
        Args:
            lda_matrix: LDA topic probability matrix (n_profiles x n_topics)
            topic_words: List of top words for each topic
            filename: Output filename (optional, uses default if not provided)
            
        Returns:
            Number of profiles exported
        """
        try:
            if lda_matrix is None or lda_matrix.size == 0:
                self.logger.warning("Empty LDA matrix provided for visualization")
                return 0
            
            # Use provided filename or default
            output_file = filename if filename else "lda_space_visualization.json"
            if not output_file.endswith('.json'):
                output_file += '.json'
            
            full_path = os.path.join(self.output_dir, output_file)
            
            # Convert numpy array to list for JSON serialization
            lda_matrix_list = lda_matrix.tolist() if hasattr(lda_matrix, 'tolist') else lda_matrix
            
            # Prepare export data
            export_data = {
                'lda_matrix': lda_matrix_list,
                'topic_words': topic_words,
                'n_profiles': lda_matrix.shape[0] if hasattr(lda_matrix, 'shape') else len(lda_matrix_list),
                'n_topics': lda_matrix.shape[1] if hasattr(lda_matrix, 'shape') else len(lda_matrix_list[0]) if lda_matrix_list else 0,
                'export_timestamp': str(np.datetime64('now')),
                'visualization_type': 'lda_topic_space'
            }
            
            # Add topic distribution summary
            if hasattr(lda_matrix, 'shape') and lda_matrix.shape[0] > 0:
                dominant_topics = np.argmax(lda_matrix, axis=1)
                topic_distribution = self._calculate_topic_distribution(dominant_topics, topic_words)
                export_data['topic_distribution'] = topic_distribution
            
            # Write to JSON file
            with open(full_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"📊 Exported LDA data for {export_data['n_profiles']} profiles to {full_path}")
            return export_data['n_profiles']
            
        except Exception as e:
            self.logger.error(f"❌ Error exporting LDA data for visualization: {e}")
            return 0
    
    def export_lda_pre_clustering_data(self, 
                                     lda_matrix: np.ndarray, 
                                     topic_words: List[List[str]]) -> int:
        """
        Export LDA data specifically for pre-clustering visualization.
        
        Args:
            lda_matrix: LDA topic probability matrix
            topic_words: List of top words for each topic
            
        Returns:
            Number of profiles exported
        """
        return self.export_lda_data_for_visualization(
            lda_matrix, 
            topic_words, 
            "lda_space_pre_clustering.json"
        )
    
    def export_lda_post_clustering_data(self, 
                                      lda_matrix: np.ndarray, 
                                      topic_words: List[List[str]], 
                                      cluster_labels: List[int]) -> int:
        """
        Export LDA data with clustering results for post-clustering visualization.
        
        Args:
            lda_matrix: LDA topic probability matrix
            topic_words: List of top words for each topic
            cluster_labels: Cluster assignment for each profile
            
        Returns:
            Number of profiles exported
        """
        try:
            # First export the basic LDA data
            count = self.export_lda_data_for_visualization(
                lda_matrix, 
                topic_words, 
                "lda_space_post_clustering.json"
            )
            
            # Add clustering information
            if count > 0:
                full_path = os.path.join(self.output_dir, "lda_space_post_clustering.json")
                
                # Read the existing data
                with open(full_path, 'r', encoding='utf-8') as f:
                    export_data = json.load(f)
                
                # Add cluster labels
                export_data['cluster_labels'] = cluster_labels
                export_data['n_clusters'] = len(set(cluster_labels)) if cluster_labels else 0
                export_data['visualization_type'] = 'lda_topic_space_clustered'
                
                # Write back with clustering info
                with open(full_path, 'w', encoding='utf-8') as f:
                    json.dump(export_data, f, indent=2, ensure_ascii=False)
                
                self.logger.info(f"📊 Added clustering info to LDA visualization data ({export_data['n_clusters']} clusters)")
            
            return count
            
        except Exception as e:
            self.logger.error(f"❌ Error exporting clustered LDA data: {e}")
            return 0
    
    def run_lda_umap_visualization(self, filename: str = None) -> bool:
        """
        Run UMAP visualization script for LDA topic space.
        
        Args:
            filename: Specific LDA data file to visualize (optional)
            
        Returns:
            True if visualization was successful, False otherwise
        """
        try:
            # Determine which file to visualize
            target_file = filename if filename else "lda_space_pre_clustering.json"
            full_path = os.path.join(self.output_dir, target_file)
            
            if not os.path.exists(full_path):
                self.logger.warning(f"LDA data file not found: {full_path}")
                return False
            
            # Look for LDA UMAP visualization script
            script_paths = [
                os.path.join(self.output_dir, "lda_umap_visualization.py"),
                os.path.join(self.output_dir, "scripts", "lda_umap_visualization.py"),
                os.path.join(self.output_dir, "ai_service", "scripts", "lda_umap_visualization.py")
            ]
            
            umap_script = None
            for script_path in script_paths:
                if os.path.exists(script_path):
                    umap_script = script_path
                    break
            
            if not umap_script:
                self.logger.warning("LDA UMAP visualization script not found, skipping visualization")
                return False
            
            self.logger.info(f"🎨 Running LDA UMAP visualization with script: {umap_script}")
            
            # Run the LDA UMAP script
            result = subprocess.run(
                ["python", umap_script, target_file],
                cwd=self.output_dir,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                self.logger.info("✅ LDA UMAP visualization completed successfully")
                return True
            else:
                self.logger.warning(f"⚠️ LDA UMAP visualization script returned non-zero exit code: {result.returncode}")
                if result.stderr:
                    self.logger.warning(f"LDA UMAP script stderr: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            self.logger.warning("⚠️ LDA UMAP visualization script timed out")
            return False
        except Exception as e:
            self.logger.warning(f"⚠️ Error running LDA UMAP visualization: {e}")
            return False
    
    def analyze_topic_distribution(self, 
                                 lda_matrix: np.ndarray, 
                                 topic_words: List[List[str]]) -> Dict[str, Any]:
        """
        Analyze and return topic distribution statistics.
        
        Args:
            lda_matrix: LDA topic probability matrix
            topic_words: List of top words for each topic
            
        Returns:
            Dictionary containing topic distribution analysis
        """
        try:
            if lda_matrix is None or lda_matrix.size == 0:
                return {}
            
            n_topics = lda_matrix.shape[1]
            dominant_topics = np.argmax(lda_matrix, axis=1)
            
            # Calculate distribution
            topic_distribution = self._calculate_topic_distribution(dominant_topics, topic_words)
            
            # Calculate additional statistics
            topic_coverage = np.mean(np.max(lda_matrix, axis=1))  # Average max probability
            topic_entropy = self._calculate_topic_entropy(lda_matrix)
            
            analysis = {
                'n_topics': n_topics,
                'topic_distribution': topic_distribution,
                'topic_coverage': float(topic_coverage),
                'average_entropy': float(topic_entropy),
                'most_dominant_topic': max(topic_distribution.items(), key=lambda x: x[1]['count'])[0] if topic_distribution else None
            }
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"❌ Error analyzing topic distribution: {e}")
            return {}
    
    def _calculate_topic_distribution(self, 
                                    dominant_topics: np.ndarray, 
                                    topic_words: List[List[str]]) -> Dict[str, Dict[str, Any]]:
        """Calculate topic distribution from dominant topics."""
        topic_distribution = {}
        n_topics = len(topic_words) if topic_words else np.max(dominant_topics) + 1
        
        for topic_id in range(n_topics):
            count = np.sum(dominant_topics == topic_id)
            if count > 0:
                topic_words_str = ', '.join(topic_words[topic_id][:3]) if (
                    topic_words and topic_id < len(topic_words) and 
                    isinstance(topic_words[topic_id], list)
                ) else f"Topic {topic_id}"
                
                topic_distribution[f"Topic {topic_id}"] = {
                    "count": int(count),
                    "words": topic_words_str,
                    "percentage": float(count / len(dominant_topics) * 100)
                }
        
        return topic_distribution
    
    def _calculate_topic_entropy(self, lda_matrix: np.ndarray) -> float:
        """Calculate average topic entropy across profiles."""
        try:
            # Add small epsilon to avoid log(0)
            epsilon = 1e-10
            lda_safe = lda_matrix + epsilon
            
            # Calculate entropy for each profile
            entropy_per_profile = -np.sum(lda_safe * np.log(lda_safe), axis=1)
            
            # Return average entropy
            return np.mean(entropy_per_profile)
            
        except Exception:
            return 0.0
    
    def log_topic_distribution_summary(self, 
                                     lda_matrix: np.ndarray, 
                                     topic_words: List[List[str]]) -> None:
        """
        Log a formatted summary of topic distribution.
        
        Args:
            lda_matrix: LDA topic probability matrix
            topic_words: List of top words for each topic
        """
        try:
            analysis = self.analyze_topic_distribution(lda_matrix, topic_words)
            
            if not analysis:
                return
            
            self.logger.info("📊 LDA Topic Distribution Analysis:")
            self.logger.info(f"   • Total topics: {analysis['n_topics']}")
            self.logger.info(f"   • Average topic coverage: {analysis['topic_coverage']:.3f}")
            self.logger.info(f"   • Average entropy: {analysis['average_entropy']:.3f}")
            
            if analysis['topic_distribution']:
                self.logger.info("   • Topic distribution:")
                for topic, info in sorted(
                    analysis['topic_distribution'].items(), 
                    key=lambda x: x[1]["count"], 
                    reverse=True
                ):
                    self.logger.info(f"     - {topic}: {info['count']} profiles ({info['percentage']:.1f}%) - {info['words']}")
            
        except Exception as e:
            self.logger.warning(f"⚠️ Error logging topic distribution summary: {e}")
