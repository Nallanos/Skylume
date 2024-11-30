import Account from "#models/account";
import User from "#models/user";
import queue from "@rlanz/bull-queue/services/main";
import UserBotService from "./user_bot_service.js";

class UsersBotServiceManager {
    public userbotServiceMap: Map<number, UserBotService> = new Map();
    public queue = queue
    /**
     * Init alls jobs with for every users 
    */
    public async createAndStartListenersQueue() {
        await queue.clear()
        console.log("init user jobs", this.userbotServiceMap)
        this.userbotServiceMap.forEach(async (userBotService: UserBotService) => {
            await userBotService.createAJobForEachUserAccount(this.queue)
        })
        queue.process({ queueName: "listeners" })
    }

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
 * @param user 
 */
    public async startAllUsersBotService() {
        const users = await User.all();
        for (const user of users) {
            const accounts = await Account.findManyBy("userId", user.id);
            const userService = new UserBotService(accounts);
            this.userbotServiceMap.set(user.id, userService);
            await userService.initializeMapHandler();
        }
    }
}

export default new UsersBotServiceManager();
