import GroupMemberActionModal from "@/app/(shared)/GroupMemberActionModal";
import { useGroupMemberActions } from "@/lib/helper_components/useGroupMemberAction";
import { uploadUserInteraction } from "@/lib/helper_functions/uploadUserInteraction";
import { PublicUser } from "@/types/public_user";
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from "@react-navigation/native";
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
import { SafeAreaView } from 'react-native-safe-area-context';
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

  // Use your shared hook
  const groupActions = useGroupMemberActions(group.id, {
    founder: group.founder,
    leaders: group.leaders ?? [],
    members: group.members,
  }, setGroup);

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const founder = group.founder;
  const leaders = React.useMemo(() => group.leaders ?? [], [group.leaders]);
  const members = group.members.filter((m) => m !== founder && !leaders.includes(m));
  const [leadersCount, setLeaderCount] = useState<number>(leaders.length);
  const [membersCount, setMemberCount] = useState<number>(members.length);
  const leaderToFetchCount = leadersCount > 5 ? 5 : leadersCount;
  const memberToFetchCount = membersCount > 5 ? 5 : membersCount;

  const [showMemberOptions, setShowMemberOptions] = useState(false);
  const [memberOptionUser, setMemberOptionUser] = useState<PublicUser | null>(null);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;
    // Fetch the latest group data from Supabase
    const fetchGroup = async () => {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', group.id)
        .single();
      if (data) setGroup(data);
    };
    fetchGroup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

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
  }, [founder, group.id, group.members, group.leaders, leaderToFetchCount, leaders, memberToFetchCount, members]);

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

  const openActionModal = (user: PublicUser, type: "promote" | "demote" | "kick") => {
    groupActions.setSelectedUser(user);
    groupActions.setActionType(type);
    groupActions.setShowActionModal(true);
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

  const pushJoinCodeToGroupTable = async (joinCode: string) => {
    const { error } = await supabase
      .from("groups")
      .update({ join_code: joinCode, join_code_creation_time: new Date() })
      .eq("id", group.id);

    if (error) {
      console.error("Error updating join code:", error);
    }
  };

  // Helper to check if current user is founder or leader
  const canPromoteDemote = user.id === founder || leaders.includes(user.id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fdfdfd" }} edges={['top']}>
      {/* Fixed Header */}
      <SafeAreaView edges={['top']} style={styles.fixedHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#7c3aed" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 80, paddingTop: 100 }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && (
            <Text style={styles.description}>{group.description}</Text>
          )}
          {!!group.vibes?.length && (
            <View style={styles.vibes}>
              {group.vibes.map((vibe: string, i: number) => (
                <Text key={i} style={styles.vibe}>#{vibe.toLowerCase()}</Text>
              ))}
            </View>
          )}
          {group.visibility && (
            <Text style={styles.metaBadge}>
              {group.visibility === "open" && "🌐 Open to All"}
              {group.visibility === "request" && "📝 Request to Join"}
              {group.visibility === "hidden" && "🙈 Hidden"}
            </Text>
          )}
        </View>

        {/* Founder */}
        {founderUser && (
          <View style={styles.founderContainer}>
            <TouchableOpacity
              onPress={() => {
                if (founderUser.user_id !== user.id) {
                  router.push({
                    pathname: "/tabs/groups/inspect_user",
                    params: { userToInspectId: founderUser.user_id },
                  });
                  uploadUserInteraction(user.id, founderUser.user_id, "viewed_user_profile", "user");
                }
              }}
              activeOpacity={0.7}
              disabled={founderUser.user_id === user.id}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, paddingLeft: 4 }}>
                {founderUser.profile_picture_url ? (
                  <Image
                    source={{ uri: founderUser.profile_picture_url }}
                    style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: "#e4e4e7" }}
                  />
                ) : (
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#e4e4e7", marginRight: 12 }} />
                )}
                <Text style={{ fontSize: 16, color: "#1e1e1f", flex: 1 }}>{founderUser.user_name}</Text>
                <Text style={{ fontSize: 12, color: "#f59e0b", fontWeight: "600", marginLeft: 8 }}>Founder 👑</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Leaders */}
        {leadersCount > 0 && (
          <View>
            <View style={styles.sectionWithArrow}>
              <Text style={styles.sectionHeader}>Leaders</Text>
              {leaders.length > 5 && (
                <TouchableOpacity onPress={() => {
                  const role = user.id === founderUser?.user_id ? "founder" : user.id in leadersUserInfos.map(u => u.user_id) ? "leader" : "member";
                  router.push({ pathname: "/tabs/groups/group_people_list",
                                params: { 
                                  groupId: group.id, 
                                  whoToFetch: "leaders", 
                                  userDoingInspect: user.id, 
                                  userDoingInspectRole: role
                                } 
                              });
                }}>
                  <Text style={styles.arrowButtonText}>›</Text>
                </TouchableOpacity>
              )}
            </View>
            {leadersUserInfos.slice(0, 5).map((leader) => (
              <TouchableOpacity
                key={leader.id}
                onPress={() => {
                  if (leader.user_id !== user.id) {
                    router.push({
                      pathname: "/tabs/groups/inspect_user",
                      params: { userToInspectId: leader.user_id },
                    });
                    uploadUserInteraction(user.id, leader.user_id, "viewed_user_profile", "user");
                  }
                }}
                onLongPress={
                  canPromoteDemote && leader.user_id !== user.id
                    ? () => openActionModal(leader, "demote")
                    : undefined
                }
                activeOpacity={0.7}
                disabled={leader.user_id === user.id}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, paddingLeft: 4 }}>
                  {leader.profile_picture_url ? (
                    <Image
                      source={{ uri: leader.profile_picture_url }}
                      style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: "#e4e4e7" }}
                    />
                  ) : (
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#e4e4e7", marginRight: 12 }} />
                  )}
                  <Text style={{ fontSize: 16, color: "#1e1e1f", flex: 1 }}>{leader.user_name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Members */}
        {membersCount > 0 && (
          <View>
            <View style={styles.sectionWithArrow}>
              <Text style={styles.sectionHeader}>Members</Text>
              {members.length > 5 && (
                <TouchableOpacity onPress={() => {
                  const role = user.id === founderUser?.user_id ? "founder" : user.id in leadersUserInfos.map(u => u.user_id) ? "leader" : "member";
                  router.push({ pathname: "/tabs/groups/group_people_list", 
                                params: { 
                                  groupId: group.id, 
                                  whoToFetch: "members", 
                                  userDoingInspect: user.id, 
                                  userDoingInspectRole: role
                                } 
                              });
                }}>
                  <Text style={styles.arrowButtonText}>›</Text>
                </TouchableOpacity>
              )}
            </View>
            {membersUserInfos.slice(0, 5).map((member) => (
              <TouchableOpacity
                key={member.id}
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
                activeOpacity={0.7}
                disabled={member.user_id === user.id}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, paddingLeft: 4 }}>
                  {member.profile_picture_url ? (
                    <Image
                      source={{ uri: member.profile_picture_url }}
                      style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: "#e4e4e7" }}
                    />
                  ) : (
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#e4e4e7", marginRight: 12 }} />
                  )}
                  <Text style={{ fontSize: 16, color: "#1e1e1f", flex: 1 }}>{member.user_name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Join Code (for leaders/founder) */}
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

        {/* Post Event Button */}
        {(user.id === founder || leaders.includes(user.id)) && (
          <TouchableOpacity onPress={() => setShowPostEventModal(true)} style={styles.postButton}>
            <Text style={styles.postButtonText}>+ Post Event</Text>
          </TouchableOpacity>
        )}

        {/* Leave Group Button */}
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => {
            leaveGroup(user.id);
          }}
        >
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>

        {/* Events Section */}
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

      {/* Modals */}
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
      <GroupMemberActionModal
        visible={groupActions.showActionModal}
        onClose={() => groupActions.setShowActionModal(false)}
        actionType={groupActions.actionType}
        selectedUser={groupActions.selectedUser}
        onConfirm={groupActions.handleActionConfirm}
      />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(250,250,251,0.95)',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingLeft: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ede9fe', // light purple
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#7c3aed', // deep purple
    marginLeft: 6,
    fontWeight: '600',
  },
  container: {
    backgroundColor: "#fffefc",
    padding: 24,
    paddingTop: 60,
  },
  banner: {
    backgroundColor: "#fef9ff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
  },
  groupName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#7c3aed",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#555",
    marginBottom: 16,
  },
  vibes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vibe: {
    backgroundColor: "#f3e8ff",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    fontSize: 14,
    color: "#7c3aed",
    fontWeight: "500",
    marginRight: 8,
    marginBottom: 8,
  },
  metaBadge: {
    marginTop: 12,
    backgroundColor: "#ede9fe",
    color: "#6b21a8",
    fontSize: 14,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "600",
  },
  founderContainer: {
    marginBottom: 20,
    backgroundColor: "#fef9f5",
    padding: 14,
    borderRadius: 10,
    borderLeftColor: "#fbbf24",
    borderLeftWidth: 4,
  },
  sectionWithArrow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b21a8",
  },
  arrowButtonText: {
    fontSize: 25,
    color: '#7c3aed', // deep purple for the arrow
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
  placeholderText: {
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
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
    gap: 12,
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
});
