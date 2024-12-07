import Account from "#models/account";
import User from "#models/user";
import UserBotService from "./user_bot_service.js";
class UsersBotServiceManager {
    public userbotServiceMap: Map<number, UserBotService> = new Map();
    /**
     * start bot service for the given user
     * @param user 
     */
    public async startUserBotService(user: User) {
        if (this.userbotServiceMap.has(user.id)) {
            throw new Error("UserBotService already exists for this user_id");
        }
        const accounts = await Account.findManyBy("userId", user.id);
        const userService = new UserBotService(accounts);
        this.userbotServiceMap.set(user.id, userService);

        await userService.initializeMapHandler();
    }

    /**
        * start bot service for all users
        * 
     */
    public async initAllUsersBotService() {
        const users = await User.all();
        for (const user of users) {
            const accounts = await Account.findManyBy("userId", user.id);
            const userService = new UserBotService(accounts);
            this.userbotServiceMap.set(user.id, userService);
        }
    }
    /**
        * init one bot service for one user
        * @param user_id 
     */
    public async initOneUserBotService(user_id: number) {
        const accounts = await Account.findManyBy("userId", user_id);
        const userService = new UserBotService(accounts);
        this.userbotServiceMap.set(user_id, userService);
    }
}

export default new UsersBotServiceManager();
