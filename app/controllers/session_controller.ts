import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
@inject()
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
            response.redirect('/dashboard')
        } catch (error) {
            session.flash("errors.credentials", "Invalid email or password")
            response.redirect().back()
        }
    }

    public async logout({ auth, response }: HttpContext) {
        await auth.use('web').logout()

        return response.redirect('/')
    }


    public async deleteUser({ auth, response }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) throw new Error("User not found")
        await user.delete()
        return response.redirect('/')
    }
}
