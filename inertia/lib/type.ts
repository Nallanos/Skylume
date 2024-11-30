export type Account = {
    appPassword: string;
    user_id: number;
    handle: string;
    did: string;
    id: string,
    bots: Bot[]
}

export type EventType = "mention" | "follow" | "reply"


export type BotPayload = {
    handle: string;
    event: string;
    action: string
}

export type Bot = {
    accountId: string;
    action: string;
    event: string;
    id: number;
    message: null | string;
    waitTime: number
}