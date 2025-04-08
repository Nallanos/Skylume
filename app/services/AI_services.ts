import type { ProfileView } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { Agent } from "@atproto/api";
import pQueue from 'p-queue';
import { removeStopwords, eng } from 'stopword';

// Import Transformers.js (cela fonctionnera localement avec WASM ou en pur JS)
import { FeatureExtractionPipeline, pipeline } from '@xenova/transformers';

type KeywordData = {
  set: Set<string>;
  embeddings: number[][]; // tableau de nombres pour les embeddings
}

export class TargetAudienceService {
  // Utilisation d'un modèle via Transformers.js
  private static model: FeatureExtractionPipeline | null = null;
  private static modelPromise: Promise<void>;
  private apiQueue = new pQueue({ concurrency: 5, interval: 1200, intervalCap: 2 });

  constructor() {
    TargetAudienceService.modelPromise = this.initModel();
  }

  private async initModel() {
    console.log('Initializing Transformers model (all-MiniLM-L6-v2)...');
    if (!TargetAudienceService.model) {
      try {
        // Crée un pipeline pour l’extraction d’embeddings (le modèle sera téléchargé si nécessaire)
        TargetAudienceService.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('Model loaded successfully.');
      } catch (error) {
        console.log('Error loading Transformers model:', error);
      }
    }
  }

  // ──────────────────────────────
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
    await TargetAudienceService.modelPromise;
    const kwSet = new Set(keywords);
    if (!TargetAudienceService.model) {
      throw new Error('Model not initialized');
    }
    const res = await TargetAudienceService.model(keywords);
    // Conversion du DataArray en number[][]
    const embeddings = this.convertEmbeddings(res.data as Float32Array, keywords.length);
    console.log(`Prepared embeddings for ${keywords.length} keywords. ${embeddings.length} embeddings generated.`);
    return { set: kwSet, embeddings: this.normalizeEmbeddings(embeddings) };
  }

  // ──────────────────────────────
  // Normalise un tableau d'embeddings (chaque vecteur) pour obtenir une norme égale à 1
  private normalizeEmbeddings(embeddings: number[][]): number[][] {
    return embeddings.map(vector => {
      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      return vector.map(v => v / norm);
    });
  }

  // ──────────────────────────────
  // Calcul de la similarité cosinus (les vecteurs étant normalisés, le produit scalaire suffit)
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dot = 0;
    for (let i = 0; i < vec1.length; i++) {
      dot += vec1[i] * vec2[i];
    }
    return dot;
  }

  // ──────────────────────────────
  // Méthode de clustering avec k-means sur les embeddings des tokens uniques.
  // On sélectionne le token le plus fréquent dans chaque cluster comme mot-clé représentatif.
  // Version améliorée : on concatène toutes les descriptions pour utiliser l'intégralité du texte.
  private async generateDynamicKeywords(profiles: ProfileView[], top: number = 10): Promise<string[]> {
    // 1. Concaténer toutes les descriptions en une seule chaîne.

    let combinedDescriptions = "";
    for (const profile of profiles) {
      if (profile.description) {
        combinedDescriptions += " " + profile.description.toLowerCase();
      }
    }
    if (!combinedDescriptions) return [];

    // Définir les stopwords personnalisés.
    const customStopwords = new Set([
      "com", "https", "http", "www", "org", "net", "trump", "good", "not",
      "pro", "con", "like", "love", "hate", "want", "need", "see", "say",
      "go", "get", "make", "know", "dms", "dm", "off", "life", "fuck",
      "future", "link", "linktree", "just", "time", "day", "year", "people",
      "follow", "build"
    ]);

    // 2. Extraire les tokens de l'intégralité du texte.
    const tokens = combinedDescriptions.split(/\W+/)
      .filter(word => word.length > 2 && !customStopwords.has(word));
    // Supprimer les stopwords en anglais.
    const filteredTokens = removeStopwords(tokens, eng);

    // 3. Utiliser le modèle pour extraire les embeddings de tous ces tokens.
    await TargetAudienceService.modelPromise;
    if (!TargetAudienceService.model) throw new Error('Model not initialized');
    const embeddingResult = await TargetAudienceService.model(filteredTokens);
    const embeddings = this.convertEmbeddings(embeddingResult.data as Float32Array, filteredTokens.length);
    const normalizedEmbeddings = this.normalizeEmbeddings(embeddings);

    // 4. Clustering par k-means. Si le nombre de tokens est inférieur à "top", on ajuste k.
    const k = Math.min(top, filteredTokens.length);
    const clusters = this.kMeans(normalizedEmbeddings, k);

    // 5. Pour chaque cluster, sélectionner le token ayant la fréquence la plus élevée.
    const tokenFrequency = new Map<string, number>();
    filteredTokens.forEach(token => {
      tokenFrequency.set(token, (tokenFrequency.get(token) || 0) + 1);
    });

    const representativeTokens: string[] = [];
    for (const cluster of clusters) {
      let bestToken = "";
      let bestFreq = 0;
      for (const idx of cluster.indices) {
        const token = filteredTokens[idx];
        const freq = tokenFrequency.get(token) || 0;
        if (freq > bestFreq) {
          bestFreq = freq;
          bestToken = token;
        }
      }
      if (bestToken) representativeTokens.push(bestToken);
    }

    console.log("Dynamic keywords generated (clustering):", representativeTokens);
    return representativeTokens;
  }

  // ──────────────────────────────
  // Calcul de la distance euclidienne entre deux vecteurs.
  private euclideanDistance(vec1: number[], vec2: number[]): number {
    return Math.sqrt(vec1.reduce((sum, v, i) => sum + (v - vec2[i]) ** 2, 0));
  }

  // Implémentation simple de k-means sur un ensemble de vecteurs.
  private kMeans(data: number[][], k: number, maxIter = 100): { indices: number[] }[] {
    const n = data.length;
    if (n === 0) return [];

    // Initialisation : choisir k indices aléatoires distincts comme centroïdes.
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();
    while (centroids.length < k) {
      const idx = Math.floor(Math.random() * n);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        centroids.push([...data[idx]]);
      }
    }

    let assignments: number[] = new Array(n).fill(-1);
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      // Affecter chaque point au centroïde le plus proche.
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestCluster = -1;
        for (let j = 0; j < k; j++) {
          const dist = this.euclideanDistance(data[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        }
        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }
      if (!changed) break;

      // Recalcul des centroïdes.
      const newCentroids: number[][] = Array.from({ length: k }, () => new Array(data[0].length).fill(0));
      const counts = new Array(k).fill(0);
      for (let i = 0; i < n; i++) {
        const cluster = assignments[i];
        counts[cluster]++;
        for (let d = 0; d < data[i].length; d++) {
          newCentroids[cluster][d] += data[i][d];
        }
      }
      for (let j = 0; j < k; j++) {
        if (counts[j] === 0) continue;
        for (let d = 0; d < newCentroids[j].length; d++) {
          newCentroids[j][d] /= counts[j];
        }
      }
      centroids.splice(0, centroids.length, ...newCentroids);
    }

    // Regrouper les indices par cluster.
    const clusters: { indices: number[] }[] = Array.from({ length: k }, () => ({ indices: [] }));
    assignments.forEach((cluster, idx) => {
      clusters[cluster].indices.push(idx);
    });
    return clusters;
  }

  // ──────────────────────────────
  // Calcul de la similarité sémantique entre un ensemble de mots et des keywords.
  private async semanticMatch(words: string[], keywordData: KeywordData): Promise<number> {
    if (!TargetAudienceService.model) throw new Error('Model not initialized');
    const wordEmbeddingsRes = await TargetAudienceService.model(words);
    const wordEmbeddings = this.convertEmbeddings(wordEmbeddingsRes.data as Float32Array, words.length);
    const normalizedWords = this.normalizeEmbeddings(wordEmbeddings);
    let matchCount = 0;
    const threshold = 0.65;
    for (let i = 0; i < normalizedWords.length; i++) {
      for (let j = 0; j < keywordData.embeddings.length; j++) {
        const sim = this.cosineSimilarity(normalizedWords[i], keywordData.embeddings[j]);
        if (sim > threshold) matchCount++;
      }
    }
    return matchCount;
  }

  // Compte les correspondances exactes et sémantiques
  private async countMatches(words: string[], keywordData: KeywordData): Promise<number> {
    const exactMatches = words.filter(w => keywordData.set.has(w.toLowerCase())).length;
    const remainingWords = words.filter(w => !keywordData.set.has(w.toLowerCase()));
    let matchCount = exactMatches;
    console.log("Exact matches:", exactMatches);
    if (remainingWords.length > 0) {
      matchCount += await this.semanticMatch(remainingWords, keywordData);
    }
    console.log(`Total matches: ${matchCount}`);
    return matchCount;
  }

  private async getProfileData(did: string, agent: Agent) {
    return Promise.all([
      agent.getFollows({ actor: did, limit: 100 }).then(r => r.data.follows),
      agent.getAuthorFeed({ actor: did, limit: 50 }).then(r => r.data.feed),
    ]);
  }
  // ──────────────────────────────
  // Classifie les intérêts d'un profil à partir de sa description en se basant sur les mots-clés dynamiques.
  private async classifyProfileInterest(
    profile: ProfileView,
    keywordData: KeywordData,
    interestKeywords: string[]
  ): Promise<string[]> {
    if (!profile.description) return [];
    const descriptionWords = profile.description.split(/\s+/).map(w => w.toLowerCase());
    const filteredWords = removeStopwords(descriptionWords, eng);
    if (!TargetAudienceService.model) throw new Error('Model not initialized');
    const wordEmbeddingsRes = await TargetAudienceService.model(filteredWords);
    const wordEmbeddings = this.convertEmbeddings(wordEmbeddingsRes.data as Float32Array, filteredWords.length);
    const normalizedWordEmbeddings = this.normalizeEmbeddings(wordEmbeddings);
    const interests: string[] = [];
    const threshold = 0.65;
    for (let i = 0; i < interestKeywords.length; i++) {
      const keyword = interestKeywords[i];
      if (filteredWords.includes(keyword.toLowerCase())) {
        interests.push(keyword);
        continue;
      }
      // Obtenir l'embedding du mot-clé
      const kwRes = await TargetAudienceService.model([keyword]);
      const kwEmbeddingArr = this.convertEmbeddings(kwRes.data as Float32Array, 1);
      const normalizedKw = this.normalizeEmbeddings(kwEmbeddingArr)[0];
      // Comparer avec chaque mot de la description
      let maxSim = 0;
      for (let j = 0; j < normalizedWordEmbeddings.length; j++) {
        const sim = this.cosineSimilarity(normalizedWordEmbeddings[j], normalizedKw);
        if (sim > maxSim) {
          maxSim = sim;
        }
      }
      if (maxSim >= threshold) {
        interests.push(keyword);
      }
    }
    return interests;
  }

  public async getTargetedAudience(
    agent: Agent,
    did: string,
    keywords: string[],
    cursor: string | undefined
  ) {
    await TargetAudienceService.modelPromise;
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
    await TargetAudienceService.modelPromise;
    if (!TargetAudienceService.model) throw new Error('Model not initialized');
    const embeddingsRes = await TargetAudienceService.model([text1, text2]);
    const embeddings = this.convertEmbeddings(embeddingsRes.data as Float32Array, 2);
    const normalized = this.normalizeEmbeddings(embeddings);
    return this.cosineSimilarity(normalized[0], normalized[1]);
  }



  public async getClassifiedFollowers(
    agent: Agent,
    profiles: ProfileView[]
  ) {
    try {
      await TargetAudienceService.modelPromise;
      // Générer des mots-clés dynamiques à partir des profils.
      const dynamicKeywords = await this.generateDynamicKeywords(profiles, 10);
      console.log(dynamicKeywords)
      const keywordData = await this.prepareKeywords(dynamicKeywords);
      const results: { handle: string, interest: string[] }[] = [];

      for (const profile of profiles) {
        // Récupération des données additionnelles : following et posts du profil
        const [following, posts] = await this.getProfileData(profile.did, agent);

        // Concaténer la description du profil, les bios des comptes suivis et le texte des posts
        let combinedText = profile.description ? profile.description : "";

        following.forEach(follow => {
          if (follow.description) {
            combinedText += " " + follow.description;
          }
        });

        posts.forEach(post => {
          // On suppose ici que la structure des posts reste similaire à celle utilisée dans getTargetedAudience.
          const text: string = (post.post?.record as any)?.text || "";
          combinedText += " " + text;
        });

        // Création d'un objet temporaire en réinjectant la description combinée
        const tempProfile: ProfileView = { ...profile, description: combinedText };

        // Classification des intérêts à partir de la description combinée
        const interests = await this.classifyProfileInterest(tempProfile, keywordData, dynamicKeywords);
        results.push({ handle: profile.handle, interest: interests });
      }
      return results;
    } catch (err) {
      console.error("error while getting classiefied cofoerpazjkrjaeu gtnhezi" + "ta mère la pute" + err)
    }

  }
}

export default new TargetAudienceService();
