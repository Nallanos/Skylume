from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple
import numpy as np

class ClusteringModel(ABC):
    """
    Interface abstraite pour les modèles de clustering
    """
    
    @abstractmethod
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
        pass
    
    @abstractmethod
    def get_parameters(self) -> Dict[str, Any]:
        """
        Renvoie les paramètres de configuration du modèle de clustering
        
        Returns:
            Dictionnaire des paramètres
        """
        pass
        
    @abstractmethod
    def set_parameters(self, **kwargs) -> None:
        """
        Définit les paramètres du modèle de clustering
        
        Args:
            **kwargs: Paramètres à définir
        """
        pass
        
    @abstractmethod
    def adjust_for_dataset_size(self, dataset_size: int) -> None:
        """
        Ajuste les paramètres du clustering en fonction de la taille du dataset
        
        Args:
            dataset_size: Nombre d'éléments dans le dataset
        """
        pass