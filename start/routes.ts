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
import DmCampaign from '#models/dm_campaign'

router.on('/').renderInertia('home')
router.on('/schedule').renderInertia('schedule').use(middleware.auth())
router.on('/login').renderInertia('login')
router.on("/terms").renderInertia("terms")
router.on("/privacy").renderInertia("privacy")
router.on("/pricing").renderInertia("pricing")
router.on("/password/reset").renderInertia("contact-us")
router.on("/account/:id/ai-posts").renderInertia("AiPost").use(middleware.auth())
router.on("/add/account").renderInertia("AddAccount").use(middleware.auth())
router.on("/add/campaign").renderInertia("AddCampaign").use(middleware.auth())

const dm_campaign_controller = () => import('#controllers/dm_campaigns_controller')
const session_controller = () => import('#controllers/session_controller')
const account_controller = () => import('#controllers/account_controller')
const bots_controller = () => import('#controllers/bots_controller')
router.post("/login", [session_controller, 'login'])
router.delete("/delete", [session_controller, "deleteUser"])

router.post("/dm_campaign/toggle", [dm_campaign_controller, "toggleDmCampaignStatus"]).use(middleware.auth())
router.post("/dm_campaign/start", [dm_campaign_controller, "startCampaign"]).use(middleware.auth())
router.put("/dm_campaign/delete", [dm_campaign_controller, "removeDmCampaign"]).use(middleware.auth())
router.post("/dm_campaign/create", [dm_campaign_controller, "createDmCampaign"]).use(middleware.auth())
router.put("/account", [account_controller, 'createAccount'])
router.post("/dashboard/accounts/delete", [account_controller, 'deleteAccount']).use(middleware.auth())
router.post("/bot/add", [bots_controller, 'addBot']).use(middleware.auth())
router.post("/bot/remove", [bots_controller, 'removeBot']).use(middleware.auth())
router.put("/logout", [session_controller, 'logout']).use(middleware.auth())
router.post("/bot/refresh", [bots_controller, 'refreshBotData']).use(middleware.auth())
router.put("/bot/update", [bots_controller, 'updateBot']).use(middleware.auth())
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
            console.log(a.listeners)
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

router.get('/account/:id/dashboard', async ({ params, inertia }) => {
    try {
        const id = params.id

        const account = await Account.find(id)
        if (!account) {
            throw new Error("Account not found")
        }
        await account.refresh()
        await account.load('listeners')
        account.listeners.sort((a, b) => a.id.localeCompare(b.id))

        if (!account.listeners) {
            throw new Error("Listeners not found")
        }

        return inertia.render('botDashboard', {
            account: account.serialize(),
        })
    } catch (error) {
        console.log(error)
    }

}).use(middleware.auth())

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