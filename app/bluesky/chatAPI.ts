import type { MessagePayload } from "./types.js";
import type { At } from "@atcute/client/lexicons"
import type { RateLimitedAgent } from "@skyware/bot";
export async function getConvoFromMembers(
    members: Array<string>,
    chatProxy: RateLimitedAgent
) {
    try {
        const response = await chatProxy.get("chat.bsky.convo.getConvoForMembers", {
            params: { members: members as Array<At.DID> },
        })
        return response.data.convo;
    } catch (error) {
        console.error("failed to get convo from members", error);
    }
}

export async function sendMessageToConvo(payload: MessagePayload, chatProxy: RateLimitedAgent) {
    try {
        await chatProxy.call("chat.bsky.convo.sendMessage", { data: { convoId: payload.convoId, message: { text: payload.message.text } } })
        console.log("message sent !")
    } catch (error) {
        console.error("Error:", error);
    }
}