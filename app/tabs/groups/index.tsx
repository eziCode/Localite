import { JoinRequestWithGroup } from "@/types/join_request_with_group";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import type { Group } from "../../../types/group";
import CreateGroupModal from "../../modals/create_group";

export default function GroupsPage() {
  const router = useRouter();
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestWithGroup[]>([]);
  const [ownJoinRequests, setOwnJoinRequests] = useState<JoinRequestWithGroup[]>([]);
  const [groupedJoinRequests, setGroupedJoinRequests] = useState<{ [groupId: number]: JoinRequestWithGroup[] }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchUserGroups = async (userId: string) => {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .filter("members", "cs", JSON.stringify([userId]))
      .order("id", { ascending: false })
      .limit(10);

    if (error) console.error(error);
    else setUserGroups(data);
  };

  const fetchSuggestedGroups = async (userId: string) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: requests, error: requestError } = await supabase
      .from("group_join_requests")
      .select("group_id, status, created_at")
      .eq("from_id", userId);

    if (requestError) {
      console.error("Error fetching join requests:", requestError);
      return;
    }

    const blockedGroupIds = new Set(
      requests?.filter(req =>
        req.status === "pending" ||
        (req.created_at && new Date(req.created_at) > oneWeekAgo)
      ).map(req => req.group_id)
    );

    const { data: groups, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .not("members", "cs", JSON.stringify([userId]))
      .neq("visibility", "hidden");

    if (groupError) console.error(groupError);
    else setSuggestedGroups(groups.filter(group => !blockedGroupIds.has(group.id)));
  };

  const fetchJoinRequests = async (userId: string) => {
    const { data, error } = await supabase
      .from("group_join_requests")
      .select("*, group:group_id (name)")
      .eq("to_id", userId)
      .eq("status", "pending");

    if (error) console.error("Error fetching join requests:", error);
    else setJoinRequests(data);
  };

  const fetchOwnJoinRequests = async (userId: string) => {
    const { data, error } = await supabase
      .from("group_join_requests")
      .select("*, group:group_id (name)")
      .eq("from_id", userId)
      .neq("status", "pending");

    if (error) console.error("Error fetching own join requests:", error);
    else setOwnJoinRequests(data);
  };

  const handleDismissResult = async (id: number) => {
    const { error } = await supabase
      .from("group_join_requests")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Error dismissing join request result:", error);
    }
    setOwnJoinRequests(prev => prev.filter(req => req.id !== id));
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
    const grouped: { [groupId: number]: JoinRequestWithGroup[] } = {};
    for (const request of joinRequests) {
      const groupId = Number(request.group_id);
      if (!grouped[groupId]) grouped[groupId] = [];
      grouped[groupId].push(request);
    }
    setGroupedJoinRequests(grouped);
  }, [joinRequests]);

  useFocusEffect(
    useCallback(() => {
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
    }, [])
  );

  const handleJoinByCode = () => {
    console.log("Joining group with code:", inviteCode);
  };

  async function handleRefreshGroups(): Promise<void> {
    if (user) {
      await fetchUserGroups(user.id);
      await fetchSuggestedGroups(user.id);
      await fetchJoinRequests(user.id);
    }
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fafafa" }}>
        <ScrollView style={styles.container}>
          <Text style={styles.title}>Your Groups</Text>
          {userGroups.length === 0 ? (
            <Text style={styles.subText}>No groups yet.</Text>
          ) : (
            <FlatList
              data={userGroups}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.card}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.groupMeta}>{item.members?.length ?? 0} {item.members?.length === 1 ? "member" : "members"}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.createButton}>
            <Text style={styles.createButtonText}>+ Create New Group</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Suggested Groups</Text>
          {suggestedGroups.length === 0 ? (
            <Text style={styles.subText}>No suggested groups at this time.</Text>
          ) : (
            <FlatList
              data={suggestedGroups}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/tabs/groups/foreign_groups_view", params: { group: JSON.stringify(item), user: JSON.stringify(user) } })}
                  style={styles.suggestedGroup}
                >
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.groupMeta}>{item.members?.length ?? 0} {item.members?.length === 1 ? "member" : "members"}</Text>
                  {item.invite_code && <Text style={styles.nextEvent}>Invite Code: {item.invite_code}</Text>}
                </TouchableOpacity>
              )}
            />
          )}

          {Object.entries(groupedJoinRequests).length > 0 && (
            <>
              <Text style={styles.title}>Join Requests</Text>
              {Object.entries(groupedJoinRequests).map(([groupId, requests]) => (
                <TouchableOpacity
                  key={groupId}
                  onPress={() =>
                    router.push({
                      pathname: "/tabs/groups/group_join_requests",
                      params: {
                        groupId: groupId.toString(),
                        groupName: requests[0].group.name,
                        requests: JSON.stringify(requests),
                      },
                    })
                  }
                  style={styles.requestCard}
                >
                  <Text style={styles.requestText}>{requests.length} join request{requests.length > 1 ? "s" : ""} for {requests[0].group.name}</Text>
                  <Text style={styles.requestDate}>Last request: {new Date(requests[requests.length - 1].created_at).toLocaleDateString()}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
          {ownJoinRequests.length > 0 && (
          <>
            <Text style={styles.title}>Join Request Results</Text>
            {ownJoinRequests.map((result) => (
              <View key={result.id} style={styles.resultCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={styles.resultGroup}>{result.group.name}</Text>
                    <Text
                      style={[
                        styles.resultStatus,
                        result.status === "accepted"
                          ? { color: "#16a34a" }
                          : { color: "#dc2626" },
                      ]}
                    >
                      {result.status === "accepted" ? "Accepted ✅" : "Rejected ❌"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDismissResult(result.id)}
                    style={styles.dismissButton}
                  >
                    <Text style={styles.dismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

          <Text style={styles.title}>Join by Invite Code</Text>
          <View style={styles.inviteRow}>
            <TextInput
              placeholder="Enter invite code"
              value={inviteCode}
              onChangeText={setInviteCode}
              style={styles.input}
            />
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinByCode}>
              <Text style={{ color: "white" }}>Join</Text>
            </TouchableOpacity>
          </View>
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
          onGroupCreated={handleRefreshGroups}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 50, paddingHorizontal: 20, backgroundColor: "#fafafa" },
  title: { fontSize: 24, fontWeight: "700", color: "#3a3a3a", marginTop: 24, marginBottom: 12 },
  subText: { color: "#9a9a9a", marginBottom: 12, fontStyle: "italic" },
  card: { backgroundColor: "#fefefe", borderRadius: 12, padding: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, marginBottom: 12 },
  groupName: { fontSize: 18, fontWeight: "600", color: "#242424" },
  groupMeta: { fontSize: 14, color: "#7a7a7a", marginTop: 4 },
  nextEvent: { color: "#567a68", marginTop: 6, fontSize: 14, fontStyle: "italic" },
  suggestedGroup: { backgroundColor: "#f0f0f0", padding: 14, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: "#d7a4ff" },
  inviteRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 40 },
  input: { flex: 1, borderColor: "#bbb", borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: "#fff" },
  joinButton: { backgroundColor: "#7c5e99", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  createButton: { backgroundColor: "#7c5e99", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignSelf: "flex-start", marginBottom: 16 },
  createButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  requestCard: { backgroundColor: "#fff9fc", borderLeftColor: "#ff90c2", borderLeftWidth: 4, borderRadius: 10, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  requestText: { fontSize: 16, fontWeight: "600", color: "#3a3a3a" },
  requestDate: { fontSize: 13, color: "#b36f9c", marginTop: 4, fontStyle: "italic" },
  resultCard: {
  backgroundColor: "#f9f9ff",
  borderRadius: 10,
  padding: 14,
  marginBottom: 10,
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 2,
  elevation: 1,
},
resultGroup: {
  fontSize: 16,
  fontWeight: "600",
  color: "#3a3a3a",
},
resultStatus: {
  marginTop: 4,
  fontSize: 14,
  fontWeight: "500",
},
dismissButton: {
  paddingVertical: 6,
  paddingHorizontal: 12,
  backgroundColor: "#e5e7eb",
  borderRadius: 6,
},
dismissText: {
  color: "#374151",
  fontWeight: "500",
  fontSize: 14,
},

});
