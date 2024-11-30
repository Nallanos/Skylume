import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon';
import UsersBotServiceManager from '../bluesky/users_bot_service_manager.js';

export default class SessionController {
    public async login({ request, auth, response, session }: HttpContext) {
        try {
            const { email, password } = request.only(['email', 'password'])
            const userAlreadyExists = await User.findBy('email', email)

            if (userAlreadyExists == null) {
                session.flash("errors.credentials", "This account does not exist")
                return response.redirect().back()
            }

            const user = await User.verifyCredentials(email, password)

            let UserBotService = UsersBotServiceManager.userbotServiceMap.get(user.id)

            if (!UserBotService) {
                UsersBotServiceManager.startUserBotService(user)
            }

            await auth.use('web').login(user)
            response.redirect('/dashboard')
        } catch (error) {
            session.flash("errors.credentials", "Invalid email or password")
            response.redirect().back()
        }
    }

    public async signUp({ request, auth, response, session }: HttpContext) {
        try {
            const { email, password } = request.only(['email', 'password'])
            const userAlreadyExists = await User.findBy('email', email)

            if (userAlreadyExists !== null) {
                session.flash('errors.credential', 'Account already exists')
                return response.redirect().back()
            }

            await User.create({ email: request.body().email, password: request.body().password, createdAt: DateTime.now() })
            const user = await User.verifyCredentials(email, password)

            await auth.use('web').login(user)

            await UsersBotServiceManager.startUserBotService(user)
            return response.redirect('/dashboard')
        } catch (err) {
            console.log("error while signin up:", err)
        }
    }

    public async logout({ auth, response }: HttpContext) {
        await auth.use('web').logout()

        return response.redirect('/')
    }
}
