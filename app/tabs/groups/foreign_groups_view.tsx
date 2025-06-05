import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import type { Group } from "../../../types/group";

export default function ForeignGroupsView() {
  const router = useRouter();
  const { group } = useLocalSearchParams();
  const parsedGroup: Group | null = group ? JSON.parse(group as string) : null;

  if (!parsedGroup) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 20, color: "#7c3aed", textAlign: "center" }}>
          No connection right now. Please try again later.
        </Text>
      </View>
    );
  }

  const founder = parsedGroup.founder;
  const leaders = parsedGroup.leaders || [];
  const members = parsedGroup.members.filter(
    id =>
      id !== parsedGroup.founder &&
      !(parsedGroup.leaders || []).includes(id)
  );

  const leaderLength = Math.min(parsedGroup?.leaders?.length || 0, 5);
  const memberLength = Math.min(parsedGroup?.members?.length || 0, 5);

  const [founderUser, setFounderUser] = useState<{ username: string } | null>(null);
  const [leaderUsers, setLeaderUsers] = useState<{ username: string }[]>([]);
  const [memberUsers, setMemberUsers] = useState<{ username: string }[]>([]);

  async function getUsersByIds(userIds: string[]): Promise<{ id: string; username?: string }[]> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const res = await fetch("https://<your-project-ref>.functions.supabase.co/get-users-by-id", {
    method: "POST",
    headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_ids: userIds }),
      });

      if (!res.ok) {
        console.error("Error fetching users", await res.text());
        return [];
      }

      const { users } = await res.json();
      return users;
    }


  useEffect(() => {
      const fetchAll = async () => {
        const allIds = [
          parsedGroup.founder,
          ...(parsedGroup.leaders || []),
          ...parsedGroup.members,
        ];
        const users = await getUsersByIds(allIds);

        const founder = users.find((u) => u.id === parsedGroup.founder && typeof u.username === "string");
        setFounderUser(founder ? { username: founder.username! } : null);
        setLeaderUsers(
          users
            .filter((u) => parsedGroup.leaders?.includes(u.id) && typeof u.username === "string")
            .map((u) => ({ username: u.username! }))
        );
        setMemberUsers(
          users
            .filter(
              (u) =>
                parsedGroup.members.includes(u.id) &&
                u.id !== parsedGroup.founder &&
                !parsedGroup.leaders?.includes(u.id) &&
                typeof u.username === "string"
            )
            .map((u) => ({ username: u.username! }))
        );
      };

      fetchAll();
    }, [parsedGroup]);


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Text style={styles.groupName}>{parsedGroup.name}</Text>
        {parsedGroup.description && <Text style={styles.description}>{parsedGroup.description}</Text>}

        {parsedGroup.vibes?.length ? (
          <View style={styles.vibes}>
            {parsedGroup.vibes.map((vibe, i) => (
              <Text key={i} style={styles.vibe}>#{vibe.toLowerCase()}</Text>
            ))}
          </View>
        ) : null}

        {parsedGroup.visibility && (
          <Text style={styles.metaBadge}>
            {parsedGroup.visibility === "open" && "🌐 Open to All"}
            {parsedGroup.visibility === "request" && "📝 Request to Join"}
            {parsedGroup.visibility === "hidden" && "🙈 Hidden"}
          </Text>
        )}

        {parsedGroup.invite_code && (
          <Text style={styles.invite}>🔐 Invite Code: {parsedGroup.invite_code}</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>👑 Founder</Text>
      {founderUser && (
        <View style={[styles.member, styles.founderBorder]}>
          <Text style={styles.memberText}>{founderUser.username[0]?.toUpperCase()}</Text>
          <Text style={styles.memberBadge}>Founder</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>🧭 Leaders ({leaders.length})</Text>
      <View style={styles.members}>
        {leaderUsers.map((user, i) => (
          <View key={i} style={[styles.member, styles.leaderBorder]}>
            <Text style={styles.memberText}>{user.username[0]?.toUpperCase()}</Text>
            <Text style={styles.memberBadge}>Leader</Text>
          </View>
        ))}
        {leaders.length === 5 && (
          <TouchableOpacity onPress={() => {/* add your logic here */}}>
            <Text style={styles.moreMembers}>→ View All Leaders</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>👥 Members ({members.length})</Text>
      <View style={styles.members}>
        {memberUsers.map((user, i) => (
          <View key={i} style={styles.member}>
            <Text style={styles.memberText}>{user.username[0]?.toUpperCase()}</Text>
            <Text style={styles.memberBadge}>Member</Text>
          </View>
        ))}
        {members.length === 5 && (
          <TouchableOpacity onPress={() => {/* add your logic here */}}>
            <Text style={styles.moreMembers}>→ View All Members</Text>
          </TouchableOpacity>
        )}
      </View>


      {parsedGroup.visibility !== "hidden" && (
        <TouchableOpacity style={styles.joinButton}>
          <Text style={styles.joinButtonText}>
            {parsedGroup.visibility === "open" ? "🚀 Join Instantly" : "✍️ Request to Join"}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fffefc",
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    fontSize: 18,
    color: "#7c3aed",
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  members: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  member: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
  },
  memberText: {
    color: "#fff",
    fontWeight: "bold",
  },
  memberBadge: {
    position: "absolute",
    bottom: -16,
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
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
  invite: {
    marginTop: 10,
    fontSize: 14,
    color: "#6b21a8",
    fontStyle: "italic",
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
  moreMembers: {
    marginTop: 8,
    fontSize: 14,
    color: "#7c3aed",
    fontWeight: "500",
  },
  founderBorder: {
    borderWidth: 2,
    borderColor: "#facc15",
  },
  leaderBorder: {
    borderWidth: 2,
    borderColor: "#38bdf8",
  },
});
