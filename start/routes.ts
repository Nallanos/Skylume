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

router.on('/terms').renderInertia('terms')
router.on('/privacy').renderInertia('privacy')
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
const stripe_controller = () => import('#controllers/stripes_controller')
const plans_controller = () => import('#controllers/plans_controller')
const pricing_controller = () => import('#controllers/pricing_controller')
const home_controller = () => import('#controllers/home_controller')
const feed_controller = () => import('#controllers/feeds_controller')
const analytics_controller = () => import('#controllers/analytics_controller')
const follower_analysis_controller = () => import('#controllers/follower_analysis_controller')
const follower_tracker_controller = () => import('#controllers/follower_tracker_controller')
const dm_campaigns_controller = () => import('#controllers/campaigns/dm_campaigns_basic_controller')
const dm_campaign_analysis_controller = () => import('#controllers/campaigns/dm_campaign_analysis_controller')
const dm_campaign_stats_controller = () => import('#controllers/campaigns/dm_campaign_stats_controller')
const campaign_conversations_controller = () => import('#controllers/campaigns/campaign_conversations_controller')
const campaign_messages_controller = () => import('#controllers/campaigns/campaign_messages_controller')
const hashtag_groups_controller = () => import('#controllers/hashtag_groups_controller')
const campaign_variables_controller = () => import('#controllers/campaigns/campaign_variables_controller')
const campaign_groups_controller = () => import('#controllers/campaigns/campaign_groups_controller')

/*
|--------------------------------------------------------------------------
| USER AUTHENTICATION & SESSION
|--------------------------------------------------------------------------
| Routes pour la gestion des utilisateurs et sessions
|
*/

/*
|--------------------------------------------------------------------------
| Routes pour la gestion des utilisateurs et sessions
|
*/

router.get('/', [home_controller, 'index'])
router.get('/pricing', [pricing_controller, 'index'])
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
router
  .put('/account', [account_controller, 'createAccount'])
  .use(middleware.planLimit({
    feature: 'accounts',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))
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
// Route publique pour le checkout - permet aux visiteurs non connectés d'acheter
router.get('/stripe/checkout/:plan', [stripe_controller, 'redirectToStripe'])
router.post('/stripe/webhook', [stripe_controller, 'getPaymentSucceeded'])
router.post('/downgrade-plan', [stripe_controller, 'downgradePlan'])
router.post('/cancel-subscription', [stripe_controller, 'cancelSubscription']).use(middleware.auth())
router.post('/customer-portal', [stripe_controller, 'createCustomerPortal']).use(middleware.auth())

// Route pour valider les codes promo
router.post('/api/validate-promo', async ({ request, response }) => {
  const { code, plan } = request.only(['code', 'plan'])
  const { PromoCodeService } = await import('#services/promo_code_service')
  
  const validation = PromoCodeService.validatePromoCode(code, plan)
  return response.json(validation)
})

// Routes pour la gestion des plans
router
  .get('/plans', [plans_controller, 'index'])
  .use(middleware.auth())
router
  .get('/api/usage-status', [plans_controller, 'getUsageStatus'])
  .use(middleware.auth())
router
  .post('/api/can-perform-action', [plans_controller, 'canPerformAction'])
  .use(middleware.auth())
router.get('/api/plan-info', [plans_controller, 'getPlanInfo'])

// Route pour valider les codes promo
router.get('/api/validate-promo/:code/:plan', async ({ params, response }) => {
  const { PromoCodeService } = await import('#services/promo_code_service')
  const validation = PromoCodeService.validatePromoCode(params.code, params.plan)
  
  if (validation.valid && validation.promoCode) {
    const { PlanService } = await import('#services/plan_service')
    const planInfo = PlanService.getPlanInfo(params.plan)
    const discountedPrice = PromoCodeService.calculateDiscountedPrice(planInfo.price, validation.promoCode)
    
    return response.json({
      valid: true,
      discount: validation.promoCode.discount,
      type: validation.promoCode.type,
      originalPrice: planInfo.price,
      discountedPrice: discountedPrice,
      message: `${validation.promoCode.discount}${validation.promoCode.type === 'percentage' ? '%' : '€'} de réduction appliquée !`
    })
  } else {
    return response.json({
      valid: false,
      error: validation.error
    })
  }
})

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
router
  .post('/feed/create', [feed_controller, 'createFeed'])
  .use(middleware.auth())
  .use(middleware.planLimit({
    feature: 'feeds',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))
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

    // Get scheduling count for the user
    const { default: Scheduling } = await import('#models/scheduling')
    const schedulings = await Scheduling.query().where('userId', user.id).where('status', 'pending')

    const scheduledCount = schedulings.length
    
    // Utiliser le nouveau système de limites
    const { UsageTrackingService } = await import('#services/usage_tracking_service')
    const { PlanService } = await import('#services/plan_service')
    
    const usageStatus = await UsageTrackingService.getUsageStatus(user.id)
    const currentPlan = PlanService.getPlanInfo(user.plan || 'free')
    
    // Déterminer quelles limites sont proches d'être atteintes pour les CTA
    const upgradeSuggestions = []
    
    if (PlanService.isApproachingLimit(usageStatus.scheduledPosts.current, usageStatus.scheduledPosts.limit)) {
      upgradeSuggestions.push({
        type: 'scheduledPosts',
        message: `Vous approchez de la limite de posts programmés (${usageStatus.scheduledPosts.current}/${usageStatus.scheduledPosts.limit})`,
        ctaText: 'Débloquer posts illimités',
        recommendedPlan: 'pro'
      })
    }
    
    if (PlanService.isApproachingLimit(usageStatus.accounts.current, usageStatus.accounts.limit)) {
      upgradeSuggestions.push({
        type: 'accounts',
        message: `Vous approchez de la limite de comptes (${usageStatus.accounts.current}/${usageStatus.accounts.limit})`,
        ctaText: 'Débloquer comptes illimités',
        recommendedPlan: 'pro'
      })
    }

    return inertia.render('dashboard', {
      accounts: accounts,
      twitterAccounts: twitterAccounts.map(acc => ({
        ...acc.toJSON(),
        platform: 'twitter'
      })),
      user: {
        ...user.toJSON(),
        scheduledCount: scheduledCount,
        isScheduledLimitReached: PlanService.isLimitReached(scheduledCount, usageStatus.scheduledPosts.limit),
      },
      usageStatus,
      currentPlan,
      upgradeSuggestions
    })
  } else {
    // User not authenticated, show AddAccount component
    console.log('User not authenticated, showing AddAccount component')
    return inertia.render('dashboard', { accounts: [], twitterAccounts: [] })
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
  .use(middleware.planLimit({
    feature: 'feeds',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))
  .as('hashtag-groups.store')

router
  .get('/hashtag-groups/:id', [hashtag_groups_controller, 'show'])
  .use(middleware.auth())
  .as('hashtag-groups.show')

router
  .put('/hashtag-groups/:id', [hashtag_groups_controller, 'update'])
  .use(middleware.auth())
  .use(middleware.planLimit({
    feature: 'feeds',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))
  .as('hashtag-groups.update')

router
  .delete('/hashtag-groups/:id', [hashtag_groups_controller, 'destroy'])
  .use(middleware.auth())
  .use(middleware.planLimit({
    feature: 'feeds',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))
  .as('hashtag-groups.destroy')

router
  .post('/hashtag-groups/:id/hashtags', [hashtag_groups_controller, 'addHashtag'])
  .use(middleware.auth())
  .use(middleware.planLimit({
    feature: 'feeds',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))
  .as('hashtag-groups.hashtags.store')

router
  .delete('/hashtag-groups/:groupId/hashtags/:hashtagId', [hashtag_groups_controller, 'removeHashtag'])
  .use(middleware.auth())
  .use(middleware.planLimit({
    feature: 'feeds',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))
  .as('hashtag-groups.hashtags.destroy')

router
  .put('/hashtag-groups/:id/reorder', [hashtag_groups_controller, 'reorderHashtags'])
  .use(middleware.auth())
  .use(middleware.planLimit({
    feature: 'feeds',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))
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

      // Vérifier les limites pour les campagnes DM
      const { PlanService } = await import('#services/plan_service')
      const userPlan = user.plan || 'free'
      const canAccessDM = PlanService.canAccessFeature(userPlan, 'dmCampaigns')
      const canExecuteDM = PlanService.canAccessFeature(userPlan, 'dmCampaignExecution')

      // Récupérer les campagnes de l'utilisateur
      const { default: DmCampaign } = await import('#models/dm_campaign')
      const campaigns = await DmCampaign.query()
        .where('user_id', user.id)
        .orderBy('createdAt', 'desc')
      
      const safeCampaigns = campaigns.map(campaign => {
        try {
          const json = campaign.toJSON()
          console.log('Campaign JSON:', json)
          return json
        } catch (error) {
          console.error('Error serializing campaign:', error, 'Campaign ID:', campaign.id)
          return {
            id: campaign.id,
            name: campaign.name,
            accountHandle: campaign.accountHandle,
            strategy: campaign.strategy,
            user_id: campaign.user_id,
            status: campaign.status,
            keywords: campaign.keywords,
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
        // Ajouter les informations de plan pour les CTA
        planInfo: {
          current: userPlan,
          canAccessDM,
          canExecuteDM,
          upgradeMessage: !canAccessDM 
            ? 'Les campagnes DM sont disponibles avec le plan Pro' 
            : !canExecuteDM 
            ? 'L\'exécution automatique des campagnes DM nécessite le plan Business'
            : null,
          requiredPlan: !canAccessDM ? 'pro' : 'business'
        }
      })
    } catch (error) {
      console.error('Error loading campaigns:', error)
      return inertia.render('dmCampaigns', {
        user: auth.user!.toJSON(),
        campaigns: [],
        planInfo: { current: 'free', canAccessDM: false, canExecuteDM: false }
      })
    }
  }).use(middleware.auth())

// Campaign Dashboard - Individual campaign view
router
  .get('/campaign/:id', [dm_campaign_stats_controller, 'getCampaignDashboardPage'])
  .use(middleware.auth())

router
  .post('/campaign/create', [dm_campaigns_controller, 'createDmCampaign'])
  .use(middleware.auth())
  .use(middleware.planLimit({
    feature: 'dmCampaigns',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))
router
  .post('/campaign/toggle/:campaign_id', [dm_campaigns_controller, 'toggleDmCampaignStatus'])
  .use(middleware.auth())
router
  .delete('/campaign/delete/:campaign_id', [dm_campaigns_controller, 'removeDmCampaign'])
  .use(middleware.auth())

// ===== DM CAMPAIGNS ANALYSIS & EXECUTION =====
router
  .post('/campaign/:id/analyze', [dm_campaign_analysis_controller, 'analyzeFollowers'])
  .use(middleware.auth())
router
  .put('/campaign/:id/update', [dm_campaigns_controller, 'updateCampaign'])
  .use(middleware.auth())
router
  .post('/campaign/:id/execute', [dm_campaign_analysis_controller, 'executeCampaign'])
  .use(middleware.auth())
router
  .post('/campaign/:id/stop', [dm_campaign_analysis_controller, 'stopCampaignExecution'])
  .use(middleware.auth())
router
  .post('/campaign/:id/pause', [dm_campaign_analysis_controller, 'pauseCampaignExecution'])
  .use(middleware.auth())
router
  .post('/campaign/:id/resume', [dm_campaign_analysis_controller, 'resumeCampaignExecution'])
  .use(middleware.auth())
router
  .get('/api/campaign/:id/execution-status', [dm_campaign_analysis_controller, 'getExecutionStatus'])
  .use(middleware.auth())
router
  .post('/campaign/:id/count-responses', [campaign_conversations_controller, 'countResponses'])
  .use(middleware.auth())
router
  .get('/campaign/:id/stats', [dm_campaign_stats_controller, 'getCampaignStatsPage'])
  .use(middleware.auth())
router
  .get('/api/campaign/:id/stats', [dm_campaign_stats_controller, 'getCampaignStats'])
  .use(middleware.auth())
router
  .get('/campaign/:id/followers', [dm_campaign_stats_controller, 'getAnalyzedFollowers'])
  .use(middleware.auth())
router
  .post('/campaign/:id/mark-all-existing-conversations', [campaign_conversations_controller, 'markAllExistingConversationsAsContacted'])
  .use(middleware.auth())

// ===== CAMPAIGN MESSAGES =====
router
  .get('/campaign/:id/messages', [campaign_messages_controller, 'getCampaignMessages'])
  .use(middleware.auth())
router
  .post('/campaign/:id/messages', [campaign_messages_controller, 'createCampaignMessage'])
  .use(middleware.auth())
router
  .put('/campaign/:id/messages/:messageId', [campaign_messages_controller, 'updateCampaignMessage'])
  .use(middleware.auth())
router
  .delete('/campaign/:id/messages/:messageId', [campaign_messages_controller, 'deleteCampaignMessage'])
  .use(middleware.auth())

// ===== CONVERSATION TRACKING =====
router
  .get('/campaign/:id/conversation-status', [campaign_conversations_controller, 'getConversationStatus'])
  .use(middleware.auth())
router
  .post('/campaign/:id/check-conversations', [campaign_conversations_controller, 'checkConversations'])
  .use(middleware.auth())
router
  .post('/campaign/:id/mark-contacted/:followerId', [campaign_conversations_controller, 'markAsContacted'])
  .use(middleware.auth())

// ===== CAMPAIGN VARIABLES =====
router
  .get('/campaign/:id/variables', [campaign_variables_controller, 'index'])
  .use(middleware.auth())
router
  .post('/campaign/:id/variables', [campaign_variables_controller, 'store'])
  .use(middleware.auth())
router
  .put('/campaign/:id/variables/:variableId', [campaign_variables_controller, 'update'])
  .use(middleware.auth())
router
  .delete('/campaign/:id/variables/:variableId', [campaign_variables_controller, 'destroy'])
  .use(middleware.auth())

// ===== CAMPAIGN GROUPS =====
router
  .get('/campaign/:id/groups', [campaign_groups_controller, 'index'])
  .use(middleware.auth())
router
  .post('/campaign/:id/groups', [campaign_groups_controller, 'store'])
  .use(middleware.auth())
router
  .put('/campaign/:id/groups/:groupId', [campaign_groups_controller, 'update'])
  .use(middleware.auth())
router
  .delete('/campaign/:id/groups/:groupId', [campaign_groups_controller, 'destroy'])
  .use(middleware.auth())
router
  .post('/campaign/:id/groups/estimate', [campaign_groups_controller, 'estimate'])
  .use(middleware.auth())
router
  .get('/campaign/:id/groups/:groupId/followers', [campaign_groups_controller, 'getGroupFollowers'])
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

// ===== ANALYTICS DIAGNOSTICS =====
router
  .post('/api/analytics/:id/generate-test-data', [analytics_controller, 'generateTestHistoryData'])
  .use(middleware.auth())
router
  .get('/api/analytics/:id/diagnostic', [analytics_controller, 'diagnosticHistoryData'])
  .use(middleware.auth())


// ===== FOLLOWER ANALYSIS =====
router
  .post('/api/accounts/:id/follower-analysis/start', [
    follower_analysis_controller,
    'startAnalysis',
  ])
  .use(middleware.auth())
  .use(middleware.planLimit({
    feature: 'followerLoading',
    redirectOnLimit: '/pricing',
    jsonOnLimit: true
  }))
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
  .use(middleware.planLimit({
    feature: 'followActions',
    redirectOnLimit: '/pricing',
    jsonOnLimit: true
  }))
router
  .post('/accounts/:id/follower-tracker/batch-unfollow', [
    follower_tracker_controller,
    'batchUnfollow',
  ])
  .use(middleware.auth())
  .use(middleware.planLimit({
    feature: 'followActions',
    redirectOnLimit: '/pricing',
    jsonOnLimit: true
  }))
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
| CROSSPOSTING AUTHENTICATION ROUTES
|--------------------------------------------------------------------------
| Routes for connecting and managing crossposting accounts
| Includes: Twitter OAuth, disconnect functionality
|
*/

router
  .get('/auth/twitter', [twitter_auth_controller, 'initiateAuth'])
  .use(middleware.auth())
  .use(middleware.planLimit({
    feature: 'accounts',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))

router
  .get('/auth/twitter/callback', [twitter_auth_controller, 'callback'])
  .use(middleware.planLimit({
    feature: 'accounts',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))

router
  .post('/auth/twitter/disconnect/:id', [twitter_auth_controller, 'disconnect'])
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
  .use(middleware.planLimit({
    feature: 'scheduling',
    redirectOnLimit: '/pricing',
    jsonOnLimit: false
  }))

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