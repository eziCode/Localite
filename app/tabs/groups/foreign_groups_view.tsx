import type { PublicUser } from "@/types/public_user";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
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
  const params = useLocalSearchParams();
  const groupParam = params?.group;
  const userParam = params?.user;
  const [showRequestSentModal, setShowRequestSentModal] = useState(false);
  const [showRequestDeniedModal, setShowRequestDeniedModal] = useState(false);

  const [founderUser, setFounderUser] = useState<PublicUser | null>(null);
  const [leaderUsers, setLeaderUsers] = useState<PublicUser[]>([]);
  const [memberUsers, setMemberUsers] = useState<PublicUser[]>([]);

  const parsedGroup: Group | null = groupParam ? JSON.parse(groupParam as string) : null;
  const parsedUser: import('@supabase/supabase-js').User | null = userParam ? JSON.parse(userParam as string) : null;

  const founder = parsedGroup?.founder;
  const leaders = parsedGroup?.leaders || [];
  const members = parsedGroup?.members.filter(
    id => id !== founder && !leaders.includes(id)
  );

  const leaderLength = leaders.length;
  const memberLength = members?.length;

  const leadersToFetch = leaderLength > 5 ? 5 : leaderLength;
  const membersToFetch = memberLength ? (memberLength > 5 ? 5 : memberLength) : 0;

  useEffect(() => {
    const fetchAll = async () => {
      const { data: founderData } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", founder);

      const { data: leaderData } = await supabase
        .from("users")
        .select("*")
        .in("user_id", leaders.slice(0, leadersToFetch))
        .limit(leadersToFetch);

      const { data: memberData } = await supabase
        .from("users")
        .select("*")
        .in("user_id", (members ?? []).slice(0, membersToFetch))
        .limit(membersToFetch);

      setFounderUser(founderData?.[0] || null);
      setLeaderUsers(leaderData || []);
      setMemberUsers(memberData || []);
    };

    fetchAll();
  }, [parsedGroup, founder, leaders, leadersToFetch, members, membersToFetch]);

  if (!parsedGroup || !parsedUser) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 20, color: "#7c3aed", textAlign: "center" }}>
          No connection right now. Please try again later.
        </Text>
      </View>
    );
  }

  if (!parsedGroup) return;

  const handleJoinGroup = async () => {
    if (parsedGroup.visibility === "open") {
      // Join instantly
      const { error } = await supabase
        .from("groups")
        .update({ members: [...parsedGroup.members, parsedUser.id] })
        .eq("id", parsedGroup.id);

      if (error) {
        console.error("Error joining group:", error);
      } else {
        router.back();
      }
    } 
    else if (parsedGroup.visibility === "request") {
      // Check for existing request
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const { data: existingRequests, error: checkError } = await supabase
      .from("group_join_requests")
      .select("*")
      .eq("group_id", parsedGroup.id)
      .eq("from_id", parsedUser.id)
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

      // Submit new request
      const { error } = await supabase
        .from("group_join_requests")
        .insert({
          group_id: parsedGroup.id,
          from_id: parsedUser.id,
          status: "pending",
          to_id: founder,
          message: `${parsedUser.user_metadata.username} has requested to join your group ${parsedGroup.name}.`
        });
      if (error) {
        console.error("Error requesting to join group:", error);
      } else {
        setShowRequestSentModal(true);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Text style={styles.groupName}>{parsedGroup.name}</Text>
        {parsedGroup.description && (
          <Text style={styles.description}>{parsedGroup.description}</Text>
        )}

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
        <View style={styles.memberContainer}>
          <View style={[styles.member, styles.founderBorder]}>
            <Text style={styles.memberText}>{founderUser.user_name[0]?.toUpperCase()}</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitleRow}>
        <Text>🧭 Leaders ({leaderLength})</Text>
        {leaderLength > 5 && (
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => {
              // TODO: Navigate to full leaders list page
              // router.push("/tabs/groups/all_leaders?group=" + encodeURIComponent(JSON.stringify(parsedGroup)));
            }}
          >
            <Text style={styles.arrowButtonText}>→</Text>
          </TouchableOpacity>
        )}
      </Text>
      <View style={styles.members}>
        {leaderUsers.map((user, i) => (
          <View key={i} style={styles.memberContainer}>
            <View style={[styles.member, styles.leaderBorder]}>
              <Text style={styles.memberText}>{user.user_name[0]?.toUpperCase()}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitleRow}>
        <Text>👥 Members ({memberLength})</Text>
        {memberLength ? memberLength > 5 && (
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => {
              // TODO: Navigate to full members list page
              // router.push("/tabs/groups/all_members?group=" + encodeURIComponent(JSON.stringify(parsedGroup)));
            }}
          >
            <Text style={styles.arrowButtonText}>→</Text>
          </TouchableOpacity>
        ) : null}
      </Text>
      <View style={styles.members}>
        {memberUsers.map((user, i) => (
          <View key={i} style={styles.memberContainer}>
            <View style={styles.member}>
              <Text style={styles.memberText}>{user.user_name[0]?.toUpperCase()}</Text>
            </View>
          </View>
        ))}
      </View>

      {parsedGroup.visibility !== "hidden" && (
        <TouchableOpacity onPress={handleJoinGroup} style={styles.joinButton}>
          <Text style={styles.joinButtonText}>
            {parsedGroup.visibility === "open" ? "🚀 Join Instantly" : "✍️ Request to Join"}
          </Text>
        </TouchableOpacity>
      )}
      
<Modal
  visible={showRequestSentModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowRequestSentModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>🎉 Request Sent!</Text>
      <Text style={styles.modalMessage}>
        We&apos;ll notify the group leader that you want to join{" "}
        <Text style={{ fontWeight: "bold" }}>{parsedGroup.name}</Text>.
      </Text>
      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => {
          setShowRequestSentModal(false);
          router.back();
        }}
      >
        <Text style={styles.modalButtonText}>Got it!</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
<Modal
  visible={showRequestDeniedModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowRequestDeniedModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>🚫 Request Blocked</Text>
      <Text style={styles.modalMessage}>
        You&apos;ve already requested to join{" "}
        <Text style={{ fontWeight: "bold" }}>{parsedGroup.name}</Text>. Please wait until your previous request is processed or a week has passed.
      </Text>
      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => {
          setShowRequestDeniedModal(false);
          router.back();
        }}>
        <Text style={styles.modalButtonText}>Okay</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


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
  invite: {
    marginTop: 10,
    fontSize: 14,
    color: "#6b21a8",
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  members: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  memberContainer: {
    alignItems: "center",
    marginRight: 16,
  },
  member: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
  },
  memberText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  memberLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
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
  arrowButton: {
    marginLeft: 8,
    padding: 4,
  },
  arrowButtonText: {
    fontSize: 20,
    color: "#7c3aed",
    fontWeight: "bold",
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
