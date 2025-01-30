import type { MessagePayload } from "./types.js";

export async function getConvoFromMembers(
    members: Array<string>,
    authToken: string
) {
    try {
        const params = new URLSearchParams();
        members.forEach(member => params.append('members', member));
        const url = `https://api.bsky.chat/xrpc/chat.bsky.convo.getConvoForMembers?${params.toString()}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json",
                "atproto-Proxy": "did:web:api.bsky.chat"
            }
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Erreur HTTP ! Statut : ${response.status}, error : ${JSON.stringify(data)}`);
        }
        return data.convo;
    } catch (error) {
        console.error("Échec de la récupération de la conversation à partir des membres", error);
    }
}

export async function sendMessageToConvo(payload: MessagePayload, chatToken: string) {
    try {
        const url = `https://api.bsky.chat/xrpc/chat.bsky.convo.sendMessage`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${chatToken}`,
                "Content-Type": "application/json",
                "atproto-Proxy": "did:web:api.bsky.chat"
            },
            body: JSON.stringify({
                convoId: payload.convoId,
                message: payload.message
            })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Erreur HTTP ! Statut : ${response.status}, error : ${JSON.stringify(data)}`);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}