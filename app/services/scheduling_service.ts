import { Queue, Worker, Job } from 'bullmq'
import { Redis } from 'ioredis'
import Scheduling from '#models/scheduling'
import Account from '#models/account'
import { AtpAgent } from '@atproto/api'

interface ScheduleJobData {
  schedulingId: number
}

class SchedulingService {
  private queue: Queue
  private worker: Worker
  private redis: Redis

  constructor() {
    // Configuration Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null, // Requis par BullMQ
      enableReadyCheck: false,
    })

    // Configuration de la queue
    this.queue = new Queue('scheduling', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })

    // Configuration du worker
    this.worker = new Worker(
      'scheduling',
      async (job: Job<ScheduleJobData>) => {
        await this.processScheduledPost(job.data)
      },
      {
        connection: this.redis,
        concurrency: 5,
      }
    )

    this.setupEventListeners()
    
    // Confirmer que le worker est prêt
    console.log('[SCHEDULING] BullMQ worker created and ready')
  }

  private setupEventListeners() {
    this.worker.on('ready', () => {
      console.log('[SCHEDULING] Worker is ready to process jobs')
    })

    this.worker.on('completed', (job) => {
      console.log(`[SCHEDULING] Job ${job.id} completed successfully`)
    })

    this.worker.on('failed', (job, err) => {
      console.error(`[SCHEDULING] Job ${job?.id} failed:`, err)
    })

    this.worker.on('error', (err) => {
      console.error('[SCHEDULING] Worker error:', err)
    })

    this.worker.on('stalled', (jobId) => {
      console.warn(`[SCHEDULING] Job ${jobId} stalled`)
    })
  }

  /**
   * Ajouter un post à la queue de scheduling
   */
  async schedulePost(scheduling: Scheduling): Promise<string> {
    // Handle both DateTime objects and string dates
    let scheduleTimeStr: string
    if (typeof scheduling.scheduleTime === 'string') {
      scheduleTimeStr = scheduling.scheduleTime
    } else if (scheduling.scheduleTime && typeof scheduling.scheduleTime.toISO === 'function') {
      const isoString = scheduling.scheduleTime.toISO()
      if (!isoString) {
        throw new Error('Failed to convert DateTime to ISO string')
      }
      scheduleTimeStr = isoString
    } else {
      throw new Error('Invalid schedule time format')
    }
    
    if (!scheduleTimeStr) {
      throw new Error('Invalid schedule time')
    }
    
    const scheduleTime = new Date(scheduleTimeStr)
    const delay = scheduleTime.getTime() - Date.now()

    if (delay <= 0) {
      throw new Error('Schedule time must be in the future')
    }

    const job = await this.queue.add(
      'publish-post',
      { schedulingId: scheduling.id },
      {
        delay,
        jobId: `schedule-${scheduling.id}`,
      }
    )

    // Mettre à jour le scheduling avec le job ID
    scheduling.jobId = job.id?.toString() || ''
    await scheduling.save()

    console.log(`[SCHEDULING] Post scheduled for ${scheduleTime.toISOString()}, job ID: ${job.id}`)
    return job.id?.toString() || ''
  }

  /**
   * Annuler un post programmé
   */
  async cancelScheduledPost(scheduling: Scheduling): Promise<boolean> {
    if (!scheduling.jobId) {
      return false
    }

    try {
      const job = await this.queue.getJob(scheduling.jobId)
      if (job) {
        await job.remove()
        console.log(`[SCHEDULING] Cancelled job ${scheduling.jobId}`)
        return true
      }
    } catch (error) {
      console.error(`[SCHEDULING] Error cancelling job ${scheduling.jobId}:`, error)
    }

    return false
  }

  /**
   * Reprogrammer un post
   */
  async reschedulePost(scheduling: Scheduling): Promise<string> {
    // Annuler l'ancien job
    if (scheduling.jobId) {
      await this.cancelScheduledPost(scheduling)
    }

    // Créer un nouveau job
    return this.schedulePost(scheduling)
  }

  /**
   * Traiter un post programmé
   */
  private async processScheduledPost(data: ScheduleJobData): Promise<void> {
    try {
      console.log(`[SCHEDULING] Processing scheduled post ID: ${data.schedulingId}`)

      // Récupérer le scheduling
      const scheduling = await Scheduling.query()
        .where('id', data.schedulingId)
        .preload('account')
        .first()

      if (!scheduling) {
        throw new Error(`Scheduling not found: ${data.schedulingId}`)
      }

      if (scheduling.status !== 'pending') {
        throw new Error(`Scheduling is not pending: ${scheduling.status}`)
      }

      // Récupérer le compte et ses credentials
      const account = scheduling.account
      if (!account) {
        throw new Error('Account not found')
      }

      // Publier le post sur Bluesky
      await this.publishToBluesky(scheduling, account)

      // Mettre à jour le statut
      scheduling.status = 'completed'
      await scheduling.save()

      console.log(`[SCHEDULING] Post published successfully for @${account.handle}`)

    } catch (error) {
      console.error(`[SCHEDULING] Error processing scheduled post:`, error)
      
      // Mettre à jour le statut en erreur
      try {
        const scheduling = await Scheduling.find(data.schedulingId)
        if (scheduling) {
          scheduling.status = 'failed'
          await scheduling.save()
        }
      } catch (updateError) {
        console.error('[SCHEDULING] Error updating status to failed:', updateError)
      }

      throw error
    }
  }

  /**
   * Publier le post sur Bluesky
   */
  private async publishToBluesky(scheduling: Scheduling, account: Account): Promise<void> {
    try {
      // Créer l'agent Bluesky
      const agent = new AtpAgent({
        service: 'https://bsky.social',
      })

      // Se connecter avec les credentials du compte
      await agent.login({
        identifier: account.handle,
        password: account.appPassword, // Utilise l'app password du compte
      })

      // Préparer le contenu du post
      const postData: any = {
        text: scheduling.message,
        createdAt: new Date().toISOString(),
      }

      // Traiter les images si elles existent
      if (scheduling.images) {
        const imagePaths = JSON.parse(scheduling.images)
        if (imagePaths.length > 0) {
          postData.embed = {
            $type: 'app.bsky.embed.images',
            images: await this.uploadImages(agent, imagePaths),
          }
        }
      }

      // Publier le post
      await agent.post(postData)

      console.log(`[SCHEDULING] Post published on Bluesky for @${account.handle}`)

    } catch (error) {
      console.error(`[SCHEDULING] Error publishing to Bluesky:`, error)
      throw error
    }
  }

  /**
   * Uploader les images vers Bluesky
   */
  private async uploadImages(agent: AtpAgent, imagePaths: string[]): Promise<any[]> {
    const images = []
    const fs = await import('fs')

    for (const imagePath of imagePaths) {
      try {
        const fullPath = `public${imagePath}`
        if (fs.existsSync(fullPath)) {
          const imageBuffer = fs.readFileSync(fullPath)
          
          // Uploader l'image
          const response = await agent.uploadBlob(imageBuffer, {
            encoding: this.getMimeType(imagePath),
          })

          images.push({
            alt: '',
            image: response.data.blob,
          })
        }
      } catch (error) {
        console.error(`[SCHEDULING] Error uploading image ${imagePath}:`, error)
        // Continue avec les autres images
      }
    }

    return images
  }

  /**
   * Déterminer le type MIME d'une image
   */
  private getMimeType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'gif':
        return 'image/gif'
      case 'webp':
        return 'image/webp'
      default:
        return 'image/jpeg'
    }
  }

  /**
   * Obtenir des statistiques sur la queue
   */
  async getQueueStats() {
    const waiting = await this.queue.getWaiting()
    const active = await this.queue.getActive()
    const completed = await this.queue.getCompleted()
    const failed = await this.queue.getFailed()

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    }
  }

  /**
   * Nettoyer la queue
   */
  async cleanup() {
    await this.worker.close()
    await this.queue.close()
    await this.redis.quit()
  }
}

export default new SchedulingService()
