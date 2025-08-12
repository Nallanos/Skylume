import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import Account from '#models/account'
import DmCampaign from '#models/dm_campaign'
import FollowerCampaign from '#models/follower_campaign'
import AccountManager from './account_manager.js'
import { AIService } from './AI_services.js'
import CampaignMessageService from './campaign_message_service.js'
import { parseKeywords } from '../utils/keywords.js'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'

type BioQuality = 'good' | 'poor' | 'empty' | 'spam'
type InterestLevel = 'interested' | 'moderately_interested' | 'not_interested' | 'excluded' | 'cannot_determine'

@inject()
export default class DmCampaignAnalysisService {
  constructor(
    protected accountManager: AccountManager,
    protected aiService: AIService,
    protected campaignMessageService: CampaignMessageService
  ) {}

  /**
   * Analyser tous les followers d'une campagne DM
   */
  public async analyzeAccountFollowers(campaign: DmCampaign): Promise<void> {
    try {
      // Mettre à jour le statut de la campagne
      campaign.analysisStatus = 'in_progress'
      campaign.analysisStartedAt = DateTime.now()
      await campaign.save()

      // Obtenir le compte associé
      const account = await Account.findByOrFail('handle', campaign.accountHandle)
      const accountService = await this.accountManager.getOrCreateAccountService(account)
      await accountService.createOrResumeSession(account)

      // Générer les embeddings pour chaque keyword individuellement
      const keywords = parseKeywords(campaign.keywords)
      const keywordArray = Array.isArray(keywords) ? keywords : [String(keywords)]
      const keywordsEmbeddings: number[][] = []
      
      for (const keyword of keywordArray) {
        if (keyword.trim().length > 0) {
          const embedding = await this.aiService.generateEmbedding(keyword.trim())
          keywordsEmbeddings.push(embedding)
        }
      }
      
      // Store embeddings as JSON string
      campaign.keywordsEmbeddings = JSON.stringify(keywordsEmbeddings)

      // Générer les embeddings pour les mots-clés d'exclusion
      let excludeKeywordsEmbeddings: number[][] = []
      if (campaign.excludeKeywords) {
        const excludeKeywords = parseKeywords(campaign.excludeKeywords)
        const excludeKeywordArray = Array.isArray(excludeKeywords) ? excludeKeywords : [String(excludeKeywords)]
        
        for (const keyword of excludeKeywordArray) {
          if (keyword.trim().length > 0) {
            const embedding = await this.aiService.generateEmbedding(keyword.trim())
            excludeKeywordsEmbeddings.push(embedding)
          }
        }
        
        campaign.excludeKeywordsEmbeddings = JSON.stringify(excludeKeywordsEmbeddings)
      }
      
      await campaign.save()

      // Récupérer tous les followers
      const followers = await this.getAllFollowers(accountService, account)
      console.log(`Analysing ${followers.length} followers for campaign ${campaign.name}`)

      // Supprimer les anciens résultats d'analyse
      await FollowerCampaign.query().where('dmCampaignId', campaign.id).delete()

      // Analyser chaque follower
      for (const follower of followers) {
        try {
          // Nettoyer et analyser la bio
          const { cleanedBio, quality } = this.cleanBio(follower.description || '')
          
          let similarityScore: number | null = null
          let interestLevel: InterestLevel = 'cannot_determine'

          // Calculer la similarité seulement si la bio est de bonne qualité
          if (quality === 'good' && cleanedBio.length > 0) {
            try {
              if (excludeKeywordsEmbeddings.length > 0) {
                const excludeSimilarity = await this.calculateSimilarity(cleanedBio, excludeKeywordsEmbeddings)
                if (excludeSimilarity >= 0.5) { 
                  interestLevel = 'excluded'
                  similarityScore = excludeSimilarity
                } else {
                  similarityScore = await this.calculateSimilarity(cleanedBio, keywordsEmbeddings)
                  interestLevel = this.determineInterestLevel(similarityScore, campaign)
                }
              } else {
                similarityScore = await this.calculateSimilarity(cleanedBio, keywordsEmbeddings)
                interestLevel = this.determineInterestLevel(similarityScore, campaign)
              }
            } catch (error) {
              console.warn(`Failed to calculate similarity for ${follower.handle}:`, error)
              interestLevel = 'cannot_determine'
            }
          }

          await FollowerCampaign.create({
            dmCampaignId: campaign.id,
            followerDid: follower.did,
            followerHandle: follower.handle,
            followerBio: follower.description || null,
            cleanedBio: quality === 'good' ? cleanedBio : null,
            similarityScore,
            interestLevel,
            bioQuality: quality,
            messageSent: false,
            responseReceived: false,
            analysisMetadata: {
              followersCount: follower.followersCount || 0,
              postsCount: follower.postsCount || 0,
              labels: follower.labels?.map(l => l.val) || []
            }
          })

        } catch (error) {
          console.error(`Error analyzing follower ${follower.handle}:`, error)
          
          // Sauvegarder avec erreur - ensure error message is a string
          const errorMessage = error instanceof Error ? error.message : String(error)
          
          await FollowerCampaign.create({
            dmCampaignId: campaign.id,
            followerDid: follower.did,
            followerHandle: follower.handle,
            followerBio: follower.description || null,
            cleanedBio: null,
            similarityScore: null,
            interestLevel: 'cannot_determine',
            bioQuality: 'poor',
            messageSent: false,
            responseReceived: false,
            analysisMetadata: { error: errorMessage }
          })
        }
      }

      // Calculer dynamiquement les compteurs à partir des FollowerCampaigns
      const counts = await FollowerCampaign.query()
        .where('dmCampaignId', campaign.id)
        .groupBy('interestLevel')
        .count('* as total')
        .select('interestLevel')

      // Initialiser tous les compteurs à 0
      let interestedCount = 0
      let moderatelyInterestedCount = 0
      let notInterestedCount = 0
      let excludedCount = 0
      let cannotDetermineCount = 0

      // Parcourir les résultats et assigner les compteurs
      for (const count of counts) {
        const total = Number(count.$extras.total)
        switch (count.interestLevel) {
          case 'interested':
            interestedCount = total
            break
          case 'moderately_interested':
            moderatelyInterestedCount = total
            break
          case 'not_interested':
            notInterestedCount = total
            break
          case 'excluded':
            excludedCount = total
            break
          case 'cannot_determine':
            cannotDetermineCount = total
            break
        }
      }

      // Mettre à jour les compteurs de la campagne
      campaign.totalFollowersAnalyzed = followers.length
      campaign.interestedFollowers = interestedCount
      campaign.moderatelyInterestedFollowers = moderatelyInterestedCount
      campaign.notInterestedFollowers = notInterestedCount
      campaign.excludedFollowers = excludedCount
      campaign.cannotDetermineFollowers = cannotDetermineCount
      campaign.analysisStatus = 'completed'
      campaign.analysisCompletedAt = DateTime.now()

      await campaign.save()

      console.log(`Analysis completed for campaign ${campaign.name}:`, {
        total: followers.length,
        interested: interestedCount,
        moderately: moderatelyInterestedCount,
        notInterested: notInterestedCount,
        excluded: excludedCount,
        cannotDetermine: cannotDetermineCount
      })

    } catch (error) {
      console.error('Error during follower analysis:', error)
      campaign.analysisStatus = 'failed'
      await campaign.save()
      throw error
    }
  }

  /**
   * Nettoyer et valider une bio
   */
  private cleanBio(bio: string): { cleanedBio: string, quality: BioQuality } {
    if (!bio || bio.trim().length === 0) {
      return { cleanedBio: '', quality: 'empty' }
    }

    // Nettoyer la bio
    let cleaned = bio
      // Supprimer les URLs
      .replace(/https?:\/\/[^\s]+/g, '')
      // Supprimer les mentions excessives (plus de 3)
      .replace(/@\w+/g, (match, offset, str) => {
        const beforeMatch = str.substring(0, offset)
        const mentionCount = (beforeMatch.match(/@\w+/g) || []).length
        return mentionCount >= 3 ? '' : match
      })
      // Supprimer les hashtags excessifs (plus de 5)
      .replace(/#\w+/g, (match, offset, str) => {
        const beforeMatch = str.substring(0, offset)
        const hashtagCount = (beforeMatch.match(/#\w+/g) || []).length
        return hashtagCount >= 5 ? '' : match
      })
      // Supprimer les caractères spéciaux excessifs
      .replace(/[^\w\s@#.,!?-]/g, '')
      // Supprimer les espaces multiples
      .replace(/\s+/g, ' ')
      .trim()

    // Détecter le spam
    const words = cleaned.split(/\s+/)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    const repetitionRatio = uniqueWords.size / Math.max(words.length, 1)
    
    // Critères de qualité
    if (cleaned.length < 10) {
      return { cleanedBio: cleaned, quality: 'poor' }
    }
    
    if (repetitionRatio < 0.3 || words.length < 3) {
      return { cleanedBio: cleaned, quality: 'spam' }
    }

    if (cleaned.length < 25 || words.length < 5) {
      return { cleanedBio: cleaned, quality: 'poor' }
    }

    return { cleanedBio: cleaned, quality: 'good' }
  }

  /**
   * Calculer la similarité entre une bio et les keywords
   * Retourne le score de similarité maximum avec l'un des mots-clés
   */
  private async calculateSimilarity(bio: string, keywordsEmbeddings: number[][]): Promise<number> {
    try {
      const bioEmbedding = await this.aiService.generateEmbedding(bio)
      
      let maxSimilarity = 0
      for (const keywordEmbedding of keywordsEmbeddings) {
        const similarity = this.cosineSimilarity(bioEmbedding, keywordEmbedding)
        maxSimilarity = Math.max(maxSimilarity, similarity)
      }
      
      return maxSimilarity
    } catch (error) {
      console.error('Error calculating similarity:', error)
      throw error
    }
  }

  /**
   * Calculer la similarité cosinus entre deux vecteurs
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  /**
   * Déterminer le niveau d'intérêt basé sur le score de similarité et les seuils de la campagne
   */
  private determineInterestLevel(score: number, campaign: DmCampaign): InterestLevel {
    const interestedThreshold = campaign.interestedThreshold || 0.7
    const moderatelyInterestedThreshold = campaign.moderatelyInterestedThreshold || 0.5
    
    if (score >= interestedThreshold) {
      return 'interested'
    } else if (score >= moderatelyInterestedThreshold) {
      return 'moderately_interested'
    } else {
      return 'not_interested'
    }
  }

  /**
   * Récupérer tous les followers d'un compte avec pagination
   */
  private async getAllFollowers(accountService: any, account: Account): Promise<ProfileView[]> {
    const allFollowers: ProfileView[] = []
    let cursor: string | undefined

    try {
      const actor = account.did || account.handle
      
      while (true) {
        const response = await accountService.getFollowers(account, actor, cursor)
        
        if (!response.followers || response.followers.length === 0) {
          break
        }

        allFollowers.push(...response.followers)
        
        if (!response.cursor) {
          break
        }
        
        cursor = response.cursor
        
        // Petite pause pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error('Error fetching followers:', error)
      throw error
    }

    return allFollowers
  }
}
