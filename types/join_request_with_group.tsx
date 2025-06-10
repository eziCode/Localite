import { JoinRequest } from "./join_request";

export type JoinRequestWithGroup = JoinRequest & {
  group: {
    name: string;
  };
};