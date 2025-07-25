import Follow from '#models/follow'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import { AIService } from '#services/AI_services'
import AccountManager from '#services/account_manager'
import AccountService from '#services/account_service'
import Account from '#models/account'

export default class FollowCommand extends BaseCommand {
  static commandName = 'follow'
  static description = 'Automated follow operations for Bluesky'
  static options: CommandOptions = { startApp: true, staysAlive: true }

  // Configuration
  private readonly HOURLY_LIMIT = 3000

  // State
  private service = new AIService()
  private account?: Account
  private accountService?: AccountService
  private accountManager = new AccountManager()
  private currentQuery: string = ''
  private lastAnalyzedProfiles: ProfileView[] = []

  private keywords: string[] = [
    // Solopreneur Roles & Skills
    'solopreneur',
    'entrepreneur',
    'freelancer',
    'independent professional',
    'digital nomad',
    'content creator',
    'blogger',
    'YouTuber',
    'podcaster',
    'influencer',
    'personal brand',
    'side hustler',
    'small business owner',
    'startup founder',
    'one-person business',
    'self-employed',
    'remote worker',
    'online business owner',
    'e-commerce entrepreneur',
    'creator economy',
    'passive income',
    'online course creator',
    'affiliate marketer',
    'social media influencer',
    'micro-influencer',
    'niche expert',
    'thought leader',
    'personal branding',
    'self-promotion',
    'audience building',
    'community building',
    'content strategy',
    'content scheduling',
    'social media management',
    'social media growth',
    'social media engagement',
    'social media automation',
    'time management',
    'productivity tools',
    'workflow automation',
    'task automation',
    'solo business tools',
    'solopreneur tools',
    'one-person marketing',
    'self-marketing',
    'DIY marketing',
    'low-budget marketing',
    'growth hacking for solopreneurs',
    'audience growth',
    'audience retention',
    'audience analytics',
    'content calendar',
    'post scheduling',
    'social media scheduling',
    'Bluesky marketing',
    'Bluesky growth',
    'Bluesky engagement',
    'Bluesky automation',
    'Bluesky scheduling',
    'Bluesky tools',
    'Bluesky for creators',
    'Bluesky for entrepreneurs',
    'Bluesky for solopreneurs',
    'Bluesky for small businesses',

    // Marketing & Social Media Platforms
    'LinkedIn',
    'social media tools',
    'social media scheduling tools',
    'social media automation tools',
    'social media analytics tools',
    'content creation tools',
    'content planning tools',
    'hashtag strategy',
    'trend analysis',
    'audience insights',
    'engagement strategies',
    'community engagement',
    'user-generated content',
    'brand awareness',

    // Productivity & Automation Tools
    'Zapier',
    'Make (formerly Integromat)',
    'IFTTT',
    'automation workflows',
    'task management',
    'time-saving tools',
    'efficiency tools',
    'productivity hacks',
    'workflow optimization',
    'no-code tools',
    'low-code tools',
    'DIY automation',
    'automation for solopreneurs',
    'automation for small businesses',
    'tools for solopreneurs',
    'tools for one-person businesses',
    'tools for creators',
    'tools for freelancers',

    // Business & Marketing Concepts
    'personal branding',
    'niche marketing',
    'audience targeting',
    'content marketing',
    'social media marketing',
    'digital marketing',
    'growth hacking',
    'audience growth',
    'audience retention',
    'customer engagement',
    'customer acquisition',
    'lead generation',
    'conversion optimization',
    'A/B testing',
    'funnel optimization',
    'landing page optimization',
    'email marketing',
    'newsletter growth',
    'newsletter tools',
    'email automation',
    'CRM for solopreneurs',
    'customer relationship management',
    'data-driven marketing',
    'analytics for solopreneurs',
    'marketing on a budget',
    'low-cost marketing',
    'DIY marketing strategies',
    'self-promotion tips',
    'building an online presence',
    'monetizing social media',
    'monetizing content',
    'monetizing Bluesky',
    'Bluesky monetization',
    'Bluesky for business',
    'Bluesky for creators',
    'Bluesky for influencers',
    'Bluesky for entrepreneurs',

    // Additional Skills & Keywords
    'problem-solving',
    'time management',
    'self-discipline',
    'self-motivation',
    'remote work',
    'work-life balance',
    'solopreneur lifestyle',
    'solopreneur challenges',
    'solopreneur success',
    'solopreneur tools',
    'solopreneur resources',
    'solopreneur community',
    'solopreneur tips',
    'solopreneur hacks',
    'solopreneur productivity',
    'solopreneur marketing',
    'solopreneur growth',
    'solopreneur automation',

    // Core Developer Roles
    'software developer',
    'software',
    'full-stack developer',
    'backend developer',
    'frontend developer',
    'mobile developer',
    'game developer',
    'data',
    'data scientist',
    'machine learning',
    'artificial intelligence',
    'cloud',
    'DevOps',
    'site reliability (SRE)',
    'system administrator',
    'network',
    'cybersecurity specialist',
    'security',
    'cloud architect',
    'infrastructure',
    'platform',
    'embedded software',
    'IoT',
    'database',
    'QA',
    'test automation',
    'performance',
    'build',
    'release',
    'technical project manager',
    'product manager (technical)',
    'solutions architect',
    'technical support',
    'consulting',

    // Specific Technologies & Tools
    'Kubernetes',
    'Docker',
    'containerization',
    'microservices',
    'serverless',
    'AWS Lambda',
    'Google Cloud Functions',
    'Azure Functions',
    'cloud-native',
    'CI/CD',
    'Jenkins',
    'CircleCI',
    'GitLab CI',
    'Terraform',
    'Ansible',
    'Puppet',
    'Chef',
    'Helm',
    'Istio',
    'Prometheus',
    'Grafana',
    'Splunk',
    'Elastic Stack (ELK)',
    'HashiCorp Vault',

    // Programming Languages
    'Golang',
    'TypeScript',
    'JavaScript',
    'React',
    'Angular',
    'Vue.js',
    'Node.js',
    'Python',
    'Java',
    'C#',
    '.NET',
    'Ruby',
    'Ruby on Rails',
    'PHP',
    'Swift',
    'Objective-C',
    'Rust',
    'Scala',
    'Perl',
    'R',
    'MATLAB',
    'SAS',
    'Shell scripting',
    'Bash',
    'PowerShell',

    // Databases
    'SQL',
    'NoSQL',
    'MongoDB',
    'MySQL',
    'PostgreSQL',
    'Redis',
    'Elasticsearch',
    'Cassandra',
    'DynamoDB',
    'Oracle Database',
    'MariaDB',
    'Couchbase',
    'Firebase',
    'Google BigQuery',
    'Snowflake',
    'Data warehousing',

    // Big Data & Analytics
    'Apache Kafka',
    'Apache Spark',
    'Hadoop',
    'Apache Flink',
    'Data lakes',
    'ETL',
    'data pipelines',
    'Airflow',
    'Databricks',
    'Presto',
    'HDFS',
    'MapReduce',

    // Cloud Platforms
    'AWS',
    'Amazon Web Services',
    'Azure',
    'Microsoft Azure',
    'Google Cloud Platform',
    'GCP',
    'IBM Cloud',
    'Oracle Cloud',
    'OpenStack',
    'Kubernetes Engine',
    'Azure DevOps',

    // Development Tools & VCS
    'Git',
    'GitHub',
    'GitLab',
    'Bitbucket',
    'Subversion',
    'Mercurial',
    'open source',
    'Jira',
    'Confluence',
    'Trello',
    'Asana',
    'Visual Studio Code',
    'IntelliJ IDEA',
    'PyCharm',
    'Eclipse',
    'Xcode',
    'Android Studio',

    // Operating Systems
    'Linux',
    'Unix',
    'Windows',
    'MacOS',
    'iOS',
    'Android',
    'FreeBSD',
    'Red Hat Enterprise Linux',
    'Ubuntu',

    // Software Development Concepts
    'computer science',
    'algorithms',
    'data structures',
    'software architecture',
    'design patterns',
    'OOP',
    'functional programming',
    'concurrent programming',
    'distributed systems',
    'event-driven architecture',
    'asynchronous programming',
    'REST APIs',
    'GraphQL',
    'gRPC',
    'WebSocket',
    'API design',
    'test-driven development (TDD)',
    'behavior-driven development (BDD)',
    'continuous integration',
    'continuous delivery',
    'continuous deployment',
    'agile development',
    'scrum',
    'kanban',
    'scalability',
    'high availability',
    'fault tolerance',
    'load balancing',
    'caching',
    'edge computing',

    // Specialized Areas
    'web development',
    'mobile development',
    'game development',
    'embedded systems',
    'Internet of Things (IoT)',
    'augmented reality (AR)',
    'virtual reality (VR)',
    'natural language processing (NLP)',
    'computer vision',
    'deep learning',
    'reinforcement learning',
    'cryptocurrency',
    'blockchain',
    'smart contracts',
    'quantum computing',
    'bioinformatics',
    'genomics',
    'computational biology',

    // Additional Skills & Keywords
    'problem-solving',
    'debugging',
    'optimization',
    'refactoring',
    'code review',
    'technical documentation',
    'API documentation',
    'remote work',
    'collaboration',
    'pair programming',
    'mentorship',
    'technical leadership',
  ]

  async run() {
    this.logger.info('🚀 Follow Command - Automated follow operations for Bluesky')

    // 1. Setup and initialization
    if (!(await this.initializeServices())) return

    // 2. Check rate limits and get initial query
    const { canProceed, availableSlots } = await this.checkRateLimit()
    if (!canProceed) {
      this.logger.error(`Hourly limit reached (${this.HOURLY_LIMIT}/h)`)
      return
    }

    // 3. Get initial query with smart suggestions
    this.currentQuery = await this.getInitialQuery()

    // 4. Start the fluid dynamic workflow
    await this.executeFluidWorkflow(availableSlots)
  }

  /**
   * Initialize all necessary services and accounts
   */
  private async initializeServices(): Promise<boolean> {
    // Get available accounts
    const accounts = await Account.all()
    if (accounts.length === 0) {
      this.logger.error('No accounts found in the database. Please add an account first.')
      return false
    }

    const selectedAccountId = accounts[0].id
    this.logger.info(`Using account: ${selectedAccountId}`)
    this.account = await Account.findOrFail(selectedAccountId)
    if (!this.account) {
      this.logger.error('Account not found')
      return false
    }

    // Initialize account service
    const setupAction = this.logger.action(`Setting up services for ${this.account.handle}`)
    try {
      this.accountService = await this.accountManager.getOrCreateAccountService(this.account)
      if (!this.accountService) {
        throw new Error('Account service could not be created')
      }
      await this.accountService.createOrResumeSession(this.account)
      setupAction.succeeded()
      return true
    } catch (error) {
      setupAction.failed(`Failed to initialize account service: ${error.message}`)
      return false
    }
  }

  /**
   * Get initial query with smart suggestions
   */
  private async getInitialQuery(): Promise<string> {
    const suggestions = [
      'javascript developer',
      'react typescript',
      'AI startup founder',
      'solopreneur creator',
      'content marketing',
      'indie hacker'
    ]

    this.logger.info('💡 Popular query suggestions:')
    suggestions.forEach((suggestion, index) => {
      this.logger.info(`   ${index + 1}. "${suggestion}"`)
    })

    const query = await this.prompt.ask('Enter your initial search query (or pick from suggestions above):')
    this.logger.info(`🎯 Initial query: "${query}"`)
    return query
  }

  /**
   * Execute the main fluid workflow with dynamic adaptation
   */
  private async executeFluidWorkflow(initialSlots: number): Promise<void> {
    let iterationCount = 0
    const maxIterations = 12
    let totalFollowed = 0
    const sessionStats = {
      queriesGenerated: 0,
      profilesAnalyzed: 0,
      bestScore: 0,
      topProfiles: [] as Array<{ handle: string, score: number }>
    }

    this.logger.info(`🚀 Starting fluid workflow (max ${maxIterations} iterations)`)

    while (iterationCount < maxIterations) {
      try {
        const iterationStart = Date.now()
        this.logger.info(`\n🔄 Iteration ${iterationCount + 1}/${maxIterations}`)
        this.logger.info(`   Query: "${this.currentQuery}"`)

        // Search and analyze profiles
        const searchResult = await this.smartProfileSearch()
        if (!searchResult.success) {
          await this.adaptQuery()
          iterationCount++
          continue
        }

        // Process profiles with intelligent filtering
        const processResult = await this.intelligentProfileProcessing(searchResult.profiles, initialSlots)
        sessionStats.profilesAnalyzed += searchResult.profiles.length

        if (processResult.followedCount > 0) {
          totalFollowed += processResult.followedCount
          this.logger.success(`✅ Followed ${processResult.followedCount} profiles this iteration (Total: ${totalFollowed})`)

          // Update session stats
          if (processResult.bestScore > sessionStats.bestScore) {
            sessionStats.bestScore = processResult.bestScore
          }
          sessionStats.topProfiles.push(...processResult.topProfiles.slice(0, 2))

          // Evolve query based on best matches
          await this.evolveQuery(processResult.bestMatch)
          sessionStats.queriesGenerated++
        } else {
          this.logger.warning('⚠️ No profiles followed this iteration')
          await this.adaptQuery()
        }

        iterationCount++

        // Check if we should continue
        const { canProceed } = await this.checkRateLimit()
        if (!canProceed) {
          this.logger.info('🛑 Rate limit reached, stopping workflow')
          break
        }

        // Smart delay based on success rate
        const delay = processResult.followedCount > 0 ? 2000 : 1000
        const iterationTime = Date.now() - iterationStart
        this.logger.info(`   ⏱️ Iteration completed in ${iterationTime}ms, waiting ${delay}ms...`)
        await this.delay(delay)

      } catch (error) {
        this.logger.error(`❌ Error in iteration ${iterationCount + 1}: ${error.message}`)
        if (error.message === "Workflow completed") break
        iterationCount++
      }
    }

    // Display session summary
    this.displaySessionSummary(totalFollowed, sessionStats)
  }

  /**
   * Smart profile search with adaptive strategies
   */
  private async smartProfileSearch(): Promise<{ success: boolean, profiles: ProfileView[] }> {
    if (!this.accountService) {
      return { success: false, profiles: [] }
    }

    try {
      this.logger.info(`🔍 Smart search with query: "${this.currentQuery}"`)

      // Primary search with current query
      const primaryResults = await this.accountService.agent.api.app.bsky.actor.searchActors({
        term: this.currentQuery,
        limit: 30
      })

      let profiles = primaryResults.data.actors || []

      // If few results, expand search with related keywords
      if (profiles.length < 10) {
        this.logger.info('📈 Expanding search with related keywords...')
        const expandedResults = await this.expandSearchWithKeywords()
        profiles = [...profiles, ...expandedResults].slice(0, 50)
      }

      // Remove duplicates
      const uniqueProfiles = this.removeDuplicateProfiles(profiles)

      this.logger.success(`✅ Found ${uniqueProfiles.length} unique profiles`)
      return { success: uniqueProfiles.length > 0, profiles: uniqueProfiles }

    } catch (error) {
      this.logger.error(`❌ Search error: ${error.message}`)
      return { success: false, profiles: [] }
    }
  }

  /**
   * Intelligent profile processing with advanced scoring
   */
  private async intelligentProfileProcessing(
    profiles: ProfileView[],
    maxFollows: number
  ): Promise<{
    followedCount: number,
    bestMatch: ProfileView | null,
    bestScore: number,
    topProfiles: Array<{ handle: string, score: number }>
  }> {
    if (!this.accountService || !this.account) {
      return { followedCount: 0, bestMatch: null, bestScore: 0, topProfiles: [] }
    }

    const scoredProfiles: Array<{ profile: ProfileView, score: number }> = []
    let followedCount = 0
    let bestMatch: ProfileView | null = null
    let bestScore = 0

    this.logger.info(`🧠 Intelligent processing of ${profiles.length} profiles...`)

    // Batch scoring for efficiency
    const batchSize = 8
    for (let i = 0; i < profiles.length && i < 25; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize)

      const batchResults = await Promise.allSettled(
        batch.map(async (profile) => {
          // Quick ratio check first
          if (!(await this.checkFollowRatio(profile))) {
            return null
          }

          // AI scoring
          const score = await this.service.scoreProfileRelevance(
            profile,
            this.selectSearchKeywords(),
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

          if (score >= 25) { // Minimum threshold
            scoredProfiles.push({ profile, score })

            if (score > bestScore) {
              bestScore = score
              bestMatch = profile
            }
          }
        }
      })

      await this.delay(800) // Rate limiting
    }

    // Sort by score and follow the best ones
    scoredProfiles.sort((a, b) => b.score - a.score)
    const toFollow = scoredProfiles.slice(0, Math.min(maxFollows, 8))

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

        // Store for future analysis
        this.lastAnalyzedProfiles.push(profile)

        await this.delay(1200)
      } catch (error) {
        this.logger.warning(`⚠️ Failed to follow ${profile.handle}: ${error.message}`)
      }
    }

    const topProfiles = scoredProfiles.slice(0, 5).map(item => ({
      handle: item.profile.handle,
      score: item.score
    }))

    return { followedCount, bestMatch, bestScore, topProfiles }
  }

  /**
   * Evolve query based on successful matches
   */
  private async evolveQuery(bestMatch: ProfileView | null): Promise<void> {
    if (!bestMatch) {
      await this.adaptQuery()
      return
    }

    try {
      this.logger.info(`🧬 Evolving query based on ${bestMatch.handle}...`)

      const relevantTerms = await this.extractRelevantTermsFromProfile(bestMatch)

      if (relevantTerms.length > 0) {
        const newQuery = this.createEvolvedQuery(this.currentQuery, relevantTerms)

        this.logger.success(`📈 Query evolved: "${this.currentQuery}" → "${newQuery}"`)
        this.logger.info(`   Based on: ${bestMatch.handle}`)
        this.logger.info(`   New terms: ${relevantTerms.join(', ')}`)

        this.currentQuery = newQuery
      } else {
        await this.adaptQuery()
      }
    } catch (error) {
      this.logger.error(`❌ Evolution error: ${error.message}`)
      await this.adaptQuery()
    }
  }

  /**
   * Adapt query when no good results found
   */
  private async adaptQuery(): Promise<void> {
    const adaptationStrategies = [
      () => this.diversifyQuery(),
      () => this.focusQuery(),
      () => this.trendQuery(),
      () => this.resetToPopularQuery()
    ]

    const strategy = adaptationStrategies[Math.floor(Math.random() * adaptationStrategies.length)]
    await strategy()
  }

  /**
   * Display comprehensive session summary
   */
  private displaySessionSummary(
    totalFollowed: number,
    stats: {
      queriesGenerated: number,
      profilesAnalyzed: number,
      bestScore: number,
      topProfiles: Array<{ handle: string, score: number }>
    }
  ): void {
    this.logger.info('\n' + '='.repeat(60))
    this.logger.info('📊 SESSION SUMMARY')
    this.logger.info('='.repeat(60))
    this.logger.success(`✅ Total profiles followed: ${totalFollowed}`)
    this.logger.info(`🔍 Profiles analyzed: ${stats.profilesAnalyzed}`)
    this.logger.info(`🎯 Queries generated: ${stats.queriesGenerated}`)
    this.logger.info(`🏆 Best relevance score: ${stats.bestScore}%`)

    if (stats.topProfiles.length > 0) {
      this.logger.info(`🌟 Top profiles found:`)
      stats.topProfiles.slice(0, 5).forEach((profile, index) => {
        this.logger.info(`   ${index + 1}. ${profile.handle} (${profile.score}%)`)
      })
    }

    const successRate = stats.profilesAnalyzed > 0 ?
      ((totalFollowed / stats.profilesAnalyzed) * 100).toFixed(1) : '0'
    this.logger.info(`📈 Success rate: ${successRate}%`)
    this.logger.info('='.repeat(60))
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



  // Methods removed to fix unused variable warnings - can be re-enabled later if needed
  // _analyzeProfileRelevance, _extractRelevantTerms, _combineQueryTerms have been temporarily removed

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private selectSearchKeywords(): string[] {
    // Sélectionner les mots-clés les plus pertinents pour la recherche
    const priorityKeywords = [
      // Mots-clés solopreneur prioritaires
      'solopreneur', 'entrepreneur', 'freelancer', 'startup founder',
      'content creator', 'digital nomad', 'small business owner',

      // Technologies populaires
      'javascript', 'typescript', 'react', 'node.js', 'python',
      'web development', 'full-stack developer', 'software developer',

      // Marketing et croissance
      'content marketing', 'social media marketing', 'growth hacking',
      'personal branding', 'audience building', 'creator economy',

      // Spécifique à Bluesky
      'bluesky marketing', 'bluesky for business', 'bluesky automation'
    ]

    // Ajouter des mots-clés dynamiques basés sur les tendances actuelles
    const trendingKeywords = this.getTrendingKeywords()

    // Combiner avec quelques mots-clés généraux de notre liste
    const generalKeywords = this.keywords.slice(0, 5)

    return [...priorityKeywords, ...trendingKeywords, ...generalKeywords].slice(0, 35)
  }

  private getTrendingKeywords(): string[] {
    // Mots-clés tendance en 2025 (peut être rendu dynamique plus tard)
    return [
      'ai tools', 'automation', 'no-code', 'remote work',
      'productivity', 'indie hacker', 'creator tools',
      'social media automation', 'content strategy'
    ]
  }

  /**
   * Expand search with related keywords
   */
  private async expandSearchWithKeywords(): Promise<ProfileView[]> {
    if (!this.accountService) return []

    const relatedKeywords = this.selectSearchKeywords().slice(0, 5)
    const expandedProfiles: ProfileView[] = []

    for (const keyword of relatedKeywords) {
      try {
        const response = await this.accountService.agent.api.app.bsky.actor.searchActors({
          term: keyword,
          limit: 10
        })

        expandedProfiles.push(...(response.data.actors || []))
        await this.delay(200)
      } catch (error) {
        this.logger.warning(`Failed to search for "${keyword}": ${error.message}`)
      }
    }

    return expandedProfiles
  }

  /**
   * Remove duplicate profiles based on DID
   */
  private removeDuplicateProfiles(profiles: ProfileView[]): ProfileView[] {
    const seen = new Set<string>()
    return profiles.filter(profile => {
      if (seen.has(profile.did)) return false
      seen.add(profile.did)
      return true
    })
  }

  /**
   * Create evolved query combining current and new terms
   */
  private createEvolvedQuery(currentQuery: string, newTerms: string[]): string {
    // Simple implementation that compiles
    const allTerms = [currentQuery, ...newTerms].slice(0, 3)
    return allTerms.join(' ')
  }

  /**
   * Query adaptation strategies
   */
  private async diversifyQuery(): Promise<void> {
    const diversificationTerms = ['startup', 'creative', 'tech', 'remote', 'indie']
    // Simple implementation without complex text extraction
    const newTerm = diversificationTerms[Math.floor(Math.random() * diversificationTerms.length)]

    if (newTerm && !this.currentQuery.includes(newTerm)) {
      this.currentQuery = `${this.currentQuery} ${newTerm}`.trim()
      this.logger.info(`🔀 Diversified query: "${this.currentQuery}"`)
    } else {
      await this.resetToPopularQuery()
    }
  }

  private async focusQuery(): Promise<void> {
    // Simple implementation
    const terms = this.currentQuery.split(' ').filter(t => t.length > 2)
    if (terms.length > 1) {
      this.currentQuery = terms.slice(0, 2).join(' ')
      this.logger.info(`🎯 Focused query: "${this.currentQuery}"`)
    } else {
      await this.trendQuery()
    }
  }

  private async trendQuery(): Promise<void> {
    const trendingTerms = this.getTrendingKeywords()
    const randomTrend = trendingTerms[Math.floor(Math.random() * trendingTerms.length)]
    this.currentQuery = randomTrend
    this.logger.info(`📈 Trending query: "${this.currentQuery}"`)
  }

  private async resetToPopularQuery(): Promise<void> {
    const popularQueries = [
      'javascript developer',
      'react typescript',
      'startup founder',
      'content creator',
      'solopreneur',
      'indie hacker'
    ]

    this.currentQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)]
    this.logger.info(`🔄 Reset to popular query: "${this.currentQuery}"`)
  }

  // Missing methods - simple implementations
  private async checkFollowRatio(_profile: any): Promise<boolean> {
    // Simple check - just return true for now
    return true
  }

  private async extractRelevantTermsFromProfile(profile: any): Promise<string[]> {
    // Extract terms from profile description and handle
    const terms: string[] = []

    if (profile.description) {
      // Simple word extraction from description
      const words = profile.description.toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 3)
        .slice(0, 3) // Limit to 3 terms
      terms.push(...words)
    }

    return terms
  }
}