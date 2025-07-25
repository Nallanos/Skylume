import redis from '@adonisjs/redis/services/main'

/**
 * Interface pour les informations de compte stockées dans un hash redis
 */
interface AccountInfo {
  hashId: string
  followersCount: number
  accountHandle: string
  lastUpdated?: string
  metadata?: Record<string, any>
}

export class AiSchedulerService {
  /**
   * Constantes pour les noms des clés redis
   */
  private readonly RECURRING_ANALYSIS_QUEUE = 'analysis:priorityQueue' // Queue pour analyses récurrentes (déclenchées par firehose)
  private readonly HASH_PREFIX = 'analysis:info:'
  private readonly BULK_ANALYSIS_QUEUE = 'queue:audience_analysis' // Queue pour analyses manuelles (déclenchées par utilisateur)

  /**
   * Ajoute ou met à jour un compte dans la file d'attente des analyses récurrentes (déclenchées par firehose)
   * @param hashId - Identifiant unique du compte
   * @param priority - Priorité (score) dans le sorted set (plus la valeur est élevée, plus la priorité est haute)
   * @param accountInfo - Informations du compte à stocker
   */
  public async addAccountToRecurringAnalysisQueue(
    hashId: string,
    priority: number,
    accountInfo: Omit<AccountInfo, 'hashId'>
  ): Promise<void> {
    try {
      // 1. Ajouter au Sorted Set avec la priorité
      await redis.zadd(this.RECURRING_ANALYSIS_QUEUE, priority.toString(), hashId)

      // 2. Stocker les informations dans un Hash
      const hashKey = this.getHashKeyForAccount(hashId)
      const hashData = {
        hashId,
        followersCount: accountInfo.followersCount,
        accountHandle: accountInfo.accountHandle,
        lastUpdated: new Date().toISOString(),
        metadata: JSON.stringify(accountInfo.metadata || {}),
      }

      // Stocker chaque champ du hash individuellement
      await redis.hset(hashKey, hashData)

      console.log(`Account ${hashId} added to recurring analysis queue with priority ${priority}`)
    } catch (error) {
      console.error(`Error adding account to recurring analysis queue: ${error.message}`)
      throw error
    }
  }

  /**
   * Récupère les informations d'un compte depuis redis
   * @param hashId - Identifiant unique du compte
   * @returns Les informations du compte ou null si non trouvé
   */
  public async getAccountInfo(hashId: string): Promise<AccountInfo | null> {
    try {
      const hashKey = this.getHashKeyForAccount(hashId)
      const accountData = await redis.hgetall(hashKey)

      if (!accountData || Object.keys(accountData).length === 0) {
        return null
      }

      // Parse les données JSON stockées dans metadata
      let metadata = {}
      try {
        if (accountData.metadata) {
          metadata = JSON.parse(accountData.metadata)
        }
      } catch (e) {
        console.warn(`Failed to parse metadata for account ${hashId}: ${e.message}`)
      }

      return {
        hashId: accountData.hashId,
        followersCount: parseInt(accountData.followersCount, 10),
        accountHandle: accountData.accountHandle,
        lastUpdated: accountData.lastUpdated,
        metadata,
      }
    } catch (error) {
      console.error(`Error getting account info: ${error.message}`)
      throw error
    }
  }

  /**
   * Récupère les N comptes avec la plus haute priorité pour les analyses récurrentes
   * @param count - Nombre de comptes à récupérer
   * @returns Un tableau des hashIds des comptes les plus prioritaires pour analyses récurrentes
   */
  public async getHighestPriorityRecurringAccounts(count: number): Promise<string[]> {
    try {
      // Récupérer les N hashIds avec les scores les plus élevés (ordre décroissant)
      const accounts = await redis.zrevrange(this.RECURRING_ANALYSIS_QUEUE, 0, count - 1)
      return accounts
    } catch (error) {
      console.error(`Error getting highest priority recurring accounts: ${error.message}`)
      throw error
    }
  }

  /**
   * Met à jour la priorité d'un compte dans la queue des analyses récurrentes
   * @param hashId - Identifiant unique du compte
   * @param newPriority - Nouvelle valeur de priorité
   */
  public async updateRecurringAccountPriority(hashId: string, newPriority: number): Promise<void> {
    try {
      await redis.zadd(this.RECURRING_ANALYSIS_QUEUE, newPriority.toString(), hashId)
      console.log(`Priority for account ${hashId} updated to ${newPriority}`)
    } catch (error) {
      console.error(`Error updating recurring account priority: ${error.message}`)
      throw error
    }
  }

  /**
   * Met à jour les informations d'un compte dans la queue des analyses récurrentes
   * @param hashId - Identifiant unique du compte
   * @param updatedInfo - Informations à mettre à jour
   */
  public async updateRecurringAccountInfo(
    hashId: string,
    updatedInfo: Partial<Omit<AccountInfo, 'hashId'>>
  ): Promise<void> {
    try {
      const hashKey = this.getHashKeyForAccount(hashId)

      // Construire l'objet avec les champs à mettre à jour
      const updates: Record<string, string> = {}

      if (updatedInfo.followersCount !== undefined) {
        updates.followersCount = updatedInfo.followersCount.toString()
      }

      if (updatedInfo.accountHandle !== undefined) {
        updates.accountHandle = updatedInfo.accountHandle
      }

      if (updatedInfo.metadata !== undefined) {
        updates.metadata = JSON.stringify(updatedInfo.metadata)
      }

      // Toujours mettre à jour lastUpdated
      updates.lastUpdated = new Date().toISOString()

      if (Object.keys(updates).length > 0) {
        await redis.hset(hashKey, updates)
        console.log(`Recurring account info updated for ${hashId}`)
      }
    } catch (error) {
      console.error(`Error updating recurring account info: ${error.message}`)
      throw error
    }
  }

  /**
   * Supprime un compte de la file d'attente des analyses récurrentes et ses informations
   * @param hashId - Identifiant unique du compte à supprimer
   */
  public async removeRecurringAccount(hashId: string): Promise<void> {
    try {
      const hashKey = this.getHashKeyForAccount(hashId)

      // Supprimer du Sorted Set
      await redis.zrem(this.RECURRING_ANALYSIS_QUEUE, hashId)

      // Supprimer le Hash
      await redis.del(hashKey)

      console.log(`Account ${hashId} removed from recurring analysis queue and info storage`)
    } catch (error) {
      console.error(`Error removing recurring account: ${error.message}`)
      throw error
    }
  }

  /**
   * Utilitaire pour générer la clé du hash pour un compte
   * @param hashId - Identifiant unique du compte
   * @returns La clé redis pour le hash
   */
  private getHashKeyForAccount(hashId: string): string {
    return `${this.HASH_PREFIX}${hashId}`
  }

  /**
   * Ajoute une analyse d'audience manuelle à la queue Redis (déclenchée par utilisateur)
   * @param analysisId - ID de l'analyse en BDD
   * @param accountId - ID du compte à analyser
   * @param followers - Liste des followers à analyser (max 100)
   * @param priority - Priorité (plus élevé = plus prioritaire)
   */
  public async addBulkAnalysisToQueue(
    analysisId: number,
    accountId: string,
    followers: any[],
    priority: number = 100
  ): Promise<string> {
    try {
      const queueJobId = `audience_analysis_${analysisId}_${Date.now()}`

      // Ajouter à la queue prioritaire
      await redis.zadd(this.BULK_ANALYSIS_QUEUE, priority.toString(), queueJobId)

      // Stocker les détails du job avec les followers
      const jobData = {
        analysisId: analysisId.toString(),
        accountId: accountId,
        type: 'audience_analysis',
        createdAt: new Date().toISOString(),
        status: 'queued',
        followers: JSON.stringify(followers)
      }

      await redis.hset(`job:${queueJobId}`, jobData)

      console.log(`Bulk audience analysis ${analysisId} queued with job ID: ${queueJobId} (${followers.length} followers)`)
      return queueJobId
    } catch (error) {
      console.error(`Error queueing bulk audience analysis: ${error.message}`)
      throw error
    }
  }

  /**
   * Récupère le prochain job d'analyse d'audience manuelle à traiter
   */
  public async getNextBulkAnalysisJob(): Promise<{
    jobId: string
    analysisId: number
    accountId: string
    followers: any[]
  } | null> {
    try {
      // Récupérer le job avec la plus haute priorité
      const jobs = await redis.zrevrange(this.BULK_ANALYSIS_QUEUE, 0, 0)

      if (jobs.length === 0) {
        return null
      }

      const jobId = jobs[0]

      // Récupérer les détails du job
      const jobData = await redis.hgetall(`job:${jobId}`)

      if (!jobData || !jobData.analysisId) {
        // Nettoyer le job invalide
        await redis.zrem(this.BULK_ANALYSIS_QUEUE, jobId)
        await redis.del(`job:${jobId}`)
        return null
      }

      // Supprimer de la queue (le job est maintenant en cours)
      await redis.zrem(this.BULK_ANALYSIS_QUEUE, jobId)

      // Marquer comme en cours
      await redis.hset(`job:${jobId}`, 'status', 'processing')

      // Parse les followers
      let followers = []
      try {
        if (jobData.followers) {
          followers = JSON.parse(jobData.followers)
        }
      } catch (e) {
        console.error(`Error parsing followers for job ${jobId}:`, e)
      }

      return {
        jobId,
        analysisId: parseInt(jobData.analysisId),
        accountId: jobData.accountId,
        followers
      }
    } catch (error) {
      console.error(`Error getting next bulk analysis job: ${error.message}`)
      throw error
    }
  }

  /**
   * Met à jour le statut d'un job d'analyse bulk
   */
  public async updateBulkJobStatus(
    jobId: string,
    status: 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const updates: Record<string, string> = {
        status,
        updatedAt: new Date().toISOString()
      }

      if (errorMessage) {
        updates.errorMessage = errorMessage
      }

      await redis.hset(`job:${jobId}`, updates)

      // Si terminé ou échoué, nettoyer après 24h
      if (status === 'completed' || status === 'failed') {
        await redis.expire(`job:${jobId}`, 2 * 60) // 24 heures
      }
    } catch (error) {
      console.error(`Error updating bulk job status: ${error.message}`)
      throw error
    }
  }

  /**
   * Annule un job d'analyse d'audience bulk
   */
  public async cancelBulkAnalysisJob(queueJobId: string): Promise<void> {
    try {
      // Supprimer de la queue
      await redis.zrem(this.BULK_ANALYSIS_QUEUE, queueJobId)

      // Marquer comme annulé
      await redis.hset(`job:${queueJobId}`, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      })

      console.log(`Bulk analysis job ${queueJobId} cancelled`)
    } catch (error) {
      console.error(`Error cancelling bulk analysis job: ${error.message}`)
      throw error
    }
  }

  /**
   * Vérifie si une analyse d'audience est vraiment en cours dans la queue Redis
   * @param analysisId - ID de l'analyse en BDD
   * @returns true si l'analyse est vraiment en cours, false sinon
   */
  public async isBulkAnalysisActiveInQueue(analysisId: number): Promise<boolean> {
    try {
      // 1. Chercher dans la queue des jobs en attente
      const queuedJobs = await redis.zrange(this.BULK_ANALYSIS_QUEUE, 0, -1)

      for (const jobId of queuedJobs) {
        const jobData = await redis.hgetall(`job:${jobId}`)
        if (jobData.analysisId === analysisId.toString()) {
          console.log(`Found queued job ${jobId} for analysis ${analysisId}`)
          return true
        }
      }

      // 2. Chercher un job en cours de traitement avec un pattern plus spécifique
      const jobIdPattern = `audience_analysis_${analysisId}_*`
      const jobKeys = await redis.keys(`job:${jobIdPattern}`)

      for (const key of jobKeys) {
        const jobData = await redis.hgetall(key)
        if (jobData.status === 'processing') {
          // Vérifier si le job est récent (moins de 10 minutes)
          const createdAt = new Date(jobData.createdAt || jobData.updatedAt)
          const now = new Date()
          const timeDiff = now.getTime() - createdAt.getTime()
          const tenMinutes = 10 * 60 * 1000

          if (timeDiff < tenMinutes) {
            console.log(`Found recent processing job ${key} for analysis ${analysisId}`)
            return true
          } else {
            console.log(`Found stale processing job ${key} for analysis ${analysisId}, cleaning up`)
            // Nettoyer le job obsolète
            await redis.del(key)
          }
        }
      }

      return false
    } catch (error) {
      console.error(`Error checking if bulk analysis is active in queue: ${error.message}`)
      // En cas d'erreur Redis, on retourne false pour permettre de relancer
      return false
    }
  }

  /**
   * Nettoie les jobs obsolètes et orphelins dans Redis
   * @param analysisId - ID de l'analyse à nettoyer (optionnel)
   */
  public async cleanupStaleJobs(analysisId?: number): Promise<void> {
    try {
      console.log('Starting cleanup of stale jobs...')
      let pattern = 'job:audience_analysis_*'
      if (analysisId) {
        pattern = `job:audience_analysis_${analysisId}_*`
      }

      const jobKeys = await redis.keys(pattern)
      let cleanedCount = 0

      for (const key of jobKeys) {
        const jobData = await redis.hgetall(key)

        if (!jobData.createdAt && !jobData.updatedAt) {
          // Job sans timestamp, probablement corrompu
          await redis.del(key)
          cleanedCount++
          continue
        }

        const lastUpdate = new Date(jobData.updatedAt || jobData.createdAt)
        const now = new Date()
        const timeDiff = now.getTime() - lastUpdate.getTime()
        const oneHour = 60 * 60 * 1000

        // Nettoyer les jobs de plus d'une heure
        if (timeDiff > oneHour) {
          console.log(`Cleaning up stale job ${key} (${timeDiff / 1000 / 60} minutes old)`)
          await redis.del(key)
          cleanedCount++
        }
      }

      // Nettoyer aussi les jobs orphelins dans la queue
      const queuedJobs = await redis.zrange(this.BULK_ANALYSIS_QUEUE, 0, -1)
      for (const jobId of queuedJobs) {
        const jobExists = await redis.exists(`job:${jobId}`)
        if (!jobExists) {
          console.log(`Removing orphaned job ${jobId} from queue`)
          await redis.zrem(this.BULK_ANALYSIS_QUEUE, jobId)
          cleanedCount++
        }
      }

      console.log(`Cleanup completed: ${cleanedCount} stale jobs removed`)
    } catch (error) {
      console.error(`Error during cleanup: ${error.message}`)
    }
  }

  /**
   * Récupère le statut complet d'une analyse avec nettoyage automatique
   * @param analysisId - ID de l'analyse
   * @returns Informations sur le statut de l'analyse
   */
  public async getAnalysisQueueStatus(analysisId: number): Promise<{
    isActive: boolean
    isQueued: boolean
    isProcessing: boolean
    jobId?: string
    status?: string
    lastUpdate?: string
  }> {
    try {
      // D'abord nettoyer les jobs obsolètes pour cette analyse
      await this.cleanupStaleJobs(analysisId)

      let isQueued = false
      let isProcessing = false
      let jobId: string | undefined
      let status: string | undefined
      let lastUpdate: string | undefined

      // Vérifier dans la queue
      const queuedJobs = await redis.zrange(this.BULK_ANALYSIS_QUEUE, 0, -1)
      for (const queuedJobId of queuedJobs) {
        const jobData = await redis.hgetall(`job:${queuedJobId}`)
        if (jobData.analysisId === analysisId.toString()) {
          isQueued = true
          jobId = queuedJobId
          status = jobData.status
          lastUpdate = jobData.updatedAt || jobData.createdAt
          break
        }
      }

      // Vérifier les jobs en cours
      if (!isQueued) {
        const jobIdPattern = `audience_analysis_${analysisId}_*`
        const jobKeys = await redis.keys(`job:${jobIdPattern}`)

        for (const key of jobKeys) {
          const jobData = await redis.hgetall(key)
          if (jobData.status === 'processing') {
            isProcessing = true
            jobId = key.replace('job:', '')
            status = jobData.status
            lastUpdate = jobData.updatedAt || jobData.createdAt
            break
          }
        }
      }

      return {
        isActive: isQueued || isProcessing,
        isQueued,
        isProcessing,
        jobId,
        status,
        lastUpdate
      }
    } catch (error) {
      console.error(`Error getting analysis queue status: ${error.message}`)
      return {
        isActive: false,
        isQueued: false,
        isProcessing: false
      }
    }
  }

  /**
   * Force l'arrêt complet d'une analyse et nettoie tous les jobs associés
   * @param analysisId - ID de l'analyse à arrêter
   */
  public async forceStopAnalysis(analysisId: number): Promise<void> {
    try {
      console.log(`Force stopping analysis ${analysisId}`)

      // 1. Supprimer tous les jobs en queue pour cette analyse
      const queuedJobs = await redis.zrange(this.BULK_ANALYSIS_QUEUE, 0, -1)
      for (const jobId of queuedJobs) {
        const jobData = await redis.hgetall(`job:${jobId}`)
        if (jobData.analysisId === analysisId.toString()) {
          await redis.zrem(this.BULK_ANALYSIS_QUEUE, jobId)
          await redis.del(`job:${jobId}`)
          console.log(`Removed queued job ${jobId} for analysis ${analysisId}`)
        }
      }

      // 2. Supprimer tous les jobs en cours pour cette analyse
      const jobIdPattern = `audience_analysis_${analysisId}_*`
      const jobKeys = await redis.keys(`job:${jobIdPattern}`)

      for (const key of jobKeys) {
        await redis.del(key)
        console.log(`Removed processing job ${key} for analysis ${analysisId}`)
      }

      console.log(`Force stop completed for analysis ${analysisId}`)
    } catch (error) {
      console.error(`Error force stopping analysis: ${error.message}`)
      throw error
    }
  }

  /**
   * Méthode appelée par le worker Python pour signaler la fin du traitement
   * @param jobId - ID du job qui a été traité
   * @param success - Si le traitement a réussi
   * @param errorMessage - Message d'erreur si le traitement a échoué
   */
  public async completeJobFromWorker(
    jobId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      const status = success ? 'completed' : 'failed'
      await this.updateBulkJobStatus(jobId, status, errorMessage)

      if (success) {
        console.log(`✅ Job ${jobId} completed successfully by worker`)
      } else {
        console.log(`❌ Job ${jobId} failed in worker: ${errorMessage}`)
      }
    } catch (error) {
      console.error(`Error completing job from worker: ${error.message}`)
    }
  }

  /**
   * Méthode pour vérifier l'état de la communication avec le worker
   * @returns Statistiques sur l'état de la queue
   */
  public async getQueueStats(): Promise<{
    queuedJobs: number
    processingJobs: number
    recentCompletedJobs: number
    staleJobs: number
  }> {
    try {
      const queuedJobs = await redis.zcard(this.BULK_ANALYSIS_QUEUE)

      const allJobKeys = await redis.keys('job:audience_analysis_*')
      let processingJobs = 0
      let recentCompletedJobs = 0
      let staleJobs = 0

      const now = new Date()
      const oneHour = 60 * 60 * 1000
      const oneDay = 24 * oneHour

      for (const key of allJobKeys) {
        const jobData = await redis.hgetall(key)
        const lastUpdate = new Date(jobData.updatedAt || jobData.createdAt)
        const timeDiff = now.getTime() - lastUpdate.getTime()

        if (jobData.status === 'processing' && timeDiff < oneHour) {
          processingJobs++
        } else if (jobData.status === 'completed' && timeDiff < oneDay) {
          recentCompletedJobs++
        } else if (timeDiff > oneHour) {
          staleJobs++
        }
      }

      return {
        queuedJobs,
        processingJobs,
        recentCompletedJobs,
        staleJobs
      }
    } catch (error) {
      console.error(`Error getting queue stats: ${error.message}`)
      return {
        queuedJobs: 0,
        processingJobs: 0,
        recentCompletedJobs: 0,
        staleJobs: 0
      }
    }
  }
}