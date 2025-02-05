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

router.on('/').renderInertia('home')
router.on('/schedule').renderInertia('schedule').use(middleware.auth())
router.on('/sign-up').renderInertia('sign-up')
router.on('/login').renderInertia('login')
router.on("/landing-page").renderInertia("landing_page")
router.on("/terms").renderInertia("terms")
router.on("/privacy").renderInertia("privacy")
router.on("/pricing").renderInertia("pricing")
router.on("/thank-you").renderInertia("thank-you")
router.on("/password/reset").renderInertia("contact-us")
router.on("/account/:id/ai-posts").renderInertia("AiPost").use(middleware.auth())

const session_controller = () => import('#controllers/session_controller')
const account_controller = () => import('#controllers/account_controller')
const bots_controller = () => import('#controllers/bots_controller')
router.post("/sign-up", [session_controller, 'signUp'])
router.post("/login", [session_controller, 'login'])

router.put("/account", [account_controller, 'createAccount']).use(middleware.auth())
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

router.get('/dashboard', async ({ auth, inertia }) => {
    const user = auth.user!
    if (user) {
        const accounts = await Account.query()
            .where('user_id', user.id)
        const listeners = await Listener.findManyBy("user_id", user.id)
        return inertia.render('dashboard', { accounts: accounts.map((a) => a.serialize()), listeners: listeners.map((a) => a.serialize()) })
    }
    return inertia.render('dashboard', { accounts: [] })
}).use(middleware.auth())

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
        await account.load('listeners')

        if (!account.listeners) {
            throw new Error("Listeners not found")
        }

        // const listeners_convos = await Listeners_convos.query().whereIn('listeners_id', account.listeners.map((l) => l.id))

        // if (!listeners_convos) {
        //     throw new Error("Bot convos not found")
        // }

        return inertia.render('accountDashboard', {
            account: account.serialize(),
            // listeners_convos: listeners_convos.map((l) => l.serialize())
        })
    } catch (error) {
        console.log(error)
    }

}).use(middleware.auth())

