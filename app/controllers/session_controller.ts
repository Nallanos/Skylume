import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
@inject()
export default class SessionController {
    constructor() { }

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
