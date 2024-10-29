import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'crypto';
import AccountService from '../utils/services/account_service.js';
import Account from '#models/account'
import { inject } from '@adonisjs/core'
@inject()
export default class AccountController {
  constructor(protected account: AccountService) { }
  public async createAccount({ request, auth, response, session }: HttpContext) {
    try {
      const user = await auth.authenticate();
      const data = request.only(['token_app_password', 'bksy_social']);
      if (!data.token_app_password || !data.bksy_social) {
        return response.redirect().back();
      }
      const did = await this.account.getAccountDid(data.bksy_social, data.token_app_password);
      if (user) {
        await Account.create({
          user_id: user.id,
          app_password: data.token_app_password,
          bksy_social: data.bksy_social,
          id: crypto.randomBytes(16).toString('hex'),
          did: did
        });
        response.redirect('/dashboard');
      }
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