import { Float } from "react-native/Libraries/Types/CodegenTypes";

export type UserEvent = {
    id: number;
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
    latitude: Float;
    longitude: Float;
};