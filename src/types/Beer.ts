import { Message } from "./Message";

export interface Beer {
    from_slack_id: string;
    to_slack_id: string;
    sent_at: number;
    message: Message;
}