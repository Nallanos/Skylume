import Follow from '#models/follow'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { AtpAgent } from '@atproto/api'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import { DateTime } from 'luxon'

export default class FollowCommand extends BaseCommand {
  static commandName = 'followMass'
  static description = 'Create a follow session and optionally fetch new follows'
  static options: CommandOptions = {
    startApp: true,
  }

  private readonly HOURLY_FOLLOW_LIMIT = 20000

  private async checkRateLimit(): Promise<{ canProceed: boolean; availableSlots: number }> {
    const recentFollowsCount = await Follow.query()
      .where('created_at', '>', DateTime.now().minus({ hours: 1 }).toSQL())
      .count('* as total')

    const count = Number((recentFollowsCount[0] as any).$extras.total)
    const availableSlots = this.HOURLY_FOLLOW_LIMIT - count

    return {
      canProceed: availableSlots > 0,
      availableSlots,
    }
  }

  private async fetchFollows(agent: AtpAgent): Promise<ProfileView[]> {
    const profiles: ProfileView[] = []
    let cursor: string = ''
    try {
      while (true) {
        const response = await agent.getFollows({
          actor: "tmaker.io",
          limit: 100,
          cursor,
        })
        profiles.push(...response.data.follows)
        if (!response.data.cursor) {
          break
        }
        cursor = response.data.cursor
      }
      return profiles
    } catch (error) {
      this.logger.error('Failed to fetch follows', error)
      throw error
    }
  }

  private async fetchPostLikes(agent: AtpAgent, postUri: string): Promise<ProfileView[]> {
    const profiles: ProfileView[] = []
    let cursor: string = ''
    try {
      while (true) {
        const response = await agent.api.app.bsky.feed.getLikes({
          uri: postUri,
          limit: 100,
          cursor,
        })

        const likerProfiles = response.data.likes.map((like) => like.actor)
        profiles.push(...likerProfiles)

        if (!response.data.cursor) {
          break
        }
        cursor = response.data.cursor
      }
      return profiles
    } catch (error) {
      this.logger.error('Failed to fetch post likes', error)
      throw error
    }
  }

  private async fetchAccountFollowers(agent: AtpAgent, handle: string): Promise<ProfileView[]> {
    const profiles: ProfileView[] = []
    let cursor: string = ''
    try {
      while (true) {
        const response = await agent.getFollowers({
          actor: handle,
          limit: 100,
          cursor,
        })
        profiles.push(
          ...response.data.followers.filter((follow) => {
            if (!follow.description) {
              return false
            }

            const keywords: string[] = [
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

            return keywords.some((keyword) =>
              follow.description!.toLowerCase().includes(keyword.toLowerCase())
            )
          })
        )
        if (!response.data.cursor) {
          break
        }
        cursor = response.data.cursor
      }
      return profiles
    } catch (error) {
      this.logger.error('Failed to fetch account followers', error)
      throw error
    }
  }

  private async followUser(agent: AtpAgent, did: string): Promise<boolean> {
    try {
      await agent.follow(did)
      return true
    } catch (error) {
      this.logger.error(`Failed to follow user ${did}`, error)
      return false
    }
  }

  async run() {
    // Check rate limit before starting
    const { canProceed, availableSlots } = await this.checkRateLimit()
    if (!canProceed) {
      this.logger.error('Rate limit reached: You have followed too many users in the past hour')
      this.logger.info('Please try again later')
      return
    }
    this.logger.info(`You can follow up to ${availableSlots} more users in the current hour`)

    const agent = new AtpAgent({
      service: 'https://bsky.social',
    })

    await agent.login({
      identifier: "nallanos.bsky.social",
      password: "hffk-i5vk-ledd-dmpd",
    })

    let follows: Follow[] = []
    if (await this.prompt.confirm('Do you want to re-fetch follows?')) {
      const fetchAnimation = this.logger.action('re-fetching follows...')
      let blueskyFollows: ProfileView[] = []
      try {
        blueskyFollows = await this.fetchFollows(agent)
        fetchAnimation.displayDuration().succeeded()
      } catch (error) {
        fetchAnimation.failed(error)
        return
      }

      const insertingAnimation = this.logger.action('inserting follows into the database...')
      try {
        follows = await Follow.updateOrCreateMany(
          'did',
          blueskyFollows.map((follow) => ({
            did: follow.did,
            handle: follow.handle,
            displayName: follow.displayName || null,
          }))
        )
        insertingAnimation.displayDuration().succeeded()
      } catch (error) {
        insertingAnimation.failed(error)
        return
      }
    } else {
      follows = await Follow.query()
    }

    const method = await this.prompt.choice(
      'Which method do you want to use in order to massfollow?',
      ['Followers from Account', 'Likes on Specified Post']
    )

    let targetProfiles: ProfileView[] = []
    if (method === 'Likes on Specified Post') {
      const postUri = await this.prompt.ask('Enter the post URI:')
      const fetchingLikes = this.logger.action('fetching users who liked the post...')
      try {
        targetProfiles = await this.fetchPostLikes(agent, postUri)
        fetchingLikes.displayDuration().succeeded()
      } catch (error) {
        fetchingLikes.failed(error)
        return
      }
    } else {
      const handle = await this.prompt.ask('Enter the account handle:')
      const fetchingFollowers = this.logger.action('fetching account followers...')
      try {
        targetProfiles = await this.fetchAccountFollowers(agent, handle)
        fetchingFollowers.displayDuration().succeeded()
      } catch (error) {
        fetchingFollowers.failed(error)
        return
      }
    }

    const existingFollowDids = follows.map((f) => f.did)
    const newProfiles = targetProfiles.filter(
      (profile) => !existingFollowDids.includes(profile.did)
    )

    if (newProfiles.length === 0) {
      this.logger.success('No new users to follow!')
      return
    }

    // Limit the number of profiles to follow based on available slots
    const profilesToFollow = newProfiles.slice(0, availableSlots)

    this.logger.info(`Found ${newProfiles.length} new users to follow`)
    this.logger.info(`Will follow ${profilesToFollow.length} users (limited by rate limit)`)

    if (await this.prompt.confirm('Do you want to proceed with following these users?')) {
      const followingAnimation = this.logger.action('following users...')
      let successCount = 0

      for (const profile of profilesToFollow) {
        // Check rate limit again before each follow
        const { canProceed } = await this.checkRateLimit()
        if (!canProceed) {
          this.logger.warning('Rate limit reached during execution. Stopping here.')
          break
        }

        if (await this.followUser(agent, profile.did)) {
          successCount++
          // Add to database
          await Follow.create({
            did: profile.did,
            handle: profile.handle,
            displayName: profile.displayName || null,
          })
        }

        this.logger.info(`now following ${profile.handle}`)
      }

      followingAnimation.displayDuration().succeeded()
      this.logger.success(
        `Successfully followed ${successCount} out of ${profilesToFollow.length} users`
      )

      if (successCount < newProfiles.length) {
        this.logger.info(`Remaining users can be followed after the rate limit resets`)
      }
    }
  }
}
