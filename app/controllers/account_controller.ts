import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'crypto'
import AccountService from '#services/account_service'
import Account from '#models/account'
import { inject } from '@adonisjs/core'
import queue_manager from '../bluesky/queue_manager.js'
import Listeners_convos from '#models/listeners_convos'
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import { getConvoFromMembers, getMessages, sendMessageToConvo } from '../bluesky/chatAPI.js'
import type { MessageViewSender } from '@atproto/api/dist/client/types/chat/bsky/convo/defs.js'
import Listener from '#models/listener'
@inject()
export default class AccountController {
  constructor(protected account_service: AccountService) { }

  public async createAccount({ request, auth, response, session }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const { token_app_password, bksy_social } = request.only(['token_app_password', 'bksy_social'])

      if (!token_app_password || !bksy_social) {
        session.flash("errors.credentials", "Missing app password or social handle.")
        return response.redirect().back()
      }

      if (!user) {
        session.flash("errors.credentials", "User not authenticated.")
        return response.redirect("/")
      }

      let did: string | undefined
      try {
        did = await this.account_service.getAccountDid(bksy_social, token_app_password)
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
      session.flash("errors.credentials", "An unexpected error occurred. Please try again.")
      return response.redirect().back()
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

  public async sendMessageToAllFollowers({ request, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      throw new Error("no user found")
    }

    const agent = users_bot_service_manager.userbotServiceMap.get(user.id)?.agent
    if (!agent) {
      throw new Error("no agent found")
    }

    const { account_id, listener_id } = request.only(["account_id", "listener_id"])
    const account = await Account.find(account_id)

    if (!account) {
      throw new Error("no account found")
    }

    const listener = await Listener.find(listener_id)
    if (!listener) {
      throw new Error("no listener found")
    }
    let cursor: string = ''
    try {
      while (true) {
        let user_bot_service = users_bot_service_manager.userbotServiceMap.get(user.id)

        await user_bot_service?.createOrResumeSession(account)

        const response = await agent.getFollowers({
          actor: account.handle,
          limit: 100,
          cursor,
        });

        for (const follow of response.data.followers) {
          if (!account.at_session) {
            throw new Error("no account session found");
          }

          let resAuth = await agent.com.atproto.server.getServiceAuth(
            { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getConvoForMembers" },
            { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
          );
          const convo = await getConvoFromMembers([account.did, follow.did], resAuth.data.token);

          if (convo && user_bot_service) {
            resAuth = await user_bot_service.agent.com.atproto.server.getServiceAuth({
              aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getMessages"
            }, { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } })

            const messages = await getMessages(convo.id, resAuth.data.token) as unknown as MessageViewSender[]


            if (messages.length === 0) {
              let resAuth = await agent.com.atproto.server.getServiceAuth(
                {
                  aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.sendMessage"
                },
                { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
              );
              await sendMessageToConvo({ convoId: convo.id, message: { text: listener.message } }, resAuth.data.token)
              console.log("sent message to", follow.handle)
            }
          }

          if (!response.data.cursor) {
            break;
          }
          cursor = response.data.cursor;
        }
      }
    } catch (error) {
      response.redirect().back()
    }
  }
}