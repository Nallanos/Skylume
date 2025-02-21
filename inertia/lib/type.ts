import Account from "#models/account";
import Convo from "#models/convo";
import User from "#models/user";

export type EventType = "mention" | "follow" | "reply" | 'like'

export type BotPayload = {
    handle: string;
    event: string;
    action: string
}

export type Listener = {
    id: string
    accountId: string
    event: string
    user_id: number
    handler: string
    wait_time: number
    message: string
    action: string
    numberOfMessageSent: number
    numberOfMessageReceived: number
    isActive: boolean
    stateSendToAll: boolean | undefined
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