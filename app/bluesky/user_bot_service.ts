import Account from '#models/account'
import Listener from '#models/listener'
import { type AtpSessionData, AtpAgent, } from '@atproto/api'
import { EventListener } from './bot.js'
import type { NotificationData } from './types.js'
import queue from '@rlanz/bull-queue/services/main'
import BotJob from '../jobs/bot_job.js'
import { RateLimitedAgent } from '@skyware/bot'
import { RateLimitThreshold } from "rate-limit-threshold";
/**
 * Manages bot services for an account, including listener handling
 */
export default class UserBotService {
  public handlers: Map<string, EventListener> = new Map()
  private agent: AtpAgent;
  private chat: RateLimitedAgent;
  constructor(private accounts: Account[]) {
    console.log("instance of user bot service created")
    this.agent = new AtpAgent({ service: "https://bsky.social" })
    this.chat = new RateLimitedAgent(
      { handler: this.agent.fetchHandler },
      new RateLimitThreshold(3000, 300),
    ).withProxy("bsky_chat", "did:web:api.bsky.chat");
    this.initializeMapHandler()
  }

  /**
   * Create one Job for one Account
   */
  public async createOneJob(account: Account, Queue: typeof queue) {
    Queue.dispatch(BotJob, account, { queueName: "listeners", repeat: { every: 60000 * 1 } })
  }
  /**
   * Create a Job for each user's account
   */
  public async createAJobForEachUserAccount(Queue: typeof queue) {
    try {
      for (const account of this.accounts) {
        console.log("Adding a job for account:", account)
        console.log(account.save)
        await Queue.dispatch(BotJob, account, { queueName: "listeners", repeat: { every: 60000 * 1 } })
      }
      console.log("All jobs have been added successfully!")
    } catch (err) {
      console.error("An error occurred while creating jobs:", err)
    }
  }

  /**
   * Initializes map handlers for all listeners associated with the account
   */
  public async initializeMapHandler(): Promise<void> {
    try {
      const listeners = await this.getListeners()

      if (listeners == undefined) {
        throw new Error("listeners connection is undefined")
      }

      this.handlers = new Map(
        listeners.map((listener) => [listener.id, new EventListener(this.chat, this.agent, listener.event, listener.action, listener.id, listener.account_id, listener.message)])
      )

    } catch (err) {
      console.error('Handler map initialization failed:', err)
    }
  }

  /**
   * Removes a handler from the managed map listeners
   */
  public async removeHandlerFromMap(listener_id: string): Promise<void> {
    try {
      this.handlers.delete(listener_id)
    } catch (err) {
      console.error('Handler removing failed:', err)
    }
  }

  /**
   * Adds a new handler to the managed map listeners
   */
  public async addHandlerToMap(listener_id: string): Promise<void> {
    try {
      const listener = await Listener.find(listener_id)
      const account = await Account.find(listener?.account_id)

      if (!listener || !account) {
        console.error('Listener or account not found')
        return
      }

      this.handlers.set(listener_id, new EventListener(this.chat, this.agent, listener.event, listener.action, listener.id, account.id, listener.message))
      console.log("updated handlers map :", this.handlers)
    } catch (err) {
      console.error('Handler addition failed:', err)
    }
  }

  /**
   * Starts all the given listeners for the given events
   */
  public async startAllListeners(notificationData: NotificationData[], listeners: Listener[]): Promise<void> {
    try {
      notificationData.forEach(async (notification) => {
        console.log("starting notifcation:", notification)
        const userListeners = await this.getListenersOn(notification.event, listeners)

        // Sort the listeners array to ensure that "Follow" actions are processed first
        // This is necessary because "Follow" should happen before "Send A Message" for proper sequence
        userListeners.sort((a, b) => {
          if (a.action === "Follow" && b.action !== "Follow") return -1;
          if (a.action !== "Follow" && b.action === "Follow") return 1;
          return 0;
        });
        for (const listener of userListeners) {
          let bot = this.handlers.get(listener.id)
          if (bot === undefined) {
            await this.initializeMapHandler()
            bot = this.handlers.get(listener.id)
            if (bot === undefined) {
              throw new Error(`didn't find the handlers with ${listener.id} in the handlers map`)
            }
          }
          await bot.on(notification.authorDid)
        }
      })
    } catch (err) {
      console.error('Starting all listeners failed:', err)
    }
  }


  /***
   * get users listeners for a specific event
   */
  public async getListenersOn(event: string, listeners: Listener[]) {
    try {
      const filteredListeners = listeners.filter(listener => listener.event === event);
      return filteredListeners;
    } catch (err) {
      throw new Error(`error while getting listeners on ${event}`)
    }
  }


  /**
   * Retrieves all listeners from an user in the database
   */
  public async getListeners(): Promise<Listener[]> {
    try {
      let listener: Listener[] = []
      if (this.accounts) {
        for (const account of this.accounts) {
          console.log(`getting listener with ${account.id}`)
          listener = [...listener, ...(await Listener.findManyBy('account_id', account.id) || [])];
        }
        if (listener.length == 0) {
          console.log("user doesn't have listeners", listener)
        }
        return listener
      }
      throw Error(`error getting listeners ${listener}of ${this.accounts}`)
    } catch (err) {
      console.error('Retrieving listeners failed:', err)
      return []
    }
  }

  /**
   * Stops a specific listener
   */
  public stop(listener_id: string): void {
    try {
      const bot = this.handlers.get(listener_id)
      if (bot == undefined) {
        throw new Error("Bot is undefined")
      }
      bot.removeListener()
      this.removeHandlerFromMap(listener_id)
    } catch (err) {
      console.error('Stopping listener failed:', err)
    }
  }

  /**
   * Starts a specific listener
   */
  public async start(listener_id: string, did: string): Promise<void> {
    try {
      await this.addHandlerToMap(listener_id).then(async () => {
        let bot = this.handlers.get(listener_id)
        if (bot === undefined) {
          bot = this.handlers.get(listener_id)
          if (bot === undefined) {
            throw new Error(`can't find mapped bot in handlermap with ${listener_id} as listener_id`)
          }
        }
        await bot.on(did)
      })

    } catch (err) {
      console.error('Starting listener failed:', err)
    }
  }

  public async createOrResumeSession(account_id: string): Promise<void> {
    try {
      const account = await Account.find(account_id)
      if (!account) {
        throw new Error("can't find the account with the given userId")
      }

      if (!this.agent.sessionManager.hasSession) {
        const session = (await this.agent.login({
          identifier: account.did,
          password: account.appPassword,
        })).data;

        account.session = JSON.stringify(session)
        account.save()
        console.log("New session created!");
      }
      if (account.at_session) {
        await this.agent.resumeSession({
          accessJwt: account.at_session.accessJwt,
          refreshJwt: account.at_session.refreshJwt,
          handle: account.handle,
          did: account.did,
        } as AtpSessionData);
      }
      return;
    } catch (err) {
      console.error("Error while creating or resuming the session in the userBotService:", err);
    }
  }

  public async fetchAccountNotifications(): Promise<NotificationData[] | undefined> {
    try {
      const response = await this.agent.listNotifications();
      if (!response) {
        console.log("response undefined in fetchAccountNotifications");
        throw new Error("list notification response is undefined");
      }

      const notificationsData: NotificationData[] = response.data.notifications.map((notification) => ({
        authorDid: notification.author.did,
        event: notification.reason,
      }));

      return notificationsData;
    } catch (err) {
      console.error("Error while fetching Account Notifications in the userBotService: ", err);
      return undefined;
    }
  }


  public async readAllNotification() {
    await this.agent.updateSeenNotifications()
  }
}
