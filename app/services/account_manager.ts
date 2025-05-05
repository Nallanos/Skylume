import AccountService from "./account_service.js"
import { AtpAgent } from '@atproto/api'
import Account from '#models/account'

class Account_manager {
    public accountServiceMap: Map<string, AccountService> = new Map()

    public async getOrCreateAccountService(account: Account): Promise<AccountService> {
        if (!account) {
            console.error("Cannot create account service: Account is null or undefined");
            throw new Error("Account not found");
        }

        try {
            const existingService = this.accountServiceMap.get(account.handle)
            if (existingService) {
                return existingService
            }
            return await this.createAccountService(account)
        } catch (error) {
            console.error(`Failed to get or create account service for ${account?.handle || 'unknown account'}:`, error);
            throw error;
        }
    }

    public async createAccountService(account: Account): Promise<AccountService> {
        if (!account) {
            console.error("Cannot create account service: Account is null or undefined");
            throw new Error("Account not found");
        }

        try {
            const agent = new AtpAgent({ service: 'https://bsky.social' })
            const accountService = new AccountService(agent)
            await accountService.createOrResumeSession(account)
            this.accountServiceMap.set(account.handle, accountService)
            return accountService
        } catch (error) {
            console.error(`Error creating account service for ${account.handle}:`, error);
            throw error;
        }
    }

    public async initOneAccountService(account: Account): Promise<void> {
        if (!account) {
            console.error("Cannot initialize account service: Account is null or undefined");
            throw new Error("Account not found");
        }

        try {
            await this.createAccountService(account)
        } catch (error) {
            console.error(`Failed to initialize account service for ${account.handle}:`, error)
            throw error
        }
    }

    public async DeleteOneAccountService(accountHandle: string): Promise<void> {
        if (!accountHandle) {
            console.error("Cannot delete account service: Account handle is null or undefined");
            return;
        }

        if (this.accountServiceMap.has(accountHandle)) {
            this.accountServiceMap.delete(accountHandle)
        }
    }
}

export default new Account_manager()