import Account from "#models/account";
import type User from "#models/user";
import UserBotService from "./user_bot_service.js";

class UsersBotServiceManager {
    public userbotServiceMap: Map<number, UserBotService> = new Map()

    constructor() {
        console.log("instance user bot service manager created")
    }

    public async startUserBotService(user: User) {
        if (this.userbotServiceMap.get(user.id) != undefined) {
            throw new Error("You tried to create a new UserBotService but one is already mapped with the given user_id")
        }
        const ws = new WebSocket("wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos")

        const accounts = await Account.findManyBy("userId", user.id)
        this.userbotServiceMap.set(user.id, new UserBotService(user, ws, accounts))
        const user_service = this.userbotServiceMap.get(user.id)
        if (user_service == undefined) {
            throw Error(`can't find userbotservice in the userbotservicemap with ${user.id}`)
        }
        await user_service?.initializeMapHandler()
    }
}

export default new UsersBotServiceManager()