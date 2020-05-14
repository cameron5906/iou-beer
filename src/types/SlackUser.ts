export interface SlackUser {
    id: string;
    team_id: string;
    name: string;
    deleted: boolean;
    color: string;
    real_name: string;
    tz: string;
    tz_label: string;
    tz_offset: number;
    profile: {
        avatar_hash: string;
        status_text: string;
        status_emoji: string;
        real_name: string;
        display_name: string;
        real_name_normalized: string;
        display_name_normalized: string;
        email: string;
        image_original: string;
        team: string;
    };
    is_admin: boolean;
    is_owner: boolean;
    is_primary_owner: boolean;
    is_restricted: boolean;
    is_ultra_restricted: boolean;
    is_bot: boolean;
    updated: number;
    is_app_user: boolean;
}