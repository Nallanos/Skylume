import Account from '#models/account'
import Listener from '#models/listener'
import { type AtpSessionData, AtpAgent, } from '@atproto/api'
import { EventListener } from './bot.js'
import type { NotificationData } from './types.js'

/**
 * Manages bot services for an account, including listener handling
 */
export default class UserBotService {
  public handlers: Map<string, EventListener> = new Map()
  public agent: AtpAgent;

  constructor(private accounts: Account[]) {
    console.log("instance of user bot service created")
    this.agent = new AtpAgent({ service: "https://bsky.social" })
    this.initializeMapHandler()
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
        listeners.map((listener) => [listener.id, new EventListener(this.agent, listener.event, listener.action, listener.id, listener.account_id, listener.message)])
      )

      if (this.handlers.size != listeners.length) {
        throw new Error(`mapEventListener is missing handlers: ${this.handlers.size} != ${listeners.length}: ${this.handlers}`)
      }

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

      this.handlers.set(listener_id, new EventListener(this.agent, listener.event, listener.action, listener.id, account.id, listener.message))
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
        const userListeners = await this.getListenersOn(notification.event, listeners)

        // Sort the listeners array to ensure that "Follow" actions are processed first
        // This is necessary because "Follow" should happen before "Send A Message" for proper sequence
        userListeners.sort((a, b) => {
          if (a.action === "Follow" && b.action !== "Follow") return -1;
          if (a.action !== "Follow" && b.action === "Follow") return 1;
          return 0;
        });
        for (const listener of userListeners) {
          if (listener.isActive) {
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

  public async createOrResumeSession(account: Account): Promise<void> {
    try {
      if (!this.agent.sessionManager.hasSession || !account.session) {
        console.log("will login")
        const session = (await this.agent.login({
          identifier: account.did,
          password: account.appPassword,
        })).data;

        account.session = JSON.stringify(session)
        await account.save()
      }
      else if (account.at_session) {
        console.log("will resume")
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

  public async fetchAccountNotifications(account: Account): Promise<NotificationData[] | undefined> {
    try {
      const response = await this.agent.listNotifications();
      if (!response) {
        throw new Error("list notification response is undefined");
      }
      const newNotification = response.data.notifications.filter((notification) => new Date(notification.indexedAt) > new Date(account.seenNotificationAt))
      return newNotification.map((notification) => ({
        authorDid: notification.author.did,
        event: notification.reason,
        indexedAt: notification.indexedAt
      }));
    } catch (err) {
      console.error("Error while fetching Account Notifications in the userBotService: ", err);
      return undefined;
    }
  }
}
