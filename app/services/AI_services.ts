import type { ProfileView } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { Agent } from "@atproto/api";
import pQueue from 'p-queue';
import KMeans from 'ml-kmeans';

// Import Transformers.js (cela fonctionnera localement avec WASM ou en pur JS)
import { FeatureExtractionPipeline, pipeline, Tensor } from '@xenova/transformers';

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

      const tensor = await TargetAudienceService.model(text, {
        pooling: "mean",
        normalize: true,
      });

      const embedding = tensor.tolist()[0];
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

export default new TargetAudienceService();
