# Fallback LDA – Logique réelle de reclustering adaptatif

## Contexte

Quand le clustering principal (HDBSCAN/cosine) produit des clusters « faibles » (cohésion basse ou variance élevée), une logique de fallback avancée est appliquée pour améliorer la qualité des regroupements.

## Étapes détaillées de la logique

1. **Détection des clusters faibles**

   - Un cluster est jugé faible si :
     - Sa cohésion < `cohesion_threshold` (ex : 0.4)
     - OU sa variance > `variance_threshold` (ex : 0.5)
   - Les clusters faibles sont extraits pour traitement spécial.

2. **Reclustering adaptatif (ProfileClusterer)**

   - Les profils issus des clusters faibles sont rassemblés.
   - Un reclustering itératif est tenté avec des paramètres plus stricts (cosine > 0.7, min_cluster_size réduit).
   - À chaque itération, les bons clusters sont extraits, les faibles sont re-réessayés.
   - Limite : `max_iterations` (ex : 10).

3. **Fallback LDA (EnhancedClusteringFallback)**

   - Si après reclustering il reste ≥ 3 profils non clusterisés :
     - Si un `fallback_handler` (EnhancedClusteringFallback) et un `profile_processor` sont disponibles :
       - On extrait les textes des profils restants via `profile_processor.extract_cluster_texts`.
       - On filtre les textes vides ou trop courts.
       - On construit une matrice de distribution de sujets LDA (`_build_lda_topic_matrix`).
       - On tente un clustering HDBSCAN sur cette matrice (euclidean, min_cluster_size adaptatif).
       - Si HDBSCAN échoue ou produit des clusters incohérents, on regroupe d'abord les profils par topic dominant (`_group_by_dominant_topic`).
       - Pour chaque groupe de topic dominant :
         - On calcule la cohésion du groupe (avec les embeddings d'origine).
         - Si la cohésion est suffisante, le groupe est accepté tel quel.
         - Sinon, on tente de shrink le groupe (garder les profils les plus similaires jusqu'à atteindre la cohésion minimale).
         - Si le shrink échoue, le groupe est rejeté.
       - Si tout échoue, on crée un cluster « miscellaneous ».
     - Sinon, un warning est loggé.

4. **Cluster Divers**
   - Si des profils restent encore non clusterisés après toutes les tentatives, ils sont regroupés dans un cluster « Divers » (miscellaneous).

## Pseudocode simplifié

```python
# Reclustering adaptatif
for each reclustering iteration:
    recluster weak profiles (cosine > 0.7)
    extract good clusters
    if no more clusters: break

# Fallback LDA
if remaining_profiles >= 3:
    if fallback_handler and profile_processor:
        # Extraction des textes
        texts = profile_processor.extract_cluster_texts(remaining_profiles)
        # Construction matrice LDA
        topic_matrix = _build_lda_topic_matrix(texts)
        # HDBSCAN sur topic_matrix
        clusters = _apply_hdbscan_on_topic_matrix(topic_matrix, ...)
        if not clusters:
            clusters = _group_by_dominant_topic(topic_matrix, ...)
        if not clusters:
            clusters = [miscellaneous_cluster]
        add clusters to result
    else:
        log warning
if remaining_profiles:
    add to miscellaneous cluster
```

## Points importants

- Le fallback LDA n’est tenté que si ≥ 3 profils restent ET que les objets nécessaires sont fournis.
- Les textes vides ou trop courts sont filtrés avant LDA.
- Le fallback est toujours tenté avant la création du cluster Divers.
- Tous les profils sont garantis d’être inclus dans un cluster final.
- La logique de fallback est encapsulée dans `EnhancedClusteringFallback.process_weak_clusters`.

---

**Fichiers concernés :**

- `profile_clusterer.py` (méthode `_adaptive_reclustering`)
- `enhanced_clustering_fallback.py` (classe `EnhancedClusteringFallback`)
