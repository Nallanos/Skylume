import type { ProfileView } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { Agent } from "@atproto/api";
import pQueue from 'p-queue';
import KMeans from 'ml-kmeans';
import crypto from 'crypto';


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
  private apiQueue = new pQueue({ concurrency: 15, interval: 600, intervalCap: 5 }); // Augmentation de la concurrence

  // Cache pour stocker les embeddings déjà calculés
  private embeddingsCache: Map<string, number[]> = new Map();
  private similarityCache: Map<string, number> = new Map();

  constructor() {
    TargetAudienceService.modelPromise = this.initModel();
    console.log('TargetAudienceService initialized with cache');
  }

  private async initModel() {
    console.log('Initializing Transformers model (all-MiniLM-L6-v2)...');
    if (!TargetAudienceService.model) {
      try {
        // Crée un pipeline pour l'extraction d'embeddings (le modèle sera téléchargé si nécessaire)
        TargetAudienceService.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
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
    await TargetAudienceService.modelPromise;
    const kwSet = new Set(keywords);
    if (!TargetAudienceService.model) {
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
      const res = await TargetAudienceService.model(uncachedKeywords);
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
    if (!TargetAudienceService.model) throw new Error('Model not initialized');

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
      const wordEmbeddingsRes = await TargetAudienceService.model(uncachedWords);
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
      if (!TargetAudienceService.model) throw new Error("Model is not initialized");
      if (!text) throw new Error("Text is null");

      const cacheKey = this.generateCacheKey(text);
      if (this.embeddingsCache.has(cacheKey)) {
        return this.embeddingsCache.get(cacheKey)!;
      }

      const tensor = await TargetAudienceService.model(text, {
        pooling: "mean",
        normalize: true,
      });

      const embedding = tensor.tolist()[0];
      this.embeddingsCache.set(cacheKey, embedding);
      return embedding;
    } catch (err) {
      console.error("Error while getting embedding", err);
      return [];
    }
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

    // Vérifier le cache de similarité
    const cacheKey = this.generateCacheKey(text1, text2);
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!;
    }

    // Traiter les deux textes pour obtenir leurs embeddings
    const embeddingsRes = await TargetAudienceService.model([text1, text2]);
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
      await TargetAudienceService.modelPromise;
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

