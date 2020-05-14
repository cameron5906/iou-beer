import { WebClient } from '@slack/web-api';
import { SlackUser } from '../types/SlackUser';
import { SlackMessage } from '../types/SlackMessage';

const { SLACK_TOKEN } = process.env;

class SlackService {
    webClient: WebClient;
    
    constructor() {
        this.webClient = new WebClient(SLACK_TOKEN);
    }

    /**
     * Get a single {@link SlackUser}
     * @param {string} id The Slack user ID 
     */
    async getUser(id: string): Promise<SlackUser> {
        const response = await this.webClient.users.info({ user: id });
    
        if(response.ok) {
            return response.user as SlackUser;
        } else {
            throw response.error;
        }
    }

    /**
     * Retrieve the entire user directory from Slack
     */
    async getAllUsers(): Promise<SlackUser[]> {
        const response = await this.webClient.users.list();

        if(response.ok) {
            return response.members as SlackUser[];
        } else {
            throw response.error;
        }
    }

    /**
     * Send a message to a channel
     * @param {string} channel The channel to send the message to 
     * @param {string} message The message to send 
     */
    async sendMessageToChannel(channel: string, message: string) {
        this.webClient.chat.postMessage({
            channel,
            text: message,
            username: 'IOU Beer Bot'
        });
    }

    /**
     * Send a message privately to a user
     * @param {string} targetId The user to send the message to 
     * @param {string} message The message to send 
     */
    async sendIM(targetId: string, message: string) {
        this.webClient.chat.postMessage({
            channel: targetId,
            text: message,
            username: 'IOU Beer Bot'
        });
    }

    /**
     * Sends a temporary message to a channel or IM
     * @param {string} targetId The user that should see the message 
     * @param {string} channelId The channel to send to 
     * @param {string} message The message to send 
     */
    async sendEphemeralMessage(targetId: string, channelId: string, message: string) {
        this.webClient.chat.postEphemeral({
            channel: channelId,
            attachments: [],
            text: message,
            user: targetId,
            as_user: true
        });
    }

    /**
     * Retrieves a single {@link SlackMessage}
     * @param {string} messageTs The message timestamp 
     * @param {string} conversationId The channel or conversation the message is in 
     */
    async getMessage(messageTs: string, conversationId: string): Promise<SlackMessage> {
        const response = await this.webClient.conversations.history({
            channel: conversationId,
            latest: messageTs,
            limit: 1,
            inclusive: true
        });

        if(response.ok) {
            return { ...(response.messages as SlackMessage[])[0], channel: conversationId }; //Include the channel id, which does not come back from the API
        } else {

            throw response.error;
        }
    }
}

export default new SlackService;