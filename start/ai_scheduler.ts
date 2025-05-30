import app from '@adonisjs/core/services/app'
import { FirehoseSubscriberService } from '../app/services/firehose_subscriber_service.js'
import { Logger } from '@adonisjs/core/logger'

/**
 * Start the Firehose connection to listen for follow events for all accounts
 * This connection will automatically increment the numbersOfFollowersToAnalyze
 * property for accounts when they receive new followers.
 */
async function startFirehoseConnection() {
    try {
        // Get the logger service
        const logger = await app.container.make(Logger)

        // Get the firehose subscriber service
        const firehoseService = await app.container.make(FirehoseSubscriberService)

        // Start listening for follows on all accounts
        const success = await firehoseService.listenToAllAccounts()

        if (success) {
            logger.info('Firehose connection started successfully. Now listening for follow events on all accounts.')
        } else {
            logger.warn('Failed to start Firehose connection. No accounts may be available to listen for.')
        }
    } catch (error) {
        console.error('Failed to start Firehose connection:', error)
    }
}

// Start the Firehose connection when the application starts
startFirehoseConnection().catch(err => {
    console.error('Error starting Firehose connection:', err)
})