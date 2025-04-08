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
import Listener from '#models/listener'

import Feed from '#models/feed'

router.on('/').renderInertia('home')
router.on('/login').renderInertia('login')
router.on("/terms").renderInertia("terms")
router.on("/privacy").renderInertia("privacy")
router.on("/pricing").renderInertia("pricing")
router.on("/philosophy").renderInertia("philosophy")
router.on("/password/reset").renderInertia("contact-us")


router.on("/account/:id/ai-posts").renderInertia("AiPost").use(middleware.auth())
router.on("/add/account").renderInertia("AddAccount").use(middleware.auth())
router.on("/add/campaign").renderInertia("AddCampaign").use(middleware.auth())
router.on("/add/schedule").renderInertia("AddSchedule").use(middleware.auth())
router.on("/plan/change").renderInertia("planChange").use(middleware.auth())

const session_controller = () => import('#controllers/session_controller')
const scheduling_controller = () => import('#controllers/schedulings_controller')
const account_controller = () => import('#controllers/account_controller')
const stripe_controller = () => import("#controllers/stripes_controller")
const bots_controller = () => import('#controllers/bots_controller')
const feed_controller = () => import('#controllers/feeds_controller')
const follower_analysis_controller = () => import('#controllers/follower_analysis_controller')

router.post("/login", [session_controller, 'login'])

router.delete("/delete", [session_controller, "deleteUser"]).use(middleware.auth())
// router.post("/dm_campaign/toggle", [dm_campaign_controller, "toggleDmCampaignStatus"]).use(middleware.auth())
// router.post("/dm_campaign/start", [dm_campaign_controller, "startCampaign"]).use(middleware.auth())
// router.put("/dm_campaign/delete", [dm_campaign_controller, "removeDmCampaign"]).use(middleware.auth())
// router.post("/dm_campaign/create", [dm_campaign_controller, "createDmCampaign"]).use(middleware.auth())
router.put("/account", [account_controller, 'createAccount'])
router.post("/dashboard/accounts/delete", [account_controller, 'deleteAccount']).use(middleware.auth())
router.post("/bot/add", [bots_controller, 'addBot']).use(middleware.auth())
router.post("/bot/remove", [bots_controller, 'removeBot']).use(middleware.auth())
router.put("/logout", [session_controller, 'logout']).use(middleware.auth())
router.post("/bot/refresh", [bots_controller, 'refreshBotData']).use(middleware.auth())
router.put("/bot/update", [bots_controller, 'updateBot']).use(middleware.auth())
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



router.post("/bot/toggle", async ({ response, request }) => {

    const { listener_id } = request.only(["listener_id"])

    console.log("listener_id", listener_id)

    const listener = await Listener.find(listener_id)

    if (!listener) {
        throw new Error("Listener not found")
    }

    listener.isActive = !listener.isActive
    await listener.save()

    return response.redirect().back()
}).use(middleware.auth())

router.get('/dashboard', async ({ auth, inertia, response }) => {
    try {
        let user = await auth.authenticate()
        let accounts = await Account.query()
            .where('user_id', user.id)
        accounts.map(async (a) => {
            await a.load("listeners")
            a.serialize()
        })

        return inertia.render('dashboard', {
            accounts: accounts,
        })
    } catch (err) {
        if (err.status === 401) {
            console.error(err)
            return inertia.render('dashboard', { accounts: [] })
        }
        console.error(err)
        return response.redirect().back()

    }
})

router.get('/bot', async ({ auth, inertia }) => {
    const user = auth.user!
    if (user) {
        const accounts = await Account.query().where('user_id', user.id);
        return inertia.render('add_bot', { accounts })
    }
    return inertia.render('bot', { accounts: [] })
}).use(middleware.auth())

router.get('/bot/:id', async ({ params, inertia }) => {
    const id = params.id

    const bot = await Listener.find(id)
    if (!bot) { return }
    return inertia.render('bot', { bot: bot.serialize() })
}).use(middleware.auth())

router.get('/account/:id/dashboard', [follower_analysis_controller, "AnalyzeFollowers"]).use(middleware.auth())

// router.get('/DM_Campaigns', async ({ auth, inertia }) => {
//     const user = auth.user
//     if (user) {
//         let dmCampaigns = await DmCampaign.query()
//             .where('user_id', user.id)
//         dmCampaigns.sort((a, b) =>
//             b.accountHandle.localeCompare(a.accountHandle)
//         );
//         return inertia.render('DM_Campaigns', {
//             campaigns: dmCampaigns
//         })
//     }
//     return inertia.render('DM_Campaigns', { campaigns: [] })
// }).use(middleware.auth())

router.get('/schedule', async ({ auth, inertia }) => {
    const user = auth.user
    if (user) {
        let schedulings = await user.related('scheduling').query()
        return inertia.render('schedule', { schedulings })
    }
    return inertia.render('schedule')


}).use(middleware.auth())

