import Account from "#models/account";
import User from "#models/user";
import UserBotService from "./user_bot_service.js";

class UsersBotServiceManager {
    public userbotServiceMap: Map<string, UserBotService> = new Map();

    /**
     * Start bot service for the given user.
     * @param user The user for which to start the bot service.
     * @throws Error if a service already exists for the user.
     */
    public async startUserBotService(user: User): Promise<void> {
        if (this.userbotServiceMap.has(user.id)) {
            throw new Error(`UserBotService already exists for user_id: ${user.id}`);
        }
        await this.initializeUserService(user.id);
    }

    /**
     * Start bot services for all users.
     * Initializes a bot service for each user in the system and stores it in the map.
     */
    public async initAllUsersBotService(): Promise<void> {
        try {
            const users = await User.all();
            await Promise.all(users.map((user) => this.initializeUserService(user.id)));
        } catch (error) {
            console.error("[ERROR] Failed to initialize all user bot services:", error);
        }
    }

    /**
     * Initialize a bot service for a single user.
     * @param user_id The ID of the user.
     */
    public async initOneUserBotService(user_id: string): Promise<void> {
        if (this.userbotServiceMap.has(user_id)) {
            console.log(`[INFO] Bot service already exists for user_id: ${user_id}`);
            return;
        }
        await this.initializeUserService(user_id);
    }

    /**
     * Helper function to initialize a bot service for a specific user ID.
     * @param user_id The ID of the user for which to initialize the bot service.
     */
    private async initializeUserService(user_id: string): Promise<void> {
        try {
            const accounts = await Account.findManyBy("userId", user_id);
            if (accounts.length === 0) {
                console.warn(`[WARN] No accounts found for user_id: ${user_id}`);
                return;
            }
            const userService = new UserBotService(accounts);
            this.userbotServiceMap.set(user_id, userService);
            await userService.initializeMapHandler();
        } catch (error) {
            console.error(`[ERROR] Failed to initialize bot service for user_id: ${user_id}`, error);
        }
    }
}

export default new UsersBotServiceManager();
