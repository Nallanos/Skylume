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
router.on('/settings').renderInertia('settings').use(middleware.auth())
router.on('/schedule').renderInertia('schedule').use(middleware.auth())
router.on('/sign-up').renderInertia('sign-up')
router.on('/login').renderInertia('login')
router.on("/landing-page").renderInertia("landing_page")

const session_controller = () => import('#controllers/session_controller')
const account_controller = () => import('#controllers/account_controller')
const bots_controller = () => import('#controllers/bots_controller')
router.post("/sign-up", [session_controller, 'signUp'])
router.post("/login", [session_controller, 'login'])
router.put("/settings", [account_controller, 'createAccount']).use(middleware.auth())
router.post("/dashboard/accounts/delete", [account_controller, 'deleteAccount']).use(middleware.auth())
router.post("/bot/add", [bots_controller, 'addBot']).use(middleware.auth())
router.post("/bot/remove", [bots_controller, 'removeBot']).use(middleware.auth())
router.put("/logout", [session_controller, 'logout']).use(middleware.auth())


router.get('/dashboard', async ({ auth, inertia }) => {
    const user = auth.user!
    if (user) {
        const accounts = await Account.query()
            .where('user_id', user.id)
        const listeners = await Listener.findManyBy("user_id", user.id)
        console.log(listeners)
        return inertia.render('dashboard', { accounts: accounts.map((a) => a.serialize()), listeners: listeners.map((a) => a.serialize()) })
    }
    return inertia.render('dashboard', { accounts: [] })
}).use(middleware.auth())

router.get('/bot', async ({ auth, inertia }) => {
    const user = auth.user!
    if (user) {
        const accounts = await Account.query().where('user_id', user.id);
        return inertia.render('bot', { accounts })
    }
    return inertia.render('bot', { accounts: [] })
}).use(middleware.auth())