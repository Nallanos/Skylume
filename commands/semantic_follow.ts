import Follow from '#models/follow'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { AtpAgent } from '@atproto/api'
import { DateTime } from 'luxon'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import targetAudienceService from '#services/AI_services'
import pQueue from 'p-queue'
import account_manager from '#services/account_manager'
import Account from '#models/account'

export default class SemanticFollowCommand extends BaseCommand {
    static commandName = 'semantic:follow'
    static description = 'Mass follow profiles that semantically match specific keywords from Bluesky posts'
    static options: CommandOptions = { startApp: true, staysAlive: true }

    // Configuration
    private readonly HOURLY_LIMIT = 3000
    private readonly MIN_SEMANTIC_SCORE = 0.65 // Seuil minimal de score sémantique
    private readonly MAX_POSTS_TO_FETCH = 300 // Nombre maximal de posts à récupérer par mot-clé
    private readonly MAX_AUTHORS_TO_PROCESS = 200 // Nombre maximal d'auteurs à analyser
    private readonly DEFAULT_KEYWORDS = [
        'software development',
        'programming',
        'web development',
        'artificial intelligence',
        'machine learning',
        'data science',
        'blockchain',
        'startup'
    ]

    // State
    private agent = new AtpAgent({ service: 'https://bsky.social' })
    private keywords: string[] = []
    private accountService: any
    private account: Account | null = null
    private processingQueue = new pQueue({ concurrency: 5 }) // Pour les traitements parallèles
    private authorProfiles: Map<string, ProfileView> = new Map() // Pour stocker les profils uniques
    private authorScores: Map<string, number> = new Map() // Pour stocker les scores sémantiques

    async run() {
        // Initialisation
        this.logger.info('🔍 Semantic Follow - Find and follow profiles based on semantic post analysis')

        // 1. Sélection du compte - compte fixe au lieu de demander à l'utilisateur
        const accounts = await Account.all()
        if (accounts.length === 0) {
            this.logger.error('No accounts found in the database. Please add an account first.')
            return
        }

        // Utiliser un ID de compte fixe au lieu de demander à l'utilisateur
        // Choisir ici l'ID du compte à utiliser (par exemple, le premier compte trouvé)
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
            this.accountService = await account_manager.getOrCreateAccountService(this.account)
            await this.accountService.createOrResumeSession(this.account)
            setupAction.succeeded()
        } catch (error) {
            setupAction.failed(`Failed to initialize account service: ${error.message}`)
            return
        }

        // 3. Configuration des mots-clés - utiliser les mots-clés par défaut sans demander
        this.logger.info('Using default keywords')
        this.keywords = this.DEFAULT_KEYWORDS
        this.logger.info(`Keywords loaded: ${this.keywords.join(', ')}`)

        // 4. Vérification des limites de rate
        const { canProceed, availableSlots } = await this.checkRateLimit()
        if (!canProceed) {
            this.logger.error(`Hourly limit reached (${this.HOURLY_LIMIT}/h)`)
            return
        }

        // 5. Workflow principal
        try {
            // a. Récupérer des posts basés sur les mots-clés
            await this.fetchPostsByKeywords()

            this.logger.success(`Found ${this.authorProfiles.size} unique authors from posts`)

            // b. Analyser les profils des auteurs
            await this.analyzeAuthorProfiles()

            // c. Trier et filtrer les auteurs par score sémantique
            const matchingAuthors = this.getTopMatchingProfiles(Math.min(availableSlots, 50))

            if (matchingAuthors.length > 0) {
                // d. Suivre les profils correspondants
                await this.processFollows(matchingAuthors)
            } else {
                this.logger.warning('No semantically matching profiles found')
            }
        } catch (error) {
            this.logger.error(`An error occurred: ${error.message}`)
        }

        this.logger.success('Semantic follow process completed')
    }

    /**
     * Récupère des posts basés sur les mots-clés et stocke leurs auteurs
     */
    private async fetchPostsByKeywords() {
        this.logger.info('Searching for posts matching keywords...')

        for (const keyword of this.keywords) {
            const fetchingAction = this.logger.action(`Searching posts with keyword: ${keyword}`)
            try {
                let cursor: string | undefined = undefined
                let totalFetched = 0

                do {
                    // Récupérer des posts avec le mot-clé actuel
                    const searchResults: { posts?: ProfileView[], cursor?: string } = await this.accountService.searchPosts(
                        this.account!,
                        keyword,
                        cursor
                    )

                    const posts = searchResults?.posts || []

                    // Traiter les posts et extraire les auteurs
                    for (const post of posts) {
                        const author = post.author

                        // Stocker uniquement les profils uniques
                        if (!this.authorProfiles.has(author.did)) {
                            this.authorProfiles.set(author.did, author)
                        }
                    }

                    cursor = searchResults?.cursor
                    totalFetched += posts.length

                    // Continuer jusqu'à atteindre la limite ou ne plus avoir de posts
                    if (!cursor || totalFetched >= this.MAX_POSTS_TO_FETCH) break

                    // Pause pour respecter les limites de l'API
                    await new Promise(resolve => setTimeout(resolve, 300))

                } while (true)

                fetchingAction.succeeded()
                this.logger.success(`Found ${totalFetched} posts for "${keyword}"`)
            } catch (error) {
                fetchingAction.failed(`Error searching posts for "${keyword}": ${error.message}`)
            }

            // Limiter le nombre total d'auteurs à analyser
            if (this.authorProfiles.size >= this.MAX_AUTHORS_TO_PROCESS) {
                this.logger.info(`Reached maximum number of authors to analyze (${this.MAX_AUTHORS_TO_PROCESS})`)
                break
            }
        }
    }

    /**
     * Analyse les profils des auteurs pour calculer leur score sémantique
     */
    private async analyzeAuthorProfiles() {
        const analyzingAction = this.logger.action(`Analyzing ${this.authorProfiles.size} author profiles`)

        // Convertir la Map en tableau pour traitement parallèle
        const authors = Array.from(this.authorProfiles.values())

        // Limiter à un nombre raisonnable d'auteurs pour éviter de surcharger
        const authorsToProcess = authors.slice(0, this.MAX_AUTHORS_TO_PROCESS)

        // Traiter les auteurs en parallèle avec une concurrence limitée
        const tasks = authorsToProcess.map(author => this.processingQueue.add(async () => {
            try {
                const score = await this.calculateAuthorScore(author)
                this.authorScores.set(author.did, score)
            } catch (error) {
                this.logger.warning(`Error analyzing ${author.handle}: ${error.message}`)
            }
        }))

        analyzingAction.succeeded()
        this.logger.success(`Analyzed ${this.authorScores.size} profiles semantically`)
    }

    /**
     * Calcule un score sémantique pour un auteur en analysant sa bio et ses posts récents
     */
    private async calculateAuthorScore(author: ProfileView): Promise<number> {
        if (!author.did) return 0

        // Récupérer plus d'informations sur le profil si nécessaire
        let bioScore = 0
        let postsScore = 0

        // 1. Analyser la bio
        if (author.description) {
            const bioScores = await Promise.all(
                this.keywords.map(keyword =>
                    targetAudienceService.getSemanticSimilarity(keyword, author.description!)
                )
            )
            bioScore = Math.max(...bioScores) * 0.4 // La bio compte pour 40% du score total
        }

        // 2. Analyser les posts récents
        try {
            const feed = await this.accountService.agent.getAuthorFeed({
                actor: author.handle,
                limit: 10
            })

            if (feed?.data?.feed && feed.data.feed.length > 0) {
                // Calculer le score moyen des posts
                const postScores = await Promise.all(
                    feed.data.feed.map(async (feedItem: any) => {
                        const postText = (feedItem.post.record as any)?.text || ''
                        if (!postText) return 0

                        // Calculer le meilleur score de similarité avec les mots-clés
                        const scores = await Promise.all(
                            this.keywords.map(keyword =>
                                targetAudienceService.getSemanticSimilarity(keyword, postText)
                            )
                        )

                        return Math.max(...scores)
                    })
                )

                // Faire la moyenne des scores des posts
                postsScore = postScores.reduce((sum, score) => sum + score, 0) / postScores.length * 0.6
            }
        } catch (error) {
            // En cas d'erreur, on continue avec le score de la bio uniquement
            this.logger.warning(`Couldn't fetch posts for ${author.handle}: ${error.message}`)
        }

        // Calculer le score total (bio + posts)
        return bioScore + postsScore
    }

    /**
     * Récupère les N profils avec les meilleurs scores sémantiques
     */
    private getTopMatchingProfiles(limit: number): ProfileView[] {
        // Trier les auteurs par score sémantique (du plus élevé au plus faible)
        const sortedAuthors = Array.from(this.authorScores.entries())
            .filter(([_did, score]) => score >= this.MIN_SEMANTIC_SCORE)
            .sort(([_didA, scoreA], [_didB, scoreB]) => scoreB - scoreA)
            .slice(0, limit)
            .map(([did, score]) => {
                const profile = this.authorProfiles.get(did)!
                this.logger.info(`${profile.handle}: score ${score.toFixed(2)}`)
                return profile
            })

        return sortedAuthors
    }

    private async checkRateLimit() {
        const recentCount = await Follow.query()
            .where('created_at', '>', DateTime.now().minus({ hours: 1 }).toSQL())
            .count('* as total')

        const count = Number((recentCount[0] as any).$extras.total)
        return {
            canProceed: count < this.HOURLY_LIMIT,
            availableSlots: this.HOURLY_LIMIT - count
        }
    }

    private async processFollows(targets: ProfileView[]) {
        if (!targets.length) {
            this.logger.warning('No targets found')
            return
        }

        this.logger.info(`Starting follow batch (${targets.length} users)`)
        let successCount = 0

        for (const [index, profile] of targets.entries()) {
            try {
                if (!this.account) throw new Error("Account not defined")

                // Vérifier si déjà suivi
                const existing = await Follow.query().where('did', profile.did).first()
                if (existing) {
                    this.logger.info(`[${index + 1}/${targets.length}] Already following ${profile.handle}`)
                    continue
                }

                const followAction = this.logger.action(`Following ${profile.handle}`)
                await this.accountService.followUser(this.account, profile.did)

                // Enregistrer le follow dans la base de données
                await Follow.create({
                    did: profile.did,
                    handle: profile.handle,
                    displayName: profile.displayName || null
                })

                followAction.succeeded()
                successCount++

                // Respect rate limits with a small delay between follows
                await new Promise(resolve => setTimeout(resolve, 300))

                // Check rate limits every 10 follows
                if ((index + 1) % 10 === 0) {
                    const { availableSlots } = await this.checkRateLimit()
                    if (availableSlots <= 0) {
                        this.logger.warning('Hourly rate limit reached, stopping batch')
                        break
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to follow ${profile.handle}: ${error.message}`)
            }
        }

        this.logger.success(`Follow batch completed: ${successCount} profiles followed successfully`)
    }
}