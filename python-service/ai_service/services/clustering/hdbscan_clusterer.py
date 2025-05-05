import hdbscan
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from ai_service.models.interfaces.clustering_model import ClusteringModel

class HDBSCANClusterer(ClusteringModel):
    """
    Implémentation d'un modèle de clustering basé sur HDBSCAN
    """
    
    def __init__(self, min_cluster_size: int = 3, min_samples: Optional[int] = None, 
                 metric: str = "cosine", cluster_selection_method: str = 'eom'):
        """
        Initialise le clusterer HDBSCAN
        
        Args:
            min_cluster_size: Taille minimale d'un cluster
            min_samples: Nombre minimum d'échantillons dans un voisinage pour un point central
            metric: Métrique de distance à utiliser ('cosine', 'euclidean', etc.)
            cluster_selection_method: Méthode de sélection des clusters ('eom' ou 'leaf')
        """
        self.min_cluster_size = min_cluster_size
        self.min_samples = min_samples if min_samples is not None else min_cluster_size - 1
        self.metric = metric
        self.cluster_selection_method = cluster_selection_method
        
    def fit_predict(self, embeddings: List[List[float]]) -> Tuple[np.ndarray, Any]:
        """
        Effectue le clustering sur un ensemble d'embeddings
        
        Args:
            embeddings: Liste des vecteurs d'embedding à regrouper en clusters
            
        Returns:
            Tuple contenant:
                - Un tableau numpy des étiquettes de cluster pour chaque embedding
                - L'instance du clusterer utilisé (pour des usages additionnels)
        """
        # Convertir en tableau numpy si ce n'est pas déjà fait
        if isinstance(embeddings, list):
            embeddings = np.array(embeddings)
        
        # Créer et configurer le clusterer
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=self.min_cluster_size,
            min_samples=self.min_samples,
            metric=self.metric,
            cluster_selection_method=self.cluster_selection_method,
            approx_min_span_tree=True,
            prediction_data=True
        )
        
        # Effectuer le clustering
        labels = clusterer.fit_predict(embeddings)
        
        return labels, clusterer
    
    def get_parameters(self) -> Dict[str, Any]:
        """
        Renvoie les paramètres de configuration du modèle de clustering
        
        Returns:
            Dictionnaire des paramètres
        """
        return {
            "min_cluster_size": self.min_cluster_size,
            "min_samples": self.min_samples,
            "metric": self.metric,
            "cluster_selection_method": self.cluster_selection_method
        }
    
    def set_parameters(self, **kwargs) -> None:
        """
        Définit les paramètres du modèle de clustering
        
        Args:
            **kwargs: Paramètres à définir
        """
        if 'min_cluster_size' in kwargs:
            self.min_cluster_size = kwargs['min_cluster_size']
        
        if 'min_samples' in kwargs:
            self.min_samples = kwargs['min_samples']
        else:
            # Ajuster min_samples si min_cluster_size a changé mais pas min_samples
            if 'min_cluster_size' in kwargs:
                self.min_samples = self.min_cluster_size - 1
        
        if 'metric' in kwargs:
            self.metric = kwargs['metric']
            
        if 'cluster_selection_method' in kwargs:
            self.cluster_selection_method = kwargs['cluster_selection_method']
            
    def adjust_for_dataset_size(self, dataset_size: int) -> None:
        """
        Ajuste les paramètres du clustering en fonction de la taille du dataset
        
        Args:
            dataset_size: Nombre d'éléments dans le dataset
        """
        # Ajuster min_cluster_size en fonction de la taille du dataset
        # Règle heuristique: environ 5% de la taille du dataset, avec un minimum de 3
        self.min_cluster_size = max(3, int(dataset_size * 0.05))
        # Ajuster min_samples automatiquement
        self.min_samples = max(2, self.min_cluster_size - 1)