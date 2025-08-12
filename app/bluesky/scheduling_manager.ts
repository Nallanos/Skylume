import { Worker, Queue } from 'bullmq'
import Scheduling from '#models/scheduling'
import handle from '../jobs/schedule_job.js'
import env from '#start/env'
import crypto from 'crypto'
import { inject } from '@adonisjs/core'
import AccountManager from '#services/account_manager'
import Account from '#models/account'


@inject()
export class SchedulingQueueManager {
    public queueName = 'schedulers'

    constructor(protected account_manager: AccountManager) { }

    public queue = new Queue(this.queueName, {
        connection: {
            family: 0,
            host: env.get('REDIS_HOST'),
            port: env.get('REDIS_PORT'),
            password: env.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'fixed',
                delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: true,
        },
    })

    /**
     * Initialise la queue et démarre le worker
     */
    public async createAndStartSchedulersQueue(): Promise<void> {
        try {
            const schedulings = await Scheduling.all()
            await Promise.all(schedulings.map((scheduling) => this.createOneJob(scheduling)))

            new Worker(
                this.queueName,
                async (job) => {
                    console.log(`[WORKER] 🔥 Processing job ${job.id} with data:`, job.data)
                    const { schedule_id } = job.data
                    try {
                        const scheduling = await Scheduling.findOrFail(schedule_id)
                        const account = await Account.findOrFail(scheduling.account_id)
                        console.log(`[WORKER] ✅ Found scheduling ${schedule_id} for account ${account.handle}`)
                        console.log(`[WORKER] 📤 About to publish post: "${scheduling.message}"`)
                        await handle({ schedule_id }, await this.account_manager.getOrCreateAccountService(account))
                        console.log(`[WORKER] 🎉 Successfully processed job ${job.id} for schedule ${schedule_id}`)
                    } catch (error) {
                        console.error(`[WORKER] ❌ Error processing job ${job.id}:`, error)
                        throw error
                    }
                },
                {
                    connection: {
                        family: 0,
                        host: env.get('REDIS_HOST'),
                        port: env.get('REDIS_PORT'),
                        password: env.get('REDIS_PASSWORD'),
                    },
                }
            )
        } catch (err) {
            console.error('[ERROR] Failed to start schedulers queue:', err)
        }
    }

    /**
     * Crée un job pour un scheduling
     */
    public async createOneJob(scheduling: Scheduling): Promise<void> {
        try {
            // Handle both Lucid DateTime objects and regular Date/string objects
            let scheduleTimeISO: string
            if (scheduling.scheduleTime && typeof scheduling.scheduleTime.toISO === 'function') {
                // Lucid DateTime object
                const isoString = scheduling.scheduleTime.toISO()
                if (!isoString) {
                    throw new Error(`Failed to convert DateTime to ISO string for schedule ${scheduling.id}`)
                }
                scheduleTimeISO = isoString
            } else if (scheduling.scheduleTime instanceof Date) {
                // JavaScript Date object
                scheduleTimeISO = scheduling.scheduleTime.toISOString()
            } else if (typeof scheduling.scheduleTime === 'string') {
                // String representation
                scheduleTimeISO = new Date(scheduling.scheduleTime).toISOString()
            } else {
                throw new Error(`Invalid schedule time format for schedule ${scheduling.id}`)
            }
            
            if (!scheduleTimeISO) {
                throw new Error(`Invalid schedule time for schedule ${scheduling.id}`)
            }
            const scheduleTime = new Date(scheduleTimeISO)
            const delay = scheduleTime.getTime() - Date.now()
            
            // Ne pas créer de job pour les dates passées
            if (delay <= 0) {
                console.warn(`[WARNING] Schedule ${scheduling.id} is in the past, skipping job creation`)
                return
            }

            const job = await this.queue.add(
                'schedule',
                { schedule_id: scheduling.id },
                {
                    delay,
                    jobId: crypto.randomBytes(16).toString('hex'),
                }
            )
            
            if (job.id) {
                scheduling.jobId = job.id
                await scheduling.save()
                console.log(`[INFO] Created job ${job.id} for schedule ${scheduling.id}`)
            } else {
                throw new Error(`No job ID found for schedule ${scheduling.id}`)
            }
        } catch (err) {
            console.error(`[ERROR] Failed to create job for schedule ${scheduling.id}:`, err)
            throw err
        }
    }

    /**
     * Supprime un job existant
     */
    public async removeJob(jobId: string): Promise<void> {
        try {
            if (!jobId) {
                console.warn(`[WARNING] No job ID provided for removal`)
                return
            }
            
            const job = await this.queue.getJob(jobId)
            if (job) {
                await job.remove()
                console.log(`[INFO] Removed job ${jobId}`)
            } else {
                console.warn(`[WARNING] Job ${jobId} not found in queue`)
            }
        } catch (err) {
            console.error(`[ERROR] Failed to remove job ${jobId}:`, err)
            // Ne pas rethrow l'erreur pour éviter de bloquer les autres opérations
        }
    }

    /**
     * Met à jour un job existant
     */
    public async updateJob(scheduling: Scheduling): Promise<void> {
        try {
            // Supprimer l'ancien job s'il existe
            if (scheduling.jobId) {
                await this.removeJob(scheduling.jobId)
            }
            
            // Créer le nouveau job
            await this.createOneJob(scheduling)
        } catch (err) {
            console.error(`[ERROR] Failed to update job for schedule ${scheduling.id}:`, err)
            throw err
        }
    }
}