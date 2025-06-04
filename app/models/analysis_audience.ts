import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Account from './account.js'

export type AnalysisStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'stopped'

export interface AnalysisProgress {
  analyzed: number
  total: number
  percentage: number
}

export default class AnalysisAudience extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare accountId: string

  @column()
  declare accountHandle: string

  @column()
  declare status: AnalysisStatus

  @column()
  declare queueJobId: string | null

  @column()
  declare followersCursor: string | null

  @column({
    prepare: (value: AnalysisProgress | null) => {
      if (value === null || value === undefined) return null
      return typeof value === 'string' ? value : JSON.stringify(value)
    },
    consume: (value: string | null) => {
      if (!value) return null
      try {
        // Handle case where value is already an object (shouldn't happen but defensive)
        if (typeof value === 'object') return value
        // Handle case where value is a stringified "[object Object]"
        if (value === '[object Object]') return {}
        return JSON.parse(value)
      } catch (error) {
        console.warn('Failed to parse progress JSON:', value, error)
        return {}
      }
    }
  })
  declare progress: AnalysisProgress | null

  @column({
    prepare: (value: any) => {
      if (value === null || value === undefined) return null
      return typeof value === 'string' ? value : JSON.stringify(value)
    },
    consume: (value: string | null) => {
      if (!value) return null
      try {
        // Handle case where value is already an object
        if (typeof value === 'object') return value
        // Handle case where value is a stringified "[object Object]"
        if (value === '[object Object]') return {}
        return JSON.parse(value)
      } catch (error) {
        console.warn('Failed to parse result JSON:', value, error)
        return {}
      }
    }
  })
  declare result: any | null

  @column()
  declare errorMessage: string | null

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  /**
   * Marque l'analyse comme démarrée
   */
  public async markAsStarted(queueJobId?: string): Promise<void> {
    this.status = 'in_progress'
    this.startedAt = DateTime.now()
    if (queueJobId) {
      this.queueJobId = queueJobId
    }
    await this.save()
    await this.notifySSEClients() // Notifier les clients SSE
  }

  /**
   * Met à jour le progrès de l'analyse
   */
  public async updateProgress(progress: AnalysisProgress): Promise<void> {
    this.progress = progress
    await this.save()
    await this.notifySSEClients() // Notifier les clients SSE
  }

  /**
   * Marque l'analyse comme terminée avec succès
   */
  public async markAsCompleted(result?: any): Promise<void> {
    this.status = 'completed'
    this.completedAt = DateTime.now()
    if (result) {
      this.result = result
    }
    await this.save()
    await this.notifySSEClients() // Notifier les clients SSE
  }

  /**
   * Marque l'analyse comme échouée
   */
  public async markAsFailed(errorMessage: string): Promise<void> {
    this.status = 'failed'
    this.errorMessage = errorMessage
    this.completedAt = DateTime.now()
    await this.save()
    await this.notifySSEClients() // Notifier les clients SSE
  }

  /**
   * Marque l'analyse comme arrêtée
   */
  public async markAsStopped(): Promise<void> {
    this.status = 'stopped'
    this.completedAt = DateTime.now()
    await this.save()
    await this.notifySSEClients() // Notifier les clients SSE
  }

  /**
   * Notifie les connexions SSE actives des changements de statut
   */
  async notifySSEClients() {
    const { sseService } = await import('#services/sse_service')

    const statusData = {
      id: this.id,
      status: this.status,
      progress: this.progress,
      errorMessage: this.errorMessage,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      updatedAt: this.updatedAt
    }

    // Envoyer à toutes les connexions SSE de ce compte
    sseService.sendToAccount(this.accountId, statusData)
  }
}