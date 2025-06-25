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
    top: 30,
    left: 30,
    opacity: opacityAccept.value,
    transform: [{ scale: 1 + opacityAccept.value * 0.2 }],
    zIndex: 10,
  }));

  const rejectIndicatorStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: 30,
    right: 30,
    opacity: opacityReject.value,
    transform: [{ scale: 1 + opacityReject.value * 0.2 }],
    zIndex: 10,
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
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.doneTitle}>All Done!</Text>
            <Text style={styles.doneSubtitle}>You&apos;ve reviewed all join requests for this group</Text>
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

        <View style={styles.header}>
          <Text style={styles.headerText}>
            {remaining} request{remaining > 1 ? "s" : ""} remaining
          </Text>
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.subText}>Swipe right to accept • Swipe left to reject</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${(currentIndex / parsedRequests.length) * 100}%` }]} />
        </View>

        <View style={styles.cardContainer}>
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.card, animatedStyle]}>
              <Animated.View style={[styles.indicatorContainer, acceptIndicatorStyle]}>
                <Text style={styles.acceptIndicator}>✓</Text>
              </Animated.View>
              <Animated.View style={[styles.indicatorContainer, rejectIndicatorStyle]}>
                <Text style={styles.rejectIndicator}>✕</Text>
              </Animated.View>
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
                      style={styles.nameButton}
                    >
                      <Text style={styles.userName}>{user.user_name}</Text>
                    </TouchableOpacity>
                    <Text style={styles.userAge}>Age {user.age}</Text>
                    {current.message && (
                      <View style={styles.messageBox}>
                        <Text style={styles.messageLabel}>Message:</Text>
                        <Text style={styles.messageText}>&quot;{current.message}&quot;</Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </Animated.View>
          </GestureDetector>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
            <Text style={styles.rejectButtonText}>✕ Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
            <Text style={styles.acceptButtonText}>✓ Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 24,
    color: "#64748b",
    fontWeight: "600",
  },
  header: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  groupName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 12,
  },
  subText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    marginHorizontal: 32,
    marginBottom: 32,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 2,
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: SCREEN_WIDTH - 40,
    maxHeight: SCREEN_HEIGHT * 0.6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  indicatorContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptIndicator: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    backgroundColor: "#10b981",
    width: 60,
    height: 60,
    borderRadius: 30,
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 60,
  },
  rejectIndicator: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    backgroundColor: "#ef4444",
    width: 60,
    height: 60,
    borderRadius: 30,
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 60,
  },
  userCard: {
    alignItems: "center",
    padding: 40,
    width: "100%",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 4,
    borderColor: "#e2e8f0",
  },
  avatarText: {
    fontSize: 36,
    color: "#475569",
    fontWeight: "700",
  },
  nameButton: {
    marginBottom: 8,
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
  },
  userAge: {
    fontSize: 18,
    color: "#64748b",
    marginBottom: 24,
    fontWeight: "500",
  },
  messageBox: {
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  messageLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 16,
    color: "#334155",
    lineHeight: 24,
    fontStyle: "italic",
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 32,
    paddingBottom: 48,
    gap: 16,
  },
  rejectButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    flex: 1,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptButton: {
    backgroundColor: "#10b981",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    flex: 1,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  rejectButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
    textAlign: "center",
  },
  acceptButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
    textAlign: "center",
  },
  doneContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  doneCard: {
    backgroundColor: "#ffffff",
    padding: 48,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  doneEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  doneTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 16,
    textAlign: "center",
  },
  doneSubtitle: {
    fontSize: 18,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 26,
  },
});

export default GroupJoinRequests;