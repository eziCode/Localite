import type { PublicUser } from "@/types/public_user";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  SafeAreaView,
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
  }, [founder, leaderToFetchCount, leaders, memberToFetchCount, members]);

  const founderUser = userInfos.find((u) => u.user_id === founder);
  const leadersUserInfos = userInfos.filter((u) => leaders.includes(u.user_id));
  const membersUserInfos = userInfos.filter((u) => members.includes(u.user_id));

  const MemberRow = ({
    name,
    badge,
    profile_picture_url,
  }: {
    name: string;
    badge?: string;
    profile_picture_url?: string;
  }) => (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, paddingLeft: 4 }}>
      {profile_picture_url ? (
        <Image
          source={{ uri: profile_picture_url }}
          style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: "#d4d4d8" }}
        />
      ) : (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#d4d4d8", marginRight: 12 }} />
      )}
      <Text style={{ fontSize: 16, color: "#333", flex: 1 }}>{name}</Text>
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

  if (!group) return;

  const handleJoinGroup = async () => {
    if (group.visibility === "open") {
      // Join instantly
      const { error } = await supabase
        .from("groups")
        .update({ members: [...group.members, user.id] })
        .eq("id", group.id);

      if (error) {
        console.error("Error joining group:", error);
      } else {
        router.back();
      }
    } 
    else if (group.visibility === "request") {
      // Check for existing request
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

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

      // Submit new request
      const { error } = await supabase
        .from("group_join_requests")
        .insert({
          group_id: group.id,
          from_id: user.id,
          status: "pending",
          to_id: founder,
          message: `${user.user_metadata.username} has requested to join your group ${group.name}.`
        });
      if (error) {
        console.error("Error requesting to join group:", error);
      } else {
        setShowRequestSentModal(true);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: "#fff" }}
          contentContainerStyle={[styles.container, { minHeight: "100%" }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.banner}>
            <Text style={styles.groupName}>{group.name}</Text>
            {group.description && (
              <Text style={styles.description}>{group.description}</Text>
            )}

            {group.vibes?.length ? (
              <View style={styles.vibes}>
                {group.vibes.map((vibe, i) => (
                  <Text key={i} style={styles.vibe}>#{vibe.toLowerCase()}</Text>
                ))}
              </View>
            ) : null}

            {group.visibility && (
              <Text style={styles.metaBadge}>
                {group.visibility === "open" && "🌐 Open to All"}
                {group.visibility === "request" && "📝 Request to Join"}
                {group.visibility === "hidden" && "🙈 Hidden"}
              </Text>
            )}

            {group.invite_code && (
              <Text style={styles.invite}>🔐 Invite Code: {group.invite_code}</Text>
            )}
          </View>

          {founderUser && (
  <View style={styles.founderContainer}>
    <MemberRow name={founderUser.user_name} badge="Founder 👑" profile_picture_url={founderUser.profile_picture_url} />
  </View>
)}

{leadersCount > 0 && (
  <>
    <View style={styles.sectionWithArrow}>
      <Text style={styles.sectionHeader}>Leaders</Text>
      {leadersCount > 5 && (
        <TouchableOpacity onPress={() => {router.push("/tabs/groups/group_people_list")}} style={{ padding: 8 }}>
          <Text style={{ fontSize: 25, color: "#7c3aed" }}>›</Text>
        </TouchableOpacity>
      )}
    </View>
    {leadersUserInfos.slice(0, 5).map((leader) => (
      <MemberRow key={leader.id} name={leader.user_name} profile_picture_url={leader.profile_picture_url} />
    ))}
  </>
)}

{membersCount > 0 && (
  <>
    <View style={styles.sectionWithArrow}>
      <Text style={styles.sectionHeader}>Members</Text>
      {membersCount > 5 && (
        <TouchableOpacity onPress={() => {router.push("/tabs/groups/group_people_list")}} style={{ padding: 8 }}>
          <Text style={{ fontSize: 25, color: "#7c3aed" }}>›</Text>
        </TouchableOpacity>
      )}
    </View>
    {membersUserInfos.slice(0, 5).map((member) => (
      <MemberRow key={member.id} name={member.user_name} profile_picture_url={member.profile_picture_url} />
    ))}
  </>
)}

      {group.visibility !== "hidden" && (
        <TouchableOpacity onPress={handleJoinGroup} style={styles.joinButton}>
          <Text style={styles.joinButtonText}>
            {group.visibility === "open" ? "🚀 Join Instantly" : "✍️ Request to Join"}
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
        <Text style={{ fontWeight: "bold" }}>{group.name}</Text>.
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
        <Text style={{ fontWeight: "bold" }}>{group.name}</Text>. Please wait until your previous request is processed or a week has passed.
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
  </View>
  </SafeAreaView>
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
});