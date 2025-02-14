import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'crypto'
import AccountService from '#services/account_service'
import Account from '#models/account'
import { inject } from '@adonisjs/core'
import queue_manager from '../bluesky/queue_manager.js'
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js'
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

  public async sendMessageToAllFollowers({ request, response, auth, session }: HttpContext) {
    const user = auth.user;
    if (!user) throw new Error("No user found");

    const userBotService = users_bot_service_manager.userbotServiceMap.get(user.id);
    if (!userBotService) throw new Error("User bot service not found");

    const { account_id, listener_id } = request.only(["account_id", "listener_id"]);
    const [account, listener] = await Promise.all([
      Account.find(account_id),
      Listener.find(listener_id)
    ]);

    if (!account || !listener) throw new Error("Account or listener not found");
    if (!account.at_session) throw new Error("Account session missing");

    const agent = userBotService.agent;

    // Fonction de rafraîchissement de session et d'authentifications
    const refreshSessionAndAuths = async () => {
      await userBotService.createOrResumeSession(account);
      await account.refresh();

      if (!account.at_session) throw new Error("Account session missing")

      return Promise.all([
        agent.com.atproto.server.getServiceAuth(
          { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getConvoForMembers" },
          { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
        ),
        agent.com.atproto.server.getServiceAuth(
          { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getMessages" },
          { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
        ),
        agent.com.atproto.server.getServiceAuth(
          { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.sendMessage" },
          { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
        )
      ]);
    };

    // Initialisation des authentifications
    let [convoAuth, messagesAuth, sendMessageAuth] = await refreshSessionAndAuths();

    // Vérification d'expiration JWT
    const isJwtExpired = (token: string) => {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.exp * 1000 < Date.now() + 5000; // Marge de sécurité de 5s
      } catch {
        return true;
      }
    };

    // Wrapper de réessai automatique
    const withRetry = async (fn: () => Promise<any>, context: string) => {
      try {
        return await fn();
      } catch (err) {
        if (err.message.includes('JwtExpired')) {
          console.log(`JWT expiré détecté (${context}), tentative de rafraîchissement...`);
          [convoAuth, messagesAuth, sendMessageAuth] = await refreshSessionAndAuths();
          return await fn();
        }
        throw err;
      }
    };

    let cursor: string | undefined;
    if (account.followersCursor) cursor = account.followersCursor
    try {
      while (true) {
        const followersResponse = await agent.getFollowers({
          actor: account.handle,
          limit: 100,
          cursor
        });

        if (!followersResponse.data.followers.length) break;

        for (const follow of followersResponse.data.followers) {
          try {
            console.log("Processing account:", follow.handle)
            // Vérification proactive avant chaque follower
            if (isJwtExpired(account.at_session.accessJwt)) {
              [convoAuth, messagesAuth, sendMessageAuth] = await refreshSessionAndAuths();
            }

            // Utilisation du wrapper de réessai
            const convo = await withRetry(
              () => getConvoFromMembers([account.did, follow.did], convoAuth.data.token),
              'getConvoFromMembers'
            );

            if (convo) {
              const messages = await withRetry(
                () => getMessages(convo.id, messagesAuth.data.token),
                'getMessages'
              ) as unknown as MessageViewSender[];

              console.log(messages.length === 0)
              if (messages.length === 0) {
                await withRetry(
                  () => sendMessageToConvo(
                    { convoId: convo.id, message: { text: listener.message } },
                    sendMessageAuth.data.token
                  ),
                  'sendMessageToConvo'
                );
                console.log("Message sent to", follow.handle);

                // Délai anti-rate-limit
                await new Promise(resolve => setTimeout(resolve, 1500));
              }
            }
          } catch (err) {
            console.error("error catché avec", err.statusCode)
            if (err.statusCode === 429) {
              const retryAfter = err.response?.headers?.['retry-after'] || 60;
              console.log(`Rate limit (${retryAfter}s)`);
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
              continue;
            }
            console.error(`Erreur avec ${follow.handle}:`, err.message);
          }
        }

        cursor = followersResponse.data.cursor;
        account.followersCursor = cursor
        await account.save()
        console.log("Cursor updated")
        if (!cursor) break;

        // Délai entre les pages
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error("Erreur globale:", error);
      session.flash('error', 'Erreur: ' + error.message);
      return response.redirect().back();
    }

    session.flash('success', 'Messages envoyés avec succès');
    return response.redirect().back();
  }

}
