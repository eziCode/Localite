import { uploadUserInteraction } from "@/lib/helper_functions/uploadUserInteraction";
import { PublicUser } from "@/types/public_user";
import { format } from "date-fns";
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import type { Group } from "../../../types/group";
import { UserEvent } from "../../../types/user_event";
import PostEventModal from "../../modals/post_event";

export default function OwnGroupsView() {
  const router = useRouter();
  const { group: groupStr, user: userStr } = useLocalSearchParams();
  const [group, setGroup] = useState<Group>(JSON.parse(groupStr as string));
  const user: import("@supabase/supabase-js").User = JSON.parse(userStr as string);
  const [userInfos, setUserInfos] = useState<PublicUser[]>([]);
  const [showPostEventModal, setShowPostEventModal] = useState(false);
  const [events, setEvents] = useState<UserEvent[]>([]);

  const [joinCode, setJoinCode] = useState<string>(group.join_code || "");

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [actionType, setActionType] = useState<"promote" | "demote" | "kick" | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const founder = group.founder;
  const leaders = React.useMemo(() => group.leaders ?? [], [group.leaders]);
  const members = group.members.filter((m) => m !== founder && !leaders.includes(m));
  const [leadersCount, setLeaderCount] = useState<number>(leaders.length);
  const [membersCount, setMemberCount] = useState<number>(members.length);
  const leaderToFetchCount = leadersCount && leadersCount > 5 ? 5 : leadersCount;
  const memberToFetchCount = membersCount > 5 ? 5 : membersCount;

  const [showMemberOptions, setShowMemberOptions] = useState(false);
  const [memberOptionUser, setMemberOptionUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    const idsToFetch = [founder, ...leaders.slice(0, leaderToFetchCount), ...members.slice(0, memberToFetchCount)];
    const fetchMemberData = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("user_id", idsToFetch);

      if (error) console.error("Error fetching member data:", error);
      else setUserInfos(data);
    };

    const fetchEvents = async () => {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("group_id", group.id)
        
        if (error) console.error("Error fetching event data:", error);
        else setEvents(data);
    };

    fetchEvents();
    fetchMemberData();
  }, [founder, group.id, group.members, leaderToFetchCount, leaders, memberToFetchCount, members]);

  let founderUser = userInfos.find((u) => u.user_id === founder);
  let leadersUserInfos = userInfos.filter((u) => leaders.includes(u.user_id));
  let membersUserInfos = userInfos.filter((u) => members.includes(u.user_id));

  const eventsByDate = events.reduce<Record<string, UserEvent[]>>((acc, event) => {
      if (event && event.start_time) {
        const date = format(new Date(event.start_time), "yyyy-MM-dd");
        if (!acc[date]) acc[date] = [];
        acc[date].push(event);
      }
      return acc;
    }, {});

  const makeMemberLeader = async (userId: string) => {
    const { error } = await supabase
      .from("groups")
      .update({
        leaders: [...leaders, userId],
      })
      .eq("id", group.id);
    
    if (error) {
      console.error("Error making member a leader:", error);
    }
    else {
      // Update local state to reflect the change
      const newLeader = userInfos.find((u) => u.user_id === userId);
      if (newLeader) {
        setGroup((prev) => ({
          ...prev,
          leaders: [...(prev.leaders ?? []), userId],
        }));
        const currentLeaderCount = leadersCount
        const currentMemberCount = membersCount
        setLeaderCount(currentLeaderCount + 1);
        setMemberCount(currentMemberCount - 1);
      }
    }
  };

  const demoteLeaderToMember = async (userId: string) => {
    const newLeaders = (group.leaders ?? []).filter((id) => id !== userId);
    // Ensure founder is always included in members array
    const newMembers = Array.from(new Set([...group.members, userId, founder]));
    const { error } = await supabase
      .from("groups")
      .update({
        leaders: newLeaders,
        members: newMembers,
      })
      .eq("id", group.id);
    if (error) {
      console.error("Error demoting leader to member:", error);
    } else {
      setGroup((prev) => ({
        ...prev,
        leaders: newLeaders,
        members: newMembers,
      }));
      setLeaderCount(leadersCount - 1);
      setMemberCount(membersCount + 1);
    }
  };

  const kickGroupMember = async (userId: string) => {
    const { error } = await supabase.rpc(
      "kick_group_member_with_group_id_as_uuid", 
      { member_to_remove: userId, group_to_edit: group.id }
    );
    if (error) {
      console.error("Error kicking member:", error);
    }
    else {
      // Update local state to reflect the change
      setGroup((prev) => ({
        ...prev,
        members: prev.members.filter((id) => id !== userId),
      }));
      setMemberCount(membersCount - 1);
    }
  };

  const openActionModal = (user: PublicUser, type: "promote" | "demote" | "kick") => {
    setSelectedUser(user);
    setActionType(type);
    setShowActionModal(true);
    Vibration.vibrate(50); // slight buzz
  };

  const leaveGroup = async (userId: string) => {
    const { error } = await supabase.rpc(
      "leave_group_w_group_id_as_uuid", 
      { user_id: userId, group_id: group.id }
    );
    if (error) {
      console.error("Error leaving group:", error);
    } else {
      router.back();
    }
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

  const pushJoinCodeToGroupTable = async (joinCode: string) => {
    const { error } = await supabase
      .from("groups")
      .update({ join_code: joinCode, join_code_creation_time: new Date() })
      .eq("id", group.id);

    if (error) {
      console.error("Error updating join code:", error);
    }
  };
  // Text box displaying current join code
  // If box is empty (no join code to be fetched), display button to generate a new join code
  // If join code is present, display text box with join code and button to copy it (maybe add a button to share to other platforms)
  // Only show the join code if the user is the founder or a leader of the group

// Helper to check if current user is founder or leader
const canPromoteDemote = user.id === founder || leaders.includes(user.id);

  return (
    <>
    <SafeAreaView style={styles.container}>
       <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </View>

      <Text style={styles.groupTitle}>{group.name}</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
        {founder && founderUser && (
          <View style={styles.founderContainer}>
            <TouchableOpacity
              style={styles.memberRow}
              disabled={founderUser.user_id === user.id}
              onPress={() => {
                if (founderUser.user_id !== user.id) {
                  router.push({
                    pathname: "/tabs/groups/inspect_user",
                    params: { userToInspectId: founderUser.user_id },
                  });
                  uploadUserInteraction(user.id, founderUser.user_id, "viewed_user_profile", "user");
                }
              }}
            >
              {founderUser.profile_picture_url ? (
                <Image
                  source={{ uri: founderUser.profile_picture_url }}
                  style={styles.avatarCircle}
                />
              ) : (
                <View style={styles.avatarCircle} />
              )}
              <Text style={styles.memberName}>{founderUser.user_name}</Text>
              <Text style={styles.badge}>Founder 👑</Text>
            </TouchableOpacity>
          </View>
        )}

        {leadersCount > 0 && (
          <>
            <View style={styles.sectionWithArrow}>
              <Text style={styles.sectionHeader}>Leaders</Text>
              {leadersCount > 5 && (
                <TouchableOpacity onPress={() => {router.push({
                  pathname: "/tabs/groups/group_people_list",
                  params: { groupId: group.id, whoToFetch: "leaders", userDoingInspection: user.id },
                })}} style={styles.moreArrow}>
                  <Text style={{ fontSize: 25, color: "#7c3aed" }}>›</Text>
                </TouchableOpacity>
              )}
            </View>
            {leadersUserInfos.slice(0, 5).map((leader) => (
              <TouchableOpacity
                key={leader.id}
                style={styles.memberRow}
                disabled={leader.user_id === user.id}
                onPress={() => {
                  if (leader.user_id !== user.id) {
                    router.push({
                      pathname: "/tabs/groups/inspect_user",
                      params: {
                        userToInspectId: leader.user_id 
                      },
                    });
                    uploadUserInteraction(user.id, leader.user_id, "viewed_user_profile", "user");
                  }
                }}
                onLongPress={
                  canPromoteDemote && leader.user_id !== user.id
                    ? () => openActionModal(leader, "demote")
                    : undefined
                }
              >
                {leader.profile_picture_url ? (
                  <Image
                    source={{ uri: leader.profile_picture_url }}
                    style={styles.avatarCircle}
                  />
                ) : (
                  <View style={styles.avatarCircle} />
                )}
                <Text style={styles.memberName}>{leader.user_name}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {membersCount > 0 && (
          <>
            <View style={styles.sectionWithArrow}>
              <Text style={styles.sectionHeader}>Members</Text>
              {membersCount > 5 && (
                <TouchableOpacity onPress={() => {router.push({
                  pathname: "/tabs/groups/group_people_list",
                  params: { groupId: group.id, whoToFetch: "members", userDoingInspection: user.id },
                })}} style={styles.moreArrow}>
                  <Text style={{ fontSize: 25, color: "#7c3aed" }}>›</Text>
                </TouchableOpacity>
              )}
            </View>
            {membersUserInfos.slice(0, 5).map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberRow}
                disabled={member.user_id === user.id}
                onPress={() => {
                  if (member.user_id !== user.id) {
                    router.push({
                      pathname: "/tabs/groups/inspect_user",
                      params: { userToInspectId: member.user_id },
                    });
                    uploadUserInteraction(user.id, member.user_id, "viewed_user_profile", "user");
                  }
                }}
                onLongPress={
                  canPromoteDemote
                    ? () => {
                        if (user.id === founder && member.user_id !== founder) {
                          setMemberOptionUser(member);
                          setShowMemberOptions(true);
                        } else {
                          openActionModal(member, "promote");
                        }
                      }
                    : undefined
                }
              >
                {member.profile_picture_url ? (
                  <Image
                    source={{ uri: member.profile_picture_url }}
                    style={styles.avatarCircle}
                  />
                ) : (
                  <View style={styles.avatarCircle} />
                )}
                <Text style={styles.memberName}>{member.user_name}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {(user.id === founder || leaders.includes(user.id)) && (
          <View style={{ marginTop: 24, marginBottom: 24, backgroundColor: "#f3f0ff", borderRadius: 10, padding: 16 }}>
            <Text style={{ fontWeight: "600", color: "#6b21a8", marginBottom: 8 }}>Group Join Code</Text>
            {joinCode ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#e5e7eb" }}>
                  <Text selectable style={{ fontSize: 16, letterSpacing: 1 }}>{joinCode}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => Clipboard.setStringAsync(joinCode)}
                  style={{ marginLeft: 12, padding: 8, backgroundColor: "#7c3aed", borderRadius: 8 }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Copy</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={async () => {
                  // Generate a new join code (simple example: random 6 chars)
                  const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                  setJoinCode(newCode);
                  await pushJoinCodeToGroupTable(newCode);
                }}
                style={{ backgroundColor: "#7c3aed", borderRadius: 8, padding: 12, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Generate Join Code</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {(user.id === founder || leaders.includes(user.id)) && (
          <TouchableOpacity onPress={() => setShowPostEventModal(true)} style={styles.postButton}>
              <Text style={styles.postButtonText}>+ Post Event</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => {
            leaveGroup(user.id);
          }}
        >
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>

        <View style={styles.eventsContainer}>
          <Text style={styles.sectionHeader}>Upcoming Events</Text>
          
          <Calendar
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: "#7c3aed" },
                ...Object.keys(eventsByDate).reduce((acc, date) => {
                  acc[date] = { marked: true };
                  return acc;
                }, {} as Record<string, any>),
              }}
              theme={{
                selectedDayBackgroundColor: "#7c3aed",
                todayTextColor: "#7c3aed",
              }}
              style={{ borderRadius: 10, marginBottom: 16 }}
            />
            <Text style={{ color: "#888", fontSize: 13, textAlign: "center", marginBottom: 8 }}>
              All times are shown in your local time zone.
            </Text>

          {eventsByDate[selectedDate]?.length ? (
            eventsByDate[selectedDate]
              .slice()
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => {
                    router.push({
                      pathname: "/(shared)/inspect_event",
                      params: {
                        event: JSON.stringify(event),
                        user: JSON.stringify(user),
                      },
                    });
                    uploadUserInteraction(user.id, event.id, "viewed_event", "event");
                  }}
                >
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    {new Date(event.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" – "}
                    {new Date(event.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {event.location_name && (
                    <Text style={styles.eventLocation}>{event.location_name}</Text>
                  )}
                </TouchableOpacity>
              ))
          ) : (
            <Text style={styles.placeholderText}>No events on this day.</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>

    <Modal
        animationType="slide"
        visible={showPostEventModal}
        onRequestClose={() => setShowPostEventModal(false)}
        presentationStyle="pageSheet"
      >
        <PostEventModal
          onClose={() => setShowPostEventModal(false)}
          user={user}
          current_group={group}
        />
      </Modal>
    <Modal
      visible={showActionModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowActionModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {actionType === "promote"
              ? `Promote ${selectedUser?.user_name} to Leader?`
              : actionType === "demote"
              ? `Demote ${selectedUser?.user_name} to Member?`
              : actionType === "kick"
              ? `Kick ${selectedUser?.user_name} from the group?`
              : ""}
          </Text>
          <Text style={styles.modalSubtext}>
            {actionType === "kick"
              ? "This member will be removed from the group immediately."
              : "This change will take effect immediately."}
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 0, marginRight: 10, width: "48%" }]}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { width: "48%" },
                actionType === "promote"
                  ? styles.promoteColor
                  : actionType === "demote"
                  ? styles.demoteColor
                  : actionType === "kick"
                  ? { backgroundColor: "#f43f5e" }
                  : {},
              ]}
              onPress={handleActionConfirm}
            >
              <Text style={styles.confirmButtonText}>
                {actionType === "promote"
                  ? "Promote"
                  : actionType === "demote"
                  ? "Demote"
                  : actionType === "kick"
                  ? "Kick"
                  : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    <Modal
      visible={showMemberOptions}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMemberOptions(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            What would you like to do with {memberOptionUser?.user_name}?
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.promoteColor, { marginRight: 8 }]}
              onPress={() => {
                setShowMemberOptions(false);
                if (memberOptionUser) {
                  openActionModal(memberOptionUser, "promote");
                }
              }}
            >
              <Text style={styles.confirmButtonText}>Promote</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: "#f43f5e" }]}
              onPress={() => {
                setShowMemberOptions(false);
                if (memberOptionUser) {
                  openActionModal(memberOptionUser, "kick");
                }
              }}
            >
              <Text style={styles.confirmButtonText}>Kick</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowMemberOptions(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalTitle: {
  fontSize: 18,
  fontWeight: "600",
  color: "#1f2937",
  textAlign: "center",
  marginBottom: 20,
},

modalSubtext: {
  fontSize: 14,
  color: "#6b7280",
  textAlign: "center",
  marginBottom: 20,
},

modalButtons: {
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  gap: 12, // cleaner spacing than marginRight hacks
},

confirmButton: {
  flex: 1,
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
},

cancelButton: {
  backgroundColor: "#f3f4f6",
  paddingVertical: 14,
  borderRadius: 10,
  width: "100%",
  alignItems: "center",
  marginTop: 16,
},
  modalContainer: {
  width: "90%",
  backgroundColor: "#fff",
  paddingVertical: 28,
  paddingHorizontal: 20,
  borderRadius: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 5,
  alignItems: "center",
},
  container: { backgroundColor: "#fafafa", flex: 1 },
  groupTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#3a3a3a",
    textAlign: "center",
    marginBottom: 10,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b21a8",
    marginTop: 24,
    marginBottom: 10,
  },
  founderContainer: {
    marginBottom: 20,
    backgroundColor: "#fef9f5",
    padding: 14,
    borderRadius: 10,
    borderLeftColor: "#fbbf24",
    borderLeftWidth: 4,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingLeft: 4,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#d4d4d8",
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  badge: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "600",
    marginLeft: 8,
  },
  postButton: {
    backgroundColor: "#7c3aed",
    marginTop: 32,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  postButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  leaveButton: {
    backgroundColor: "#fff0f0",
    borderColor: "#f43f5e",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  leaveButtonText: {
    color: "#f43f5e",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  eventsContainer: {
    marginTop: 40,
    padding: 16,
    backgroundColor: "#f3f0ff",
    borderRadius: 12,
  },
  placeholderText: {
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  sectionWithArrow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 24,
  marginBottom: 10,
    },
    moreArrow: {
    padding: 8,
    },
    safeArea: {
    flex: 1,
    backgroundColor: "#fafafa",
    },
    header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#fafafa",
    },
    backButtonText: {
    fontSize: 18,
    color: "#7c3aed",
    },
    eventCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    },
    eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    },
    eventTime: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 2,
    },
    eventLocation: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 2,
    },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "500",
  },
  promoteColor: {
    backgroundColor: "#7c3aed",
  },

  demoteColor: {
    backgroundColor: "#f43f5e",
  },

  confirmButtonText: {
    color: "white",
    fontWeight: "600",
  },

founderModalContainer: {
  width: "85%",
  backgroundColor: "#fef9f5",
  padding: 24,
  borderRadius: 20,
  borderLeftWidth: 4,
  borderLeftColor: "#fbbf24",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 5,
  alignItems: "center",
  maxHeight: 300,
  justifyContent: "space-between",
},


founderEmoji: {
  fontSize: 40,
  marginBottom: 10,
},

founderOkButton: {
  backgroundColor: "#fbbf24",
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderRadius: 10,
  marginTop: 16,
  alignSelf: "center",
  minWidth: 100,
},

founderCloseButton: {
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 10,
  padding: 4,
},
founderCloseText: {
  fontSize: 20,
  color: "#fbbf24",
  fontWeight: "bold",
}
});
