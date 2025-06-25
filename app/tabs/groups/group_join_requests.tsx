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

configureReanimatedLogger({ strict: false });

const GroupJoinRequests = () => {
  const router = useRouter();
  const { requests, groupName, groupId } = useLocalSearchParams();
  const parsedRequests = useMemo(() => JSON.parse(requests as string), [requests]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = parsedRequests[currentIndex];

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacityAccept = useSharedValue(0);
  const opacityReject = useSharedValue(0);

  const processSwipe = (id: string, status: string) => {
    updateSupabaseRequestStatus(id, status);
    goToNextCard();
  };

  const goToNextCard = () => {
    translateX.value = 0;
    translateY.value = 0;
    opacityAccept.value = 0;
    opacityReject.value = 0;
    setCurrentIndex((prev) => prev + 1);
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (!parsedRequests[currentIndex]) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY / 2;
      opacityAccept.value = event.translationX > 0 ? Math.min(event.translationX / 100, 1) : 0;
      opacityReject.value = event.translationX < 0 ? Math.min(-event.translationX / 100, 1) : 0;
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

  const acceptIndicatorStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: 20,
    left: 20,
    opacity: opacityAccept.value,
    transform: [{ scale: 1 + opacityAccept.value * 0.2 }],
  }));

  const rejectIndicatorStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: 20,
    right: 20,
    opacity: opacityReject.value,
    transform: [{ scale: 1 + opacityReject.value * 0.2 }],
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
      const { error: updateError } = await supabase.rpc(
        "append_member_to_group_id_w_group_id_as_uuid",
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
    updateSupabaseRequestStatus(current.id, "accepted");
    setCurrentIndex((prev) => prev + 1);
  };

  const handleReject = () => {
    if (!current) return;
    translateX.value = 0;
    translateY.value = 0;
    updateSupabaseRequestStatus(current.id, "rejected");
    setCurrentIndex((prev) => prev + 1);
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

  if (!parsedRequests[currentIndex]) {
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
        <Text style={styles.subText}>Swipe right to accept ✅ • Swipe left to reject ❌</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${(currentIndex / parsedRequests.length) * 100}%` }]} />
        </View>

        <View style={styles.cardContainer}>
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.card, animatedStyle]}>
              <Animated.Text style={[styles.indicatorText, acceptIndicatorStyle]}>✅</Animated.Text>
              <Animated.Text style={[styles.indicatorText, rejectIndicatorStyle]}>❌</Animated.Text>
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
    paddingTop: 64,
    paddingHorizontal: 20,
    backgroundColor: "#fdfdfd",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 32,
    color: "#7c3aed",
    fontWeight: "700",
  },
  headerText: {
    marginTop: 20,
    marginBottom: 6,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#2e1065",
  },
  subText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#a78bfa",
    borderRadius: 3,
  },
  indicatorText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#10b981",
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#f5f3ff",
    borderRadius: 20,
    padding: 28,
    width: SCREEN_WIDTH - 36,
    height: SCREEN_HEIGHT * 0.58,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 5,
  },
  userCard: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#e9d5ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#a855f7",
  },
  avatarText: {
    fontSize: 30,
    color: "#6b21a8",
    fontWeight: "bold",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e1b4b",
    marginBottom: 2,
  },
  userAge: {
    fontSize: 15,
    color: "#71717a",
    marginBottom: 12,
  },
  messageBox: {
    backgroundColor: "#f3e8ff",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    width: "100%",
  },
  messageText: {
    fontSize: 15,
    fontStyle: "italic",
    color: "#4b5563",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 40,
    gap: 16,
  },
  rejectButton: {
    backgroundColor: "#f87171",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    flex: 1,
  },
  acceptButton: {
    backgroundColor: "#4ade80",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    flex: 1,
  },
  actionText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  doneContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  doneCard: {
    backgroundColor: "#ecfeff",
    padding: 28,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    alignItems: "center",
    maxWidth: SCREEN_WIDTH * 0.85,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
    textAlign: "center",
  },
  doneSubtitle: {
    fontSize: 16,
    color: "#334155",
    textAlign: "center",
  },
});

export default GroupJoinRequests;
