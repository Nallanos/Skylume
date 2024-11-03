import Account from '#models/account'
import { AtpAgent  } from '@atproto/api'
export default class AccountService {
    public async getAccountDid(handle: string, app_password: string){
        const agent = new AtpAgent ({
            service: 'https://bsky.social'
        })
        console.log(handle, app_password)
        await agent.login({
            identifier: handle,
            password: app_password
        })
        return agent.did
    } 
    public async loginToBluesky(account_id: string){
        const agent = new AtpAgent ({
            service: 'https://bsky.social'
        })
        const account = await Account.find(account_id)
        if(account){
            await agent.login({
                identifier: account.did,
                password: account.app_password
            })
        }
        return agent.session?.accessJwt
    } 
  }
  