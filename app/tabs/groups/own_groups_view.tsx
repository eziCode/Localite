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
  const group = JSON.parse(groupStr as string) as Group;
  const user: import("@supabase/supabase-js").User = JSON.parse(userStr as string);
  const [userInfos, setUserInfos] = useState<PublicUser[]>([]);
  const [showPostEventModal, setShowPostEventModal] = useState(false);
  const [events, setEvents] = useState<UserEvent[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));


  const MoreArrow = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={styles.moreArrow}>
        <Text style={{ fontSize: 25, color: "#7c3aed" }}>›</Text>
    </TouchableOpacity>
    );

  const founder = group.founder;
  const leaders = React.useMemo(() => group.leaders ?? [], [group.leaders]);
  const members = group.members.filter((m) => m !== founder && !leaders.includes(m));
  const leadersCount = leaders.length;
  const membersCount = members.length;
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

  const MemberRow = ({ name, badge }: { name: string; badge?: string }) => (
    <View style={styles.memberRow}>
      <View style={styles.avatarCircle} />
      <Text style={styles.memberName}>{name}</Text>
      {badge && <Text style={styles.badge}>{badge}</Text>}
    </View>
  );

  const eventsByDate = events.reduce<Record<string, UserEvent[]>>((acc, event) => {
      if (event && event.start_time) {
        const date = format(new Date(event.start_time), "yyyy-MM-dd");
        if (!acc[date]) acc[date] = [];
        acc[date].push(event);
      }
      return acc;
    }, {});

  const makeMemberLeader = async (userId: string) => {
    const { data, error } = await supabase
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
        leadersUserInfos = [...leadersUserInfos, newLeader];
        membersUserInfos = membersUserInfos.filter((m) => m.user_id !== userId);
      }
    }
  };

  return (
    <>
    <SafeAreaView style={styles.container}>
       <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </View>

      <Text style={styles.groupTitle}>{group.name}</Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {founder && founderUser && (
          <View style={styles.founderContainer}>
            <MemberRow name={founderUser.user_name} badge="Founder 👑" />
          </View>
        )}

        {leadersCount > 0 && (
            <>
                <View style={styles.sectionWithArrow}>
                <Text style={styles.sectionHeader}>Leaders</Text>
                {leadersCount > 5 && (
                    <MoreArrow
                    onPress={() =>
                        router.push({
                        pathname: "/tabs/groups/group_people_list",
                        params: {
                            group: JSON.stringify(group),
                            user: JSON.stringify(user),
                            people: JSON.stringify(leaders),
                            role: "Leaders",
                        },
                        })
                    }
                    />
                )}
                </View>
                {leadersUserInfos.slice(0, 5).map((leader) => (
                <MemberRow key={leader.id} name={leader.user_name} />
                ))}
            </>
            )}

            {membersCount > 0 && (
            <>
                <View style={styles.sectionWithArrow}>
                <Text style={styles.sectionHeader}>Members</Text>
                {membersCount > 5 && (
                    <MoreArrow
                    onPress={() =>
                        router.push({
                        pathname: "/tabs/groups/group_people_list",
                        params: {
                            group: JSON.stringify(group),
                            user: JSON.stringify(user),
                            people: JSON.stringify(members),
                            role: "Members",
                        },
                        })
                    }
                    />
                )}
                </View>
                {membersUserInfos.slice(0, 5).map((member) => (
                <MemberRow key={member.id} name={member.user_name} />
                ))}
            </>
            )}


            {(user.id === founder || leaders.includes(user.id)) && (
            <TouchableOpacity onPress={() => setShowPostEventModal(true)} style={styles.postButton}>
                <Text style={styles.postButtonText}>+ Post Event</Text>
            </TouchableOpacity>
            )}


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
});
