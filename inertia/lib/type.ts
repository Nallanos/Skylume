import Account from "#models/account";
import Convo from "#models/convo";
import User from "#models/user";

export type EventType = "mention" | "follow" | "reply" | 'like'

export type BotPayload = {
    handle: string;
    event: string;
    action: string
}


export type MetricData = {

}

export type DmCampaign = {
    id: number
    name: string
    message: string
    accountHandle: string
    strategy: string
    user_id: string
    numberOfMessageSent: number
    numberOfMessageReceived: number
    status: boolean
    keywords: string
    followersCursor: string | undefined
    convos: Convo[]
    account: Account[]
    user: User[]
}