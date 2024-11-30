export type EventType = "mention" | "follow" | "reply"

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
}
