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
  View
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
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestWithGroup[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<JoinRequestWithGroup | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Helper functions
  const fetchUserGroups = async (userId: string) => {
    const { data: userGroupsData, error: userGroupsError } = await supabase
      .from("groups")
      .select("*")
      .filter("members", "cs", JSON.stringify([userId]))
      .order("id", { ascending: false })
      .limit(10);

    if (userGroupsError) {
      console.error(userGroupsError);
    } else {
      setUserGroups(userGroupsData);
    }
  };

  const fetchSuggestedGroups = async (userId: string) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch recent or pending join requests
    const { data: requests, error: requestError } = await supabase
      .from("group_join_requests")
      .select("group_id, status, created_at")
      .eq("from_id", userId);

    if (requestError) {
      console.error("Error fetching join requests:", requestError);
      return;
    }

    const blockedGroupIds = new Set(
      requests
        ?.filter(req =>
          req.status === "pending" ||
          (req.created_at && new Date(req.created_at) > oneWeekAgo)
        )
        .map(req => req.group_id)
    );

    // Fetch suggested groups
    const { data: suggestedGroupsData, error: suggestedGroupsError } = await supabase
      .from("groups")
      .select("*")
      .not("members", "cs", JSON.stringify([userId]))
      .neq("visibility", "hidden");

    if (suggestedGroupsError) {
      console.error(suggestedGroupsError);
    } else {
      // Filter out groups that have pending/recent requests
      const filteredGroups = suggestedGroupsData.filter(
        group => !blockedGroupIds.has(group.id)
      );
      setSuggestedGroups(filteredGroups);
    }
  };

  const fetchJoinRequests = async (userId: string) => {
    const { data, error } = await supabase
      .from("group_join_requests")
      .select(`*, group:group_id (name)`)
      .eq("to_id", userId)
  
    if (error) {
      console.error("Error fetching join requests:", error);
      return;
    } else {
      setJoinRequests(data);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchUserGroups(user.id);
        fetchSuggestedGroups(user.id);
        fetchJoinRequests(user.id);
      }
    };
    fetchAll();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // This will run every time the screen comes into focus
      const fetchAll = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          fetchUserGroups(user.id);
          fetchSuggestedGroups(user.id);
        }
      };
      fetchAll();
    }, [])
  );

  const handleJoinByCode = () => {
    // TODO: Check invite code against Supabase
    console.log("Joining group with code:", inviteCode);
  };

  const handleCreateGroup = () => {
    setShowCreateModal(true);
  };

  const handleRefreshGroups = () => {
    if (user) {
      fetchUserGroups(user.id);
      fetchSuggestedGroups(user.id);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fafafa" }} >
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
                <Text style={styles.groupMeta}>
                  {item.members?.length ?? 0}{" "}
                  {item.members?.length === 1 ? "member" : "members"}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
        <TouchableOpacity onPress={handleCreateGroup} style={styles.createButton}>
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
                onPress={() => router.push({
                  pathname: "/tabs/groups/foreign_groups_view",
                  params: { 
                    group: JSON.stringify(item),
                    user: JSON.stringify(user),
                  },
                })}
                style={styles.suggestedGroup}
              >
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupMeta}>
                  {item.members?.length ?? 0}{" "}
                  {item.members?.length === 1 ? "member" : "members"}
                </Text>
                {item.invite_code && (
                  <Text style={styles.nextEvent}>
                    Invite Code: {item.invite_code}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        )}
        {joinRequests.length > 0 && (
  <>
    <Text style={styles.title}>Join Requests</Text>
          <FlatList
            data={joinRequests}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedRequest(item);
                  setShowRequestModal(true);
                }}
                style={styles.requestCard}
              >
                <Text style={styles.requestText}>
                  Request to join group: {item.group.name}
                </Text>
                <Text style={styles.requestSubText}>
                  Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
                <Text style={styles.requestDate}>
                  Requested on {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )}
          />
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
        visible={showRequestModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setShowRequestModal(false)}
              style={styles.closeButton}
            >
              <Text style={{ fontSize: 18 }}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              Join Request for {selectedRequest?.group.name}
            </Text>
            <Text style={styles.modalMessage}>{selectedRequest?.message}</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#7ac47a" }]}
                onPress={() => {
                  // TODO: handle accept logic
                  setShowRequestModal(false);
                }}
              >
                <Text style={styles.actionText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#d36f6f" }]}
                onPress={() => {
                  // TODO: handle reject logic
                  setShowRequestModal(false);
                }}
              >
                <Text style={styles.actionText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  container: {
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: "#fafafa",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3a3a3a",
    marginTop: 24,
    marginBottom: 12,
  },
  subText: {
    color: "#9a9a9a",
    marginBottom: 12,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: "#fefefe",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#242424",
  },
  groupMeta: {
    fontSize: 14,
    color: "#7a7a7a",
    marginTop: 4,
  },
  nextEvent: {
    color: "#567a68",
    marginTop: 6,
    fontSize: 14,
    fontStyle: "italic",
  },
  suggestedGroup: {
    backgroundColor: "#f0f0f0",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#d7a4ff",
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 40,
  },
  input: {
    flex: 1,
    borderColor: "#bbb",
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  joinButton: {
    backgroundColor: "#7c5e99",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButton: {
    backgroundColor: "#7c5e99",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  requestCard: {
  backgroundColor: "#fff9fc",
  borderLeftColor: "#ff90c2",
  borderLeftWidth: 4,
  borderRadius: 10,
  padding: 14,
  marginBottom: 12,
  shadowColor: "#000",
  shadowOpacity: 0.03,
  shadowRadius: 2,
  elevation: 1,
},
requestText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#3a3a3a",
},
requestSubText: {
  fontSize: 14,
  color: "#8a8a8a",
  marginTop: 4,
},
requestDate: {
  fontSize: 13,
  color: "#b36f9c",
  marginTop: 4,
  fontStyle: "italic",
},
modalOverlay: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.4)",
},
modalContent: {
  width: "85%",
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 20,
  alignItems: "center",
},
modalTitle: {
  fontSize: 20,
  fontWeight: "700",
  marginBottom: 10,
  color: "#3a3a3a",
  textAlign: "center",
},
modalMessage: {
  fontSize: 15,
  color: "#555",
  marginBottom: 20,
  textAlign: "center",
},
actionRow: {
  flexDirection: "row",
  gap: 12,
},
actionButton: {
  flex: 1,
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 8,
  alignItems: "center",
},
actionText: {
  color: "#fff",
  fontWeight: "600",
},
closeButton: {
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 1,
},
});
