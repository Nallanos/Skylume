import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'crypto';
import AccountService from '#services/account_service';
import Account from '#models/account'
import { inject } from '@adonisjs/core'
import UserBotService from '../bluesky/user_bot_service.js';
@inject()
export default class AccountController {
  constructor(protected account_service: AccountService) { }
  public async createAccount({ request, auth, response, session }: HttpContext) {
    try {
      const user = await auth.authenticate();
      const data = request.only(['token_app_password', 'bksy_social']);

      if (!data.token_app_password || !data.bksy_social) {
        return response.redirect().back();
      }

      const did = await this.account_service.getAccountDid(data.bksy_social, data.token_app_password);

      if (!user) {
        session.flash("errors.credentials", "you're not authenticated")
        return response.redirect("/")
      }

      const account = await Account.create({
        userId: user.id,
        app_password: data.token_app_password,
        bksy_social: data.bksy_social,
        id: crypto.randomBytes(16).toString('hex'),
        did: did,
      });

      if (!account) {
        session.flash("errors.credentials", "Failed to create account, please, verify the credential")
      }

      return response.redirect('/dashboard');
    } catch (err) {
      session.flash("errors.credentials", "Invalid social or password")
      return response.redirect().back()
    }
  }



  public async deleteAccount({ request, response }: HttpContext) {
    const data = request.only(['id'])
    const account = await Account.findBy('id', data.id)
    if (account) {
      account.delete()
      response.redirect().back()
    }
  }


}