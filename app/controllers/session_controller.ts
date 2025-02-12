import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon';
import UsersBotServiceManager from '../bluesky/users_bot_service_manager.js';
import { isEmailValid } from '#services/session_service';
import crypto from 'crypto';


export default class SessionController {
    constructor() { }
    public async login({ request, auth, response, session }: HttpContext) {
        try {
            const { email, password } = request.only(['email', 'password'])
            const userAlreadyExists = await User.findBy('email', email)

            if (userAlreadyExists == null) {
                session.flash("errors.credentials", "This account does not exist")
                return response.redirect().back()
            }

            const user = await User.verifyCredentials(email, password)

            await auth.use('web').login(user)
            response.redirect('/thank-you')
        } catch (error) {
            session.flash("errors.credentials", "Invalid email or password")
            response.redirect().back()
        }
    }

    public async signUp({ request, auth, response, session }: HttpContext) {
        try {
            const { email, password, marketing_consent } = request.only(['email', 'password', "marketing_consent"])
            console.log({ email, password, marketing_consent })
            const userAlreadyExists = await User.findBy('email', email)

            if (userAlreadyExists !== null) {
                session.flash('errors.credentials', 'Account already exists')
                console.log("Account already exists")
                return response.redirect().back()
            }

            if (!await isEmailValid(email)) {
                session.flash('errors.credentials', 'Please enter a valid email')
                console.log("email is invalid")
                return response.redirect().back()
            }

            await User.create({ id: crypto.randomBytes(16).toString('hex'), email: request.body().email, password: request.body().password, createdAt: DateTime.now(), marketing_consent: marketing_consent })
            const user = await User.verifyCredentials(email, password)

            await auth.use('web').login(user)

            await UsersBotServiceManager.startUserBotService(user)
            return response.redirect('/thank-you')
        } catch (err) {
            console.log("error while signin up:", err)
        }
    }

    public async logout({ auth, response }: HttpContext) {
        await auth.use('web').logout()

        return response.redirect('/')
    }

}
