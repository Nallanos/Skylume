import os
import warnings
from sentence_transformers import SentenceTransformer, util
from typing import List, Union, Dict, Any
import numpy as np
from ai_service.models.interfaces.embedding_model import EmbeddingModel

# Configuration des variables d'environnement et suppression des avertissements
os.environ.setdefault('TRANSFORMERS_OFFLINE', '0')
warnings.filterwarnings('ignore', category=FutureWarning, message='.*TRANSFORMERS_CACHE.*')
warnings.filterwarnings('ignore', category=FutureWarning, module='transformers.utils.hub')

class TransformerEmbedder(EmbeddingModel):
    """
    Implémentation d'un modèle d'embedding utilisant Sentence Transformers
    """
    
    def __init__(self, model_name: str = "sentence-transformers/all-mpnet-base-v2", normalize: bool = True):
        """
        Initialise le modèle d'embedding
        
        Args:
            model_name: Nom du modèle Sentence Transformers à utiliser
            normalize: Si True, normalise les embeddings
        """
        self.model = SentenceTransformer(model_name)
        self.normalize = normalize
        
    def encode(self, texts: Union[str, List[str]], batch_size: int = 32) -> List[List[float]]:
        """
        Encode un texte ou une liste de textes en vecteurs d'embedding
        
        Args:
            texts: Le texte ou la liste de textes à encoder
            batch_size: La taille de lot à utiliser pour l'encodage
            
        Returns:
            Une liste de vecteurs d'embedding
        """
        embeddings = self.model.encode(
            texts, 
            batch_size=batch_size, 
            convert_to_numpy=True, 
            normalize_embeddings=self.normalize
        )
        
        # Assurer que le résultat est une liste de listes
        if isinstance(texts, str):
            return [embeddings.tolist()]
        
        return embeddings.tolist()
    
    def get_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calcule la similarité cosinus entre deux embeddings
        
        Args:
            embedding1: Premier vecteur d'embedding
            embedding2: Second vecteur d'embedding
            
        Returns:
            Score de similarité cosinus entre les deux embeddings
        """
        # Convertir en numpy arrays
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        
        # Calculer la similarité cosinus
        return float(util.cos_sim(emb1, emb2)[0][0])
    
    def batch_similarity(self, embedding: List[float], comparison_embeddings: List[List[float]]) -> List[float]:
        """
        Calcule la similarité entre un embedding et une liste d'embeddings
        
        Args:
            embedding: Vecteur d'embedding de référence
            comparison_embeddings: Liste de vecteurs d'embedding à comparer
            
        Returns:
            Liste des scores de similarité
        """
        # Convertir en numpy arrays
        emb = np.array(embedding)
        comp_embs = np.array(comparison_embeddings)
        
        # Calculer les similarités
        similarities = util.cos_sim(emb, comp_embs)[0].tolist()
        
        return similarities