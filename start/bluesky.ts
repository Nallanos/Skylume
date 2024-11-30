import logger from '@adonisjs/core/services/logger'
import users_bot_service_manager from '../app/bluesky/users_bot_service_manager.js'
async function bootBluesky() {
    logger.info('[Bluesky] booting job queue...')

    await users_bot_service_manager.startAllUsersBotService()
    await users_bot_service_manager.createAndStartListenersQueue()
}

await bootBluesky()