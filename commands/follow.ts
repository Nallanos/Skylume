import Follow from '#models/follow'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import { TargetAudienceService } from '#services/AI_services'
import AccountManager from '#services/account_manager'
import AccountService from '#services/account_service'
import Account from '#models/account'

// Type definitions for session tracking
interface TopProfile {
  handle: string
  score: number
  query: string
}

interface FlowSession {
  iteration: number
  totalFollowed: number
  totalAnalyzed: number
  bestScore: number
  topProfiles: TopProfile[]
  queryEvolutions: string[]
  startTime: number
}

export default class FollowCommand extends BaseCommand {
  static commandName = 'follow'
  static description = 'Restructured automated follow operations for Bluesky with fluid workflow'
  static options: CommandOptions = { startApp: true, staysAlive: true }

  // Configuration
  private readonly HOURLY_LIMIT = 3000
  private readonly MIN_RELEVANCE_SCORE = 25
  private readonly BATCH_SIZE = 8
  private readonly TARGET_FOLLOWS = 1000 // Stop only after following 1000 people

  // State
  private service = new TargetAudienceService()
  private account?: Account
  private accountService?: AccountService
  private accountManager = new AccountManager()
  private currentQuery: string = ''
  private lastAnalyzedProfiles: ProfileView[] = []

  // Core keywords for targeting
  private readonly coreKeywords = [
    // Tech & Development
    'javascript', 'typescript', 'react', 'node.js', 'python', 'web development',
    'full-stack developer', 'software developer', 'frontend', 'backend',

    // Solopreneur & Business
    'solopreneur', 'entrepreneur', 'freelancer', 'startup founder',
    'content creator', 'digital nomad', 'indie hacker', 'creator economy',

    // Marketing & Growth
    'content marketing', 'social media marketing', 'growth hacking',
    'personal branding', 'audience building', 'bluesky marketing',

    // Trending 2025
    'ai tools', 'automation', 'no-code', 'remote work', 'productivity'
  ]

  async run() {
    this.logger.info('🚀 Restructured Follow Command - Fluid Bluesky Follow System')

    // 1. Initialize services and check limits
    if (!(await this.initializeServices())) return
    if (!(await this.checkAndDisplayLimits())) return

    // 2. Get intelligent initial query
    this.currentQuery = await this.getSmartInitialQuery()

    // 3. Execute fluid adaptive workflow
    await this.executeFluidWorkflow()
  }

  /**
   * Initialize all services with better error handling
   */
  private async initializeServices(): Promise<boolean> {
    try {
      const accounts = await Account.all()
      if (accounts.length === 0) {
        this.logger.error('❌ No accounts found. Please add an account first.')
        return false
      }

      this.account = accounts[0]
      this.logger.info(`🔧 Using account: ${this.account.handle}`)

      const setupAction = this.logger.action('Setting up account services')
      this.accountService = await this.accountManager.getOrCreateAccountService(this.account)

      if (!this.accountService) {
        throw new Error('Failed to create account service')
      }

      await this.accountService.createOrResumeSession(this.account)
      setupAction.succeeded()
      return true

    } catch (error) {
      this.logger.error(`❌ Service initialization failed: ${error.message}`)
      return false
    }
  }

  /**
   * Check rate limits and display current status
   */
  private async checkAndDisplayLimits(): Promise<boolean> {
    const { canProceed, availableSlots, currentCount } = await this.getRateLimitStatus()

    this.logger.info(`📊 Rate Limit Status: ${currentCount}/${this.HOURLY_LIMIT} used (${availableSlots} available)`)

    if (!canProceed) {
      this.logger.error('❌ Hourly rate limit reached. Please try again later.')
      return false
    }

    return true
  }

  /**
   * Get smart initial query with contextual suggestions
   */
  private async getSmartInitialQuery(): Promise<string> {
    const contextualSuggestions = this.generateContextualSuggestions()

    this.logger.info('\n💡 Smart Query Suggestions (based on 2025 trends):')
    contextualSuggestions.forEach((suggestion, index) => {
      this.logger.info(`   ${index + 1}. "${suggestion.query}" - ${suggestion.description}`)
    })

    const query = await this.prompt.ask('Enter your search query (or use a suggestion number):')

    // Handle numeric input for suggestions
    const numericChoice = parseInt(query)
    if (numericChoice && numericChoice <= contextualSuggestions.length) {
      const selectedSuggestion = contextualSuggestions[numericChoice - 1]
      this.logger.success(`🎯 Selected: "${selectedSuggestion.query}"`)
      return selectedSuggestion.query
    }

    this.logger.success(`🎯 Custom query: "${query}"`)
    return query
  }

  /**
   * Generate contextual suggestions based on current trends
   */
  private generateContextualSuggestions() {
    return [
      { query: 'ai automation tools', description: 'AI/ML enthusiasts and tool builders' },
      { query: 'react typescript', description: 'Modern web developers' },
      { query: 'solopreneur creator', description: 'Independent content creators' },
      { query: 'indie hacker', description: 'Solo entrepreneurs building products' },
      { query: 'no-code builder', description: 'No-code/low-code advocates' },
      { query: 'remote work productivity', description: 'Remote work specialists' }
    ]
  }

  /**
   * Main fluid workflow with adaptive intelligence
   */
  private async executeFluidWorkflow(): Promise<void> {
    const session = this.initializeSession()

    this.logger.info(`\n🌊 Starting Fluid Workflow (target: ${this.TARGET_FOLLOWS} follows)`)
    this.logger.info('━'.repeat(60))

    while (true) { // Continue until we reach our target or hit an error
      const iterationResult = await this.executeIteration(session)

      if (!iterationResult.shouldContinue) {
        this.logger.info('🛑 Workflow stopped: ' + iterationResult.reason)
        break
      }

      await this.adaptiveDelay(iterationResult.success)
    }

    this.displayFinalSummary(session)
  }

  /**
   * Initialize session tracking
   */
  private initializeSession(): FlowSession {
    return {
      iteration: 0,
      totalFollowed: 0,
      totalAnalyzed: 0,
      bestScore: 0,
      topProfiles: [] as TopProfile[],
      queryEvolutions: [] as string[],
      startTime: Date.now()
    }
  }

  /**
   * Execute a single iteration with comprehensive logic
   */
  private async executeIteration(session: FlowSession) {
    session.iteration++
    const iterationStart = Date.now()

    this.logger.info(`\n🔄 Iteration ${session.iteration} (Progress: ${session.totalFollowed}/${this.TARGET_FOLLOWS})`)
    this.logger.info(`   🎯 Query: "${this.currentQuery}"`)

    try {
      // 1. Intelligent profile search
      const searchResult = await this.intelligentProfileSearch()
      if (!searchResult.success) {
        await this.adaptQuery('search_failed')
        return { shouldContinue: true, success: false, reason: 'Search failed, adapting query' }
      }

      session.totalAnalyzed += searchResult.profiles.length

      // 2. Advanced profile processing
      const processResult = await this.advancedProfileProcessing(searchResult.profiles)

      if (processResult.followedCount > 0) {
        session.totalFollowed += processResult.followedCount
        session.topProfiles.push(...processResult.topProfiles)

        if (processResult.bestScore > session.bestScore) {
          session.bestScore = processResult.bestScore
        }

        // 3. Intelligent query evolution
        await this.evolveQueryIntelligently(processResult.bestMatch)
        session.queryEvolutions.push(this.currentQuery)

        this.logger.success(`✅ Iteration success: +${processResult.followedCount} follows (Total: ${session.totalFollowed})`)
      } else {
        await this.adaptQuery('no_follows')
        this.logger.warning('⚠️ No follows this iteration - adapting strategy')
      }

      // 4. Check continuation conditions

      // Primary condition: Stop if we've reached our target of 1000 follows
      if (session.totalFollowed >= this.TARGET_FOLLOWS) {
        return { shouldContinue: false, success: true, reason: `Target reached: ${session.totalFollowed} follows completed` }
      }

      // Secondary condition: Check rate limits only as a fallback
      const { canProceed } = await this.getRateLimitStatus()
      if (!canProceed) {
        return { shouldContinue: false, success: true, reason: 'Rate limit reached' }
      }

      const iterationTime = Date.now() - iterationStart
      this.logger.info(`   ⏱️ Completed in ${iterationTime}ms`)
      this.logger.info(`   📊 Progress: ${session.totalFollowed}/${this.TARGET_FOLLOWS} follows`)

      // Continue workflow regardless of individual iteration success
      // Only stop when target is reached or rate limit hit
      return { shouldContinue: true, success: true }

    } catch (error) {
      this.logger.error(`❌ Iteration ${session.iteration} failed: ${error.message}`)
      await this.adaptQuery('error')
      return { shouldContinue: true, success: false, reason: `Error: ${error.message}` }
    }
  }

  /**
   * Intelligent profile search with multi-strategy approach
   */
  private async intelligentProfileSearch(): Promise<{ success: boolean, profiles: ProfileView[] }> {
    if (!this.accountService) {
      return { success: false, profiles: [] }
    }

    try {
      this.logger.info(`🔍 Intelligent search: "${this.currentQuery}"`)

      // Primary targeted search
      const primaryProfiles = await this.primarySearch(this.currentQuery)

      // Expand if needed with smart keyword selection
      let allProfiles = primaryProfiles
      if (primaryProfiles.length < 15) {
        this.logger.info('📈 Expanding with strategic keywords...')
        const expandedProfiles = await this.strategicExpansion()
        allProfiles = [...primaryProfiles, ...expandedProfiles]
      }

      // Remove duplicates and apply initial filtering
      const uniqueProfiles = this.deduplicateAndFilter(allProfiles)

      this.logger.success(`✅ Found ${uniqueProfiles.length} unique profiles`)
      return { success: uniqueProfiles.length > 0, profiles: uniqueProfiles }

    } catch (error) {
      this.logger.error(`❌ Search error: ${error.message}`)
      return { success: false, profiles: [] }
    }
  }

  /**
   * Primary search with the current query
   */
  private async primarySearch(query: string): Promise<ProfileView[]> {
    if (!this.accountService) return []

    const response = await this.accountService.agent.api.app.bsky.actor.searchActors({
      term: query,
      limit: 30
    })

    return response.data.actors || []
  }

  /**
   * Strategic expansion with related keywords
   */
  private async strategicExpansion(): Promise<ProfileView[]> {
    if (!this.accountService) return []

    const strategicKeywords = this.selectStrategicKeywords()
    const expandedProfiles: ProfileView[] = []

    for (const keyword of strategicKeywords.slice(0, 4)) {
      try {
        const response = await this.accountService.agent.api.app.bsky.actor.searchActors({
          term: keyword,
          limit: 10
        })

        expandedProfiles.push(...(response.data.actors || []))
        await this.delay(250)
      } catch (error) {
        this.logger.warning(`Failed expansion search for "${keyword}": ${error.message}`)
      }
    }

    return expandedProfiles
  }

  /**
   * Select strategic keywords based on current query context
   */
  private selectStrategicKeywords(): string[] {
    const queryTerms = this.extractQueryTerms(this.currentQuery)
    const relatedKeywords: string[] = []

    // Add contextually relevant keywords
    if (queryTerms.some(term => ['javascript', 'react', 'typescript', 'web'].includes(term))) {
      relatedKeywords.push('frontend developer', 'react developer', 'typescript')
    }

    if (queryTerms.some(term => ['ai', 'ml', 'automation'].includes(term))) {
      relatedKeywords.push('machine learning', 'ai tools', 'automation')
    }

    if (queryTerms.some(term => ['startup', 'entrepreneur', 'founder'].includes(term))) {
      relatedKeywords.push('indie hacker', 'solopreneur', 'startup founder')
    }

    // Fallback to core keywords
    return relatedKeywords.length > 0 ? relatedKeywords : this.coreKeywords.slice(0, 6)
  }

  /**
   * Deduplicate and apply initial filtering
   */
  private deduplicateAndFilter(profiles: ProfileView[]): ProfileView[] {
    const seen = new Set<string>()
    return profiles.filter(profile => {
      if (seen.has(profile.did)) return false
      seen.add(profile.did)
      return profile.handle && profile.did // Basic validation
    })
  }

  /**
   * Advanced profile processing with intelligent scoring
   */
  private async advancedProfileProcessing(profiles: ProfileView[]) {
    if (!this.accountService || !this.account) {
      return { followedCount: 0, bestMatch: null, bestScore: 0, topProfiles: [] }
    }

    this.logger.info(`🧠 Processing ${profiles.length} profiles with AI scoring...`)

    const scoredProfiles: Array<{ profile: ProfileView, score: number }> = []
    let followedCount = 0
    let bestMatch: ProfileView | null = null
    let bestScore = 0

    // Process in batches for efficiency
    for (let i = 0; i < profiles.length && i < 25; i += this.BATCH_SIZE) {
      const batch = profiles.slice(i, i + this.BATCH_SIZE)

      const batchResults = await Promise.allSettled(
        batch.map(async (profile) => {
          // Quick pre-filtering
          if (!(await this.quickProfileValidation(profile))) {
            return null
          }

          // AI relevance scoring
          const score = await this.service.scoreProfileRelevance(
            profile,
            this.coreKeywords,
            this.accountService!.agent,
            false
          )

          return { profile, score }
        })
      )

      // Process successful results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { profile, score } = result.value

          if (score >= this.MIN_RELEVANCE_SCORE) {
            scoredProfiles.push({ profile, score })

            if (score > bestScore) {
              bestScore = score
              bestMatch = profile
            }
          }
        }
      })

      await this.delay(800) // Rate limiting between batches
    }

    // Follow the best profiles
    scoredProfiles.sort((a, b) => b.score - a.score)
    const toFollow = scoredProfiles.slice(0, Math.min(8, scoredProfiles.length))

    for (const { profile, score } of toFollow) {
      try {
        const wasFollowed = await this.accountService.followUser(this.account, profile.did)

        if (wasFollowed) {
          await Follow.create({
            did: profile.did,
            handle: profile.handle,
            displayName: profile.displayName || null
          })

          followedCount++
          this.logger.success(`✅ Followed ${profile.handle} (${score}%)`)
        } else {
          this.logger.info(`📍 Already following ${profile.handle} (${score}%)`)
        }

        this.lastAnalyzedProfiles.push(profile)
        await this.delay(1200)
      } catch (error) {
        this.logger.warning(`⚠️ Failed to follow ${profile.handle}: ${error.message}`)
      }
    }

    const topProfiles = scoredProfiles.slice(0, 3).map(item => ({
      handle: item.profile.handle,
      score: item.score,
      query: this.currentQuery
    }))

    return { followedCount, bestMatch, bestScore, topProfiles }
  }

  /**
   * Quick profile validation (ratio, activity, etc.)
   */
  private async quickProfileValidation(profile: ProfileView): Promise<boolean> {
    if (!this.accountService) return false

    try {
      const profileResponse = await this.accountService.agent.api.app.bsky.actor.getProfile({
        actor: profile.did
      })

      const followersCount = profileResponse.data.followersCount || 0
      const followingCount = profileResponse.data.followsCount || 0

      // Intelligent ratio checking
      if (followersCount === 0 && followingCount === 0) return false
      if (followingCount === 0) return followersCount > 0

      const ratio = followersCount / followingCount
      return ratio >= 0.1 &&
        (followersCount >= 5 || followingCount < 1000) &&
        (followingCount <= 2000 || followersCount >= 500)

    } catch (error) {
      return true // Accept on error (conservative approach)
    }
  }

  /**
   * Intelligent query evolution based on successful matches
   */
  private async evolveQueryIntelligently(bestMatch: ProfileView | null): Promise<void> {
    if (!bestMatch) {
      await this.adaptQuery('no_best_match')
      return
    }

    try {
      this.logger.info(`🧬 Evolving query based on ${bestMatch.handle}...`)

      const profileTerms = await this.extractProfileTerms(bestMatch)
      const evolvedQuery = this.createEvolvedQuery(profileTerms)

      if (evolvedQuery !== this.currentQuery) {
        this.logger.success(`📈 Query evolved: "${this.currentQuery}" → "${evolvedQuery}"`)
        this.logger.info(`   🎯 Based on: ${bestMatch.handle}`)
        this.currentQuery = evolvedQuery
      } else {
        await this.adaptQuery('no_evolution')
      }
    } catch (error) {
      this.logger.error(`❌ Evolution error: ${error.message}`)
      await this.adaptQuery('evolution_error')
    }
  }

  /**
   * Extract relevant terms from a profile
   */
  private async extractProfileTerms(profile: ProfileView): Promise<string[]> {
    const terms = new Set<string>()

    // Extract from bio/description
    if (profile.description) {
      const bioTerms = this.extractRelevantTerms(profile.description)
      bioTerms.forEach(term => terms.add(term))
    }

    // Extract from handle and display name
    const nameTerms = this.extractRelevantTerms(
      `${profile.handle} ${profile.displayName || ''}`
    )
    nameTerms.forEach(term => terms.add(term))

    return Array.from(terms)
      .filter(term => this.isRelevantTerm(term))
      .slice(0, 3)
  }

  /**
   * Create evolved query from profile terms
   */
  private createEvolvedQuery(profileTerms: string[]): string {
    const currentTerms = this.extractQueryTerms(this.currentQuery)
    const combinedTerms = [...new Set([...currentTerms, ...profileTerms])]
      .filter(term => this.isRelevantTerm(term))
      .slice(0, 3)

    return combinedTerms.join(' ')
  }

  /**
   * Adaptive query modification based on context
   */
  private async adaptQuery(reason: string): Promise<void> {
    const strategies = {
      search_failed: () => this.diversifyQuery(),
      no_follows: () => this.focusQuery(),
      no_best_match: () => this.trendQuery(),
      no_evolution: () => this.diversifyQuery(),
      evolution_error: () => this.resetToTrendingQuery(),
      error: () => this.resetToTrendingQuery()
    }

    const strategy = strategies[reason as keyof typeof strategies] || strategies.error
    await strategy()

    this.logger.info(`🔄 Query adapted (${reason}): "${this.currentQuery}"`)
  }

  /**
   * Query adaptation strategies
   */
  private async diversifyQuery(): Promise<void> {
    const diversificationTerms = ['creative', 'remote', 'indie', 'digital', 'tech']
    const currentTerms = this.extractQueryTerms(this.currentQuery)
    const newTerm = diversificationTerms.find(term => !currentTerms.includes(term))

    this.currentQuery = newTerm ? `${this.currentQuery} ${newTerm}` : this.getRandomTrendingQuery()
  }

  private async focusQuery(): Promise<void> {
    const terms = this.extractQueryTerms(this.currentQuery)
    this.currentQuery = terms.length > 1 ? terms.slice(0, 2).join(' ') : this.getRandomTrendingQuery()
  }

  private async trendQuery(): Promise<void> {
    this.currentQuery = this.getRandomTrendingQuery()
  }

  private async resetToTrendingQuery(): Promise<void> {
    this.currentQuery = this.getRandomTrendingQuery()
  }

  /**
   * Get random trending query
   */
  private getRandomTrendingQuery(): string {
    const trendingQueries = [
      'ai automation', 'react developer', 'indie hacker', 'no-code builder',
      'content creator', 'remote work', 'startup founder', 'solopreneur'
    ]
    return trendingQueries[Math.floor(Math.random() * trendingQueries.length)]
  }

  /**
   * Utility: Extract query terms
   */
  private extractQueryTerms(query: string): string[] {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word))
  }

  /**
   * Utility: Extract relevant terms from text
   */
  private extractRelevantTerms(text: string): string[] {
    return this.extractQueryTerms(text).filter(term => this.isRelevantTerm(term))
  }

  /**
   * Check if term is relevant for our targeting
   */
  private isRelevantTerm(term: string): boolean {
    const relevantPatterns = [
      /^(developer|engineer|programmer|coder)$/i,
      /^(entrepreneur|founder|startup|business)$/i,
      /^(designer|creator|writer|blogger)$/i,
      /^(marketing|growth|social|content)$/i,
      /^(javascript|typescript|react|python|ai)$/i,
      /^(freelance|remote|digital|indie)$/i
    ]

    return relevantPatterns.some(pattern => pattern.test(term)) ||
      this.coreKeywords.includes(term)
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'around', 'i', 'me',
      'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her',
      'it', 'its', 'they', 'them', 'their', 'this', 'that', 'these', 'those'
    ])

    return stopWords.has(word.toLowerCase())
  }

  /**
   * Get current rate limit status
   */
  private async getRateLimitStatus() {
    const recentCount = await Follow.query()
      .where('created_at', '>', DateTime.now().minus({ hours: 1 }).toSQL())
      .count('* as total')

    const currentCount = Number((recentCount[0] as any).$extras.total)
    const availableSlots = this.HOURLY_LIMIT - currentCount

    return {
      canProceed: currentCount < this.HOURLY_LIMIT,
      availableSlots,
      currentCount
    }
  }

  /**
   * Adaptive delay based on success rate
   */
  private async adaptiveDelay(success: boolean): Promise<void> {
    const delay = success ? 2000 : 1000
    await this.delay(delay)
  }

  /**
   * Basic delay utility
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Display comprehensive final summary
   */
  private displayFinalSummary(session: FlowSession): void {
    const duration = Date.now() - session.startTime
    const durationMinutes = Math.round(duration / 60000)

    this.logger.info('\n' + '═'.repeat(60))
    this.logger.info('🎯 FLUID WORKFLOW COMPLETE')
    this.logger.info('═'.repeat(60))
    this.logger.success(`✅ Total profiles followed: ${session.totalFollowed}/${this.TARGET_FOLLOWS} (${((session.totalFollowed / this.TARGET_FOLLOWS) * 100).toFixed(1)}%)`)
    this.logger.info(`🔍 Total profiles analyzed: ${session.totalAnalyzed}`)
    this.logger.info(`🔄 Iterations completed: ${session.iteration}`)
    this.logger.info(`🏆 Best relevance score: ${session.bestScore}%`)
    this.logger.info(`⏱️ Total duration: ${durationMinutes} minutes`)

    if (session.topProfiles.length > 0) {
      this.logger.info(`🌟 Top profiles discovered:`)
      session.topProfiles
        .sort((a: TopProfile, b: TopProfile) => b.score - a.score)
        .slice(0, 5)
        .forEach((profile: TopProfile, index: number) => {
          this.logger.info(`   ${index + 1}. ${profile.handle} (${profile.score}%) via "${profile.query}"`)
        })
    }

    if (session.queryEvolutions.length > 0) {
      this.logger.info(`🧬 Query evolution path:`)
      session.queryEvolutions.slice(-3).forEach((query: string, index: number) => {
        this.logger.info(`   ${index + 1}. "${query}"`)
      })
    }

    const successRate = session.totalAnalyzed > 0 ?
      ((session.totalFollowed / session.totalAnalyzed) * 100).toFixed(1) : '0'
    this.logger.info(`📈 Success rate: ${successRate}%`)
    this.logger.info('═'.repeat(60))
  }
}
