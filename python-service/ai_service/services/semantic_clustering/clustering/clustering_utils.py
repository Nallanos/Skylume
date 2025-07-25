import numpy as np
from typing import List, Dict, Any, Tuple
import logging

def detect_weak_clusters(
    clusters: List[Dict[str, Any]],
    cohesion_threshold: float = 0.4,
    variance_threshold: float = 0.5,
    persistence_threshold: float = 0.5,
    logger: logging.Logger = None
) -> Tuple[list, list]:
    """
    Détecte les clusters faibles selon la persistence (si dispo), sinon cohésion/variance.
    Args:
        clusters: Liste des clusters à évaluer
        cohesion_threshold: Seuil de cohésion minimum
        variance_threshold: Seuil de variance maximum
        persistence_threshold: Seuil de persistence minimum pour HDBSCAN
        logger: logger optionnel pour les logs
    Returns:
        Tuple (good_clusters, weak_clusters)
    """
    good_clusters = []
    weak_clusters = []
    for i, cluster_data in enumerate(clusters):
        profiles = cluster_data.get('profiles', [])
        embeddings = cluster_data.get('embedding', [])
        persistence = cluster_data.get('persistence')
        cluster_id = cluster_data.get('cluster_id', i)
        if logger:
            logger.info(f"\n--- Cluster {i+1} (id={cluster_id}) ---")
            logger.info(f"  Size: {len(profiles)} | Persistence: {persistence} | Cohesion: {cluster_data.get('cohesion', 0.0)} | Variance: {cluster_data.get('variance', 'N/A')}")
        if len(profiles) < 2 or not embeddings:
            if logger:
                logger.info(f"🔍 Cluster {i+1} marked as weak (too small: {len(profiles)} profiles)")
            weak_clusters.append(cluster_data)
            continue
        # Critère HDBSCAN : persistence prioritaire
        if persistence is not None:
            if persistence < persistence_threshold:
                if logger:
                    logger.info(f"🔍 Cluster {i+1} marked as weak (persistence={persistence:.3f} < {persistence_threshold})")
                weak_clusters.append(cluster_data)
            else:
                if logger:
                    logger.info(f"✅ Cluster {i+1} is good (persistence={persistence:.3f} >= {persistence_threshold})")
                good_clusters.append(cluster_data)
            continue
        # Fallback sur cohésion/variance pour les autres méthodes
        cohesion = cluster_data.get('cohesion', 0.0)
        variance = cluster_data.get('variance')
        if variance is None:
            variance = calculate_cluster_variance(embeddings)
            if logger:
                logger.info(f"  Calculated variance: {variance:.3f}")
        is_weak = False
        reasons = []
        if cohesion < cohesion_threshold:
            is_weak = True
            reasons.append(f"cohesion={cohesion:.3f} < {cohesion_threshold}")
        if variance > variance_threshold:
            is_weak = True
            reasons.append(f"variance={variance:.3f} > {variance_threshold}")
        if is_weak:
            if logger:
                logger.info(f"🔍 Cluster {i+1} marked as weak ({', '.join(reasons)})")
            weak_clusters.append(cluster_data)
        else:
            if logger:
                logger.info(f"✅ Cluster {i+1} is good (cohesion={cohesion:.3f}, variance={variance:.3f})")
            good_clusters.append(cluster_data)
    return good_clusters, weak_clusters

def calculate_cluster_variance(embeddings: List[List[float]]) -> float:
    try:
        if not embeddings or len(embeddings) < 2:
            return 0.0
        embeddings_array = np.array(embeddings)
        variances = np.var(embeddings_array, axis=0)
        mean_variance = np.mean(variances)
        return float(mean_variance)
    except Exception:
        return 1.0
