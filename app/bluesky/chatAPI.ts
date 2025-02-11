import type { ConvoView } from "@atproto/api/dist/client/types/chat/bsky/convo/defs.js";
import type { MessagePayload } from "./types.js";




export async function getMessages(
    convoId: string,
    authToken: string,
    limit: number = 50,
    cursor?: string
): Promise<{ messages: unknown[]; cursor?: string } | undefined> {
    try {
        const params = new URLSearchParams();
        params.append('convoId', convoId);

        // Validation de la limite
        const processedLimit = Math.min(Math.max(limit, 1), 100);
        params.append('limit', processedLimit.toString());

        if (cursor) {
            params.append('cursor', cursor);
        }

        const url = `https://api.bsky.chat/xrpc/chat.bsky.convo.getMessages?${params.toString()}`;
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
            throw new Error(`HTTP error! Status: ${response.status}, error: ${JSON.stringify(data)}`);
        }

        return data.messages
    } catch (error) {
        console.error("Échec de la récupération des messages de la conversation", error);
        return undefined;
    }
}


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