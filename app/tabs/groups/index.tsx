import { uploadUserInteraction } from "@/lib/helper_functions/uploadUserInteraction";
import { JoinRequestWithGroup } from "@/types/join_request_with_group";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import type { Group } from "../../../types/group";
import CreateGroupModal from "../../modals/create_group";

const MAX_GROUPS_TO_SHOW = 5;

export default function GroupsPage() {
  const router = useRouter();
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestWithGroup[]>([]);
  const [ownJoinRequests, setOwnJoinRequests] = useState<JoinRequestWithGroup[]>([]);
  const [groupedJoinRequests, setGroupedJoinRequests] = useState<{ [groupId: string]: JoinRequestWithGroup[] }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteCodeError, setInviteCodeError] = useState("");
  const insets = useSafeAreaInsets();

  const fetchUserGroups = async (userId: string) => {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .filter("members", "cs", JSON.stringify([userId]))
      .limit(MAX_GROUPS_TO_SHOW + 1);
    if (error) console.error(error);
    else setUserGroups(data);
  };

  const fetchSuggestedGroups = async (userId: string) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { data: requests } = await supabase
      .from("group_join_requests")
      .select("group_id, status, created_at")
      .eq("from_id", userId)
      .limit(MAX_GROUPS_TO_SHOW + 1);

    const blockedGroupIds = new Set(
      requests?.filter(req =>
        req.status === "pending" || (req.created_at && new Date(req.created_at) > oneWeekAgo)
      ).map(req => req.group_id)
    );

    const { data: groups, error } = await supabase
      .from("groups")
      .select("*")
      .not("members", "cs", JSON.stringify([userId]))
      .neq("visibility", "hidden");
    if (error) console.error(error);
    else setSuggestedGroups(groups.filter(group => !blockedGroupIds.has(group.id)));
  };

  const fetchJoinRequests = async (userId: string) => {
    const { data } = await supabase
      .from("group_join_requests")
      .select("*, group:groups(name)")
      .eq("to_id", userId)
      .eq("status", "pending");
    setJoinRequests(data ?? []);
  };

  const fetchOwnJoinRequests = async (userId: string) => {
    const { data } = await supabase
      .from("group_join_requests")
      .select("*, group:groups(name)")
      .eq("from_id", userId)
      .neq("status", "pending")
      .neq("acknowledged", true);
    setOwnJoinRequests(data ?? []);
  };

  const handleDismissResult = async (id: number) => {
    const request = ownJoinRequests.find((r) => r.id === id);
    if (!request) return;
    if (request.status === "accepted") {
      await supabase.from("group_join_requests").delete().eq("id", id);
      fetchUserGroups(user?.id!);
    } else if (request.status === "rejected") {
      await supabase.from("group_join_requests").update({ acknowledged: true }).eq("id", id);
    }
    setOwnJoinRequests((prev) => prev.filter((req) => req.id !== id));
  };

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchUserGroups(user.id);
        fetchSuggestedGroups(user.id);
        fetchJoinRequests(user.id);
        fetchOwnJoinRequests(user.id);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const grouped: { [groupId: string]: JoinRequestWithGroup[] } = {};
    for (const request of joinRequests) {
      if (!grouped[request.group_id]) grouped[request.group_id] = [];
      grouped[request.group_id].push(request);
    }
    setGroupedJoinRequests(grouped);
  }, [joinRequests]);

  useFocusEffect(useCallback(() => {
    const fetchOnFocus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchUserGroups(user.id);
        fetchSuggestedGroups(user.id);
        fetchJoinRequests(user.id);
      }
    };
    fetchOnFocus();
  }, []));

  const handleJoinByCode = async () => {
    const trimmedCode = inviteCode.trim();
    const { data, error } = await supabase.from("groups").select("*").eq("join_code", trimmedCode).single();
    if (error || !data) return setInviteCodeError("Invalid code.");
    const groupToJoin = data as Group;
    if (userGroups.some((g) => g.id === groupToJoin.id)) {
      return setInviteCodeError("You're already a member.");
    }
    const { error: joinError } = await supabase.rpc("append_member_to_group_id_is_int", {
      group_id_input: groupToJoin?.id,
      user_id_input: user?.id,
    });
    if (!joinError) {
      uploadUserInteraction(user?.id!, groupToJoin.id, "joined_group_by_code", "group");
      if (user?.id) groupToJoin.members = [...(groupToJoin.members), user.id];
      setUserGroups((prev) => [...prev, groupToJoin]);
      setInviteCode("");
      setInviteCodeError("");
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          style={[styles.profileIconButton, { top: insets.top + 8 }]}
          onPress={() => router.push({
            pathname: "/tabs/groups/profile",
            params: {
              user: JSON.stringify(user),
              groups: JSON.stringify(userGroups),
            },
          })}
        >
          <Ionicons name="person-circle-outline" size={32} color="#6C4FF6" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.pageTitle}>Groups</Text>

          <Text style={styles.sectionTitle}>Your Groups</Text>
          {userGroups.length === 0 ? (
            <Text style={styles.subText}>No groups yet.</Text>
          ) : (
            userGroups.slice(0, MAX_GROUPS_TO_SHOW).map((group, i) => (
              <Animated.View entering={FadeInUp.delay(i * 60)} key={group.id}>
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: "/tabs/groups/own_groups_view",
                    params: { group: JSON.stringify(group), user: JSON.stringify(user) },
                  })}
                  style={styles.card}
                >
                  <View style={styles.accent} />
                  <View style={styles.cardContent}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupMeta}>
                      {group.members?.length ?? 0} {group.members?.length === 1 ? "member" : "members"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}

          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.createButton}>
            <Text style={styles.createButtonText}>+ Create New Group</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Suggested Groups</Text>
          {suggestedGroups.length === 0 ? (
            <Text style={styles.subText}>No suggestions at this time.</Text>
          ) : (
            suggestedGroups.slice(0, MAX_GROUPS_TO_SHOW).map((group, i) => (
              <Animated.View entering={FadeInUp.delay(i * 60)} key={group.id}>
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: "/tabs/groups/foreign_groups_view",
                    params: { group: JSON.stringify(group), user: JSON.stringify(user) },
                  })}
                  style={styles.cardAlt}
                >
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    {group.members?.length ?? 0} {group.members?.length === 1 ? "member" : "members"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}

          {Object.entries(groupedJoinRequests).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Join Requests</Text>
              {Object.entries(groupedJoinRequests).map(([groupId, requests], i) => (
                <Animated.View entering={FadeInUp.delay(i * 60)} key={groupId}>
                  <TouchableOpacity
                    style={styles.requestCard}
                    onPress={() =>
                      router.push({
                        pathname: "/tabs/groups/group_join_requests",
                        params: {
                          groupId,
                          groupName: requests[0].group.name,
                          requests: JSON.stringify(requests),
                          user: JSON.stringify(user),
                        },
                      })}
                  >
                    <Text style={styles.requestText}>{requests.length} request{requests.length > 1 ? "s" : ""} for {requests[0].group.name}</Text>
                    <Text style={styles.requestDate}>Last: {new Date(requests.at(-1)!.created_at).toLocaleDateString()}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </>
          )}

          {ownJoinRequests.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Join Request Results</Text>
              {ownJoinRequests.map((result, i) => (
                <Animated.View entering={FadeInUp.delay(i * 60)} key={result.id}>
                  <View style={styles.resultCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View>
                        <Text style={styles.groupName}>{result.group.name}</Text>
                        <Text
                          style={[
                            styles.resultStatus,
                            result.status === "accepted" ? { color: "#16a34a" } : { color: "#dc2626" },
                          ]}
                        >
                          {result.status === "accepted" ? "Accepted ✅" : "Rejected ❌"}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDismissResult(result.id)} style={styles.dismissButton}>
                        <Text style={styles.dismissText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Join by Invite Code</Text>
          <View style={styles.inviteRow}>
            <TextInput
              placeholder="Enter invite code"
              value={inviteCode}
              onChangeText={setInviteCode}
              style={styles.input}
            />
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinByCode}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>Join</Text>
            </TouchableOpacity>
          </View>
          {inviteCodeError && <Text style={{ color: "#dc2626", marginTop: 4 }}>{inviteCodeError}</Text>}
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="slide"
        visible={showCreateModal}
        onRequestClose={() => setShowCreateModal(false)}
        presentationStyle="pageSheet"
      >
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onGroupCreated={() => user?.id && fetchUserGroups(user.id)}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFAFB" },
  container: { padding: 20 },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E1E1F",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#444",
    marginTop: 24,
    marginBottom: 12,
  },
  subText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#999",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  accent: {
    width: 8,
    backgroundColor: "#6C4FF6",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardAlt: {
    backgroundColor: "#F3F1FD",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1E1F",
  },
  groupMeta: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  requestCard: {
    backgroundColor: "#FFF7FB",
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#F29EDB",
    marginBottom: 14,
  },
  requestText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3A3A3A",
  },
  requestDate: {
    fontSize: 13,
    color: "#A14FA1",
    marginTop: 4,
    fontStyle: "italic",
  },
  resultCard: {
    backgroundColor: "#F0F5FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  resultStatus: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
  },
  dismissButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
  },
  dismissText: {
    fontWeight: "600",
    color: "#374151",
  },
  inviteRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 40,
  },
  input: {
    flex: 1,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
  },
  joinButton: {
    backgroundColor: "#6C4FF6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createButton: {
    backgroundColor: "#6C4FF6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  profileIconButton: {
    position: "absolute",
    right: 18,
    zIndex: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
});