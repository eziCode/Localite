import { PublicUser } from "@/types/public_user";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [actionType, setActionType] = useState<"promote" | "demote" | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const founder = group.founder;
  const leaders = React.useMemo(() => group.leaders ?? [], [group.leaders]);
  const members = group.members.filter((m) => m !== founder && !leaders.includes(m));
  const [leadersCount, setLeaderCount] = useState<number>(leaders.length);
  const [membersCount, setMemberCount] = useState<number>(members.length);
  const leaderToFetchCount = leadersCount && leadersCount > 5 ? 5 : leadersCount;
  const memberToFetchCount = membersCount > 5 ? 5 : membersCount;

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

  const openActionModal = (user: PublicUser, type: "promote" | "demote") => {
    setSelectedUser(user);
    setActionType(type);
    setShowActionModal(true);
    Vibration.vibrate(50); // slight buzz
  };

  const leaveGroup = async (userId: string) => {
    const { error } = await supabase.rpc(
      "leave_group", 
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
  }
  setShowActionModal(false);
  setSelectedUser(null);
  setActionType(null);
};

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
            >
              <View style={styles.avatarCircle} />
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
                <TouchableOpacity onPress={() => router.back()} style={styles.moreArrow}>
                  <Text style={{ fontSize: 25, color: "#7c3aed" }}>›</Text>
                </TouchableOpacity>
              )}
            </View>
            {leadersUserInfos.slice(0, 5).map((leader) => (
              <TouchableOpacity
                key={leader.id}
                style={styles.memberRow}
                onLongPress={
                  canPromoteDemote && leader.user_id !== user.id // Prevent self-demote
                    ? () => openActionModal(leader, "demote")
                    : undefined
                }
              >
                <View style={styles.avatarCircle} />
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
                <TouchableOpacity onPress={() => {router.push({pathname: "/tabs/groups/group_people_list"})}} style={styles.moreArrow}>
                  <Text style={{ fontSize: 25, color: "#7c3aed" }}>›</Text>
                </TouchableOpacity>
              )}
            </View>
            {membersUserInfos.slice(0, 5).map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberRow}
                onLongPress={
                  canPromoteDemote
                    ? () => openActionModal(member, "promote")
                    : undefined
                }
              >
                <View style={styles.avatarCircle} />
                <Text style={styles.memberName}>{member.user_name}</Text>
              </TouchableOpacity>
            ))}
          </>
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

          {eventsByDate[selectedDate]?.length ? (
            eventsByDate[selectedDate]
              .slice()
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    {new Date(event.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" – "}
                    {new Date(event.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {event.location_name && (
                    <Text style={styles.eventLocation}>{event.location_name}</Text>
                  )}
                </View>
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
              : `Demote ${selectedUser?.user_name} to Member?`}
          </Text>
          <Text style={styles.modalSubtext}>
            This change will take effect immediately.
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                actionType === "promote"
                  ? styles.promoteColor
                  : styles.demoteColor,
              ]}
              onPress={handleActionConfirm}
            >
              <Text style={styles.confirmButtonText}>
                {actionType === "promote" ? "Promote" : "Demote"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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

  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
  },

  modalSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 24,
    textAlign: "center",
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#374151",
    fontWeight: "500",
  },

  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
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
},
});
