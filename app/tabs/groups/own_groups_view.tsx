import { PublicUser } from "@/types/public_user";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import type { Group } from "../../../types/group";

export default function OwnGroupsView() {
  const router = useRouter();
  const { group: groupStr, user: userStr } = useLocalSearchParams();
  const group = JSON.parse(groupStr as string) as Group;
  const user = JSON.parse(userStr as string);
  const [userInfos, setUserInfos] = useState<PublicUser[]>([]);

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

    fetchMemberData();
  }, [founder, group.members, leaderToFetchCount, leaders, memberToFetchCount, members]);

  const founderUser = userInfos.find((u) => u.user_id === founder);
  const leadersUserInfos = userInfos.filter((u) => leaders.includes(u.user_id));
  const membersUserInfos = userInfos.filter((u) => members.includes(u.user_id));

  const MemberRow = ({ name, badge }: { name: string; badge?: string }) => (
    <View style={styles.memberRow}>
      <View style={styles.avatarCircle} />
      <Text style={styles.memberName}>{name}</Text>
      {badge && <Text style={styles.badge}>{badge}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

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


        <TouchableOpacity style={styles.postButton}>
          <Text style={styles.postButtonText}>+ Post Event</Text>
        </TouchableOpacity>

        <View style={styles.eventsContainer}>
          <Text style={styles.sectionHeader}>Upcoming Events</Text>
          <Text style={styles.placeholderText}>
            🎉 Visual event timeline or calendar goes here...
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa", paddingTop: 40 },
  backButton: { paddingHorizontal: 20, paddingBottom: 10 },
  backButtonText: { fontSize: 18, color: "#7c3aed" },
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

});
