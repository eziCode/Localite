import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { supabase } from "../../lib/supabase";
import CreateGroupModal from "../modals/create_group";
import ForeignGroupModal from "../modals/foreign_groups_view";


type Group = {
  id: string;
  created_at: string;
  name: string;
  description?: string;
  invite_code?: string;
  creator_id: string;
  members: string[];
  vibes?: string[];
  is_private?: boolean;
  founder: string;
  leaders?: string[];
};

export default function GroupsPage() {
  const router = useRouter();
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showForeignGroupsModal, setShowForeignGroupsModal] = useState(false);

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
    const { data: suggestedGroupsData, error: suggestedGroupsError } = await supabase
      .from("groups")
      .select("*")
      .not("members", "cs", JSON.stringify([userId]))
      .limit(5);

    if (suggestedGroupsError) {
      console.error(suggestedGroupsError);
    } else {
      setSuggestedGroups(suggestedGroupsData);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchUserGroups(user.id);
        fetchSuggestedGroups(user.id);
      }
    };
    fetchAll();
  }, []);

  const handleJoinByCode = () => {
    // TODO: Check invite code against Supabase
    console.log("Joining group with code:", inviteCode);
  };

  const handleCreateGroup = () => {
    setShowCreateModal(true);
  };

  const handleForeignGroups = () => {
    setShowForeignGroupsModal(true);
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
              <TouchableOpacity onPress={handleForeignGroups} style={styles.suggestedGroup}>
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
      <Modal
        animationType="slide"
        visible={showForeignGroupsModal}
        onRequestClose={() => setShowForeignGroupsModal(false)}
        presentationStyle="pageSheet"
      >
        <ForeignGroupModal
          onClose={() => setShowForeignGroupsModal(false)}
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
});
