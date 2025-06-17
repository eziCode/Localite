export type UserEvent = {
    id: string;
    created_at: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    organizer_id: string;
    group_id: number;
    event_invite_code: string;
    post_only_to_group: boolean;
    location_name: string;
    latitude: number;
    longitude: number;
};