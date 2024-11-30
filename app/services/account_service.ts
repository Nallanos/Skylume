import { AtpAgent } from '@atproto/api'
export default class AccountService {
    public async getAccountDid(handle: string, app_password: string) {
        const agent = new AtpAgent({
            service: 'https://bsky.social'
        })
        await agent.login({
            identifier: handle,
            password: app_password
        })
        return agent.did
    }
}
