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
import DmCampaign from '#models/dm_campaign'

router.on('/').renderInertia('home')
router.on('/login').renderInertia('login')
router.on("/terms").renderInertia("terms")
router.on("/privacy").renderInertia("privacy")
router.on("/pricing").renderInertia("pricing")
router.on("/philosophy").renderInertia("philosophy")
router.on("/password/reset").renderInertia("contact-us")


router.on("/add/account").renderInertia("AddAccount").use(middleware.auth())
router.on("/add/campaign").renderInertia("AddCampaign").use(middleware.auth())
router.on("/add/schedule").renderInertia("AddSchedule").use(middleware.auth())
router.on("/plan/change").renderInertia("planChange").use(middleware.auth())
router.on('/account/:id/dashboard/loading').renderInertia("AccountDashboard").use(middleware.auth())

// AI Analysis Routes
router.on("/ai-analysis").renderInertia("AiAnalysis").use(middleware.auth())
// Route corrigée pour l'analyse d'audience
// router.get("/account/:id/audience-analysis", async ({ params, inertia, auth, response }) => {
//     const user = auth.user
//     if (!user) {
//         return response.redirect('/login')
//     }

//     try {
//         // Récupérer le compte associé à l'ID et à l'utilisateur authentifié
//         const account = await Account.query()
//             .where('id', params.id)
//             .where('userId', user.id)
//             .firstOrFail()

//         // Rendre la vue avec le compte en tant que props
//         return inertia.render('AudienceAnalysis', { account })
//     } catch (error) {
//         console.error('Erreur lors du chargement du compte:', error)
//         return response.redirect('/dashboard')
//     }
// }).use(middleware.auth())

const session_controller = () => import('#controllers/session_controller')
const scheduling_controller = () => import('#controllers/schedulings_controller')
const account_controller = () => import('#controllers/account_controller')
const stripe_controller = () => import("#controllers/stripes_controller")
const feed_controller = () => import('#controllers/feeds_controller')
const analytics_controller = () => import('#controllers/analytics_controller')
const follower_analysis_controller = () => import('#controllers/follower_analysis_controller')
const python_controller_methods = () => import('#controllers/python_controller_methods')


router.post("/login", [session_controller, 'login'])

router.delete("/delete", [session_controller, "deleteUser"]).use(middleware.auth())
// router.post("/dm_campaign/toggle", [dm_campaign_controller, "toggleDmCampaignStatus"]).use(middleware.auth())
// router.post("/dm_campaign/start", [dm_campaign_controller, "startCampaign"]).use(middleware.auth())
// router.put("/dm_campaign/delete", [dm_campaign_controller, "removeDmCampaign"]).use(middleware.auth())
// router.post("/dm_campaign/create", [dm_campaign_controller, "createDmCampaign"]).use(middleware.auth())
router.put("/account", [account_controller, 'createAccount'])
router.post("/dashboard/accounts/delete", [account_controller, 'deleteAccount']).use(middleware.auth())
router.get("/account/:id/refresh-stats", [account_controller, 'refreshStats']).use(middleware.auth())

router.post("/schedule/create", [scheduling_controller, "schedulePost"]).use(middleware.auth())
router.put("/schedule/delete", [scheduling_controller, "deletePost"]).use(middleware.auth())
router.put("/schedule/edit", [scheduling_controller, "editPost"]).use(middleware.auth())

router.post('/create-stripe-session', [stripe_controller, "redirectToStripe"]).use(middleware.auth())
router.post("/webhook", [stripe_controller, "getPaymentSucceeded"])
router.post("/downgrade-plan", [stripe_controller, "downgradePlan"])

router.get("/feed", async ({ inertia, auth }) => {
    const user = auth.user
    if (user) {
        const feed = await Feed.findManyBy("userId", user.id)
        if (feed.length === 0) {
            return inertia.render("feed", {
                feeds: [],
            })
        }
        return inertia.render("feed", {
            feeds: feed,
        })
    }
    return inertia.render("feed", { feeds: [] })

}).use(middleware.auth())
router.get('/feed/:id', [feed_controller, "getPertinentPosts"]).use(middleware.auth())
router.post('/feed/create', [feed_controller, "createFeed"]).use(middleware.auth())
router.post('/feed/delete', async ({ request, response }) => {
    const { feed_id } = request.only(["feed_id"])
    const feed = await Feed.find(feed_id)
    if (!feed) {
        throw new Error("Feed not found")
    }
    await feed.delete()
    return response.redirect().back()
}).use(middleware.auth())
router.get("/feed/:id/getPosts", [feed_controller, "processPosts"]).use(middleware.auth())


router.get('/dashboard', async ({ auth, inertia, response }) => {
    try {
        let user = await auth.authenticate()

        let accounts = await Account.query()
            .where('user_id', user.id)
            .orderBy('followers_count', 'desc')

        return inertia.render('dashboard', {
            accounts: accounts,
        })
    } catch (err) {
        if (err.status === 401 || err.message === "E_UNAUTHORIZED_ACCESS") {
            console.error(err)
            return inertia.render('dashboard', { accounts: [] })
        }
        console.error("test", err)
        return response.redirect("/")
    }
})


router.get('/DM_Campaigns', async ({ auth, inertia }) => {
    const user = auth.user
    if (user) {
        let dmCampaigns = await DmCampaign.query()
            .where('user_id', user.id)
        dmCampaigns.sort((a, b) =>
            b.accountHandle.localeCompare(a.accountHandle)
        );
        return inertia.render('DM_Campaigns', {
            campaigns: dmCampaigns
        })
    }
    return inertia.render('DM_Campaigns', { campaigns: [] })
}).use(middleware.auth())

router.get('/schedule', async ({ auth, inertia }) => {
    const user = auth.user
    if (user) {
        let schedulings = await user.related('scheduling').query()
        return inertia.render('schedule', { schedulings })
    }
    return inertia.render('schedule')
}).use(middleware.auth())

// Routes Analytics
router.get('/analytics/:id', [analytics_controller, 'basicAnalytics']).use(middleware.auth())
router.get('/analytics/:id/audience', [analytics_controller, 'audienceAnalysisPage']).use(middleware.auth())
router.get('/analytics/:id/audience/refresh', [follower_analysis_controller, 'getAnalysisStatus']).use(middleware.auth())

// Routes d'analyse des followers
router.post('/api/accounts/:id/follower-analysis/start', [follower_analysis_controller, 'startAnalysis']).use(middleware.auth())
router.post('/api/accounts/:id/follower-analysis/stop', [follower_analysis_controller, 'stopAnalysis']).use(middleware.auth())
router.get('/api/accounts/:id/follower-analysis/status', [follower_analysis_controller, 'getAnalysisStatus']).use(middleware.auth())
router.get('/api/accounts/:id/follower-analysis/stream', [follower_analysis_controller, 'streamAnalysisStatus']).use(middleware.auth())
router.get('/api/clusters', [follower_analysis_controller, 'getClusters'])

// Routes internes pour le worker Python (protégées par clé API)
router.get('/internal/python/next-bulk-job', [python_controller_methods, 'getNextBulkAnalysisJob']).use(middleware.api_auth())
router.get('/internal/python/next-recurring-job', [python_controller_methods, 'getNextRecurringAnalysisJob']).use(middleware.api_auth())
router.post('/internal/python/complete-job', [python_controller_methods, 'processBatchProgress']).use(middleware.api_auth())
router.post('/internal/python/update-progress', [python_controller_methods, 'updateAnalysisProgress']).use(middleware.api_auth())
router.get('/internal/python/accounts/:handle', [python_controller_methods, 'getAccount']).use(middleware.api_auth())
router.get('/internal/python/health', [python_controller_methods, 'health']).use(middleware.api_auth())