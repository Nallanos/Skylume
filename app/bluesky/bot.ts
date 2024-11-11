import type Account from "#models/account";
import { Agent } from "@atproto/api";

export class EventListener {
    constructor(private account: Account, private agent: Agent, private ws: WebSocket, private event: string, private action: string, private message?: string) {
        console.log("instance of event listener created")
        this.account = account
        this.agent = agent
    }

    /**
     * Activates event listening based on configured action
     */
    async on(): Promise<void> {
        console.log("starting bot with", this.action, this.event)
        if (this.event == "Follow") {
            if (this.action == "Send A Message" && this.message) {
                this.onFollowSendMessage(this.message)
            } else if (this.action == "Follow") {
                this.followBack()
            }
        }
    }

    /**
     * Sends a message when a follow event occurs
     */
    public async onFollowSendMessage(message: string): Promise<void> {
        console.log('ws open on message')
        this.ws.onmessage = (response) => {
            console.log(response.data, message)
        }
    }

    /**
     * Follows back a user who has followed
     */
    public async followBack(): Promise<void> {
        console.log('ws open on message')
        if (this.ws.onmessage) {
            this.ws.onmessage = (event) => {
                console.log('Message from server:', event.data);
            };
        }
    }

    /**
     * Removes all event listeners
     */
    public removeListener(): void {
        this.ws
    }
}
