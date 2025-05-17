import { BaseCommand } from '@adonisjs/core/ace'
import Account from '#models/account'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { QueueManager } from '../app/services/queue_manager.js'

export default class SetupRecurringAnalysis extends BaseCommand {
    // QueueManager sera récupéré à l'exécution
    private queueManager?: QueueManager

    constructor(
        app: any,
        kernel: any,
        ui: any,
        prompt: any,
        application: any
    ) {
        super(app, kernel, ui, prompt, application)
    }

    /**
     * S'execute avant la méthode run et initialise les services
     */
    async prepare() {
        if (super.prepare) {
            await super.prepare()
        }

        try {
            // Récupère directement l'instance de QueueManager du conteneur
            this.queueManager = await this.app.container.make(QueueManager)
        } catch (error) {
            this.logger.error('Impossible d\'obtenir QueueManager:', error)
        }
    }

    /**
     * Command name is used to run the command
     */
    static commandName = 'setup:recurring-analysis'

    static options: CommandOptions = { startApp: true }


    /**
     * Command description is displayed in the "help" output
     */
    static description = 'Setup recurring analysis jobs for all accounts'



    async run(): Promise<void> {
        this.logger.info('Setting up recurring analysis jobs')

        try {
            // Check if queue manager was initialized
            if (!this.queueManager) {
                this.logger.error('QueueManager not available - cannot schedule recurring analysis')
                this.exitCode = 1
                return
            }

            const accounts = await Account.all()

            this.logger.info(`Found ${accounts.length} accounts to setup recurring analysis for`)

            for (const account of accounts) {
                try {
                    await this.queueManager.scheduleRecurringAnalysis(account)
                    this.logger.success(`Recurring analysis setup for account: ${account.handle}`)
                } catch (error) {
                    this.logger.error(`Failed to setup recurring analysis for account ${account.handle}: ${error.message}`)
                }
            }

            this.logger.success(`Recurring analysis setup completed for ${accounts.length} accounts`)
        } catch (error) {
            this.logger.error(`Error setting up recurring analysis: ${error.message}`)
            this.exitCode = 1
        }
    }
}
