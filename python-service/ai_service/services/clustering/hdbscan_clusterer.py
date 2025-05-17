import hdbscan
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from ai_service.models.interfaces.clustering_model import ClusteringModel
from sklearn.preprocessing import normalize

class HDBSCANClusterer(ClusteringModel):
    """
    Implémentation d'un modèle de clustering basé sur HDBSCAN
    """
    
    def __init__(self, min_cluster_size: int = 3, min_samples: Optional[int] = None, 
                 metric: str = "euclidean", cluster_selection_method: str = 'eom'):
        """
        Initialise le clusterer HDBSCAN
        
        Args:
            min_cluster_size: Taille minimale d'un cluster
            min_samples: Nombre minimum d'échantillons dans un voisinage pour un point central
            metric: Métrique de distance à utiliser ('euclidean', 'manhattan', etc.)
            cluster_selection_method: Méthode de sélection des clusters ('eom' ou 'leaf')
        """
        self.min_cluster_size = min_cluster_size
        self.min_samples = min_samples if min_samples is not None else min_cluster_size - 1
        self.metric = metric
        self.original_metric = metric  # Pour garder trace de la métrique d'origine demandée
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
            
        # Prétraitement spécial pour la similarité cosinus
        # Si la métrique demandée était 'cosine', nous normalisons les vecteurs
        # puis utilisons la distance euclidienne (équivalent à la distance cosinus)
        if self.original_metric.lower() == 'cosine':
            embeddings = normalize(embeddings)
            self.metric = 'euclidean'
        
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
        # Appel direct à la méthode fit_predict de l'instance HDBSCAN plutôt qu'à notre propre méthode
        labels = clusterer.fit(embeddings).labels_
        
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
            "metric": self.original_metric,  # Renvoyer la métrique d'origine demandée
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
            self.original_metric = kwargs['metric']
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
        # Règle heuristique: environ 2% de la taille du dataset, avec un minimum de 2
        self.min_cluster_size = max(2, int(dataset_size * 0.02))
        # Ajuster min_samples plus bas pour permettre des clusters moins denses
        self.min_samples = max(1, int(self.min_cluster_size * 0.5))
        # Pour les très petits ensembles de données, utiliser le mode "leaf"
        if dataset_size < 50:
            self.cluster_selection_method = 'leaf'