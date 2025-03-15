import { Agent } from "@atproto/api"
import * as tf from '@tensorflow/tfjs-node'
import * as ai from "@tensorflow-models/universal-sentence-encoder"
import type { FollowerWithScore } from "../bluesky/types.js"
import pQueue from 'p-queue'

type KeywordData = {
  set: Set<string>
  embeddings: tf.Tensor2D
}

export class TargetAudienceService {
  private static model: ai.UniversalSentenceEncoder
  private static modelPromise: Promise<void>
  private apiQueue = new pQueue({ concurrency: 5, interval: 1200, intervalCap: 2 })

  constructor() {
    TargetAudienceService.modelPromise = this.initModel()
  }

  private async initModel() {
    console.log('Initializing Universal Sentence Encoder model...')
    if (!TargetAudienceService.model) {
      try {
        TargetAudienceService.model = await ai.load()
        console.log('Model loaded successfully.')
      } catch (error) {
        console.log('Error loading Universal Sentence Encoder model:', error)
      }
    }
  }

  private async prepareKeywords(keywords: string[]): Promise<KeywordData> {
    console.log('Preparing keywords for embedding...')
    await TargetAudienceService.modelPromise
    const kwSet = new Set(keywords.map(k => k.toLowerCase()))
    const embeddings = await TargetAudienceService.model.embed(keywords)
    console.log(`Prepared embeddings for ${keywords.length} keywords.`)
    return { set: kwSet, embeddings: this.normalize(embeddings as unknown as tf.Tensor2D) }
  }

  private normalize(tensor: tf.Tensor2D): tf.Tensor2D {
    const norm = tf.norm(tensor, 'euclidean', 1, true)
    return tf.div(tensor, norm)
  }

  private async semanticMatch(words: string[], keywordData: KeywordData): Promise<number> {
    const wordEmbeddings = await TargetAudienceService.model.embed(words)
    const normalizedWords = this.normalize(wordEmbeddings as unknown as tf.Tensor2D)

    try {
      const similarityMatrix = tf.matMul(normalizedWords, keywordData.embeddings.transpose())
      const similarities = await similarityMatrix.array() as number[][]
      return similarities.flat().filter(s => s > 0.65).length
    } finally {
      tf.dispose([wordEmbeddings as unknown as tf.Tensor2D, normalizedWords])
    }
  }

  private async countMatches(words: string[], keywordData: KeywordData): Promise<number> {
    const exactMatches = words.filter(w => keywordData.set.has(w.toLowerCase())).length
    const remainingWords = words.filter(w => !keywordData.set.has(w.toLowerCase()))

    let matchCount = exactMatches
    console.log("Exact matches:", exactMatches)
    if (remainingWords.length > 0) {
      matchCount += await this.semanticMatch(remainingWords, keywordData)
    }
    console.log(`Total matches: ${matchCount}`)
    return matchCount
  }

  private async getProfileData(did: string, agent: Agent) {
    return Promise.all([
      agent.getFollows({ actor: did, limit: 100 }).then(r => r.data.follows),
      agent.getAuthorFeed({ actor: did, limit: 50 }).then(r => r.data.feed),
    ])

  }

  public async getTargetedAudience(
    agent: Agent,
    did: string,
    keywords: string[],
    cursor: string | undefined
  ) {
    await TargetAudienceService.modelPromise
    const keywordData = await this.prepareKeywords(keywords)
    const followers: FollowerWithScore[] = []

    const response = await agent.getFollowers({ actor: did, limit: 100, cursor: cursor })
    console.log(`Fetched ${response.data.followers.length} followers.`)

    await this.apiQueue.addAll(response.data.followers.map(follow => async () => {
      const [following, posts] = await this.getProfileData(follow.did, agent)

      // Calcul des composants du score
      const descriptionMatches = follow.description
        ? await this.countMatches(follow.description.split(/\s+/), keywordData)
        : 0

      const followingMatches = following.filter(f =>
        f.description && keywordData.set.has(f.description.toLowerCase())
      ).length

      const postMatches = posts.reduce((sum, post) => {
        const text: string = (post.post.record as any)?.text || ''
        return sum + text.split(/\s+/).filter(w => keywordData.set.has(w.toLowerCase())).length
      }, 0)

      console.log("Valeur spécifiée:", postMatches, descriptionMatches)
      // Formule de score optimisée
      const score = (posts.length > 0 ? 1 * (postMatches) / posts.length : 0)
        + (posts.length > 0 ? 0.4 : 0.6) * Math.sqrt(descriptionMatches)
        + (posts.length > 0 ? 0.3 : 0.4) * (following.length > 0 ? followingMatches / Math.log2(following.length + 1) : 0);

      followers.push({ profile: follow, score })
      console.log(`Follower ${follow.did} scored: ${score}`)
      cursor = response.data.cursor
    }))


    console.log('Deleting low scored followers...')
    return { followers: followers.filter(follower => follower.score >= 0.8), responseCursor: cursor };
  }
}
