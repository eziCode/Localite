import { supabase } from "@/lib/supabase";
import { PublicUser } from "@/types/public_user";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  configureReanimatedLogger,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

configureReanimatedLogger({
    strict: false
});

const GroupJoinRequests = () => {
  const router = useRouter();
  const { requests, groupName, groupId } = useLocalSearchParams();
  const parsedRequests = useMemo(() => JSON.parse(requests as string), [requests]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = parsedRequests[currentIndex];

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Combine both actions into one function for runOnJS
  const processSwipe = (id: string, status: string) => {
    updateSupabaseRequestStatus(id, status);
    goToNextCard();
  };

  const goToNextCard = () => {
    translateX.value = 0;
    translateY.value = 0;
    setCurrentIndex((prev) => prev + 1);
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (!parsedRequests[currentIndex]) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY / 2;
    })
    .onEnd((event) => {
      'worklet';
      if (currentIndex >= parsedRequests.length) return;

      const isRight = event.translationX > SWIPE_THRESHOLD;
      const isLeft = event.translationX < -SWIPE_THRESHOLD;

      if (isRight || isLeft) {
        const curr = parsedRequests[currentIndex];
        if (!curr) return;

        translateX.value = withTiming(
          isRight ? SCREEN_WIDTH : -SCREEN_WIDTH,
          { duration: 300 },
          () => {
            runOnJS(processSwipe)(curr.id, isRight ? "accepted" : "rejected");
          }
        );
        translateY.value = withTiming(-50, { duration: 200 });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value / 20}deg` },
    ],
  }));

  const updateSupabaseRequestStatus = async (requestId: string, status: string) => {
    if (!requestId) return;
    const { error } = await supabase
      .from("group_join_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      console.error("Error updating request status:", error);
      return;
    }

    if (status === "accepted" && current?.from_id) {
      // Use Postgres array_append to add user to members array
      const { error: updateError } = await supabase.rpc(
        "append_member_to_group_id_is_int",
        { group_id_input: groupId, user_id_input: current.from_id }
      );
      if (updateError) {
        console.error("Error appending member:", updateError);
      }
    }
  };

  const handleAccept = () => {
    if (!current) return;
    translateX.value = 0;
    translateY.value = 0;
    setCurrentIndex((prev) => prev + 1);
    updateSupabaseRequestStatus(current.id, "accepted");
  };

  const handleReject = () => {
    if (!current) return;
    translateX.value = 0;
    translateY.value = 0;
    setCurrentIndex((prev) => prev + 1);
    updateSupabaseRequestStatus(current.id, "rejected");
  };

  const remaining = parsedRequests.length - currentIndex;

  const [usersRequestingToJoin, setUsersRequestingToJoin] = useState<PublicUser[]>([]);

  useEffect(() => {
    const fetchUserRequestingToJoin = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("user_id", parsedRequests.map((req: any) => req.from_id));

      if (error) {
        console.error("Error fetching users requesting to join:", error);
        return;
      }
      setUsersRequestingToJoin(data || []);
    };
    fetchUserRequestingToJoin();
  }, [parsedRequests]);

  // Fallback: If swiped past end, render empty container
  if (!parsedRequests[currentIndex]) {
    // Reset animated values when done
    translateX.value = 0;
    translateY.value = 0;
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>×</Text>
        </TouchableOpacity>
        <View style={styles.doneContainer}>
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>No more requests</Text>
            <Text style={styles.doneSubtitle}>You&apos;ve reviewed all join requests for this group 🥳</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>×</Text>
        </TouchableOpacity>

        <Text style={styles.headerText}>
          {remaining} request{remaining > 1 ? "s" : ""} remaining for {groupName}
        </Text>
        <View style={styles.cardContainer}>
          {/* Only render GestureDetector if current exists */}
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.card, animatedStyle]}>
              {(() => {
                const user = usersRequestingToJoin.find(
                  (u) => u.user_id === current.from_id
                );
                if (!user) return null;

                const initials = user.user_name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .toUpperCase();

                return (
                  <View style={styles.userCard}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/tabs/groups/inspect_user",
                          params: { userToInspectId: user.user_id },
                        })
                      }
                    >
                      <Text style={styles.userName}>{user.user_name}</Text>
                    </TouchableOpacity>
                    <Text style={styles.userAge}>Age: {user.age}</Text>
                    <View style={styles.messageBox}>
                      <Text style={styles.messageText}>&quot;{current.message}&quot;</Text>
                    </View>
                  </View>
                );
              })()}
            </Animated.View>
          </GestureDetector>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
            <Text style={styles.actionText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
            <Text style={styles.actionText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 28,
    color: "#7c3aed",
    fontWeight: "700",
  },
  headerText: {
    marginTop: 20,
    marginBottom: 16,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
    paddingHorizontal: 40,
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#faf0f8",
    borderRadius: 16,
    padding: 28,
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.55, // Big card
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  requestText: {
    fontSize: 18,
    textAlign: "center",
    color: "#3a3a3a",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  rejectButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  acceptButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  actionText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  doneText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 100,
    color: "#7c3aed",
  },
  userNameText: {
  marginTop: 12,
  fontSize: 16,
  fontWeight: "500",
  color: "#4b5563", // muted gray
},

userAgeText: {
  fontSize: 15,
  color: "#6b7280",
},
userCard: {
  alignItems: "center",
  padding: 20,
  backgroundColor: "#fff",
  borderRadius: 12,
  width: "100%",
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 3,
},

avatar: {
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: "#d8b4fe",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 12,
},

avatarText: {
  fontSize: 28,
  color: "#6b21a8",
  fontWeight: "bold",
},

userName: {
  fontSize: 20,
  fontWeight: "600",
  color: "#333",
  marginBottom: 4,
},

userAge: {
  fontSize: 16,
  color: "#6b7280",
  marginBottom: 12,
},

messageBox: {
  backgroundColor: "#f3e8ff",
  padding: 16,
  borderRadius: 8,
  marginTop: 8,
},

messageText: {
  fontSize: 16,
  fontStyle: "italic",
  color: "#4b5563",
  textAlign: "center",
},
doneContainer: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
},

doneCard: {
  backgroundColor: "#f0f9ff",
  padding: 24,
  borderRadius: 16,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 4,
  alignItems: "center",
  maxWidth: SCREEN_WIDTH * 0.8,
},

doneTitle: {
  fontSize: 22,
  fontWeight: "700",
  color: "#0f172a",
  marginBottom: 8,
  textAlign: "center",
},

doneSubtitle: {
  fontSize: 16,
  color: "#334155",
  textAlign: "center",
},

});

export default GroupJoinRequests;
