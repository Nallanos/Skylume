import { Worker, Queue } from 'bullmq'
import Scheduling from '#models/scheduling'
import handle from '../jobs/schedule_job.js'
import env from '#start/env'
import crypto from 'crypto'
import { inject } from '@adonisjs/core'

@inject()
export class SchedulingQueueManager {
    public queueName = 'schedulers'
    private worker: Worker | null = null

    /**
     * Initialize the queue (no worker logic here, just queue management)
     */
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
     * Start the worker (separate from queue management)
     */
    public async startWorker(): Promise<void> {
        if (this.worker) {
            console.log('[WORKER] Worker already running')
            return
        }

        this.worker = new Worker(
            this.queueName,
            async (job) => {
                console.log(`[WORKER] 🔥 Processing job ${job.id} with data:`, job.data)
                await handle(job.data)
                console.log(`[WORKER] 🎉 Successfully processed job ${job.id}`)
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

        console.log('[WORKER] BullMQ worker started')
    }

    /**
     * Initialize scheduling service - create jobs for existing schedules and start worker
     */
    public async createAndStartSchedulersQueue(): Promise<void> {
        try {
            // Create jobs for existing schedules
            const schedulings = await Scheduling.all()
            await Promise.all(schedulings.map((scheduling) => this.createOneJob(scheduling)))

            // Start the worker
            await this.startWorker()
        } catch (err) {
            console.error('[ERROR] Failed to start schedulers queue:', err)
        }
    }

    /**
     * Create a job for a scheduling
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
            
            // Don't create jobs for past dates
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
     * Remove an existing job
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
            // Don't rethrow to avoid blocking other operations
        }
    }

    /**
     * Update an existing job
     */
    public async updateJob(scheduling: Scheduling): Promise<void> {
        try {
            // Remove the old job if it exists
            if (scheduling.jobId) {
                await this.removeJob(scheduling.jobId)
            }
            
            // Create the new job
            await this.createOneJob(scheduling)
        } catch (err) {
            console.error(`[ERROR] Failed to update job for schedule ${scheduling.id}:`, err)
            throw err
        }
    }

    /**
     * Stop the worker gracefully
     */
    public async stopWorker(): Promise<void> {
        if (this.worker) {
            await this.worker.close()
            this.worker = null
            console.log('[WORKER] Worker stopped')
        }
    }
}
