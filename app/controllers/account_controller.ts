import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'crypto';
import AccountService from '#services/account_service';
import Account from '#models/account'
import { inject } from '@adonisjs/core'
import queue_manager from '../bluesky/queue_manager.js';
import Listeners_convos from '#models/listeners_convos';
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
        appPassword: data.token_app_password,
        handle: data.bksy_social,
        id: crypto.randomBytes(16).toString('hex'),
        did: did,
        seenNotificationAt: new Date(Date.now()).toISOString()
      });

      if (!account) {
        session.flash("errors.credentials", "Failed to create account, please, verify the credential")
      }

      await queue_manager.createOneJob(account)

      return response.redirect('/dashboard');
    } catch (err) {
      console.log(err)
      if (err.error = "AuthFactorTokenRequired") {
        session.flash("errors.credentials", "Please, check your email for the double factor authentication")
        return response.redirect().back()
      }
      session.flash("errors.credentials", "Invalid social or password")
      return response.redirect().back()
    }
  }



  public async deleteAccount({ request, response }: HttpContext) {
    try {
      const data = request.only(['id'])
      const account = await Account.query().where('id', data.id).preload("listeners").firstOrFail()
      if (!account) {
        throw new Error("Account not found")
      }
      console.log(account.$attributes)
      await queue_manager.removeJob(account)

      for (const listener of account.listeners) {
        await Listeners_convos.query().where('listeners_id', listener.id).delete()
        await listener.delete()
      }
      await account.delete()
      response.redirect().back()
    } catch (err) {
      console.log("error while deleting account", err)
      response.redirect().back()
    }
  }

}