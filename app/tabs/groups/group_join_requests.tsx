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
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const GroupJoinRequests = () => {
  const router = useRouter();
  const { requests, groupName } = useLocalSearchParams();
  const parsedRequests = useMemo(() => JSON.parse(requests as string), [requests]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = parsedRequests[currentIndex];

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const goToNextCard = () => {
    translateX.value = 0;
    translateY.value = 0;
    setCurrentIndex((prev) => prev + 1);
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
        if (!current) return;
        translateX.value = event.translationX;
        translateY.value = event.translationY / 2;
    })
    .onEnd((event) => {
        if (!current) return;

        const isRight = event.translationX > SWIPE_THRESHOLD;
        const isLeft = event.translationX < -SWIPE_THRESHOLD;

        if (isRight || isLeft) {
            translateX.value = withTiming(isRight ? SCREEN_WIDTH : -SCREEN_WIDTH, { duration: 300 }, () => {
            runOnJS(goToNextCard)();
            });
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

  const handleAccept = () => {
    translateX.value = 0;
    translateY.value = 0;
    setCurrentIndex((prev) => prev + 1);
  };

  const handleReject = () => {
    translateX.value = 0;
    translateY.value = 0;
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>×</Text>
        </TouchableOpacity>

        {current ? (
          <>
            <Text style={styles.headerText}>
              {remaining} request{remaining > 1 ? "s" : ""} remaining for {groupName}
            </Text>
            <View style={styles.cardContainer}>
              {/* Only render GestureDetector if current exists */}
              <GestureDetector gesture={pan}>
                <Animated.View style={[styles.card, animatedStyle]}>
                    <Text style={styles.requestText}>{current.message}</Text>
                    {(() => {
                        const user = usersRequestingToJoin.find(
                        (u) => u.user_id === current.from_id
                        );
                        if (!user) return null;
                        return (
                        <>
                            <Text style={styles.userNameText}>Username: {user.user_name}</Text>
                            <Text style={styles.userAgeText}>Age: {user.age}</Text>
                        </>
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
          </>
        ) : (
          <>
            {/* Reset animated values when done */}
            {(() => {
              translateX.value = 0;
              translateY.value = 0;
              return null;
            })()}
            <Text style={styles.doneText}>You&apos;re all caught up 🎉</Text>
          </>
        )}
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

});

export default GroupJoinRequests;
