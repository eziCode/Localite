export type Group = {
  id: number;
  created_at: string;
  name: string;
  description?: string;
  join_code?: string;
  creator_id: string;
  members: string[];
  vibes?: string[];
  visibility?: "open" | "request" | "hidden";
  founder: string;
  leaders?: string[];
};