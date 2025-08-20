import User from '#models/user'
import { PlanService } from './plan_service.js'
import { DateTime } from 'luxon'

export class UsageTrackingService {
  /**
   * Incrémente le compteur de chargements de followers pour ce mois
   */
  static async incrementFollowerLoadings(userId: string): Promise<void> {
    const user = await User.findOrFail(userId)
    user.followerLoadingsThisMonth = (user.followerLoadingsThisMonth || 0) + 1
    await user.save()
  }

  /**
   * Incrémente le compteur d'actions de follow pour aujourd'hui
   */
  static async incrementFollowActions(userId: string, count: number = 1): Promise<void> {
    const user = await User.findOrFail(userId)
    const today = DateTime.now().startOf('day')
    
    // Reset le compteur si c'est un nouveau jour
    if (!user.lastFollowActionDate || !user.lastFollowActionDate.equals(today)) {
      user.dailyFollowActionsCount = 0
    }
    
    user.dailyFollowActionsCount = (user.dailyFollowActionsCount || 0) + count
    user.lastFollowActionDate = today
    await user.save()
  }

  /**
   * Reset les compteurs mensuels (à appeler le 1er de chaque mois)
   */
  static async resetMonthlyCounters(): Promise<void> {
    const users = await User.query().whereNotNull('follower_loadings_this_month')
    
    for (const user of users) {
      user.followerLoadingsThisMonth = 0
      await user.save()
    }
  }

  /**
   * Obtient le statut d'utilisation pour un utilisateur
   */
  static async getUsageStatus(userId: string): Promise<{
    scheduledPosts: { current: number; limit: number; percentage: number }
    accounts: { current: number; limit: number; percentage: number }
    feeds: { current: number; limit: number; percentage: number }
    followerLoadings: { current: number; limit: number; percentage: number }
    followActions: { current: number; limit: number; percentage: number }
    plan: string
  }> {
    const user = await User.findOrFail(userId)
    await user.load('account', (accountQuery) => {
      accountQuery.preload('feed')
    })
    await user.load('twitterAccounts')
    await user.load('scheduling')

    const limits = PlanService.getLimitsForPlan(user.plan || 'free')
    
    // Compter les posts programmés
    const scheduledPostsCount = user.scheduling?.length || 0
    
    // Compter les comptes (Bluesky + Twitter)
    const blueskyAccountsCount = user.account?.length || 0
    const twitterAccountsCount = user.twitterAccounts?.length || 0
    const accountsCount = blueskyAccountsCount + twitterAccountsCount
    
    // Compter les feeds
    let totalFeeds = 0
    if (user.account) {
      for (const account of user.account) {
        totalFeeds += account.feed?.length || 0
      }
    }
    
    // Obtenir les compteurs actuels
    const followerLoadingsCount = user.followerLoadingsThisMonth || 0
    
    // Pour les actions de follow, vérifier si c'est le même jour
    const today = DateTime.now().startOf('day')
    let followActionsCount = 0
    if (user.lastFollowActionDate && user.lastFollowActionDate.equals(today)) {
      followActionsCount = user.dailyFollowActionsCount || 0
    }

    return {
      scheduledPosts: {
        current: scheduledPostsCount,
        limit: limits.maxScheduledPosts,
        percentage: PlanService.getUsagePercentage(scheduledPostsCount, limits.maxScheduledPosts)
      },
      accounts: {
        current: accountsCount,
        limit: limits.maxAccounts,
        percentage: PlanService.getUsagePercentage(accountsCount, limits.maxAccounts)
      },
      feeds: {
        current: totalFeeds,
        limit: limits.maxFeeds,
        percentage: PlanService.getUsagePercentage(totalFeeds, limits.maxFeeds)
      },
      followerLoadings: {
        current: followerLoadingsCount,
        limit: limits.followerLoadingsPerMonth,
        percentage: PlanService.getUsagePercentage(followerLoadingsCount, limits.followerLoadingsPerMonth)
      },
      followActions: {
        current: followActionsCount,
        limit: limits.dailyFollowActions,
        percentage: PlanService.getUsagePercentage(followActionsCount, limits.dailyFollowActions)
      },
      plan: user.plan || 'free'
    }
  }

  /**
   * Vérifie si l'utilisateur peut effectuer une action
   */
  static async canPerformAction(
    userId: string, 
    action: 'schedule' | 'addAccount' | 'addFeed' | 'loadFollowers' | 'followAction'
  ): Promise<{ allowed: boolean; reason?: string; currentUsage?: any }> {
    const usageStatus = await this.getUsageStatus(userId)
    
    switch (action) {
      case 'schedule':
        const allowed = usageStatus.scheduledPosts.limit === -1 || 
                       usageStatus.scheduledPosts.current < usageStatus.scheduledPosts.limit
        return {
          allowed,
          reason: allowed ? undefined : `Limite de ${usageStatus.scheduledPosts.limit} posts programmés atteinte`,
          currentUsage: usageStatus.scheduledPosts
        }

      case 'addAccount':
        const accountAllowed = usageStatus.accounts.limit === -1 || 
                              usageStatus.accounts.current < usageStatus.accounts.limit
        return {
          allowed: accountAllowed,
          reason: accountAllowed ? undefined : `Limite de ${usageStatus.accounts.limit} comptes atteinte`,
          currentUsage: usageStatus.accounts
        }

      case 'addFeed':
        const feedAllowed = usageStatus.feeds.limit === -1 || 
                           usageStatus.feeds.current < usageStatus.feeds.limit
        return {
          allowed: feedAllowed,
          reason: feedAllowed ? undefined : `Limite de ${usageStatus.feeds.limit} feeds atteinte`,
          currentUsage: usageStatus.feeds
        }

      case 'loadFollowers':
        const loadAllowed = usageStatus.followerLoadings.limit === -1 || 
                           usageStatus.followerLoadings.current < usageStatus.followerLoadings.limit
        return {
          allowed: loadAllowed,
          reason: loadAllowed ? undefined : `Limite de ${usageStatus.followerLoadings.limit} chargements par mois atteinte`,
          currentUsage: usageStatus.followerLoadings
        }

      case 'followAction':
        const actionAllowed = usageStatus.followActions.limit === -1 || 
                             usageStatus.followActions.current < usageStatus.followActions.limit
        return {
          allowed: actionAllowed,
          reason: actionAllowed ? undefined : `Limite de ${usageStatus.followActions.limit} actions par jour atteinte`,
          currentUsage: usageStatus.followActions
        }

      default:
        return { allowed: true }
    }
  }
}
