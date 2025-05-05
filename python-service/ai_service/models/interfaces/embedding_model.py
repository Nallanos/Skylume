from abc import ABC, abstractmethod
from typing import List, Union, Optional, Any

class EmbeddingModel(ABC):
    """
    Interface abstraite pour les modèles d'embedding
    """
    
    @abstractmethod
    def encode(self, texts: Union[str, List[str]], batch_size: int = 32) -> List[List[float]]:
        """
        Encode un texte ou une liste de textes en vecteurs d'embedding
        
        Args:
            texts: Le texte ou la liste de textes à encoder
            batch_size: La taille de lot à utiliser pour l'encodage
            
        Returns:
            Une liste de vecteurs d'embedding
        """
        pass
    
    @abstractmethod
    def get_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calcule la similarité entre deux embeddings
        
        Args:
            embedding1: Premier vecteur d'embedding
            embedding2: Second vecteur d'embedding
            
        Returns:
            Score de similarité entre les deux embeddings
        """
        pass