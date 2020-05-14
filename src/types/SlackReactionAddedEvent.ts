export interface SlackReactionAddedEvent {
    reaction: string;
    item_user: string;
    item: {
        type: string;
        channel: string;
        ts: string;
    }
}