import Account from "#models/account";
import Listener from "#models/listener";
import { Bot } from "@skyware/bot";
import type { AtpSessionData } from "@atcute/client"
import { EventStrategy } from "@skyware/bot";
type FollowEvent = Event<"follow">

interface EventHandler<E extends Event<string>> {
    createOrResumeSession(account: Account): Promise<void>
    on(): void
    off(): void
}

type Event<T extends string> = {
    type: T
    wait_time: number
}

class Handler implements EventHandler<FollowEvent> {
    private bot: Bot;
    private account: Account;
    private wait_time: number;
    private event: string;
    private action: string;
    private message: string | undefined;
    constructor(wait_time: number, account: Account, event: string, action: string, message?: string) {
        console.log("instance created")
        this.bot = new Bot({ eventEmitterOptions: { strategy: EventStrategy.Jetstream } })
        console.log(this.bot)
        this.account = account
        this.wait_time = wait_time
        this.event = event
        this.action = action
        this.message = message
    }

    public async createOrResumeSession() {
        try {
            let session = this.account.at_session
            if (session) {
                const resumeSessionPayLoad: AtpSessionData = {
                    handle: this.account.bksy_social,
                    active: true,
                    accessJwt: session?.accessJwt,
                    did: session.did,
                    refreshJwt: session.refreshJwt
                }
                console.log("resuming session with", session)
                await this.bot.resumeSession(resumeSessionPayLoad)
            } else {
                console.log("creating session with", this.bot, session)
                session = await this.bot.login({ identifier: this.account.did, password: this.account.app_password }) as AtpSessionData
                if (session) {
                    this.account.session = JSON.stringify(session)
                    await this.account.save()
                }
            }
        } catch (err) {
            console.log(err)
        }
    }

    async on() {
        try {
            await this.createOrResumeSession()
            const message = this.message
            if (this.bot) {
                if (this.action === "Send a Message" && message) {
                    console.log('registering')
                    this.bot.on("follow", (reply) => {
                        setTimeout(async () => {
                            console.log("sending message")
                            await reply.user.sendMessage({ text: message })
                        }, 30 * 1000)
                    })
                } else if (this.action === "Follow") {
                    console.log("tout fonctionne")
                    this.bot.on("follow", (reply) => {
                        console.log("following")
                        setTimeout(async () => {
                            await reply.user.follow()
                        }, 25 * 1000)
                    })
                }
            }
        } catch (err) {
            console.log("catching error", err)
        }
    }

    off(): void {
        if (this.bot) {
            // this.bot.removeAllListeners()
        }
    }
}

export default class Account_bot_service {
    private listeners: Map<string, Handler>;
    private account_id: string;
    constructor(account_id: string) {
        this.account_id = account_id
        this.listeners = new Map()
    }
    public async initializeMapHandler() {
        try {
            const listeners = await this.getListeners(this.account_id)
            const account = await Account.find(this.account_id)
            let mappedListeners: Map<string, Handler> = new Map()
            if (account && listeners) {
                for (const listener of listeners) {
                    const handler = new Handler(listener.wait_time, account, listener.event, listener.action, listener.message)
                    mappedListeners.set(listener.id, handler)
                }
            }
            this.listeners = mappedListeners
        } catch (err) {
            console.log(err)
        }
    }

    public async removeHandlerFromMap(listener_id: string) {
        try {
            let mappedListeners: Map<string, Handler> = this.listeners
            mappedListeners.delete(listener_id)
            this.listeners = mappedListeners
        }
        catch (err) {
            console.log(err)
        }
    }


    public async addHandlerToMap(listener_id: string) {
        try {
            const listener = await Listener.find(listener_id)
            const account = await Account.find(listener?.account_id)
            if (listener && account) {
                let mappedListeners: Map<string, Handler> = this.listeners
                mappedListeners.set(listener_id, new Handler(listener.wait_time, account, listener.event, listener.action, listener.message))
                this.listeners = mappedListeners
            } else {
                console.log("listener not found in addHandlerFromMap in the account_bot_service")
            }
        } catch (err) {
            console.log(err)
        }
    }


    public async startAllListener() {
        try {
            const listeners = await this.getListeners(this.account_id)
            if (listeners) {
                for (const listener of listeners) {
                    this.start(listener.id)
                }
            }
        } catch (err) {
            console.log(err)
        }
    }

    public async getListeners(account_id: string) {
        try {
            const listeners = await Listener.findManyBy("account_id", account_id)
            if (listeners) {
                return listeners;
            }
            return []
        } catch (err) {
            console.log(err)
        }
    }

    public stop(listener_id: string) {
        try {
            this.removeHandlerFromMap(listener_id)
            let bot = this.listeners.get(listener_id)
            if (bot) {
                bot.off()
            }
        } catch (err) {
            console.log(err)
        }
    }

    public async start(listener_id: string) {
        try {
            await this.addHandlerToMap(listener_id)
            const bot = this.listeners.get(listener_id)
            if (bot) {
                console.log("starting bot")
                await bot.on()
            }
        } catch (err) {
            console.log(err)
        }
    }
}