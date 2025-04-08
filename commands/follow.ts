import Follow from '#models/follow'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { AtpAgent } from '@atproto/api'
import { DateTime } from 'luxon'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import { TargetAudienceService } from '#services/AI_services'
export default class FollowCommand extends BaseCommand {
  static commandName = 'follow'
  static description = 'Automated follow operations for Bluesky'
  static options: CommandOptions = { startApp: true, staysAlive: true }

  // Configuration
  private readonly HOURLY_LIMIT = 3000


  private readonly CREDENTIALS = {
    identifier: undefined as string | undefined,
    password: undefined as string | undefined
  }

  // State
  private agent = new AtpAgent({ service: 'https://bsky.social' })
  private service = new TargetAudienceService()
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
  ];
  private account = undefined as string | undefined

  private async defineAccount() {
    this.CREDENTIALS.identifier = await this.prompt.ask('Enter your Bluesky identifier')
    this.CREDENTIALS.password = await this.prompt.ask('Enter your Bluesky password')
  }

  async run() {
    // Initialisation
    this.account = await this.prompt.ask('Enter the Bluesky identifier of the account to follow from')
    await this.defineAccount()

    await this.login()
    const { canProceed, availableSlots } = await this.checkRateLimit()

    if (!canProceed) {
      this.logger.error(`Hourly limit reached (${this.HOURLY_LIMIT}/h)`)
      return
    }

    // Workflow principal
    const method = await this.selectMethod()
    while (true) {
      try {
        const targets = await this.fetchTargets(method)
        console.warn("Targets:", targets.length)
        await this.processFollows(targets.slice(0, availableSlots))
      } catch (error) {
        this.logger.error(`An error occurred: ${error.message}`)
        if (error.message == "J'ai fini chef") {
          break
        }
      }
    }
  }

  private async login() {
    if (this.CREDENTIALS.identifier === undefined || this.CREDENTIALS.password === undefined) {
      this.logger.error('Invalid credentials')
      return
    }
    await this.agent.login({ identifier: this.CREDENTIALS.identifier, password: this.CREDENTIALS.password })
    this.logger.success(`Logged in as ${this.CREDENTIALS.identifier}`)
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

  private async selectMethod() {
    return this.prompt.choice('Select target source:', [
      { name: 'account_followers', message: 'Followers of account' },
      { name: 'post_likes', message: 'Likers of specific post' }
    ])
  }

  private async fetchTargets(method: string) {
    switch (method) {
      case 'post_likes':
        return this.fetchPostLikes(method)

      case 'account_followers':
        if (!this.account) throw new Error('Account not defined')
        return this.fetchAccountFollowers(this.account)

      default:
        throw new Error('Invalid method')
    }
  }

  private async fetchPostLikes(uri: string) {
    const likes: ProfileView[] = []
    let cursor = ''

    while (likes.length < 1000) {
      const response = await this.agent.api.app.bsky.feed.getLikes({
        uri,
        limit: 100,
        cursor
      })

      likes.push(...response.data.likes.map(l => l.actor))
      if (!response.data.cursor) break
      cursor = response.data.cursor
    }

    return likes
  }

  private async fetchAccountFollowers(handle: string) {
    let cursor: string | undefined = undefined
    const allFollowers: ProfileView[] = []

    do {
      const response = await this.service.getTargetedAudience(
        this.agent,
        handle,
        this.keywords,
        cursor
      )

      const filtered = response.followers
        .filter(f =>
          this.keywords.some(kw =>
            f.profile.description?.toLowerCase().includes(kw.toLowerCase())
          ))
        .map(f => f.profile)

      allFollowers.push(...filtered)

      cursor = response.responseCursor

      // Ajout d'un délai pour respecter les rate limits de l'API
      await new Promise(resolve => setTimeout(resolve, 500))

    } while (cursor && allFollowers.length < 3000) // Limite de sécurité

    if (allFollowers.length === 0) {
      throw new Error("Aucun follower trouvé avec les critères actuels")
    }

    return allFollowers
  }

  private async processFollows(targets: ProfileView[]) {
    if (!targets.length) {
      this.logger.warning('No targets found')
      return
    }

    this.logger.info(`Starting follow batch (${targets.length} users)`)

    for (const [index, profile] of targets.entries()) {
      try {
        if (!this.CREDENTIALS.identifier) throw new Error("this.CREDENTIALS.identifier")
        await this.agent.follow(profile.did)
        await Follow.create({
          did: profile.did,
          handle: profile.handle,
          displayName: profile.displayName || null
        })

        this.logger.success(`[${index + 1}/${targets.length}] Followed ${profile.handle}`)

        // Respect rate limits
        if ((index + 1) % 50 === 0) {
          const { availableSlots } = await this.checkRateLimit()
          if (availableSlots <= 0) break
        }

      } catch (error) {
        this.logger.error(`Failed to follow ${profile.handle}: ${JSON.stringify(error)}`)
      }
    }

    this.logger.success('Follow batch completed')
  }
}