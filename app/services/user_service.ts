import User from "#models/user";
import Account from "#models/account";

export default class User_Service {
    public webSocketUserMap: Map<number, WebSocket> = new Map()

    /**
     * create a map with user.id ad key and a websocket connection as value. 
     */
    public async initializeWebSocketUserMap(user: User) {
        try {
            const accounts = await Account.query().where('user_id', user.id);
            for (const account of accounts) {
                if (account.listeners && this.webSocketUserMap.get(user.id)) {
                    return
                }
                const ws = new WebSocket("wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos")
                this.webSocketUserMap.set(user.id, ws)
                return
            }
        } catch (err) {
            console.error("error while initializing websocket user map", err)
        }
    }

    public async startApp() {
        
    }
}