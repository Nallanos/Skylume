import Account from '#models/account'
import Listener from '#models/listener'
import { EventHandler } from './event_handler.js'

/**
 * Manages bot services for an account, including listener handling
 */
export default class AccountBotService {
  private handlers: Map<string, EventHandler> = new Map()

  constructor(private account: Account) {}

  /**
   * Initializes handlers for all listeners associated with the account
   */
  public async initializeMapHandler(): Promise<void> {
    try {
      const listeners = await this.getListeners()

      this.handlers = new Map(
        listeners.map((listener) => [listener.id, new EventHandler(this.account, listener)])
      )
    } catch (err) {
      console.error('Handler initialization failed:', err)
    }
  }

  /**
   * Removes a handler from the managed listeners
   */
  public async removeHandlerFromMap(listener_id: string): Promise<void> {
    try {
      this.handlers.delete(listener_id)
    } catch (err) {
      console.error('Handler removal failed:', err)
    }
  }

  /**
   * Adds a new handler to the managed listeners
   */
  public async addHandlerToMap(listener_id: string): Promise<void> {
    try {
      const listener = await Listener.find(listener_id)
      const account = await Account.find(listener?.account_id)

      if (!listener || !account) {
        console.error('Listener or account not found')
        return
      }

      this.handlers.set(listener_id, new EventHandler(this.account, listener))
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
   * Retrieves all listeners for an account
   */
  public async getListeners(): Promise<Listener[]> {
    try {
      return (await Listener.findManyBy('account_id', this.account.id)) || []
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
      if (bot) {
        bot.off()
        this.removeHandlerFromMap(listener_id)
      }
    } catch (err) {
      console.error('Stopping listener failed:', err)
    }
  }

  /**
   * Starts a specific listener
   */
  public async start(listener_id: string): Promise<void> {
    try {
      await this.addHandlerToMap(listener_id)
      const bot = this.handlers.get(listener_id)
      if (bot) {
        await bot.on()
      }
    } catch (err) {
      console.error('Starting listener failed:', err)
    }
  }
}
