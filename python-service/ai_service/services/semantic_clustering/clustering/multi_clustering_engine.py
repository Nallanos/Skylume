"""
Multi-clustering engine that handles different clustering algorithms (HDBSCAN, KMeans) 
on both embeddings and LDA topic vectors.
"""
import numpy as np
import logging
from typing import List, Dict, Any, Optional, Tuple
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity


class MultiClusteringEngine:
    """Service responsible for executing multiple clustering algorithms on different data types."""
    
    def __init__(self, embedding_model, clusterer, lda_topic_modeler=None):
        """
        Initialize multi-clustering engine.
        
        Args:
            embedding_model: Model for generating embeddings
            clusterer: HDBSCAN clustering model
            lda_topic_modeler: Optional LDA topic modeling service
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self.embedding_model = embedding_model
        self.clusterer = clusterer
        self.lda_topic_modeler = lda_topic_modeler
        
        self.logger.info("🔧 MultiClusteringEngine initialized")
    
    def cluster_embeddings_hdbscan(self, 
                                 embeddings: List[List[float]], 
                                 profiles: List[Any]) -> List[Dict[str, Any]]:
        """
        Perform HDBSCAN clustering on embeddings.
        
        Args:
            embeddings: List of embedding vectors
            profiles: Corresponding profile objects
            
        Returns:
            List of cluster dictionaries
        """
        try:
            self.logger.info(f"🔄 HDBSCAN clustering on {len(embeddings)} embeddings")
            
            if len(embeddings) < 3:
                self.logger.warning("⚠️ Too few embeddings for HDBSCAN clustering")
                return []
            
            # Perform clustering
            cluster_labels, clusterer_obj = self.clusterer.fit_predict(embeddings)
            
            # Group profiles by cluster
            clusters = {}
            for i, (label, profile, embedding) in enumerate(zip(cluster_labels, profiles, embeddings)):
                if label not in clusters:
                    clusters[label] = {
                        'cluster_id': int(label),
                        'profiles': [],
                        'embedding': [],
                        'clustering_method': 'hdbscan_embeddings'
                    }
                clusters[label]['profiles'].append(profile)
                clusters[label]['embedding'].append(embedding)
            
            # Convert to list and calculate metrics
            cluster_list = []
            for cluster_id, cluster_data in clusters.items():
                if cluster_id == -1:  # Skip noise cluster for now
                    continue
                
                cluster_data['size'] = len(cluster_data['profiles'])
                cluster_data['cohesion'] = self._calculate_cluster_cohesion(cluster_data['embedding'])
                cluster_data['centroid'] = self._calculate_cluster_centroid(cluster_data['embedding'])
                cluster_data['persistence'] = self._get_cluster_persistence(clusterer_obj, cluster_id)
                
                cluster_list.append(cluster_data)
            
            self.logger.info(f"✅ HDBSCAN on embeddings generated {len(cluster_list)} clusters")
            return cluster_list
            
        except Exception as e:
            self.logger.error(f"❌ Error in HDBSCAN embeddings clustering: {e}")
            return []
    
    def cluster_lda_hdbscan(self, 
                          lda_vectors: np.ndarray, 
                          profiles: List[Any], 
                          embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Perform HDBSCAN clustering on LDA topic vectors.
        
        Args:
            lda_vectors: Matrix of LDA topic vectors
            profiles: Corresponding profile objects
            embeddings: Corresponding embedding vectors
            
        Returns:
            List of cluster dictionaries
        """
        try:
            self.logger.info(f"🔄 HDBSCAN clustering on {lda_vectors.shape[0]} LDA vectors ({lda_vectors.shape[1]} topics)")
            
            if lda_vectors.shape[0] < 3:
                self.logger.warning("⚠️ Too few LDA vectors for HDBSCAN clustering")
                return []
            
            # Perform clustering on LDA vectors
            cluster_labels, clusterer_obj = self.clusterer.fit_predict(lda_vectors.tolist())
            
            # Group profiles by cluster
            clusters = {}
            for i, (label, profile, embedding) in enumerate(zip(cluster_labels, profiles, embeddings)):
                if label not in clusters:
                    clusters[label] = {
                        'cluster_id': int(label),
                        'profiles': [],
                        'embedding': [],
                        'lda_vectors': [],
                        'clustering_method': 'hdbscan_lda'
                    }
                clusters[label]['profiles'].append(profile)
                clusters[label]['embedding'].append(embedding)
                clusters[label]['lda_vectors'].append(lda_vectors[i].tolist())
            
            # Convert to list and calculate metrics
            cluster_list = []
            for cluster_id, cluster_data in clusters.items():
                if cluster_id == -1:  # Skip noise cluster for now
                    continue
                
                cluster_data['size'] = len(cluster_data['profiles'])
                cluster_data['cohesion'] = self._calculate_cluster_cohesion(cluster_data['embedding'])
                cluster_data['lda_cohesion'] = self._calculate_cluster_cohesion(cluster_data['lda_vectors'])
                cluster_data['centroid'] = self._calculate_cluster_centroid(cluster_data['embedding'])
                cluster_data['lda_centroid'] = self._calculate_cluster_centroid(cluster_data['lda_vectors'])
                cluster_data['persistence'] = self._get_cluster_persistence(clusterer_obj, cluster_id)
                
                cluster_list.append(cluster_data)
            
            self.logger.info(f"✅ HDBSCAN on LDA vectors generated {len(cluster_list)} clusters")
            return cluster_list
            
        except Exception as e:
            self.logger.error(f"❌ Error in HDBSCAN LDA clustering: {e}")
            return []
    
    def cluster_lda_kmeans(self, 
                         lda_vectors: np.ndarray, 
                         profiles: List[Any], 
                         embeddings: List[List[float]], 
                         n_clusters: int = None) -> List[Dict[str, Any]]:
        """
        Perform KMeans clustering on LDA topic vectors.
        
        Args:
            lda_vectors: Matrix of LDA topic vectors
            profiles: Corresponding profile objects  
            embeddings: Corresponding embedding vectors
            n_clusters: Number of clusters (if None, will be estimated)
            
        Returns:
            List of cluster dictionaries
        """
        try:
            if n_clusters is None:
                n_clusters = min(8, max(2, lda_vectors.shape[1] // 2))  # Based on number of topics
            
            self.logger.info(f"🔄 KMeans clustering on {lda_vectors.shape[0]} LDA vectors (k={n_clusters})")
            
            if lda_vectors.shape[0] < n_clusters:
                self.logger.warning(f"⚠️ Too few profiles ({lda_vectors.shape[0]}) for {n_clusters} clusters")
                n_clusters = max(1, lda_vectors.shape[0] // 2)
            
            # Perform KMeans clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(lda_vectors)
            
            # Group profiles by cluster
            clusters = {}
            for i, (label, profile, embedding) in enumerate(zip(cluster_labels, profiles, embeddings)):
                label = int(label)
                if label not in clusters:
                    clusters[label] = {
                        'cluster_id': label,
                        'profiles': [],
                        'embedding': [],
                        'lda_vectors': [],
                        'clustering_method': 'kmeans_lda'
                    }
                clusters[label]['profiles'].append(profile)
                clusters[label]['embedding'].append(embedding)
                clusters[label]['lda_vectors'].append(lda_vectors[i].tolist())
            
            # Convert to list and calculate metrics
            cluster_list = []
            for cluster_id, cluster_data in clusters.items():
                cluster_data['size'] = len(cluster_data['profiles'])
                cluster_data['cohesion'] = self._calculate_cluster_cohesion(cluster_data['embedding'])
                cluster_data['lda_cohesion'] = self._calculate_cluster_cohesion(cluster_data['lda_vectors'])
                cluster_data['centroid'] = self._calculate_cluster_centroid(cluster_data['embedding'])
                cluster_data['lda_centroid'] = self._calculate_cluster_centroid(cluster_data['lda_vectors'])
                cluster_data['persistence'] = None  # KMeans doesn't provide persistence
                
                cluster_list.append(cluster_data)
            
            self.logger.info(f"✅ KMeans on LDA vectors generated {len(cluster_list)} clusters")
            return cluster_list
            
        except Exception as e:
            self.logger.error(f"❌ Error in KMeans LDA clustering: {e}")
            return []
    
    def cluster_embeddings_kmeans(self, 
                                embeddings: List[List[float]], 
                                profiles: List[Any], 
                                n_clusters: int = None) -> List[Dict[str, Any]]:
        """
        Perform KMeans clustering on embeddings (optional fallback method).
        
        Args:
            embeddings: List of embedding vectors
            profiles: Corresponding profile objects
            n_clusters: Number of clusters (if None, will be estimated)
            
        Returns:
            List of cluster dictionaries
        """
        try:
            if n_clusters is None:
                n_clusters = min(8, max(2, len(embeddings) // 10))  # Conservative estimate
            
            self.logger.info(f"🔄 KMeans clustering on {len(embeddings)} embeddings (k={n_clusters})")
            
            if len(embeddings) < n_clusters:
                self.logger.warning(f"⚠️ Too few embeddings ({len(embeddings)}) for {n_clusters} clusters")
                n_clusters = max(1, len(embeddings) // 2)
            
            # Perform KMeans clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(embeddings)
            
            # Group profiles by cluster
            clusters = {}
            for i, (label, profile, embedding) in enumerate(zip(cluster_labels, profiles, embeddings)):
                label = int(label)
                if label not in clusters:
                    clusters[label] = {
                        'cluster_id': label,
                        'profiles': [],
                        'embedding': [],
                        'clustering_method': 'kmeans_embeddings'
                    }
                clusters[label]['profiles'].append(profile)
                clusters[label]['embedding'].append(embedding)
            
            # Convert to list and calculate metrics
            cluster_list = []
            for cluster_id, cluster_data in clusters.items():
                cluster_data['size'] = len(cluster_data['profiles'])
                cluster_data['cohesion'] = self._calculate_cluster_cohesion(cluster_data['embedding'])
                cluster_data['centroid'] = self._calculate_cluster_centroid(cluster_data['embedding'])
                cluster_data['persistence'] = None  # KMeans doesn't provide persistence
                
                cluster_list.append(cluster_data)
            
            self.logger.info(f"✅ KMeans on embeddings generated {len(cluster_list)} clusters")
            return cluster_list
            
        except Exception as e:
            self.logger.error(f"❌ Error in KMeans embeddings clustering: {e}")
            return []
    
    def _calculate_cluster_cohesion(self, vectors: List[List[float]]) -> float:
        """Calculate mean pairwise cosine similarity within a cluster."""
        if len(vectors) < 2:
            return 0.0
        
        try:
            vectors_array = np.array(vectors)
            similarities = cosine_similarity(vectors_array)
            
            # Get upper triangular matrix (excluding diagonal)
            n = similarities.shape[0]
            upper_triangle = similarities[np.triu_indices(n, k=1)]
            
            return float(np.mean(upper_triangle))
            
        except Exception as e:
            self.logger.error(f"❌ Error calculating cohesion: {e}")
            return 0.0
    
    def _calculate_cluster_centroid(self, vectors: List[List[float]]) -> List[float]:
        """Calculate centroid of a cluster."""
        if not vectors:
            return []
        
        try:
            vectors_array = np.array(vectors)
            centroid = np.mean(vectors_array, axis=0)
            return centroid.tolist()
            
        except Exception as e:
            self.logger.error(f"❌ Error calculating centroid: {e}")
            return []
    
    def _get_cluster_persistence(self, clusterer_obj, cluster_id: int) -> Optional[float]:
        """Get cluster persistence from HDBSCAN clusterer if available."""
        try:
            if hasattr(clusterer_obj, 'cluster_persistence_') and cluster_id >= 0:
                persistences = clusterer_obj.cluster_persistence_
                if cluster_id < len(persistences):
                    return float(persistences[cluster_id])
            return None
        except Exception:
            return None
    
    def generate_lda_matrix(self, profiles: List[Any], profile_processor) -> Optional[Tuple[np.ndarray, Dict[str, Any]]]:
        """
        Generate LDA topic matrix for profiles.
        
        Args:
            profiles: List of profile objects
            profile_processor: ProfileProcessor instance for text extraction
            
        Returns:
            Tuple of (LDA matrix, model info) or None if failed
        """
        try:
            if not self.lda_topic_modeler or not profile_processor:
                self.logger.warning("⚠️ LDA topic modeler or profile processor not available")
                return None
            
            # Extract texts from profiles
            texts = profile_processor.extract_cluster_texts(profiles)
            if not texts or not any(text.strip() for text in texts):
                self.logger.warning("⚠️ No valid text content for LDA analysis")
                return None
            
            # Build LDA topic matrix
            result = self.lda_topic_modeler.build_topic_matrix(texts, return_model_info=True)
            if result and result[0] is not None:
                lda_matrix, model_info = result
                n_topics = lda_matrix.shape[1]
                self.logger.info(f"✅ Generated LDA matrix: {lda_matrix.shape[0]} profiles × {n_topics} topics")
                return lda_matrix, model_info
            else:
                self.logger.warning("⚠️ LDA matrix generation failed")
                return None
                
        except Exception as e:
            self.logger.error(f"❌ Error generating LDA matrix: {e}")
            return None
