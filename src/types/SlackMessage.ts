export interface SlackMessage {
    type: string;
    user: string;
    channel: string;
    text: string;
    attachments: {
        service_name: string;
        text: string;
        fallback: string;
        thumb_url: string;
        thumb_width: number;
        thumb_height: number;
        id: number;
    }[];
    ts: string;
}