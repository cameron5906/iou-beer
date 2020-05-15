import { WebClient } from '@slack/web-api';
import { SlackUser } from '../types/SlackUser';
import { SlackMessage } from '../types/SlackMessage';
import { SlackMessageEvent } from '../types/SlackMessageEvent';

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
     * Adds a reaction emoji to a message
     * @param {string} reaction The reaction emoji name 
     * @param {string} messageTs The timestamp of the message 
     * @param {string} channelId The channel ID 
     */
    async addReaction(reaction: string, messageTs: string, channelId: string) {
        await this.webClient.reactions.add({
            name: reaction,
            timestamp: messageTs,
            channel: channelId
        });
    }

    
    /**
     * Send a message to a channel
     * @param {string} channel The channel to send the message to 
     * @param {string} message The message to send 
     * @param {SlackMessageEvent} replyingTo Message that we are replying to
     */
    async sendMessageToChannel(channel: string, message: string, replyingTo: SlackMessageEvent) {
        //If replying to a specific message, check if it's in a thread first. If it is, use the replyToMessage function
        const messageDetails = await this.getMessage(replyingTo.ts, replyingTo.channel);
        if(messageDetails.thread_ts) {
            return this.replyToMessage(messageDetails.channel, messageDetails.thread_ts, message, null);
        }

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
    async sendEphemeralMessage(targetId: string, channelId: string, message: string, replyingTo: SlackMessageEvent) {
        const messageDetails = await this.getMessage(replyingTo.ts, replyingTo.channel);
        if(messageDetails.thread_ts) {
            return this.replyToMessage(messageDetails.channel, messageDetails.thread_ts, message, replyingTo.user);
        }

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

    /**
     * Replies to a message in a channel
     * @param {string} channel The ID of the channel containing the message 
     * @param {string} messageTs The timestamp identifier of the message 
     * @param {string} reply The reply text 
     */
    private async replyToMessage(channel: string, messageTs: string, reply: string, toUser: string | null) {
        if(toUser) {
            this.webClient.chat.postEphemeral({
                user: toUser,
                channel,
                text: reply,
                thread_ts: messageTs
            });
        } else {
            this.webClient.chat.postMessage({
                channel,
                text: reply,
                thread_ts: messageTs
            });
        }
    }
}

export default new SlackService;