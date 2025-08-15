/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import Account from '#models/account'
import Feed from '#models/feed'

/*
|--------------------------------------------------------------------------
| STATIC PAGES
|--------------------------------------------------------------------------
| Routes pour les pages statiques et d'information
|
*/

router.on('/').renderInertia('home')
router.on('/terms').renderInertia('terms')
router.on('/privacy').renderInertia('privacy')
router.on('/pricing').renderInertia('pricing')
router.on('/philosophy').renderInertia('philosophy')
router.on('/password/reset').renderInertia('contact-us')

/*
|--------------------------------------------------------------------------
| AUTHENTICATED PAGES
|--------------------------------------------------------------------------
| Routes pour les pages nécessitant une authentification
|
*/

router.on('/add/account').renderInertia('AddAccount').use(middleware.auth())
router.on('/plan/change').renderInertia('planChange').use(middleware.auth())

// DM Campaigns - AI Campaign Creation
router
  .get('/add-ai-campaign', async ({ inertia, auth }) => {
    const user = auth.user!

    // Récupérer les comptes de l'utilisateur
    const accounts = await user.related('account').query()

    return inertia.render('AddAICampaign', {
      user: user.toJSON(),
      accounts: accounts.map((account: any) => ({
        id: account.id,
        handle: account.handle,
        displayName: account.displayName || account.handle,
      })),
    })
  })
  .use(middleware.auth())

router.on('/account/:id/dashboard/loading').renderInertia('AccountDashboard').use(middleware.auth())

const session_controller = () => import('#controllers/session_controller')
const account_controller = () => import('#controllers/account_controller')
const oauth_metadata_controller = () => import('#controllers/oauth_metadata_controller')
const twitter_auth_controller = () => import('#controllers/twitter_auth_controller')
const threads_auth_controller = () => import('#controllers/threads_auth_controller')
const stripe_controller = () => import('#controllers/stripes_controller')
const feed_controller = () => import('#controllers/feeds_controller')
const analytics_controller = () => import('#controllers/analytics_controller')
const follower_analysis_controller = () => import('#controllers/follower_analysis_controller')
const follower_tracker_controller = () => import('#controllers/follower_tracker_controller')
const python_controller_methods = () => import('#controllers/python_controller_methods')
const dm_campaigns_controller = () => import('#controllers/dm_campaigns_controller')
const hashtag_groups_controller = () => import('#controllers/hashtag_groups_controller')

/*
|--------------------------------------------------------------------------
| USER AUTHENTICATION & SESSION
|--------------------------------------------------------------------------
| Routes pour la gestion des utilisateurs et sessions
|
*/

router.put('/logout', [session_controller, 'logout']).use(middleware.auth())
router.delete('/delete', [session_controller, 'deleteUser']).use(middleware.auth())
router.get('/session/status', [session_controller, 'status'])
router.post('/session/refresh-oauth', [session_controller, 'refreshOAuth']).use(middleware.auth())

/*
|--------------------------------------------------------------------------
| ACCOUNT MANAGEMENT
|--------------------------------------------------------------------------
| Routes pour la gestion des comptes Bluesky
|
*/

// OAuth routes
router.get('/.well-known/oauth_client', [oauth_metadata_controller, 'metadata'])
router.get('/oauth/initiate', [account_controller, 'initiateOAuth'])
router.get('/oauth/callback', [account_controller, 'handleOAuthCallback'])

// Traditional account management
router.put('/account', [account_controller, 'createAccount'])
router
  .post('/dashboard/accounts/delete', [account_controller, 'deleteAccount'])
  .use(middleware.auth())
router
  .get('/account/:id/refresh-stats', [account_controller, 'refreshStats'])
  .use(middleware.auth())
router
  .post('/api/account/:id/refresh-stats', [account_controller, 'refreshStatsApi'])
  .use(middleware.auth())
router
  .get('/api/search/handles', [account_controller, 'searchHandles'])

/*
|--------------------------------------------------------------------------
| PAYMENT & SUBSCRIPTION
|--------------------------------------------------------------------------
| Routes pour Stripe et gestion des abonnements
|
*/

router
  .post('/create-stripe-session', [stripe_controller, 'redirectToStripe'])
  .use(middleware.auth())
router.post('/webhook', [stripe_controller, 'getPaymentSucceeded'])
router.post('/downgrade-plan', [stripe_controller, 'downgradePlan'])

/*
|--------------------------------------------------------------------------
| FEEDS MANAGEMENT  
|--------------------------------------------------------------------------
| Routes pour la gestion des flux RSS/feeds
|
*/

// Redirection from /feeds to /feed for consistency
router.get('/feeds', ({ response }) => {
  return response.redirect('/feed')
})

router
  .get('/feed', async ({ inertia, auth }) => {
    const user = auth.user
    if (user) {
      const feed = await Feed.findManyBy('userId', user.id)
      if (feed.length === 0) {
        return inertia.render('feeds', {
          feeds: [],
        })
      }
      return inertia.render('feeds', {
        feeds: feed,
      })
    }
    return inertia.render('feeds', { feeds: [] })
  })
  .use(middleware.auth())
router.get('/feed/:id', [feed_controller, 'processPosts']).use(middleware.auth())
router.post('/feed/create', [feed_controller, 'createFeed']).use(middleware.auth())
router.delete('/feed/delete/:id', [feed_controller, 'deleteFeed']).use(middleware.auth())
router.get('/api/feed/:id/getPosts', [feed_controller, 'processPostsAsync']).use(middleware.auth())

/*
|--------------------------------------------------------------------------
| MAIN DASHBOARD PAGES
|--------------------------------------------------------------------------
| Routes pour les pages principales de l'application
|
*/

router.get('/dashboard', async ({ auth, inertia }) => {
  // Silently check for authentication (including remember me tokens)
  await auth.check()

  const user = auth.user
  if (user) {
    let accounts = await Account.query()
      .where('user_id', user.id)
      .orderBy('followers_count', 'desc')

    // Get Twitter accounts
    const { default: TwitterAccount } = await import('#models/twitter_account')
    const twitterAccounts = await TwitterAccount.query()
      .where('user_id', user.id)
      .orderBy('followers_count', 'desc')

    // Get Threads accounts
    const { default: ThreadsAccount } = await import('#models/threads_account')
    const threadsAccounts = await ThreadsAccount.query()
      .where('user_id', user.id)
      .orderBy('followers_count', 'desc')

    // Get scheduling count for the user
    const { default: Scheduling } = await import('#models/scheduling')
    const schedulings = await Scheduling.query().where('userId', user.id).where('status', 'pending')

    const scheduledCount = schedulings.length
    const isScheduledLimitReached = user.plan === 'free' && scheduledCount >= 5

    return inertia.render('dashboard', {
      accounts: accounts,
      twitterAccounts: twitterAccounts.map(acc => ({
        ...acc.toJSON(),
        platform: 'twitter'
      })),
      threadsAccounts: threadsAccounts.map(acc => ({
        ...acc.toJSON(),
        platform: 'threads'
      })),
      user: {
        ...user.toJSON(),
        scheduledCount: scheduledCount,
        isScheduledLimitReached,
      },
    })
  } else {
    // User not authenticated, show AddAccount component
    console.log('User not authenticated, showing AddAccount component')
    return inertia.render('dashboard', { accounts: [], twitterAccounts: [], threadsAccounts: [] })
  }
})

router
  .get('/schedule', async ({ auth, inertia }) => {
    const user = auth.user
    if (user) {
      // Recharger l'utilisateur depuis la DB pour avoir les dernières valeurs
      await user.refresh()
      
      // Précharger les comptes de l'utilisateur pour toutes les plateformes
      await user.load('account')
      
      // Load Twitter accounts only (removed Threads support)
      const TwitterAccount = (await import('#models/twitter_account')).default
      
      const twitterAccounts = await TwitterAccount.query().where('user_id', user.id)
      
      // Transform all accounts to a unified format with platform information
      const allAccounts = [
        ...user.account.map(account => ({
          id: account.id,
          handle: account.handle,
          displayName: account.handle, // Bluesky uses handle as display name
          platform: 'bluesky' as const,
          avatar: null // Account model doesn't have avatar
        })),
        ...twitterAccounts.map(account => ({
          id: account.id,
          handle: account.username,
          displayName: account.displayName || account.username,
          platform: 'twitter' as const,
          avatar: account.profileImageUrl
        }))
      ]

      let schedulings = await user
        .related('scheduling')
        .query()
        .preload('account')
        .orderBy('scheduleTime', 'asc')
        
      // Add streak data to user object and include all accounts
      const userWithStreak = {
        ...user.serialize(),
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        isStreakActive: user.isStreakActive,
        streakStatus: user.streakStatus,
        lastPostDate: user.lastPostDate?.toISODate() || null,
        account: allAccounts // Replace with unified accounts
      }
        
      return inertia.render('schedule', { 
        schedulings,
        user: userWithStreak 
      })
    }
    return inertia.render('schedule', { 
      schedulings: [],
      user: null 
    })
  })
  .use(middleware.auth())

// Routes pour le profil utilisateur
router.on('/profile').renderInertia('profile').use(middleware.auth())

/*
|--------------------------------------------------------------------------
| HASHTAG GROUPS MANAGEMENT
|--------------------------------------------------------------------------
| Routes pour la gestion des groupes de hashtags
|
*/

router
  .get('/hashtag-groups', [hashtag_groups_controller, 'index'])
  .use(middleware.auth())
  .as('hashtag-groups.index')

router
  .post('/hashtag-groups', [hashtag_groups_controller, 'store'])
  .use(middleware.auth())
  .as('hashtag-groups.store')

router
  .get('/hashtag-groups/:id', [hashtag_groups_controller, 'show'])
  .use(middleware.auth())
  .as('hashtag-groups.show')

router
  .put('/hashtag-groups/:id', [hashtag_groups_controller, 'update'])
  .use(middleware.auth())
  .as('hashtag-groups.update')

router
  .delete('/hashtag-groups/:id', [hashtag_groups_controller, 'destroy'])
  .use(middleware.auth())
  .as('hashtag-groups.destroy')

router
  .post('/hashtag-groups/:id/hashtags', [hashtag_groups_controller, 'addHashtag'])
  .use(middleware.auth())
  .as('hashtag-groups.hashtags.store')

router
  .delete('/hashtag-groups/:groupId/hashtags/:hashtagId', [hashtag_groups_controller, 'removeHashtag'])
  .use(middleware.auth())
  .as('hashtag-groups.hashtags.destroy')

router
  .put('/hashtag-groups/:id/reorder', [hashtag_groups_controller, 'reorderHashtags'])
  .use(middleware.auth())
  .as('hashtag-groups.reorder')

// API pour récupérer les groupes (pour le sélecteur dans le post composer)
router
  .get('/api/hashtag-groups', [hashtag_groups_controller, 'api'])
  .use(middleware.auth())
  .as('hashtag-groups.api')

/*
|--------------------------------------------------------------------------
| DM CAMPAIGNS FEATURE
|--------------------------------------------------------------------------
| Routes pour la gestion des campagnes de messages directs
|
*/

// ===== DM CAMPAIGNS CRUD OPERATIONS =====
router
  .get('/campaign', async ({ inertia, auth }) => {
    try {
      const user = auth.user!

      // Récupérer les campagnes de l'utilisateur
      const { default: DmCampaign } = await import('#models/dm_campaign')
      const campaigns = await DmCampaign.query()
        .where('user_id', user.id)
        .orderBy('createdAt', 'desc')
      
      const safeCampaigns = campaigns.map(campaign => {
        try {
          const json = campaign.toJSON()
          console.log('Campaign JSON:', json)
          // Don't parse keywords here - let the frontend handle it
          // The frontend expects a JSON string that it can parse
          return json
        } catch (error) {
          console.error('Error serializing campaign:', error, 'Campaign ID:', campaign.id)
          return {
            id: campaign.id,
            name: campaign.name,
            // message: campaign.message removed - now handled by campaign messages
            accountHandle: campaign.accountHandle,
            strategy: campaign.strategy,
            user_id: campaign.user_id,
            status: campaign.status,
            keywords: campaign.keywords, // Keep as string
            analysisStatus: campaign.analysisStatus,
            createdAt: campaign.createdAt,
            updatedAt: campaign.updatedAt
          }
        }
      })
      
      console.log('Loaded campaigns:', safeCampaigns.length, 'for user:', user.id)
      return inertia.render('dmCampaigns', {
        user: user.toJSON(),
        campaigns: safeCampaigns,
      })
    } catch (error) {
      console.error('Error loading campaigns:', error)
      return inertia.render('dmCampaigns', {
        user: auth.user!.toJSON(),
        campaigns: [],
      })
    }
  }).use(middleware.auth())

// Campaign Dashboard - Individual campaign view
router
  .get('/campaign/:id', [dm_campaigns_controller, 'getCampaignDashboardPage'])
  .use(middleware.auth())

router
  .post('/campaign/create', [dm_campaigns_controller, 'createDmCampaign'])
  .use(middleware.auth())
router
  .post('/campaign/toggle/:campaign_id', [dm_campaigns_controller, 'toggleDmCampaignStatus'])
  .use(middleware.auth())
router
  .delete('/campaign/delete/:campaign_id', [dm_campaigns_controller, 'removeDmCampaign'])
  .use(middleware.auth())
router
  .post('/campaign/start/:campaign_id', [dm_campaigns_controller, 'startCampaign'])
  .use(middleware.auth())

// ===== DM CAMPAIGNS ANALYSIS & EXECUTION =====
router
  .post('/campaign/:id/analyze', [dm_campaigns_controller, 'analyzeFollowers'])
  .use(middleware.auth())
router
  .put('/campaign/:id/update', [dm_campaigns_controller, 'updateCampaign'])
  .use(middleware.auth())
router
  .post('/campaign/:id/execute', [dm_campaigns_controller, 'executeCampaign'])
  .use(middleware.auth())
router
  .post('/campaign/:id/count-responses', [dm_campaigns_controller, 'countResponses'])
  .use(middleware.auth())
router
  .get('/campaign/:id/stats', [dm_campaigns_controller, 'getCampaignStatsPage'])
  .use(middleware.auth())
router
  .get('/api/campaign/:id/stats', [dm_campaigns_controller, 'getCampaignStats'])
  .use(middleware.auth())
router
  .get('/api/campaign/:id/followers', [dm_campaigns_controller, 'getAnalyzedFollowers'])
  .use(middleware.auth())
router
  .get('/api/campaign/:id/followers-paginated', [dm_campaigns_controller, 'getAnalyzedFollowersPaginatedApi'])
  .use(middleware.auth())

// ===== NOUVELLES ROUTES - MESSAGES MULTIPLES =====
router
  .get('/campaign/:id/messages', [dm_campaigns_controller, 'getCampaignMessages'])
  .use(middleware.auth())
router
  .post('/campaign/:id/messages', [dm_campaigns_controller, 'createCampaignMessage'])
  .use(middleware.auth())
router
  .put('/campaign/:id/messages/:messageId', [dm_campaigns_controller, 'updateCampaignMessage'])
  .use(middleware.auth())
router
  .delete('/campaign/:id/messages/:messageId', [dm_campaigns_controller, 'deleteCampaignMessage'])
  .use(middleware.auth())

// ===== NOUVELLES ROUTES - TRACKING CONVERSATIONS =====
router
  .post('/campaign/:id/check-conversations', [dm_campaigns_controller, 'checkConversations'])
  .use(middleware.auth())
router
  .post('/campaign/:id/mark-contacted/:followerId', [dm_campaigns_controller, 'markAsContacted'])
  .use(middleware.auth())
router
  .get('/campaign/:id/conversation-status', [dm_campaigns_controller, 'getConversationStatus'])
  .use(middleware.auth())
router
  .post('/campaign/:id/mark-all-existing-conversations', [dm_campaigns_controller, 'markAllExistingConversationsAsContacted'])
  .use(middleware.auth())

// ===== NOUVELLES ROUTES - EXECUTION DES CAMPAGNES =====
router
  .get('/api/campaigns/:id/execution/config', [dm_campaigns_controller, 'getExecutionConfig'])
  .use(middleware.auth())
router
  .post('/api/campaigns/:id/execution/config', [dm_campaigns_controller, 'saveExecutionConfig'])
  .use(middleware.auth())
router
  .get('/api/campaigns/:id/execution/preview', [dm_campaigns_controller, 'getExecutionPreview'])
  .use(middleware.auth())
router
  .get('/api/campaigns/:id/execution/validate', [dm_campaigns_controller, 'validateExecutionConfig'])
  .use(middleware.auth())
router
  .post('/api/campaigns/:id/execution/reset-counts', [dm_campaigns_controller, 'resetMessageCounts'])
  .use(middleware.auth())
router
  .post('/api/campaigns/:id/execute', [dm_campaigns_controller, 'executeCampaign'])
  .use(middleware.auth())

/*
|--------------------------------------------------------------------------
| ANALYTICS FEATURE
|--------------------------------------------------------------------------
| Routes pour l'analyse d'audience et des statistiques
|
*/

// ===== BASIC ANALYTICS =====
router.get('/analytics/:id', [analytics_controller, 'basicAnalytics']).use(middleware.auth())
router
  .get('/analytics/:id/audience', [analytics_controller, 'audienceAnalysisPage'])
  .use(middleware.auth())
router
  .get('/analytics/:id/audience/refresh', [follower_analysis_controller, 'getAnalysisStatus'])
  .use(middleware.auth())

// ===== CLUSTER ANALYTICS =====
router
  .post('/api/accounts/:id/clusters/refresh-cache', [analytics_controller, 'refreshClusterCache'])
  .use(middleware.auth())
router
  .get('/api/accounts/:id/clusters/data', [analytics_controller, 'getClusterData'])
  .use(middleware.auth())
router
  .get('/accounts/:id/clusters/cluster/:clusterId', [analytics_controller, 'clusterDetail'])
  .use(middleware.auth())
router
  .get('/accounts/:id/clusters/supercluster/:superClusterId', [
    analytics_controller,
    'superClusterDetail',
  ])
  .use(middleware.auth())

// ===== FOLLOWER ANALYSIS =====
router
  .post('/api/accounts/:id/follower-analysis/start', [
    follower_analysis_controller,
    'startAnalysis',
  ])
  .use(middleware.auth())
router
  .post('/api/accounts/:id/follower-analysis/stop', [follower_analysis_controller, 'stopAnalysis'])
  .use(middleware.auth())
router
  .post('/api/accounts/:id/follower-analysis/force-reset', [
    follower_analysis_controller,
    'forceResetAnalysis',
  ])
  .use(middleware.auth())
router
  .get('/api/accounts/:id/follower-analysis/status', [
    follower_analysis_controller,
    'getAnalysisStatusApi',
  ])
  .use(middleware.auth())
router
  .get('/api/accounts/:id/follower-analysis/stream', [
    follower_analysis_controller,
    'streamAnalysisStatus',
  ])
  .use(middleware.auth())
router.get('/api/clusters', [follower_analysis_controller, 'getClusters'])

/*
|--------------------------------------------------------------------------
| FOLLOWER TRACKER FEATURE
|--------------------------------------------------------------------------
| Routes pour le suivi et la gestion des followers
|
*/

// General Follower Tracker route - handles account selection
router
  .get('/follower-tracker', [follower_tracker_controller, 'selectAccount'])
  .use(middleware.auth())

// ===== FOLLOWER TRACKING OPERATIONS =====
router
  .get('/accounts/:id/follower-tracker', [follower_tracker_controller, 'index'])
  .use(middleware.auth())
router
  .get('/api/accounts/:id/follower-tracker/data', [follower_tracker_controller, 'loadData'])
  .use(middleware.auth())
router
  .get('/accounts/:id/follower-tracker/load-all', [follower_tracker_controller, 'loadAllData'])
  .use(middleware.auth())
router
  .post('/accounts/:id/follower-tracker/refresh-cache', [
    follower_tracker_controller,
    'refreshCache',
  ])
  .use(middleware.auth())
router
  .post('/accounts/:id/follower-tracker/deep-refresh-cache', [
    follower_tracker_controller,
    'deepRefreshCache',
  ])
  .use(middleware.auth())
router
  .post('/accounts/:id/follower-tracker/batch-follow', [follower_tracker_controller, 'batchFollow'])
  .use(middleware.auth())
router
  .post('/accounts/:id/follower-tracker/batch-unfollow', [
    follower_tracker_controller,
    'batchUnfollow',
  ])
  .use(middleware.auth())
router
  .get('/accounts/:id/follower-tracker/progress/:action/:jobId', [
    follower_tracker_controller,
    'getBatchProgress',
  ])
  .use(middleware.auth())
router
  .get('/accounts/:id/follower-tracker/active-jobs', [follower_tracker_controller, 'getActiveJobs'])
  .use(middleware.auth())
router
  .delete('/accounts/:id/follower-tracker/cancel/:action/:jobId', [
    follower_tracker_controller,
    'cancelBatchJob',
  ])
  .use(middleware.auth())
router
  .post('/accounts/:id/follower-tracker/user-profile', [
    follower_tracker_controller,
    'getUserProfile',
  ])
  .use(middleware.auth())

/*
|--------------------------------------------------------------------------
| PYTHON WORKER API
|--------------------------------------------------------------------------
| Routes internes pour le worker Python (protégées par clé API)
|
*/

router
  .get('/internal/python/next-bulk-job', [python_controller_methods, 'getNextBulkAnalysisJob'])
  .use(middleware.api_auth())
router
  .get('/internal/python/next-recurring-job', [
    python_controller_methods,
    'getNextRecurringAnalysisJob',
  ])
  .use(middleware.api_auth())
router
  .post('/internal/python/complete-job', [python_controller_methods, 'processBatchProgress'])
  .use([middleware.api_auth(), middleware.json_validation()])
router
  .post('/internal/python/update-progress', [python_controller_methods, 'updateAnalysisProgress'])
  .use([middleware.api_auth(), middleware.json_validation()])
router
  .get('/internal/python/accounts/:handle', [python_controller_methods, 'getAccount'])
  .use(middleware.api_auth())
router
  .get('/internal/python/health', [python_controller_methods, 'health'])
  .use(middleware.api_auth())

/*
|--------------------------------------------------------------------------
| CROSSPOSTING AUTHENTICATION ROUTES
|--------------------------------------------------------------------------
| Routes for connecting and managing crossposting accounts
| Includes: Twitter OAuth, Threads OAuth, disconnect functionality
|
*/

router
  .get('/auth/twitter', [twitter_auth_controller, 'initiateAuth'])
  .use(middleware.auth())

router
  .get('/auth/twitter/callback', [twitter_auth_controller, 'callback'])

router
  .post('/auth/twitter/disconnect/:id', [twitter_auth_controller, 'disconnect'])
  .use(middleware.auth())

router
  .get('/auth/threads', [threads_auth_controller, 'initiateAuth'])
  .use(middleware.auth())

router
  .get('/auth/threads/callback', [threads_auth_controller, 'callback'])

router
  .post('/auth/threads/disconnect/:id', [threads_auth_controller, 'disconnect'])
  .use(middleware.auth())

/*
|--------------------------------------------------------------------------
| SCHEDULING FEATURE
|--------------------------------------------------------------------------
| Routes pour la gestion de la planification des posts Bluesky
| Includes: create, edit, delete scheduling posts
|
*/

const schedulings_controller = () => import('#controllers/schedulings_controller')

router
  .post('/schedule/create', [schedulings_controller, 'schedulePost'])
  .use(middleware.auth())

router
  .put('/schedule/delete', [schedulings_controller, 'deletePost'])
  .use(middleware.auth())

router
  .put('/schedule/edit', [schedulings_controller, 'editPost'])
  .use(middleware.auth())

router
  .put('/schedule/editPostPerDay', async ({ request, response, auth, session }) => {
    console.log('[DEBUG] editPostPerDay called')
    console.log('[DEBUG] Request body:', request.all())

    const user = auth.user
    if (!user) {
      console.log('[DEBUG] User not authenticated')
      return response.redirect('/dashboard')
    }

    const { postsPerDay } = request.all()

    if (!postsPerDay || isNaN(parseInt(postsPerDay))) {
      console.log('[DEBUG] Invalid postsPerDay value:', postsPerDay)
      session.flash('error', 'Valid posts per day count is required')
      return response.redirect('/schedule')
    }

    const postsPerDayNumber = parseInt(postsPerDay)

    // Validation: minimum 1, maximum 10 posts per day
    if (postsPerDayNumber < 1 || postsPerDayNumber > 10) {
      console.log('[DEBUG] Posts per day out of range:', postsPerDayNumber)
      session.flash('error', 'Posts per day must be between 1 and 10')
      return response.redirect('/schedule')
    }

    try {
      user.postsPerDay = postsPerDayNumber
      await user.save()

      console.log('[DEBUG] User posts per day updated successfully:', postsPerDayNumber)

      session.flash('success', `Posts per day updated to ${postsPerDayNumber}!`)
      return response.redirect('/schedule')
    } catch (error) {
      console.error('[DEBUG] Error updating posts per day:', error)
      session.flash('error', 'An error occurred while updating posts per day setting')
      return response.redirect('/schedule')
    }
  })
  .use(middleware.auth())

// ===== QUEUE MANAGEMENT =====
router
  .get('/schedule/queue/stats', async ({ response, auth }) => {
    try {
      await auth.authenticate()
      // TODO: Implémenter les stats via SchedulingQueueManager si nécessaire
      return response.json({ waiting: 0, active: 0, completed: 0, failed: 0 })
    } catch (error) {
      console.error('Error getting queue stats:', error)
      return response.status(500).json({ error: 'Internal server error' })
    }
  })
  .use(middleware.auth())

// ===== DEVELOPMENT / DEBUG =====
router
  .post('/schedule/test-publish/:id', async ({ params, response, auth }) => {
    try {
      await auth.authenticate()

      const { default: Scheduling } = await import('#models/scheduling')

      const scheduling = await Scheduling.query().where('id', params.id).preload('account').first()

      if (!scheduling) {
        return response.status(404).json({ error: 'Scheduling not found' })
      }

      // Tester manuellement la publication via le service privé
      // Note: Cette route est pour le développement seulement
      return response.json({
        message: 'Test publish functionality is available but requires access to private methods',
        scheduling_id: scheduling.id,
        account: scheduling.account.handle,
        status: scheduling.status,
      })
    } catch (error) {
      console.error('Error in test publish:', error)
      return response.status(500).json({ error: 'Internal server error' })
    }
  })
  .use(middleware.auth())

/*
|--------------------------------------------------------------------------
| THREADS API ROUTES
|--------------------------------------------------------------------------
| Routes for Threads posting functionality
|
*/

const ThreadsPostController = () => import('#controllers/threads_post_controller')

// Threads posting routes
router
  .group(() => {
    router.post('/text', [ThreadsPostController, 'createTextPost'])
    router.post('/image', [ThreadsPostController, 'createImagePost'])
    router.post('/carousel', [ThreadsPostController, 'createCarouselPost'])
    router.get('/limits/:accountId', [ThreadsPostController, 'getPostingLimits'])
  })
  .prefix('/api/threads/posts')
  .use(middleware.auth())
