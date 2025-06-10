export type JoinRequest = {
    id: number;
    created_at: string;
    from_id: string;
    group_id: string;
    to_id: string;
    status: "pending" | "accepted" | "rejected";
    message?: string;
};