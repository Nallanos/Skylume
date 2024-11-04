import Account from '#models/account'
import AccountBotService from '../app/bluesky/accounts_bot_service.js'
import logger from '@adonisjs/core/services/logger'
import env from './env.js'

export async function bootBlueskyListeners() {
  logger.debug('[Bluesky] booting listeners...')

  // TODO: Query accounts by batches.
  const accounts = await Account.query()

  accounts.forEach(async (account) => {
    const bot = new AccountBotService(account)
    await bot.initializeMapHandler()
    await bot.startAllListeners()
  })

  logger.debug('[Bluesky] listeners successfully started')
}
if (env.get('NODE_ENV') === 'production') {
  bootBlueskyListeners()
}
