import { uploadUserInteraction } from "@/lib/helper_functions/uploadUserInteraction";
import type { PublicUser } from "@/types/public_user";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from "../../../lib/supabase";
import type { Group } from "../../../types/group";

export default function ForeignGroupsView() {
  const router = useRouter();
  const { group: groupStr, user: userData } = useLocalSearchParams();

  const [showRequestSentModal, setShowRequestSentModal] = useState(false);
  const [showRequestDeniedModal, setShowRequestDeniedModal] = useState(false);

  const group = JSON.parse(groupStr as string) as Group;
  const user = JSON.parse(userData as string) as import('@supabase/supabase-js').User;

  const [userInfos, setUserInfos] = useState<PublicUser[]>([]);

  const founder = group.founder;
  const leaders = useMemo(() => group.leaders ?? [], [group.leaders]);
  const members = group.members.filter((m) => m !== founder && !leaders.includes(m));
  const leadersCount = leaders.length;
  const membersCount = members.length;
  const leaderToFetchCount = Math.min(5, leadersCount);
  const memberToFetchCount = Math.min(5, membersCount);

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
  }, [founder, leaderToFetchCount, leaders, memberToFetchCount, members]);

  const founderUser = userInfos.find((u) => u.user_id === founder);
  const leadersUserInfos = userInfos.filter((u) => leaders.includes(u.user_id));
  const membersUserInfos = userInfos.filter((u) => members.includes(u.user_id));

  const MemberRow = ({ name, badge, profile_picture_url }: { name: string; badge?: string; profile_picture_url?: string }) => (
    <View style={styles.memberRow}>
      {profile_picture_url ? (
        <Image
          source={{ uri: profile_picture_url }}
          style={styles.profilePicture}
        />
      ) : (
        <View style={styles.placeholderPicture} />
      )}
      <Text style={styles.memberName}>{name}</Text>
      {badge && <Text style={styles.memberBadge}>{badge}</Text>}
    </View>
  );

  const handleJoinGroup = async () => {
    if (group.visibility === "open") {
      const { error } = await supabase
        .from("groups")
        .update({ members: [...group.members, user.id] })
        .eq("id", group.id);
      if (error) console.error("Error joining group:", error);
      else router.back();
    } else if (group.visibility === "request") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: existingRequests } = await supabase
        .from("group_join_requests")
        .select("*")
        .eq("group_id", group.id)
        .eq("from_id", user.id)
        .order("created_at", { ascending: false });

      const recentOrPending = existingRequests?.find(req =>
        req.status === "pending" ||
        (req.created_at && new Date(req.created_at) > oneWeekAgo)
      );

      if (recentOrPending) {
        setShowRequestDeniedModal(true);
        return;
      }

      const { error } = await supabase
        .from("group_join_requests")
        .insert({
          group_id: group.id,
          from_id: user.id,
          status: "pending",
          to_id: founder,
          message: `${user.user_metadata.username} has requested to join your group ${group.name}.`
        });

      if (error) console.error("Error requesting to join group:", error);
      else setShowRequestSentModal(true);
    }
  };

  if (!group || !user) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 20, color: "#7c3aed", textAlign: "center" }}>
          No connection right now. Please try again later.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fdfdfd" }}>
      <SafeAreaView edges={['top']} style={styles.fixedHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#7c3aed" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <Text style={styles.groupName}>{group.name}</Text>
          {!!group.description && <Text style={styles.description}>{group.description}</Text>}
          {!!group.vibes?.length && (
            <View style={styles.vibes}>
              {group.vibes.map((vibe, i) => (
                <Text key={i} style={styles.vibe}>#{vibe.toLowerCase()}</Text>
              ))}
            </View>
          )}
          {!!group.visibility && (
            <Text style={styles.metaBadge}>
              {group.visibility === "open" && "🌐 Open to All"}
              {group.visibility === "request" && "📝 Request to Join"}
              {group.visibility === "hidden" && "🙈 Hidden"}
            </Text>
          )}
        </View>

        {founderUser && founderUser.user_id !== user.id && (
          <View style={styles.founderContainer}>
            <TouchableOpacity
              onPress={() => {
                router.push({ pathname: "/tabs/groups/inspect_user", params: { userToInspectId: founderUser.user_id } });
                uploadUserInteraction(user.id, founderUser.user_id, "viewed_user_profile", "user");
              }}
              activeOpacity={0.7}
            >
              <MemberRow
                name={founderUser.user_name}
                badge="Founder 👑"
                profile_picture_url={founderUser.profile_picture_url}
              />
            </TouchableOpacity>
          </View>
        )}

        {leadersCount > 0 && (
          <View style={styles.memberSection}>
            <View style={styles.sectionWithArrow}>
              <Text style={styles.sectionHeader}>Leaders</Text>
              {leadersCount > 5 && (
                <TouchableOpacity onPress={() =>
                  router.push({
                    pathname: "/tabs/groups/group_people_list",
                    params: {
                      groupId: group.id,
                      whoToFetch: "leaders",
                      userDoingInspect: user.id,
                      userDoingInspectRole: "viewer",
                    },
                  })
                }>
                  <Text style={styles.arrowButtonText}>›</Text>
                </TouchableOpacity>
              )}
            </View>
            {leadersUserInfos.slice(0, 5).map((leader) => (
              <TouchableOpacity
                key={leader.id}
                onPress={() =>
                  router.push({ pathname: "/tabs/groups/inspect_user", params: { userToInspectId: leader.user_id } })
                }
              >
                <MemberRow name={leader.user_name} profile_picture_url={leader.profile_picture_url} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {membersCount > 0 && (
          <View style={styles.memberSection}>
            <View style={styles.sectionWithArrow}>
              <Text style={styles.sectionHeader}>Members</Text>
              {membersCount > 5 && (
                <TouchableOpacity onPress={() =>
                  router.push({
                    pathname: "/tabs/groups/group_people_list",
                    params: {
                      groupId: group.id,
                      whoToFetch: "members",
                      userDoingInspect: user.id,
                      userDoingInspectRole: "viewer",
                    },
                  })
                }>
                  <Text style={styles.arrowButtonText}>›</Text>
                </TouchableOpacity>
              )}
            </View>
            {membersUserInfos.slice(0, 5).map((member) => (
              <TouchableOpacity
                key={member.id}
                onPress={() =>
                  router.push({ pathname: "/tabs/groups/inspect_user", params: { userToInspectId: member.user_id } })
                }
              >
                <MemberRow name={member.user_name} profile_picture_url={member.profile_picture_url} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {group.visibility !== "hidden" && (
          <TouchableOpacity onPress={handleJoinGroup} style={styles.joinButton}>
            <Text style={styles.joinButtonText}>
              {group.visibility === "open" ? "🚀 Join Instantly" : "✍️ Request to Join"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Request Sent Modal */}
        <Modal visible={showRequestSentModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>🎉 Request Sent!</Text>
              <Text style={styles.modalMessage}>
                We&apos;ll notify the group leader that you want to join <Text style={{ fontWeight: "bold" }}>{group.name}</Text>.
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowRequestSentModal(false);
                  uploadUserInteraction(user.id, group.id, "requested_to_join_group", "group");
                  router.back();
                }}
              >
                <Text style={styles.modalButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Request Denied Modal */}
        <Modal visible={showRequestDeniedModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>🚫 Request Blocked</Text>
              <Text style={styles.modalMessage}>
                You&apos;ve already requested to join <Text style={{ fontWeight: "bold" }}>{group.name}</Text>. Please wait until your previous request is processed or a week has passed.
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowRequestDeniedModal(false);
                  router.back();
                }}
              >
                <Text style={styles.modalButtonText}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 80,
    backgroundColor: "#fffefc",
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "rgba(250,250,251,0.95)",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#7c3aed",
    marginLeft: 6,
    fontWeight: "600",
  },
  banner: {
    backgroundColor: "#fef9ff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  groupName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#7c3aed",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#555",
    marginBottom: 12,
  },
  vibes: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  vibe: {
    backgroundColor: "#f3e8ff",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    fontSize: 13,
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
    marginBottom: 24,
    backgroundColor: "#fef9f5",
    padding: 12,
    borderRadius: 10,
    borderLeftColor: "#fbbf24",
    borderLeftWidth: 4,
  },
  sectionWithArrow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "600",
    color: "#6b21a8",
  },
  arrowButtonText: {
    fontSize: 22,
    color: "#7c3aed",
    fontWeight: "600",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 4,
  },
  profilePicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: "#e4e4e7",
  },
  placeholderPicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e4e4e7",
    marginRight: 12,
  },
  memberName: {
    fontSize: 15,
    color: "#1e1e1f",
    flex: 1,
  },
  memberBadge: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "600",
    marginLeft: 8,
  },
  memberSection: {
    marginBottom: 28,
  },
  joinButton: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 360,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4c1d95",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: "#333",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#7c3aed",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});