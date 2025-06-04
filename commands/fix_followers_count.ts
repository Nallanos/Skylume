import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Account from '#models/account'
import AccountManager from '#services/account_manager'

export default class FixFollowersCount extends BaseCommand {
    static commandName = 'fix:followers-count'
    static description = 'Fix accounts that have null or 0 followers_count by fetching real data from Bluesky API'

    static options: CommandOptions = {}

    async run() {
        this.logger.info('🔧 Fixing accounts with missing followers_count...')

        try {
            // Récupérer tous les comptes
            const accounts = await Account.query()
                .whereNull('followers_count')
                .orWhere('followers_count', 0)

            this.logger.info(`Found ${accounts.length} accounts with missing or zero followers_count`)

            if (accounts.length === 0) {
                this.logger.success('No accounts need fixing!')
                return
            }

            let fixed = 0
            let errors = 0

            for (const account of accounts) {
                try {
                    this.logger.info(`Fixing account: ${account.handle}`)

                    // Créer une instance d'AccountManager
                    const accountManager = new AccountManager()

                    // Obtenir l'AccountService
                    const accountService = await accountManager.getOrCreateAccountService(account)

                    // Mettre à jour les statistiques (incluant followers_count)
                    await accountService.updateAccountStats(account)

                    // Recharger l'account depuis la DB pour voir la valeur mise à jour
                    await account.refresh()

                    this.logger.success(`✓ ${account.handle}: ${account.followers_count} followers`)
                    fixed++

                } catch (error) {
                    this.logger.error(`✗ Error fixing ${account.handle}: ${error.message}`)
                    errors++
                }
            }

            this.logger.success(`Completed! Fixed: ${fixed}, Errors: ${errors}`)

        } catch (error) {
            this.logger.error(`Command failed: ${error.message}`)
            this.exitCode = 1
        }
    }
}
