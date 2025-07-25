import { inject } from '@adonisjs/core'
import Account from '#models/account'
import AnalysisAudience from '#models/analysis_audience'
import AccountManager from './account_manager.js'


@inject()
export default class FollowerBatchService {
  constructor(protected accountManager: AccountManager) { }

  /**
   * Récupère le prochain batch de 200 followers non analysés
   * @param analysis - L'analyse en cours
   * @returns Un objet contenant les followers et le nouveau cursor, ou null si terminé
   */
  public async getNextFollowersBatch(analysis: AnalysisAudience): Promise<{
    followers: any[]
    newCursor: string | null
    hasMore: boolean
  } | null> {
    try {
      // Récupérer le compte associé
      const account = await Account.findOrFail(analysis.accountId)

      // Obtenir l'AccountService via AccountManager
      const accountService = await this.accountManager.getOrCreateAccountService(account)

      // Utiliser le cursor stocké dans l'analyse
      const cursor = analysis.followersCursor

      let allFollowers: any[] = []
      let currentCursor = cursor
      const targetBatchSize = 500

      // Récupérer des followers jusqu'à atteindre 500 ou épuiser la source
      while (allFollowers.length < targetBatchSize) {
        // Récupérer les followers via l'AccountService
        const followersData = await accountService.getFollowers(
          account,
          analysis.accountHandle, // Utiliser le handle Bluesky, pas l'ID interne
          currentCursor || undefined
        )

        if (!followersData || !followersData.followers || followersData.followers.length === 0) {
          // Plus de followers à analyser
          break
        }

        // Ajouter les nouveaux followers
        allFollowers = allFollowers.concat(followersData.followers)

        // Mettre à jour le cursor
        currentCursor = followersData.cursor || null

        // Si pas de nouveau cursor, on a atteint la fin
        if (!currentCursor) {
          break
        }
      }

      if (allFollowers.length === 0) {
        return null
      }

      // Limiter à 200 followers maximum par batch
      const followers = allFollowers.slice(0, targetBatchSize)

      return {
        followers,
        newCursor: currentCursor,
        hasMore: allFollowers.length === targetBatchSize && !!currentCursor
      }
    } catch (error) {
      console.error(`Error getting followers batch for analysis ${analysis.id}:`, error)
      throw error
    }
  }

  /**
   * Met à jour le cursor dans l'analyse après traitement d'un batch
   * @param analysis - L'analyse à mettre à jour
   * @param newCursor - Le nouveau cursor
   */
  public async updateAnalysisCursor(analysis: AnalysisAudience, newCursor: string | null): Promise<void> {
    try {
      analysis.followersCursor = newCursor
      await analysis.save()
    } catch (error) {
      console.error(`Error updating cursor for analysis ${analysis.id}:`, error)
      throw error
    }
  }

  /**
   * Calcule le nombre estimé total de followers
   * @param account - Le compte à analyser
   * @returns Le nombre estimé de followers
   */
  public getEstimatedTotalFollowers(account: Account): number {
    // Utiliser le followersCount du compte comme estimation
    const followerCount = account.followersCount || 0

    // Si le count est 0, c'est potentiellement parce que le champ database n'a pas été initialisé
    if (followerCount === 0) {
      console.warn(`Account ${account.handle} has followers_count = 0. This may indicate the field was not initialized during account creation.`)
    }

    return followerCount
  }
}
