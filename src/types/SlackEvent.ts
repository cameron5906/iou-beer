export interface SlackEvent {
    type: string;
    user: string;
    ts: string;
    team: string;
    event_ts: string;
}