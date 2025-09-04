import User from '#models/user'
import Account from '#models/account'

export class BusinessPlanCounterService {
  /**
   * Compte le nombre d'utilisateurs avec le plan business
   */
  static async getBusinessPlanCount(): Promise<number> {
    try {
      const count = await User.query()
        .where('plan', 'business')
        .count('* as total')
      
      return Number(count[0].$extras.total) || 0
    } catch (error) {
      console.error('Error counting business plan users:', error)
      return 0
    }
  }

  /**
   * Compte le nombre total d'utilisateurs dans la base de données
   */
  static async getTotalUsersCount(): Promise<number> {
    try {
      const count = await User.query()
        .count('* as total')
      
      return Number(count[0].$extras.total) || 0
    } catch (error) {
      console.error('Error counting total users:', error)
      return 0
    }
  }

  /**
   * Récupère les handles Bluesky de quelques utilisateurs pour le carrousel
   */
  static async getUserHandlesForCarousel(limit: number = 20): Promise<string[]> {
    try {
      // Option 1: Try to get handles from accounts table first
      const accounts = await Account.query()
        .whereNotNull('handle')
        .where('handle', '!=', '')
        .whereRaw("platform IS NULL OR platform = 'bluesky'")
        .orderByRaw('RANDOM()')
        .limit(limit)
        .select('handle')
      
      if (accounts.length > 0) {
        return accounts.map(account => account.handle).filter(handle => handle && handle.length > 0)
      }
      
      // Option 2: Fallback to users table if no accounts found (users IDs are often Bluesky handles)
      const users = await User.query()
        .whereNotNull('id')
        .where('id', 'LIKE', '%.%') // Bluesky handles typically contain dots
        .orderByRaw('RANDOM()')
        .limit(limit)
        .select('id')
      
      return users.map(user => user.id).filter(id => id && id.length > 0)
    } catch (error) {
      console.error('Error fetching user handles:', error)
      return []
    }
  }

  /**
   * Vérifie s'il reste des places disponibles pour le plan business (limite 50)
   */
  static async getAvailableSpots(): Promise<number> {
    const currentCount = await this.getBusinessPlanCount()
    const maxSpots = 50
    return Math.max(0, maxSpots - currentCount)
  }

  /**
   * Vérifie si un utilisateur peut encore s'inscrire au plan business
   */
  static async canSignUpForBusinessPlan(): Promise<boolean> {
    const availableSpots = await this.getAvailableSpots()
    return availableSpots > 0
  }

  /**
   * Retourne les informations complètes du compteur
   */
  static async getCounterInfo(): Promise<{
    currentCount: number
    maxSpots: number
    availableSpots: number
    canSignUp: boolean
    totalUsers: number
    userHandles: string[]
  }> {
    const currentCount = await this.getBusinessPlanCount()
    const totalUsers = await this.getTotalUsersCount()
    const userHandles = await this.getUserHandlesForCarousel()
    const maxSpots = 50
    const availableSpots = Math.max(0, maxSpots - currentCount)
    const canSignUp = availableSpots > 0

    return {
      currentCount,
      maxSpots,
      availableSpots,
      canSignUp,
      totalUsers,
      userHandles
    }
  }
}
