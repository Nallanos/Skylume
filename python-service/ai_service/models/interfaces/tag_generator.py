from abc import ABC, abstractmethod
from typing import List, Tuple, Any, Dict

class TagGenerator(ABC):
    """
    Interface abstraite pour les générateurs de tags
    """
    
    @abstractmethod
    def generate_keywords(self, texts: List[str], top_n: int = 40) -> Tuple[List[Tuple[str, float]], List[float]]:
        """
        Génère des mots-clés pertinents à partir d'un ensemble de textes
        
        Args:
            texts: Liste des textes à analyser
            top_n: Nombre de mots-clés à extraire
            
        Returns:
            Tuple contenant (liste de tuples (mot-clé, score), embeddings des mots-clés)
        """
        pass
    
    @abstractmethod
    def summarize_keywords(self, keywords: List[Tuple[str, float]], max_len: int = 25) -> str:
        """
        Génère un tag représentatif à partir d'une liste de mots-clés
        
        Args:
            keywords: Liste des tuples (mot-clé, score)
            max_len: Longueur maximale du tag généré
            
        Returns:
            Tag unique représentatif
        """
        pass