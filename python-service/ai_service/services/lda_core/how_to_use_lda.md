# Minimiser la perplexité du modèle LDA pour détecter les centres d’intérêt sur BlueSky

## 📉 Comprendre la perplexité

La perplexité est une **métrique intrinsèque de LDA** qui mesure la qualité de prédiction du modèle (l’inverse de la probabilité moyenne des mots test).

- ➕ Un score **plus bas** = un **meilleur ajustement** du modèle.
- ➖ Elle **diminue naturellement** avec des **documents plus longs** ou un **corpus plus volumineux**.

> ⚠️ Les textes courts (bios, posts) entraînent des perplexités élevées (200–500) car les cooccurrences de mots sont insuffisantes.

## 📦 Stratégies pour baisser la perplexité

### 1. **Augmenter le volume de texte par utilisateur**

Assembler **un document riche par utilisateur**, en regroupant :

- **Bio de l’utilisateur** : courte, mais riche sémantiquement (≲100 mots).
- **Bios des followings** : concaténer 50–100 bios descriptives **filtrées par pertinence**.
- **Posts de l’utilisateur** : agréger 50–100 posts, en visant **500–1000 mots**. Exclure les contenus vides (ASCII, emojis seuls, réponses monosyllabiques).

### 2. **Prétraitement et filtrage du texte**

Nettoyage essentiel pour améliorer les cooccurrences significatives :

- **Normalisation** : minuscules, suppression ponctuation, URLs, mentions, hashtags vagues, emojis.
- **Stop words & fréquences** : retirer les mots vides, les mots trop rares/fréquents.
- **Filtrage thématique** : retirer les posts courts (< 5 mots) ou décoratifs.

> Objectif : chaque document utilisateur ≥ **200 mots**, concentré sur des termes signifiants.

## ⚙️ Réglage des hyperparamètres LDA

### 🔢 Nombre de topics `K`

- **Augmenter K** fait baisser la perplexité… jusqu’à un certain point.
- Tester différentes valeurs (10, 20, 50), choisir le plus **bas** donnant des **topics cohérents**.

### ⚖️ Priors `α` et `β`

- Diminuer `α` pour **favoriser des documents concentrés sur peu de topics**.
- Ajuster `β` selon le domaine ou utiliser une optimisation automatique.
- **Préférer MALLET** : priors asymétriques + optimisation par Gibbs Sampling.

### ⏳ Itérations d’apprentissage

- **Augmenter les itérations** améliore la convergence.
- S’assurer que la **perplexité se stabilise** sur un jeu de test.

### ✅ Évaluation multi-critères

> ❗ La perplexité **n’est pas toujours corrélée** à la qualité perçue des topics.

- Vérifier la **cohérence thématique** (manuellement ou avec un score de cohérence).
- Un bon modèle = **perplexité faible + topics lisibles**.

## 🧭 Recommandations pratiques (TL;DR)

- 📚 **Allonger les documents** : bio + bios filtrées + posts nettoyés.
- 🧹 **Nettoyage rigoureux** : stop words, ponctuation, exclusions sémantiques.
- 🔧 **Tuning LDA** : nombre de topics K, priors α/β, itérations, idéalement via **MALLET**.
- 👀 **Validation thématique** : s’assurer de la lisibilité des topics.
- 🔁 **Itérer** : tester plusieurs configurations et corpus.

## 🧠 Et si ça ne suffit pas…

Si la perplexité reste élevée malgré tout, envisager :

- ➕ Ajouter du texte (autres posts, descriptions…).
- 🎯 Filtrer mieux les bios.
- 🧪 Utiliser des modèles spécialisés pour textes courts (Biterm, etc.).

---

## 📝 Pipeline LDA optimal : orchestration détaillée avec les processors (adapté à l’implémentation actuelle)

Notre implémentation actuelle dans `lda_core/lda_topic_modeler.py` suit déjà la plupart des recommandations :

- Utilisation de `CountVectorizer` avec stop words anglais, min_df/max_df optimisés, ngram_range=(1,1), max_features=200
- Gestion automatique du nombre de topics (K) selon la taille du corpus, capé à 6
- Paramètres LDA : max_iter=200, learning_method='online', doc_topic_prior=0.1, topic_word_prior=0.01
- Logging détaillé (shape, perplexity, warnings)

### Pipeline recommandé (compatible avec l’existant)

1. **Enrichissement des profils**

   - `ProfileEnricher.enrich_profiles_with_api(profiles, handle, password)`
   - (Pas de changement)

2. **Validation et filtrage**

   - `ProfileValidator.validate_profiles_batch(profiles)` puis `filter_valid_profiles`
   - (Pas de changement)

3. **Extraction et nettoyage du texte**

   - `ProfileTextExtractor.build_profile_text(profile)` pour chaque profil
   - (Compatible : le LDA attend une liste de textes déjà nettoyés et concaténés)

4. **Construction du corpus**

   - Rassembler tous les textes utilisateurs dans une liste `texts`
   - (Déjà conforme à l’appel de `build_topic_matrix`)

5. **Modélisation LDA**

   - `LDATopicModeler.build_topic_matrix(texts, n_topics=None)`
   - Le nombre de topics est auto-calculé si non fourni, et tous les paramètres sont déjà optimisés pour la perplexité

6. **Évaluation et export**
   - Logging de la perplexité et de la shape dans `build_topic_matrix`
   - (Exporter les topics si besoin via les attributs du modèle sklearn)

**Ordre et sens d’utilisation des processors :**

```
[ProfileEnricher] → [ProfileValidator] → [ProfileTextExtractor] → [LDATopicModeler]
```

**Résumé des fonctions clés à utiliser :**

- `ProfileEnricher.enrich_profiles_with_api`
- `ProfileValidator.validate_profiles_batch` + `filter_valid_profiles`
- `ProfileTextExtractor.build_profile_text`
- `LDATopicModeler.build_topic_matrix`

> Notre pipeline est donc déjà aligné avec les bonnes pratiques : il suffit de bien préparer les textes en amont, puis d’utiliser la classe LDATopicModeler telle qu’implémentée pour obtenir des topics cohérents et une perplexité optimisée.
