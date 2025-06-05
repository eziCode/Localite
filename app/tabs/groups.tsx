import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Group = {
  id: string;
  created_at: string;
  name: string;
  description?: string;
  invite_code?: string;
  creator_id: string;
  members: string[];
};

export default function GroupsPage() {
  const router = useRouter();
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: userGroupsData, error: userGroupsError } = await supabase
          .from("groups")
          .select("*")
          .filter("members", "cs", JSON.stringify([user.id]))
          .limit(10);

        if (userGroupsError) console.error(userGroupsError);
        else setUserGroups(userGroupsData);

        const { data: suggestedGroupsData, error: suggestedGroupsError } = await supabase
          .from("groups")
          .select("*")
          .not("members", "cs", JSON.stringify([user.id]))
          .limit(5);

        if (suggestedGroupsError) console.error(suggestedGroupsError);
        else setSuggestedGroups(suggestedGroupsData);
      }
    };
    fetchUser();
  }, []);

  const handleJoinByCode = () => {
    // TODO: Check invite code against Supabase
    console.log("Joining group with code:", inviteCode);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
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
        <Text style={styles.title}>Suggested Groups</Text>
        {suggestedGroups.length === 0 ? (
          <Text style={styles.subText}>No suggested groups at this time.</Text>
        ) : (
          <FlatList
            data={suggestedGroups}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestedGroup}>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
  },
  subText: {
    color: "#777",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#f3f3f3",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
  },
  groupMeta: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  nextEvent: {
    color: "#2e7d32",
    marginTop: 6,
    fontSize: 14,
  },
  suggestedGroup: {
    backgroundColor: "#f9f9f9",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
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
    borderColor: "#ccc",
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
  },
  joinButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
});
