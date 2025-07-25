# Pipeline LDA Optimisé - Documentation d'utilisation

## 🎯 Vue d'ensemble

Le pipeline LDA optimisé implémente exactement les recommandations du document `how_to_use_lda.md` pour minimiser la perplexité et maximiser la qualité des topics.

## 🏗️ Architecture

Le pipeline suit cette séquence précise :

1. **ProfileEnricher** : Enrichissement avec l'API Bluesky
2. **ProfileValidator** : Validation et filtrage des profils
3. **ProfileTextExtractor** : Extraction et nettoyage du texte
4. **LDATopicModeler** : Modélisation LDA optimisée

## 🚀 Utilisation

### Exécution simple

```bash
# Sans authentification API (utilise les profils tels quels)
python -m ai_service.services.lda_core.lda_optimized_pipeline

# Avec authentification API (enrichit les profils)
export BLUESKY_HANDLE=your.handle.bsky.social
export BLUESKY_PASSWORD=your_password
python -m ai_service.services.lda_core.lda_optimized_pipeline
```

### Exécution avec script

```bash
# Utilise le script bash
./run_lda_optimized_pipeline.sh
```

### Utilisation programmatique

```python
import asyncio
from ai_service.services.lda_core.lda_optimized_pipeline import LDAOptimizedPipeline, LDAPipelineConfig

# Configuration
config = LDAPipelineConfig(
    max_profiles=50,
    min_text_length=200,
    bluesky_handle="your.handle.bsky.social",
    bluesky_password="your_password"
)

# Profils à analyser
profiles = [
    {'handle': 'user1', 'description': 'Bio 1', 'did': 'did:plc:1'},
    {'handle': 'user2', 'description': 'Bio 2', 'did': 'did:plc:2'},
    # ... plus de profils
]

# Exécution
pipeline = LDAOptimizedPipeline(config)
topic_matrix = await pipeline.run_pipeline(profiles)
```

## ⚙️ Configuration

### LDAPipelineConfig

- `max_profiles`: Nombre maximum de profils à traiter
- `min_text_length`: Longueur minimale en mots par document (recommandé: 200)
- `bluesky_handle`: Handle Bluesky pour l'authentification API
- `bluesky_password`: Mot de passe Bluesky
- `n_topics`: Nombre de topics LDA (auto-déterminé si None)

## 📊 Optimisations LDA

Le pipeline applique toutes les optimisations recommandées :

### CountVectorizer

- `max_features=200` : Réduit la complexité
- `stop_words='english'` : Supprime les mots vides
- `min_df=2` : Élimine les termes trop rares
- `max_df=0.8` : Élimine les termes trop fréquents
- `ngram_range=(1,1)` : Unigrammes seulement

### LatentDirichletAllocation

- `max_iter=200` : Convergence améliorée
- `learning_method='online'` : Plus efficace
- `doc_topic_prior=0.1` : Concentration sur peu de topics
- `topic_word_prior=0.01` : Spécialisation des topics

### Gestion automatique des topics

- Nombre de topics = max(2, min(6, len(texts) // 3))
- Capé à 6 topics maximum pour éviter la sur-segmentation

## 🔍 Validation et filtrage

Le pipeline filtre automatiquement :

- Les profils bots (patterns automatisés)
- Les profils spam (contenu promotionnel)
- Les profils avec contenu insuffisant
- Les documents trop courts (< min_text_length mots)

## 📈 Métriques et logging

Le pipeline log :

- Nombre de profils à chaque étape
- Statistiques du corpus (mots totaux, moyenne par document)
- Perplexité du modèle LDA
- Shape de la matrice des topics

## 🎯 Exemples d'utilisation

### Test avec profils Bluesky réels

```python
# Configuration pour test réel
config = LDAPipelineConfig(
    max_profiles=20,
    min_text_length=100,
    bluesky_handle=os.getenv('BLUESKY_HANDLE'),
    bluesky_password=os.getenv('BLUESKY_PASSWORD')
)

# Profils cibles
profiles = [
    {'handle': 'bsky.app', 'description': 'Official Bluesky app'},
    {'handle': 'jay.bsky.team', 'description': 'Building social media'},
    {'handle': 'pfrazee.com', 'description': 'Developer on protocols'},
    # ... plus de profils
]

# Exécution
pipeline = LDAOptimizedPipeline(config)
result = await pipeline.run_pipeline(profiles)
```

### Test avec données mockées

```python
# Configuration pour test sans API
config = LDAPipelineConfig(
    max_profiles=10,
    min_text_length=50,
    bluesky_handle=None,
    bluesky_password=None
)

# Profils avec contenu riche
profiles = [
    {
        'handle': 'tech_user',
        'description': 'Software engineer passionate about AI and machine learning',
        'posts': ['Working on neural networks', 'Deep learning is fascinating'],
        'following': [{'bio': 'AI researcher at university'}]
    },
    # ... plus de profils
]

# Exécution
pipeline = LDAOptimizedPipeline(config)
result = await pipeline.run_pipeline(profiles)
```

## 🔧 Dépendances

Le pipeline utilise les modules existants :

- `ai_service.services.semantic_clustering.processors.*`
- `ai_service.services.lda_core.lda_topic_modeler`
- `bluesky.api.AccountService`
- `scikit-learn` pour LDA

## 📋 TODO

- [ ] Export des topics vers fichier JSON/CSV
- [ ] Métriques de cohérence des topics
- [ ] Interface pour visualiser les topics
- [ ] Support pour d'autres langues (stop words)
- [ ] Intégration avec d'autres modèles (Biterm, etc.)

## 🎉 Résultats attendus

En suivant ce pipeline, vous devriez obtenir :

- **Perplexité réduite** (< 400 vs 600+ sans optimisation)
- **Topics plus cohérents** grâce au filtrage et enrichissement
- **Documents plus riches** (≥200 mots par utilisateur)
- **Traitement robuste** avec validation et gestion d'erreurs
