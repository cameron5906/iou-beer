export interface Message {
    user_slack_id: string;
    text: string;
    channel: string;
    sent_at: number;
}