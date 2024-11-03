import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon';
export default class SessionController {
    public async login({ request, auth, response, session }: HttpContext) {
        try {
            const { email, password } = request.only(['email', 'password'])
            const user = await User.verifyCredentials(email, password)
            
            await auth.use('web').login(user)
            response.redirect('/dashboard')
        } catch (error) {
            session.flash("errors.credentials", "Invalid email or password")
            response.redirect().back()
        }
    }

    public async signUp({ request, auth, response, session }: HttpContext) {
        const { email, password } = request.only(['email', 'password'])
        const userAlreadyExists = await User.findBy('email', email)
        if (userAlreadyExists !== null) {
            session.flash('errors.email', 'Email already exists')
            return response.redirect().back()
        }
        await User.create({ email: request.body().email, password: request.body().password, createdAt: DateTime.now() })
        const user = await User.verifyCredentials(email, password)
        await auth.use('web').login(user)
        return response.redirect('/dashboard')
    }

    public async logout({ auth, response }: HttpContext) {
        await auth.use('web').logout()

        return response.redirect('/')
    }
}
