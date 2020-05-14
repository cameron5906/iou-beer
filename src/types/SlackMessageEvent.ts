import { SlackEvent } from "./SlackEvent";

export interface SlackMessageEvent extends SlackEvent {
    text: string;
    channel: string;
    channel_type: string;
}