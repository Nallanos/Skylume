import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'crypto'
import AccountService from '#services/account_service'
import Account from '#models/account'
import { inject } from '@adonisjs/core'
import queue_manager from '../bluesky/queue_manager.js'
import { DateTime } from 'luxon';
import User from '#models/user'
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js'
@inject()
export default class AccountController {
  private accountService: AccountService | undefined

  public async createAccount({ request, auth, response, session }: HttpContext) {
    try {
      const { token_app_password, bksy_social } = request.only(['token_app_password', 'bksy_social'])

      if (!token_app_password || !bksy_social) {
        session.flash("errors.credentials", "Missing app password or social handle.")
        return response.redirect().back()
      }

      let user: User | undefined;
      try {
        user = await auth.authenticate()
        await auth.use('web').login(user)
      } catch (err) {
        try {
          if (!user) {
            console.warn(`error while auth: ${err.code}, creating new account...`)
            user = await this.createUser(bksy_social, token_app_password)
            await User.verifyCredentials(bksy_social, token_app_password)
            if (!user) {
              session.flash("errors.credentials", "Failed to retrieve account information. Please verify your credentials.")
              return response.redirect().back()
            }
            await auth.use('web').login(user)
          }
        } catch (err) {
          session.flash("errors.credentials", "Failed to retrieve account information. Please verify your credentials.")
          return response.redirect().back()
        }
      }

      let did: string | undefined
      if (!this.accountService) {
        let agent = users_bot_service_manager.userbotServiceMap.get(user.id)?.agent
        if (!agent) {
          await users_bot_service_manager.initOneUserBotService(user.id)
          agent = users_bot_service_manager.userbotServiceMap.get(user.id)?.agent
          console.log("agent:", agent)
          console.log("user:", users_bot_service_manager.userbotServiceMap.get(user.id))
          if (!agent) throw new Error(`Error while creating user bot service for ${user.id}`)
        }
        this.accountService = new AccountService(agent)
      }
      try {
        did = await this.accountService.getAccountDid()
      } catch (innerError) {
        session.flash("errors.credentials", "Failed to retrieve account information. Please verify your credentials.")
        return response.redirect().back()
      }

      const accountData = {
        userId: user.id,
        appPassword: token_app_password,
        handle: bksy_social,
        id: crypto.randomBytes(16).toString('hex'),
        did,
        seenNotificationAt: new Date().toISOString()
      }

      const account = await Account.create(accountData)

      if (!account) {
        session.flash("errors.credentials", "Failed to create account. Please verify your information.")
        return response.redirect().back()
      }

      try {
        await queue_manager.createOneJob(account)
      } catch (queueError) {
        console.error("Account created, but queue registration failed")
        session.flash("errors.credentials", "Account created, but queue registration failed. Please try again later.")
        return response.redirect('/dashboard')
      }
      return response.redirect('/dashboard')
    } catch (err: any) {
      if (err && err.error === "AuthFactorTokenRequired") {
        session.flash("errors.credentials", "Check your email for two-factor authentication.")
        return response.redirect().back()
      }
      else if (err.constraint === "accounts_handle_unique") {
        session.flash("errors.credentials", "Account already exists.")
        return response.redirect().back()
      }
      console.error(err)
      session.flash("errors.credentials", "An unexpected error occurred. Please try again.")
      return response.redirect().back()
    }
  }

  private async createUser(handle: string, appPassword: string) {
    try {
      const userAlreadyExists = await User.findBy('email', handle)

      if (userAlreadyExists) return userAlreadyExists

      await User.create({ id: handle, email: handle, password: appPassword, createdAt: DateTime.now() })
      const user = await User.verifyCredentials(handle, appPassword)

      await users_bot_service_manager.startUserBotService(user)

      return user
    } catch (err) {
      console.log("error while signin up:", err)
    }
  }

  public async deleteAccount({ request, response, session }: HttpContext) {
    try {
      const { id } = request.only(['id'])
      if (!id) {
        session.flash("errors.credentials", "Account ID is required.")
        return response.redirect().back()
      }

      const account = await Account.find(id)

      if (!account) {
        session.flash("errors.credentials", "Account not found.")
        return response.redirect().back()
      }


      console.log("Deleting account:", account.$attributes)

      try {
        await queue_manager.removeJob(account)
      } catch (queueError) {
        console.error("Error removing job from queue:", queueError)
        session.flash("errors.credentials", "Failed to remove account process from queue.")
        return response.redirect().back()
      }
      await account.delete()
      session.flash("success", "Account deleted successfully.")
      return response.redirect().back()
    } catch (err: any) {
      console.error("Unexpected error in deleteAccount:", err)
      session.flash("errors.credentials", "An error occurred while deleting the account. Please try again.")
      return response.redirect().back()
    }
  }
}
