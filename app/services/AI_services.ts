import type { ProfileView } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { Agent } from "@atproto/api";
import pQueue from 'p-queue';
import KMeans from 'ml-kmeans';
import crypto from 'crypto';
import * as WordNet from 'wordnet';

// Import Transformers.js (cela fonctionnera localement avec WASM ou en pur JS)
import { FeatureExtractionPipeline, pipeline } from '@xenova/transformers';

type KeywordData = {
  set: Set<string>;
  embeddings: number[][]; // tableau de nombres pour les embeddings
}

type WordAnalysis = {
  word: string;
  isValid: boolean;
  synsets: any[];
  generalityScore: number;
  frequency: number;
}

export class AIService {
  // Utilisation d'un modèle via Transformers.js
  private static model: FeatureExtractionPipeline | null = null;
  private static modelPromise: Promise<void>;
  private apiQueue = new pQueue({ concurrency: 15, interval: 600, intervalCap: 5 }); // Augmentation de la concurrence

  // Cache pour stocker les embeddings déjà calculés
  private embeddingsCache: Map<string, number[]> = new Map();
  private similarityCache: Map<string, number> = new Map();

  constructor() {
    AIService.modelPromise = this.initModel();
    console.log('TargetAudienceService initialized with cache');
  }

  private async initModel() {
    console.log('Initializing Transformers model (all-MiniLM-L6-v2)...');
    if (!AIService.model) {
      try {
        // Crée un pipeline pour l'extraction d'embeddings (le modèle sera téléchargé si nécessaire)
        AIService.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('Model loaded successfully.');
      } catch (error) {
        console.log('Error loading Transformers model:', error);
      }
    }
  }

  // Génère une clé de cache unique pour deux textes
  private generateCacheKey(text1: string, text2?: string): string {
    if (text2) {
      // Pour la similarité entre deux textes, créer une clé qui ne dépend pas de l'ordre
      const sortedTexts = [text1, text2].sort();
      return crypto.createHash('md5').update(sortedTexts.join('|')).digest('hex');
    }
    // Pour un seul texte (embedding)
    return crypto.createHash('md5').update(text1).digest('hex');
  }

  // Convertit un Float32Array en tableau de tableaux (number[][])
  // en découpant le tableau selon le batchSize (nombre d'entrées passées au modèle)
  private convertEmbeddings(embeddingData: Float32Array, batchSize: number): number[][] {
    const total = embeddingData.length;
    const dim = total / batchSize;
    const result: number[][] = [];
    for (let i = 0; i < batchSize; i++) {
      const start = i * dim;
      result.push(Array.from(embeddingData.slice(start, start + dim)));
    }
    return result;
  }

  // ──────────────────────────────
  // Prépare les embeddings pour une liste de keywords (tokens déjà en minuscule)
  private async prepareKeywords(keywords: string[]): Promise<KeywordData> {
    console.log('Preparing keywords for embedding...');
    await AIService.modelPromise;
    const kwSet = new Set(keywords);
    if (!AIService.model) {
      throw new Error('Model not initialized');
    }

    // Utiliser le cache pour les mots clés déjà traités
    const cachedEmbeddings: number[][] = [];
    const uncachedKeywords: string[] = [];

    // Vérifier quels mots clés sont déjà en cache
    for (const keyword of keywords) {
      const cacheKey = this.generateCacheKey(keyword);
      const cachedEmbedding = this.embeddingsCache.get(cacheKey);

      if (cachedEmbedding) {
        cachedEmbeddings.push(cachedEmbedding);
      } else {
        uncachedKeywords.push(keyword);
      }
    }

    // Traiter uniquement les mots clés non mis en cache
    let newEmbeddings: number[][] = [];
    if (uncachedKeywords.length > 0) {
      const res = await AIService.model(uncachedKeywords);
      newEmbeddings = this.convertEmbeddings(res.data as Float32Array, uncachedKeywords.length);

      // Mettre en cache les nouveaux embeddings
      uncachedKeywords.forEach((keyword, index) => {
        const cacheKey = this.generateCacheKey(keyword);
        this.embeddingsCache.set(cacheKey, this.normalizeEmbeddings([newEmbeddings[index]])[0]);
      });
    }

    // Combiner les embeddings en cache et les nouveaux
    const allEmbeddings = [...cachedEmbeddings, ...newEmbeddings];
    console.log(`Prepared embeddings for ${keywords.length} keywords. ${allEmbeddings.length} embeddings generated.`);

    return {
      set: kwSet,
      embeddings: allEmbeddings.length === cachedEmbeddings.length ?
        allEmbeddings : // Si tout était en cache, pas besoin de normaliser à nouveau
        this.normalizeEmbeddings(allEmbeddings)
    };
  }

  // ──────────────────────────────
  // Normalise un tableau d'embeddings (chaque vecteur) pour obtenir une norme égale à 1
  private normalizeEmbeddings(embeddings: number[][]): number[][] {
    return embeddings.map(vector => {
      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      return vector.map(v => v / norm);
    });
  }


  public cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vec1.length; i++) {
      dot += vec1[i] * vec2[i];
      normA += vec1[i] * vec1[i];
      normB += vec2[i] * vec2[i];
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  // ──────────────────────────────
  // Calcul de la similarité sémantique entre un ensemble de mots et des keywords.
  private async semanticMatch(words: string[], keywordData: KeywordData): Promise<number> {
    if (!AIService.model) throw new Error('Model not initialized');

    // Traiter les mots en utilisant le cache
    const cachedEmbeddings: number[][] = [];
    const uncachedWords: string[] = [];

    for (const word of words) {
      const cacheKey = this.generateCacheKey(word);
      const cachedEmbedding = this.embeddingsCache.get(cacheKey);

      if (cachedEmbedding) {
        cachedEmbeddings.push(cachedEmbedding);
      } else {
        uncachedWords.push(word);
      }
    }

    // Traiter uniquement les mots non mis en cache
    let newEmbeddings: number[][] = [];
    if (uncachedWords.length > 0) {
      const wordEmbeddingsRes = await AIService.model(uncachedWords);
      newEmbeddings = this.convertEmbeddings(wordEmbeddingsRes.data as Float32Array, uncachedWords.length);
      const normalizedNew = this.normalizeEmbeddings(newEmbeddings);

      // Mettre en cache les nouveaux embeddings
      uncachedWords.forEach((word, index) => {
        const cacheKey = this.generateCacheKey(word);
        this.embeddingsCache.set(cacheKey, normalizedNew[index]);
      });

      newEmbeddings = normalizedNew;
    }

    // Combiner les embeddings en cache et les nouveaux
    const normalizedWords = [...cachedEmbeddings, ...newEmbeddings];

    // Système de scoring progressif avec plusieurs seuils (plus permissifs)
    let totalScore = 0;
    const highThreshold = 0.70;    // Correspondance très forte (réduit de 0.75)
    const mediumThreshold = 0.55;  // Correspondance moyenne (réduit de 0.60)
    const lowThreshold = 0.40;     // Correspondance faible mais significative (réduit de 0.45)

    for (let i = 0; i < normalizedWords.length; i++) {
      let bestSimilarity = 0;
      for (let j = 0; j < keywordData.embeddings.length; j++) {
        const sim = this.cosineSimilarity(normalizedWords[i], keywordData.embeddings[j]);
        bestSimilarity = Math.max(bestSimilarity, sim);
      }

      // Scoring progressif basé sur la meilleure similarité
      if (bestSimilarity >= highThreshold) {
        totalScore += 3.0; // Score élevé pour correspondance forte
      } else if (bestSimilarity >= mediumThreshold) {
        totalScore += 2.0; // Score moyen
      } else if (bestSimilarity >= lowThreshold) {
        totalScore += 1.0; // Score faible mais comptabilisé
      }

      // Log pour debug des correspondances significatives
      if (bestSimilarity >= lowThreshold) {
        console.log(`Semantic match found: similarity ${bestSimilarity.toFixed(3)}, score added: ${bestSimilarity >= highThreshold ? 3.0 : bestSimilarity >= mediumThreshold ? 2.0 : 1.0}`);
      }
    }

    return totalScore;
  }

  // Compte les correspondances exactes et sémantiques avec scoring amélioré
  private async countMatches(words: string[], keywordData: KeywordData): Promise<number> {
    // Nettoyer et filtrer les mots (enlever les mots très courts, la ponctuation, etc.)
    const cleanWords = words
      .map(w => w.toLowerCase().replace(/[^\w]/g, ''))
      .filter(w => w.length > 2); // Ignorer les mots trop courts

    const exactMatches = cleanWords.filter(w => keywordData.set.has(w)).length;
    const remainingWords = cleanWords.filter(w => !keywordData.set.has(w));

    // Score de base pour les correspondances exactes (bonus important)
    let totalScore = exactMatches * 5.0;

    console.log("Exact matches:", exactMatches, "- Score from exact matches:", exactMatches * 5.0);

    if (remainingWords.length > 0) {
      const semanticScore = await this.semanticMatch(remainingWords, keywordData);
      totalScore += semanticScore;
      console.log("Semantic score:", semanticScore);
    }

    console.log(`Total score: ${totalScore}`);
    return totalScore;
  }

  private async getProfileData(did: string, agent: Agent) {
    return Promise.all([
      agent.getFollows({ actor: did, limit: 100 }).then(r => r.data.follows),
      agent.getAuthorFeed({ actor: did, limit: 50 }).then(r => r.data.feed),
    ]);
  }

  private getGlobalProfileEmbedding(profile: ProfileEmbeddings): number[] {
    const allEmbeddings = [
      profile.bio,
      ...profile.posts,
      ...profile.followingBio,
    ].filter(vec => vec.length > 0); // filtre les vides

    return this.averageVectors(allEmbeddings);
  }

  private averageVectors(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];

    const dim = vectors[0].length;
    const sum = new Array(dim).fill(0);

    for (const vec of vectors) {
      console.log(vec.length)
      if (vec.length !== dim) {
        console.error("Expected dimension:", dim, "but got:", vec.length);
        console.error("Vector content:", vec);
        throw new Error("Inconsistent embedding dimensions");
      }
      for (let i = 0; i < dim; i++) {
        sum[i] += vec[i];
      }
    }

    return sum.map(v => v / vectors.length);
  }

  private async getEmbedding(text: string): Promise<number[]> {
    try {
      if (!AIService.model) throw new Error("Model is not initialized");
      if (!text) throw new Error("Text is null");

      const cacheKey = this.generateCacheKey(text);
      if (this.embeddingsCache.has(cacheKey)) {
        return this.embeddingsCache.get(cacheKey)!;
      }

      const tensor = await AIService.model(text, {
        pooling: "mean",
        normalize: true,
      });

      const embedding = tensor.tolist()[0];
      this.embeddingsCache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.error("Error getting embedding:", error);
      throw error;
    }
  }

  /**
   * Méthode publique pour générer des embeddings
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    await AIService.modelPromise; // Attendre que le modèle soit initialisé
    return await this.getEmbedding(text);
  }

  public async getTargetedAudience(
    agent: Agent,
    did: string,
    keywords: string[],
    cursor: string | undefined
  ) {
    await AIService.modelPromise;
    const keywordData = await this.prepareKeywords(keywords);
    const followers: any[] = [];

    const response = await agent.getFollowers({ actor: did, limit: 100, cursor: cursor });
    console.log(`Fetched ${response.data.followers.length} followers.`);

    await this.apiQueue.addAll(response.data.followers.map(follow => async () => {
      const [following, posts] = await this.getProfileData(follow.did, agent);
      const descriptionMatches = follow.description
        ? await this.countMatches(follow.description.split(/\s+/), keywordData)
        : 0;

      const followingMatches = following.filter(f =>
        f.description && keywordData.set.has(f.description.toLowerCase())
      ).length;

      const postMatches = posts.reduce((sum, post) => {
        const text: string = (post.post.record as any)?.text || '';
        return sum + text.split(/\s+/).filter(w => keywordData.set.has(w.toLowerCase())).length;
      }, 0);

      console.log("Post matches:", postMatches, "Description matches:", descriptionMatches);
      const score = (posts.length > 0 ? (postMatches) / posts.length : 0)
        + (posts.length > 0 ? 0.4 : 0.6) * Math.sqrt(descriptionMatches)
        + (posts.length > 0 ? 0.3 : 0.4) * (following.length > 0 ? followingMatches / Math.log2(following.length + 1) : 0);

      followers.push({ profile: follow, score });
      console.log(`Follower ${follow.did} scored: ${score}`);
      cursor = response.data.cursor;
    }));

    console.log('Deleting low scored followers...');
    return { followers: followers.filter(follower => follower.score >= 0.8), responseCursor: cursor };
  }

  public async getSemanticSimilarity(text1: string, text2: string): Promise<number> {
    await AIService.modelPromise;
    if (!AIService.model) throw new Error('Model not initialized');

    // Vérifier le cache de similarité
    const cacheKey = this.generateCacheKey(text1, text2);
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!;
    }

    // Traiter les deux textes pour obtenir leurs embeddings
    const embeddingsRes = await AIService.model([text1, text2]);
    const embeddings = this.convertEmbeddings(embeddingsRes.data as Float32Array, 2);
    const normalized = this.normalizeEmbeddings(embeddings);

    // Calculer la similarité
    const similarity = this.cosineSimilarity(normalized[0], normalized[1]);

    // Mettre en cache le résultat
    this.similarityCache.set(cacheKey, similarity);

    return similarity;
  }

  public async getClassifiedFollowers(
    agent: Agent,
    profiles: ProfileView[]
  ) {
    try {
      await AIService.modelPromise;
      let profilesEmbeddings: ProfileEmbeddings[] = [];
      const profileProcessingQueue = new pQueue({ concurrency: 10 }); // Contrôle de la concurrence

      const tasks = profiles.map((profile) =>
        profileProcessingQueue.add(async () => {
          const [following, posts] = await this.getProfileData(profile.did, agent);
          let profileEmbeddings: ProfileEmbeddings = {
            handle: profile.handle,
            bio: [],
            posts: [],
            followingBio: [],
          };

          console.log("getting embedding of description");
          if (profile.description) {
            profileEmbeddings.bio = await this.getEmbedding(profile.description);
          }

          console.log("getting embedding of following");
          for (const follow of following) {
            if (follow.description) {
              profileEmbeddings.followingBio.push(await this.getEmbedding(follow.description));
            }
          }

          console.log("getting embedding of posts", posts.length);
          for (const post of posts as unknown as any) {
            const record = post.post?.record as any;
            if (!record?.text) continue;
            profileEmbeddings.posts.push(await this.getEmbedding(record.text));
          }

          profilesEmbeddings.push(profileEmbeddings);
        })
      );

      await Promise.all(tasks);

      let averageProfilesEmbeddings: AverageProfileEmbeddings[] = [];
      for (const profile of profilesEmbeddings) {
        const averageProfileEmbeddings = this.getGlobalProfileEmbedding(profile);
        averageProfilesEmbeddings.push({
          handle: profile.handle,
          embedding: averageProfileEmbeddings,
        });
      }

      const embeddings = averageProfilesEmbeddings.map((profile) => profile.embedding);
      const kmeans = KMeans.kmeans(embeddings, 10, {});
      const clusteredProfiles = averageProfilesEmbeddings.map((profile, idx) => ({
        handle: profile.handle,
        embedding: profile.embedding,
        cluster: kmeans.clusters[idx],
      }));

      console.log("clusteredProfiles", clusteredProfiles);
      return clusteredProfiles;
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Score la pertinence d'un profil basé sur sa description et éventuellement ses posts
   * Retourne un score de 0 à 100 (pourcentage de pertinence)
   */
  public async scoreProfileRelevance(
    profile: ProfileView,
    keywords: string[],
    agent?: Agent,
    includePostAnalysis: boolean = false
  ): Promise<number> {
    await AIService.modelPromise;

    try {
      const keywordData = await this.prepareKeywords(keywords);
      let totalScore = 0;
      let maxPossibleScore = 0;

      // 1. Analyse de la bio/description (poids: 60%)
      if (profile.description) {
        const bioWords = profile.description.split(/\s+/);
        const bioScore = await this.countMatches(bioWords, keywordData);
        // Ajuster la normalisation pour être plus permissive
        const normalizedBioScore = Math.min(bioScore / 5, 6); // Réduire le diviseur de 10 à 5
        totalScore += normalizedBioScore;
        console.log(`Bio score for ${profile.handle}: ${normalizedBioScore}/6 (raw: ${bioScore})`);
      }
      maxPossibleScore += 6;

      // 2. Analyse du handle/nom (poids: 20%)
      const handleWords = [
        profile.handle.replace(/[^\w]/g, ' '),
        profile.displayName || ''
      ].join(' ').split(/\s+/);

      const handleScore = await this.countMatches(handleWords, keywordData);
      // Réduire le diviseur pour être plus permissif
      const normalizedHandleScore = Math.min(handleScore / 3, 2); // Réduire de 5 à 3
      totalScore += normalizedHandleScore;
      maxPossibleScore += 2;
      console.log(`Handle score for ${profile.handle}: ${normalizedHandleScore}/2 (raw: ${handleScore})`);

      // 3. Analyse des posts récents (optionnel, poids: 20%)
      if (includePostAnalysis && agent) {
        try {
          const posts = await agent.getAuthorFeed({ actor: profile.did, limit: 10 });
          if (posts.data.feed.length > 0) {
            const postTexts = posts.data.feed
              .map((post: any) => (post.post?.record as any)?.text || '')
              .filter(text => text.length > 0)
              .slice(0, 5); // Analyser seulement les 5 derniers posts avec texte

            if (postTexts.length > 0) {
              const allPostWords = postTexts.join(' ').split(/\s+/);
              const postScore = await this.countMatches(allPostWords, keywordData);
              // Réduire le diviseur pour les posts aussi
              const normalizedPostScore = Math.min(postScore / 10, 2); // Réduire de 15 à 10
              totalScore += normalizedPostScore;
              console.log(`Post score for ${profile.handle}: ${normalizedPostScore}/2 (raw: ${postScore})`);
            }
          }
        } catch (error) {
          console.log(`Could not analyze posts for ${profile.handle}:`, error.message);
        }
      }
      maxPossibleScore += 2;

      // Convertir en pourcentage
      const finalScore = Math.round((totalScore / maxPossibleScore) * 100);
      console.log(`Final relevance score for ${profile.handle}: ${finalScore}% (${totalScore}/${maxPossibleScore})`);

      return finalScore;

    } catch (error) {
      console.error(`Error scoring profile ${profile.handle}:`, error);
      return 0;
    }
  }

  /**
   * Génère un tag combiné intelligent basé sur WordNet pour analyser la hiérarchie sémantique
   * Utilise les synsets, hypernymes et la profondeur dans la hiérarchie pour trouver le terme le plus général et approprié
   */
  public async generateCombinedClusterTag(tags: string[]): Promise<string> {
    try {
      console.log(`🔬 Analyzing ${tags.length} tags using WordNet semantic hierarchy...`)

      if (tags.length === 0) return 'Mixed Community'
      if (tags.length === 1) return tags[0]

      // Nettoyer et extraire les mots significatifs de tous les tags
      const allWords = this.extractSignificantWords(tags)
      console.log(`📝 Extracted significant words: ${allWords.join(', ')}`)

      if (allWords.length === 0) return tags[0] // Fallback au premier tag

      // Filtrer les mots valides avant WordNet
      const validWords = allWords.filter(word => this.isValidWordForWordNet(word))
      console.log(`🔍 Filtered to ${validWords.length} valid words for WordNet: ${validWords.join(', ')}`)

      if (validWords.length === 0) {
        console.log(`⚠️ No valid words for WordNet analysis, using fallback`)
        return tags.reduce((longest, current) =>
          current.length > longest.length ? current : longest
        )
      }

      // Analyser chaque mot avec WordNet
      const wordAnalysis = await Promise.all(
        validWords.map(word => this.analyzeWordWithWordNet(word))
      )

      // Filtrer les analyses valides
      const validAnalyses = wordAnalysis.filter(analysis => analysis.isValid)
      console.log(`✅ Found ${validAnalyses.length} valid WordNet analyses`)

      if (validAnalyses.length === 0) {
        // Fallback : retourner le tag le plus long
        return tags.reduce((longest, current) =>
          current.length > longest.length ? current : longest
        )
      }

      // Trouver le meilleur terme basé sur la généralité et la fréquence
      const bestTerm = this.selectBestTermFromAnalysis(validAnalyses, tags)
      console.log(`🎯 Selected best term: "${bestTerm}"`)

      return bestTerm

    } catch (error) {
      console.error('Error in generateCombinedClusterTag:', error)
      // Fallback en cas d'erreur
      return tags.reduce((longest, current) =>
        current.length > longest.length ? current : longest
      )
    }
  }

  /**
   * Génère un tag combiné basé sur les word embeddings (plus robuste que WordNet)
   * Calcule le centroïde des embeddings des tags et trouve le mot le plus proche
   */
  public async generateCombinedTagByEmbeddings(tags: string[], vocabulary?: string[]): Promise<string> {
    try {
      console.log(`🧠 Analyzing ${tags.length} tags using word embeddings...`)

      if (tags.length === 0) return 'Mixed Community'
      if (tags.length === 1) return tags[0]

      // 1. Obtenir les embeddings de tous les tags
      const tagEmbeddings: number[][] = []
      const validTags: string[] = []

      for (const tag of tags) {
        const embedding = await this.getEmbedding(tag.toLowerCase().trim())
        if (embedding.length > 0) {
          tagEmbeddings.push(embedding)
          validTags.push(tag)
        }
      }

      console.log(`📊 Got embeddings for ${tagEmbeddings.length}/${tags.length} tags`)

      if (tagEmbeddings.length === 0) {
        console.log('⚠️ No valid embeddings found, using fallback')
        return tags[0]
      }

      // 2. Calculer le centroïde (moyenne des embeddings)
      const centroid = this.averageVectors(tagEmbeddings)
      console.log(`🎯 Calculated centroid with ${centroid.length} dimensions`)

      // 3. Définir le vocabulaire de recherche
      const searchWords = vocabulary && vocabulary.length > 0 ? vocabulary : this.getDefaultVocabulary().concat(validTags)
      console.log(`🔍 Searching among ${searchWords.length} candidate words`)

      // 4. Trouver le mot le plus proche du centroïde
      let bestWord = validTags[0]
      let bestScore = -Infinity

      for (const word of searchWords) {
        const wordEmbedding = await this.getEmbedding(word.toLowerCase().trim())
        if (wordEmbedding.length === centroid.length) {
          const score = this.cosineSimilarity(centroid, wordEmbedding)
          if (score > bestScore) {
            bestScore = score
            bestWord = word
          }
        }
      }

      console.log(`🏆 Best match: "${bestWord}" (similarity: ${bestScore.toFixed(3)})`)

      // Capitaliser la première lettre du résultat
      return bestWord.charAt(0).toUpperCase() + bestWord.slice(1)

    } catch (error) {
      console.error('Error in generateCombinedTagByEmbeddings:', error)
      // Fallback vers le tag le plus long
      return tags.reduce((longest, current) =>
        current.length > longest.length ? current : longest
      )
    }
  }

  /**
   * Vocabulaire par défaut pour la recherche sémantique
   * Inclut des termes généraux et des domaines professionnels courants
   */
  private getDefaultVocabulary(): string[] {
    return [
      // Termes généraux
      'community', 'people', 'users', 'members', 'group', 'audience', 'network',

      // Domaines techniques
      'technology', 'developer', 'engineering', 'software', 'programming', 'coding',
      'data', 'science', 'analytics', 'research', 'innovation', 'digital',

      // Domaines créatifs
      'creative', 'design', 'art', 'content', 'media', 'writing', 'photography',
      'marketing', 'brand', 'communication', 'storytelling',

      // Domaines business
      'business', 'entrepreneur', 'startup', 'professional', 'industry', 'corporate',
      'finance', 'investment', 'management', 'leadership', 'strategy',

      // Domaines sociaux
      'social', 'culture', 'lifestyle', 'health', 'education', 'learning',
      'activism', 'politics', 'environment', 'sustainability',

      // Termes de niche
      'gaming', 'sports', 'music', 'travel', 'food', 'fashion', 'fitness',
      'productivity', 'mindfulness', 'innovation', 'collaboration'
    ]
  }

  /**
   * Extrait les mots significatifs des tags (supprime les mots vides, la ponctuation, etc.)
   */
  private extractSignificantWords(tags: string[]): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can'
    ])

    const words = new Set<string>()

    tags.forEach(tag => {
      // Diviser le tag en mots et nettoyer
      const tagWords = tag.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remplacer la ponctuation par des espaces
        .split(/\s+/)
        .filter(word =>
          word.length > 2 && // Mots de plus de 2 caractères
          !stopWords.has(word) && // Pas de mots vides
          /^[a-z]+$/.test(word) // Seulement des lettres
        )

      tagWords.forEach(word => words.add(word))
    })

    return Array.from(words)
  }

  /**
   * Vérifie si un mot est valide pour une analyse WordNet
   */
  private isValidWordForWordNet(word: string): boolean {
    try {
      const problematicWords = new Set([
        'writer',
        'affiliate',
        'api', 'url', 'http', 'https', 'www',
        'bitcoin', 'crypto', 'nft',
        'instagram', 'twitter', 'facebook', 'tiktok',
        'bot', 'ai', 'ml', 'ux', 'ui'
      ])

      if (!word || word.length < 3 || word.length > 20) {
        return false
      }

      // Vérifier si c'est un mot problématique connu
      if (problematicWords.has(word.toLowerCase())) {
        console.log(`⚠️ Skipping known problematic word: "${word}"`)
        return false
      }

      // Vérifier le format (seulement lettres)
      if (!/^[a-zA-Z]+$/.test(word)) {
        return false
      }

      // Éviter les mots avec des caractères répétés (possibles erreurs)
      if (/(.)\1{3,}/.test(word)) {
        return false
      }

      return true
    } catch (error) {
      console.log(`❌ Error validating word "${word}": ${error}`)
      return false
    }
  }

  /**
   * Analyse un mot avec WordNet pour obtenir ses propriétés sémantiques
   */
  private async analyzeWordWithWordNet(word: string): Promise<WordAnalysis> {
    return new Promise((resolve) => {
      const analysis: WordAnalysis = {
        word,
        isValid: false,
        synsets: [],
        generalityScore: 0,
        frequency: 0
      }

      try {
        // Chercher les synsets pour ce mot avec gestion d'erreur robuste
        WordNet.lookup(word, (err: any, definitions: any[]) => {
          try {
            if (err) {
              console.log(`❌ WordNet error for "${word}": ${err.message || err}`)
              resolve(analysis)
              return
            }

            if (!definitions || definitions.length === 0) {
              console.log(`❌ No WordNet definitions found for "${word}"`)
              resolve(analysis)
              return
            }

            analysis.isValid = true
            analysis.synsets = definitions

            // Calculer le score de généralité basé sur les hypernymes
            this.calculateGeneralityScore(definitions, analysis)
              .then(() => {
                console.log(`📊 "${word}": generality=${analysis.generalityScore.toFixed(2)}, synsets=${analysis.synsets.length}`)
                resolve(analysis)
              })
              .catch((calcError) => {
                console.log(`❌ Error calculating generality for "${word}": ${calcError}`)
                resolve(analysis)
              })
          } catch (callbackError) {
            console.log(`❌ WordNet callback error for "${word}": ${callbackError}`)
            resolve(analysis)
          }
        })
      } catch (error) {
        console.log(`❌ WordNet lookup error for "${word}": ${error}`)
        resolve(analysis)
      }
    })
  }  /**
   * Calcule le score de généralité d'un mot basé sur sa position dans la hiérarchie WordNet
   */
  private async calculateGeneralityScore(synsets: any[], analysis: WordAnalysis): Promise<void> {
    let totalDepth = 0
    let validSynsets = 0

    for (const synset of synsets) {
      try {
        // Calculer la profondeur dans la hiérarchie en remontant les hypernymes
        const depth = await this.getHierarchyDepth(synset)
        if (depth > 0) {
          totalDepth += depth
          validSynsets++
        }
      } catch (error) {
        // Ignorer les erreurs pour ce synset
      }
    }

    if (validSynsets > 0) {
      const averageDepth = totalDepth / validSynsets
      // Score de généralité : plus la profondeur est faible, plus c'est général
      // Normaliser entre 0 et 1 (profondeur max estimée à 15)
      analysis.generalityScore = Math.max(0, 1 - (averageDepth / 15))
    }
  }

  /**
   * Calcule la profondeur d'un synset dans la hiérarchie WordNet
   */
  private async getHierarchyDepth(synset: any): Promise<number> {
    return new Promise((resolve) => {
      const maxDepth = 15 // Limite pour éviter les boucles infinies

      const traverseUp = (currentSynset: any, currentDepth: number) => {
        if (currentDepth >= maxDepth) {
          resolve(currentDepth)
          return
        }

        // Obtenir les hypernymes (concepts plus généraux)
        WordNet.getHypernyms(currentSynset.synsetOffset, currentSynset.pos, (err: any, hypernyms: any[]) => {
          if (err || !hypernyms || hypernyms.length === 0) {
            // Pas d'hypernymes trouvés, on est probablement près de la racine
            resolve(currentDepth)
            return
          }

          // Prendre le premier hypernyme et continuer la traversée
          traverseUp(hypernyms[0], currentDepth + 1)
        })
      }

      traverseUp(synset, 1)
    })
  }

  /**
   * Sélectionne le meilleur terme basé sur l'analyse WordNet
   */
  private selectBestTermFromAnalysis(analyses: WordAnalysis[], originalTags: string[]): string {
    // Calculer la fréquence de chaque mot dans les tags originaux
    const wordFrequency = new Map<string, number>()

    originalTags.forEach(tag => {
      const words = this.extractSignificantWords([tag])
      words.forEach(word => {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1)
      })
    })

    // Mettre à jour les scores de fréquence
    analyses.forEach(analysis => {
      analysis.frequency = wordFrequency.get(analysis.word) || 0
    })

    // Trier par score composite : généralité (60%) + fréquence (40%)
    analyses.sort((a, b) => {
      const scoreA = (a.generalityScore * 0.6) + ((a.frequency / originalTags.length) * 0.4)
      const scoreB = (b.generalityScore * 0.6) + ((b.frequency / originalTags.length) * 0.4)
      return scoreB - scoreA
    })

    const bestAnalysis = analyses[0]
    console.log(`🏆 Best analysis: "${bestAnalysis.word}" (generality: ${bestAnalysis.generalityScore.toFixed(3)}, frequency: ${bestAnalysis.frequency})`)

    // Retourner le mot le mieux classé, en capitalisant la première lettre
    return bestAnalysis.word.charAt(0).toUpperCase() + bestAnalysis.word.slice(1)
  }


}

type AverageProfileEmbeddings = {
  handle: string,
  embedding: number[]
}


type ProfileEmbeddings = {
  handle: string,
  bio: number[],
  posts: number[][],
  followingBio: number[][],
}

