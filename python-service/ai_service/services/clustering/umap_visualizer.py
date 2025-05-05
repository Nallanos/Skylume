import numpy as np
import matplotlib.pyplot as plt
import umap
import os
from typing import List, Optional, Dict, Tuple
import logging

class UMAPVisualizer:
    """
    Service de visualisation de données avec UMAP
    """
    
    def __init__(self, 
                 n_neighbors: int = 20, 
                 min_dist: float = 0.1,
                 metric: str = 'cosine',
                 output_dir: str = './',
                 random_state: int = 42):
        """
        Initialise le visualiseur UMAP
        
        Args:
            n_neighbors: Nombre de voisins à considérer
            min_dist: Distance minimale entre les points
            metric: Métrique de distance
            output_dir: Répertoire de sortie pour les images
            random_state: Graine pour la reproductibilité
        """
        self.n_neighbors = n_neighbors
        self.min_dist = min_dist
        self.metric = metric
        self.random_state = random_state
        self.output_dir = output_dir
        
        # Créer le répertoire de sortie s'il n'existe pas
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
    
    def generate_visualization(self, 
                               embeddings: List[List[float]], 
                               labels: List[int], 
                               handles: List[str], 
                               filename_base: str = "umap_projection") -> Tuple[str, str]:
        """
        Génère des visualisations UMAP des embeddings
        
        Args:
            embeddings: Liste des embeddings à visualiser
            labels: Étiquettes de cluster pour chaque embedding
            handles: Les identifiants associés à chaque embedding
            filename_base: Nom de base pour les fichiers générés
            
        Returns:
            Tuple des chemins vers les images générées
        """
        # Configurer UMAP pour la réduction de dimensionnalité
        reducer = umap.UMAP(
            n_neighbors=self.n_neighbors,
            min_dist=self.min_dist,
            metric=self.metric,
            random_state=self.random_state
        )
        
        # Réduire à 2 dimensions
        embedding_2d = reducer.fit_transform(embeddings)
        
        # Générer la visualisation standard
        standard_file = self._generate_standard_visualization(
            embedding_2d, labels, handles, filename_base)
        
        # Générer la visualisation annotée
        annotated_file = self._generate_annotated_visualization(
            embedding_2d, labels, handles, filename_base)
        
        logging.info(f"Visualisations UMAP générées: {standard_file} et {annotated_file}")
        return (standard_file, annotated_file)
    
    def _generate_standard_visualization(self, 
                                        embedding_2d: np.ndarray, 
                                        labels: List[int], 
                                        handles: List[str], 
                                        filename_base: str) -> str:
        """
        Génère la visualisation standard UMAP
        """
        # Créer une figure de haute qualité
        plt.figure(figsize=(16, 12), dpi=150)
        
        # Palette de couleurs adaptée au nombre de clusters
        unique_labels = np.unique(labels)
        n_clusters = len(unique_labels) - (1 if -1 in unique_labels else 0)
        
        # Sélectionner une palette appropriée
        if n_clusters <= 10:
            cmap = plt.cm.get_cmap('tab10')
        else:
            cmap = plt.cm.get_cmap('viridis')
        
        # Tracer les points
        scatter = plt.scatter(
            embedding_2d[:, 0], 
            embedding_2d[:, 1], 
            c=labels, 
            cmap=cmap,
            s=30,  # Points plus grands
            alpha=0.8  # Légère transparence
        )
        
        # Ajouter des annotations pour les centres de cluster
        cluster_centers = {}
        for label in unique_labels:
            if label != -1:  # Ignorer les points de bruit
                mask = labels == label
                if np.sum(mask) > 0:
                    # Calculer le centre du cluster
                    center_x = np.mean(embedding_2d[mask, 0])
                    center_y = np.mean(embedding_2d[mask, 1])
                    cluster_centers[label] = (center_x, center_y)
                    
                    # Annoter le centre avec la taille du cluster
                    plt.annotate(
                        f"Cluster {label} ({np.sum(mask)})", 
                        (center_x, center_y),
                        fontsize=12,
                        weight='bold',
                        alpha=0.8,
                        backgroundcolor='white',
                        ha='center'
                    )
        
        # Finalisation de la figure
        plt.title("Projection UMAP des profils", fontsize=16)
        plt.colorbar(scatter, label="Cluster")
        plt.grid(True, linestyle='--', alpha=0.6)
        
        # Sauvegarder l'image
        filepath = os.path.join(self.output_dir, f"{filename_base}.png")
        plt.savefig(filepath, bbox_inches='tight', dpi=300)
        
        return filepath
    
    def _generate_annotated_visualization(self, 
                                         embedding_2d: np.ndarray, 
                                         labels: List[int], 
                                         handles: List[str], 
                                         filename_base: str) -> str:
        """
        Génère une visualisation UMAP annotée avec des étiquettes
        """
        # Créer une nouvelle figure
        plt.figure(figsize=(16, 12), dpi=150)
        
        # Palette de couleurs
        unique_labels = np.unique(labels)
        if len(unique_labels) <= 10:
            cmap = plt.cm.get_cmap('tab10')
        else:
            cmap = plt.cm.get_cmap('viridis')
        
        # Tracer les points
        scatter = plt.scatter(
            embedding_2d[:, 0], 
            embedding_2d[:, 1], 
            c=labels, 
            cmap=cmap,
            s=20,
            alpha=0.7
        )
        
        # Annoter les clusters et quelques points
        for label in unique_labels:
            if label == -1:
                continue  # Ignorer les outliers
                
            # Trouver points dans ce cluster
            mask = labels == label
            if np.sum(mask) > 0:
                # Centre du cluster
                center_x = np.mean(embedding_2d[mask, 0])
                center_y = np.mean(embedding_2d[mask, 1])
                
                # Annoter le centre
                plt.annotate(
                    f"Cluster {label}", 
                    (center_x, center_y),
                    fontsize=12, 
                    weight='bold',
                    ha='center',
                    va='center',
                    bbox=dict(boxstyle="round,pad=0.3", fc="white", alpha=0.8)
                )
                
                # Sélectionner jusqu'à 3 points à annoter
                indices = np.where(mask)[0]
                np.random.seed(self.random_state)  # Pour reproductibilité
                if len(indices) > 3:
                    sample_indices = np.random.choice(indices, 3, replace=False)
                else:
                    sample_indices = indices
                    
                # Annoter les points échantillonnés
                for idx in sample_indices:
                    plt.annotate(
                        handles[idx],
                        (embedding_2d[idx, 0], embedding_2d[idx, 1]),
                        fontsize=8,
                        alpha=0.7,
                        xytext=(5, 5),
                        textcoords='offset points'
                    )
        
        # Finalisation de la figure
        plt.title("Projection UMAP des profils (avec annotations)", fontsize=16)
        plt.colorbar(scatter, label="Cluster")
        plt.grid(True, linestyle='--', alpha=0.6)
        
        # Sauvegarder la version annotée
        filepath = os.path.join(self.output_dir, f"{filename_base}_annotated.png")
        plt.savefig(filepath, bbox_inches='tight', dpi=300)
        
        plt.close('all')  # Libérer la mémoire
        return filepath