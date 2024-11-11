import Account from '#models/account'
import Listener from '#models/listener'
import { type AtpSessionData, AtpAgent, } from '@atproto/api'
import { EventListener } from './bot.js'
import User from '#models/user'
/**
 * Manages bot services for an account, including listener handling
 */
export default class UserBotService {
  private handlers: Map<string, EventListener> = new Map()
  private mapUserWS: Map<number, WebSocket> = new Map()
  private agent: AtpAgent;

  constructor(private user: User, private ws: WebSocket, private accounts: Account[]) {
    console.log("instance of user bot service")
    this.agent = new AtpAgent({ service: "https://bsky.social" })
    this.mapUserWS.set(this.user.id, this.ws)
    this.initializeMapHandler()
  }


  /**
   * Initializes map handlers for all listeners associated with the account
   */
  public async initializeMapHandler(): Promise<void> {
    try {
      const listeners = await this.getListeners()
      if (this.ws === undefined) {
        throw new Error("ws connection is undefined")
      }
      if (listeners === undefined) {
        throw new Error("listeners connection is undefined")
      }
      this.handlers = new Map(
        listeners.map((listener) => [listener.id, new EventListener(listener.account, this.agent, this.ws, listener.event, listener.action, listener.message)])
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

      this.handlers.set(listener_id, new EventListener(account, this.agent, this.ws, listener.event, listener.action, listener.message))
    } catch (err) {
      console.error('Handler addition failed:', err)
    }
  }

  /**
   * Starts all listeners for the account
   */
  public async startAllListeners(): Promise<void> {
    try {
      const listeners = await this.getListeners()
      await Promise.all(listeners.map((listener) => this.start(listener.id)))
    } catch (err) {
      console.error('Starting all listeners failed:', err)
    }
  }

  /**
   * Retrieves all listeners for an user in the database
   */
  public async getListeners(): Promise<Listener[]> {
    try {
      let listener: Listener[] = []
      if (this.accounts) {
        for (const account of this.accounts) {
          listener = [...listener, ...(await Listener.findManyBy('account_id', account.id) || [])];
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
  public async start(listener_id: string): Promise<void> {
    try {
      let bot = this.handlers.get(listener_id)
      if (bot === undefined) {
        await this.initializeMapHandler()
        bot = this.handlers.get(listener_id)
        if (bot === undefined) {
          throw new Error(`can't find mapped bot in handlermap with ${listener_id} as listener_id`)
        }
      }
      await bot.on()
    } catch (err) {
      console.error('Starting listener failed:', err)
    }
  }

  private async createOrResumeSession(account: Account): Promise<void> {
    try {
      if (account.at_session) {
        await this.agent.resumeSession({
          accessJwt: account.at_session.accessJwt,
          refreshJwt: account.at_session.refreshJwt,
          handle: account.bksy_social,
          did: account.did,
        } as AtpSessionData)
        return
      }
      const session = (await this.agent.login({ identifier: account.did, password: account.app_password })).data
      account.session = JSON.stringify(session)
    } catch (err) {
      console.error("error while creating or resuming the session in the userBotService: ", err)
    }
  }
}
