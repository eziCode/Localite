import { useState } from "react";
import { Vibration } from "react-native";
import type { Group } from "../../types/group";
import { PublicUser } from "../../types/public_user";
import { supabase } from "../supabase";

type ActionType = "promote" | "demote" | "kick" | null;

export function useGroupMemberActions(
  groupId: string,
  group: { founder: string; leaders: string[]; members: string[] },
  setGroup: React.Dispatch<React.SetStateAction<Group>>
) {
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);

  const [showMemberOptions, setShowMemberOptions] = useState(false);
  const [memberOptionUser, setMemberOptionUser] = useState<PublicUser | null>(null);

  const openActionModal = (user: PublicUser, type: ActionType) => {
    setSelectedUser(user);
    setActionType(type);
    setShowActionModal(true);
    Vibration.vibrate(50);
  };

  const handleActionConfirm = async () => {
    if (!selectedUser || !actionType) return;
    if (actionType === "promote") {
      await makeMemberLeader(selectedUser.user_id);
    } else if (actionType === "demote") {
      await demoteLeaderToMember(selectedUser.user_id);
    } else if (actionType === "kick") {
      await kickGroupMember(selectedUser.user_id);
    }
    setShowActionModal(false);
    setSelectedUser(null);
    setActionType(null);
  };

  const handleMemberLongPress = (user: PublicUser) => {
    setMemberOptionUser(user);
    setShowMemberOptions(true);
    Vibration.vibrate(50);
  };

  const makeMemberLeader = async (userId: string) => {
    await supabase
      .from("groups")
      .update({ leaders: [...group.leaders, userId] })
      .eq("id", groupId);
    setGroup(prev => ({
      ...prev,
      leaders: [...(prev.leaders ?? []), userId],
      members: prev.members.filter(id => id !== userId),
    }));
  };

  const demoteLeaderToMember = async (userId: string) => {
    const newLeaders = (group.leaders ?? []).filter((id) => id !== userId);
    const newMembers = Array.from(new Set([...(group.members ?? []), userId, group.founder]));
    await supabase
      .from("groups")
      .update({ leaders: newLeaders, members: newMembers })
      .eq("id", groupId);
    setGroup(prev => ({
      ...prev,
      leaders: newLeaders,
      members: newMembers,
    }));
  };

  const kickGroupMember = async (userId: string) => {
    await supabase.rpc("kick_group_member_with_group_id_as_uuid", {
      member_to_remove: userId,
      group_to_edit: groupId,
    });
    setGroup(prev => ({
      ...prev,
      members: prev.members.filter(id => id !== userId),
    }));
  };

  return {
    showActionModal,
    setShowActionModal,
    selectedUser,
    setSelectedUser,
    actionType,
    setActionType,
    showMemberOptions,
    setShowMemberOptions,
    memberOptionUser,
    setMemberOptionUser,
    openActionModal,
    handleMemberLongPress,
    makeMemberLeader,
    demoteLeaderToMember,
    kickGroupMember,
    handleActionConfirm
  };
}