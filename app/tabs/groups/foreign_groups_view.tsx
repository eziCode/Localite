import { uploadUserInteraction } from "@/lib/helper_functions/uploadUserInteraction";
import type { PublicUser } from "@/types/public_user";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
  const leaders = React.useMemo(() => group.leaders ?? [], [group.leaders]);
  const members = group.members.filter((m) => m !== founder && !leaders.includes(m));
  const leadersCount = leaders.length;
  const membersCount = members.length;
  const leaderToFetchCount = leadersCount > 5 ? 5 : leadersCount;
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
  }, [founder, leaderToFetchCount, leaders, memberToFetchCount, members]);

  const founderUser = userInfos.find((u) => u.user_id === founder);
  const leadersUserInfos = userInfos.filter((u) => leaders.includes(u.user_id));
  const membersUserInfos = userInfos.filter((u) => members.includes(u.user_id));

  const MemberRow = ({ name, badge, profile_picture_url }: { name: string; badge?: string; profile_picture_url?: string }) => (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, paddingLeft: 4 }}>
      {profile_picture_url ? (
        <Image
          source={{ uri: profile_picture_url }}
          style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: "#e4e4e7" }}
        />
      ) : (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#e4e4e7", marginRight: 12 }} />
      )}
      <Text style={{ fontSize: 16, color: "#1e1e1f", flex: 1 }}>{name}</Text>
      {badge && <Text style={{ fontSize: 12, color: "#f59e0b", fontWeight: "600", marginLeft: 8 }}>{badge}</Text>}
    </View>
  );

  if (!group || !user) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 20, color: "#7c3aed", textAlign: "center" }}>
          No connection right now. Please try again later.
        </Text>
      </View>
    );
  }

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

      const { data: existingRequests, error: checkError } = await supabase
        .from("group_join_requests")
        .select("*")
        .eq("group_id", group.id)
        .eq("from_id", user.id)
        .order("created_at", { ascending: false });

      if (checkError) {
        console.error("Error checking existing requests:", checkError);
        return;
      }

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

  return (
    <View style={{ flex: 1, backgroundColor: "#fdfdfd" }}>
      {/* Fixed Header */}
      <SafeAreaView edges={['top']} style={styles.fixedHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#333" />
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
        <View style={styles.banner}>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && (
            <Text style={styles.description}>{group.description}</Text>
          )}
          {!!group.vibes?.length && (
            <View style={styles.vibes}>
              {group.vibes.map((vibe, i) => (
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
          <View>
            <View style={styles.sectionWithArrow}>
              <Text style={styles.sectionHeader}>Leaders</Text>
              {leadersCount > 5 && (
                <TouchableOpacity onPress={() => {
                  router.push({ pathname: "/tabs/groups/group_people_list", 
                                params: { 
                                  groupId: group.id, 
                                  whoToFetch: "leaders", 
                                  userDoingInspect: user.id, 
                                  userDoingInspectRole: "viewer"
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
                  router.push({ pathname: "/tabs/groups/inspect_user", params: { userToInspectId: leader.user_id } });
                  uploadUserInteraction(user.id, leader.user_id, "viewed_user_profile", "user");
                }}
                activeOpacity={0.7}
              >
                <MemberRow
                  name={leader.user_name}
                  profile_picture_url={leader.profile_picture_url}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {membersCount > 0 && (
          <View>
            <View style={styles.sectionWithArrow}>
              <Text style={styles.sectionHeader}>Members</Text>
              {membersCount > 5 && (
                <TouchableOpacity onPress={() => {
                  router.push({ pathname: "/tabs/groups/group_people_list", 
                                params: { 
                                  groupId: group.id, 
                                  whoToFetch: "members", 
                                  userDoingInspect: user.id, 
                                  userDoingInspectRole: "viewer"
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
                  router.push({ pathname: "/tabs/groups/inspect_user", params: { userToInspectId: member.user_id } });
                  uploadUserInteraction(user.id, member.user_id, "viewed_user_profile", "user");
                }}
                activeOpacity={0.7}
              >
                <MemberRow
                  name={member.user_name}
                  profile_picture_url={member.profile_picture_url}
                />
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
    backgroundColor: "#fffefc",
    padding: 24,
    paddingTop: 60,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 0, // SafeAreaView will handle top padding
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(250,250,251,0.95)',
    paddingLeft: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F1F3',
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#1E1E1F',
    marginLeft: 6,
    fontWeight: '600',
  },
  headerBackButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#f6f5fa",
    alignSelf: "flex-start",
  },
  headerBackArrow: {
    fontSize: 18,
    color: "#7c3aed",
    marginRight: 4,
    fontWeight: "600",
  },
  headerBackText: {
    fontSize: 16,
    color: "#7c3aed",
    fontWeight: "600",
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
  founderContainer: {
    marginBottom: 20,
    backgroundColor: "#fef9f5",
    padding: 14,
    borderRadius: 10,
    borderLeftColor: "#fbbf24",
    borderLeftWidth: 4,
  },
  joinButton: {
    marginTop: 32,
    backgroundColor: "#8b5cf6",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  arrowButtonText: {
    fontSize: 25,
    color: "#7c3aed",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 999,
  },
  modalBox: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4c1d95",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
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
