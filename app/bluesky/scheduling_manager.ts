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
                    const { schedule_id } = job.data
                    const scheduling = await Scheduling.findOrFail(schedule_id)
                    const account = await Account.findOrFail(scheduling.account_id)
                    console.log(`Processing schedule job ${job.id} for schedule ID: ${schedule_id}`)
                    await handle({ schedule_id }, await this.account_manager.getOrCreateAccountService(account))
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
            const scheduleTime = new Date(scheduling.scheduleTime)
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