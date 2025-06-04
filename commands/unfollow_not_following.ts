// filepath: /home/allan/Documents/bsky-copilot2/Bluesky-copilot/commands/unfollow_not_following.ts
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import AccountManager from '#services/account_manager'
import AccountService from '#services/account_service'
import Account from '#models/account'
import { inject } from '@adonisjs/core'
import pQueue from 'p-queue'

@inject()
export default class UnfollowNotFollowing extends BaseCommand {
  static commandName = 'unfollow:not:following'
  static description = 'Unfollow accounts that do not follow you back'
  static options: CommandOptions = { startApp: true, staysAlive: true }

  // Configuration
  private readonly BATCH_SIZE = 100 // Nombre d'utilisateurs à traiter par lot
  private readonly MAX_CONCURRENCY = 5 // Nombre maximum de requêtes parallèles
  private readonly RATE_LIMIT_DELAY = 200 // Délai entre les requêtes en millisecondes

  // Dependencies
  private accountService: AccountService | null = null
  private account: Account | null = null
  private processingQueue = new pQueue({ concurrency: this.MAX_CONCURRENCY })
  private followingNotFollowers: Map<string, ProfileView> = new Map() // DIDs des utilisateurs que vous suivez mais qui ne vous suivent pas
  private followingCount = 0

  constructor(
    protected accountManager: AccountManager,
    app: any,
    kernel: any,
    ui: any,
    prompt: any,
    application: any
  ) {
    super(app, kernel, ui, prompt, application)
  }

  async run() {
    this.logger.info('🧹 Unfollow Not Following - Remove follows for accounts that do not follow you back')

    // 1. Récupérer les comptes disponibles
    const accounts = await Account.all()
    if (accounts.length === 0) {
      this.logger.error('No accounts found in the database. Please add an account first.')
      return
    }

    const selectedAccountId = accounts[0].id
    this.logger.info(`Using account: ${selectedAccountId}`)
    this.account = await Account.findOrFail(selectedAccountId)
    if (!this.account) {
      this.logger.error('Account not found')
      return
    }

    // 2. Initialisation du service de compte
    const setupAction = this.logger.action(`Setting up services for ${this.account.handle}`)
    try {
      this.accountService = await this.accountManager.getOrCreateAccountService(this.account)
      await this.accountService.createOrResumeSession(this.account)
      setupAction.succeeded()
    } catch (error) {
      setupAction.failed(`Failed to initialize account service: ${error.message}`)
      return
    }

    // 3. Workflow principal
    try {
      // a. Récupérer la liste des comptes suivis
      await this.fetchFollowing()

      // b. Récupérer la liste des followers
      await this.filterFollowers()

      // c. Afficher les résultats
      this.logger.info(`You are following: ${this.followingCount} accounts`)
      this.logger.info(`Accounts not following you back: ${this.followingNotFollowers.size}`)

      // d. Demander confirmation avant de procéder
      if (this.followingNotFollowers.size > 0) {
        const confirmUnfollow = await this.prompt.confirm('Do you want to unfollow these accounts?')
        if (confirmUnfollow) {
          await this.processUnfollows()
        } else {
          this.logger.info('Operation cancelled. No accounts were unfollowed.')
        }
      } else {
        this.logger.success('All accounts you follow are following you back. No action needed.')
      }
    } catch (error) {
      this.logger.error(`An error occurred: ${error.message}`)
    }
  }

  /**
   * Récupère tous les comptes que l'utilisateur suit
   */
  private async fetchFollowing() {
    if (!this.account || !this.accountService) return

    const fetchingAction = this.logger.action('Fetching accounts you follow')

    try {
      let cursor: string | undefined
      const following: ProfileView[] = []

      do {
        const response = await this.accountService.agent.getFollows({
          actor: this.account.did,
          limit: this.BATCH_SIZE,
          cursor
        })

        const profiles = response.data.follows || []
        following.push(...profiles)

        this.logger.info(`Fetched ${following.length} following so far...`)

        // Stocker temporairement tous les profils suivis
        profiles.forEach(profile => {
          if (!this.followingNotFollowers.has(profile.did)) {
            this.followingNotFollowers.set(profile.did, profile)
          }
        })

        cursor = response.data.cursor

        if (!cursor) break

        // Pause pour respecter les limites d'API
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY))
      } while (true)

      this.followingCount = following.length
      fetchingAction.succeeded()
      this.logger.success(`Found ${following.length} accounts that you follow`)
    } catch (error) {
      fetchingAction.failed(`Error fetching following: ${error.message}`)
      throw error
    }
  }

  /**
   * Filtre la liste des comptes suivis pour ne garder que ceux qui ne suivent pas l'utilisateur en retour
   */
  private async filterFollowers() {
    if (!this.account || !this.accountService) return

    const filteringAction = this.logger.action('Identifying accounts not following you back')

    try {
      let cursor: string | undefined
      let followersFound = 0

      do {
        const response = await this.accountService.agent.getFollowers({
          actor: this.account.did,
          limit: this.BATCH_SIZE,
          cursor
        })

        const followers = response.data.followers || []
        followersFound += followers.length

        // Supprimer de la Map les profils qui vous suivent
        followers.forEach(follower => {
          if (this.followingNotFollowers.has(follower.did)) {
            this.followingNotFollowers.delete(follower.did)
          }
        })

        this.logger.info(`Processed ${followersFound} followers so far...`)
        cursor = response.data.cursor

        if (!cursor) break

        // Pause pour respecter les limites d'API
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY))
      } while (true)

      filteringAction.succeeded()
      this.logger.success(`Found ${this.followingNotFollowers.size} accounts not following you back`)
    } catch (error) {
      filteringAction.failed(`Error filtering followers: ${error.message}`)
      throw error
    }
  }

  /**
   * Supprime les follows pour les profils qui ne suivent pas en retour
   */
  private async processUnfollows() {
    if (!this.account || !this.accountService) return

    const unfollowAction = this.logger.action(`Unfollowing ${this.followingNotFollowers.size} accounts`)
    const profiles = Array.from(this.followingNotFollowers.values())

    // Création d'un tableau pour suivre les profils à traiter par lots
    const batches = []
    for (let i = 0; i < profiles.length; i += 10) {
      batches.push(profiles.slice(i, i + 10))
    }

    this.logger.info(`Processing ${batches.length} batches of unfollows`)
    let successCount = 0

    // Traiter chaque lot séquentiellement
    for (const [batchIndex, batch] of batches.entries()) {
      this.logger.info(`Processing batch ${batchIndex + 1}/${batches.length}`)

      // Traiter les profils dans le lot en parallèle contrôlé
      const batchPromises = batch.map((profile, profileIndex) =>
        this.processingQueue.add(async () => {
          const index = (batchIndex * 10) + profileIndex

          try {
            // Vérifier si nous suivons encore ce profil
            if (profile.viewer?.following) {
              const unfollowProfileAction = this.logger.action(`[${index + 1}/${profiles.length}] Unfollowing ${profile.handle}`)

              try {
                // Supprimer le follow
                if (this.accountService) {
                  await this.accountService.agent.deleteFollow(profile.viewer.following)
                }

                unfollowProfileAction.succeeded()
                successCount++
              } catch (error) {
                unfollowProfileAction.failed(`Failed to unfollow ${profile.handle}: ${error.message}`)
              }
            } else {
              this.logger.info(`[${index + 1}/${profiles.length}] Already not following ${profile.handle}`)
            }
          } catch (error) {
            this.logger.error(`Error processing ${profile.handle}: ${error.message}`)
          }
        })
      )

      // Attendre que toutes les tâches du lot soient terminées
      await Promise.all(batchPromises)

      // Pause entre les lots pour respecter les limites d'API
      if (batchIndex < batches.length - 1) {
        this.logger.info('Taking a short break before next batch...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    unfollowAction.succeeded()
    this.logger.success(`Successfully unfollowed ${successCount} accounts that were not following you back`)
  }
}