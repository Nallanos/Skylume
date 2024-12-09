import logger from '@adonisjs/core/services/logger'
import queue_manager from '../app/bluesky/queue_manager.js'
export async function bootBlueskyQueue() {
    try {
        await queue_manager.createAndStartListenersQueue()
        queue_manager.process()
    } catch (err) {
        logger.error("error while booting bluesky queue", err)
    }
}
await bootBlueskyQueue()