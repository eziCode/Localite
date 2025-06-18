import { supabase } from "@/lib/supabase";
import { UserEvent } from "@/types/user_event";
import * as Location from "expo-location";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getDistanceFromLatLonInMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const PAGE_SIZE = 25;

export default function Explore() {
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [absoluteOffset, setAbsoluteOffset] = useState<number | null>(0);
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        setLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserCoords({ latitude, longitude });
      setLoading(false);
    };

    initialize();
  }, []);

  useEffect(() => {
    if (absoluteOffset !== null && user && userCoords) {
      fetchRankedEvents(absoluteOffset, absoluteOffset === 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userCoords]);

  const fetchRankedEvents = async (offsetToUse: number, isInitial = false) => {
    if (!user || !userCoords) return;

    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch("https://axdnmsjjofythsclelgu.functions.supabase.co/rank_events", {
        method: "POST",
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZG5tc2pqb2Z5dGhzY2xlbGd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA1Mjg4MSwiZXhwIjoyMDY0NjI4ODgxfQ.BVL_pmvhI_f6W_c8iXN6dSxOyPL5yzru5m_dCxg2JmE`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          userLatitude: userCoords.latitude,
          userLongitude: userCoords.longitude,
          userAge: user.user_metadata?.age,
          offset: offsetToUse,
          pageSize: PAGE_SIZE,
        }),
      });

      if (response.status === 200) {
        const { events: newEvents, has_more, next_offset } = await response.json() as {
          events: UserEvent[],
          has_more: boolean,
          next_offset: number | null,
        };

        if (offsetToUse === 0) {
          setEvents(newEvents);
        } else {
          setEvents(prev => [...prev, ...newEvents]);
        }

        setHasMore(has_more);
        setAbsoluteOffset(next_offset);
      } else {
        const error = await response.json();
        console.error(`Error ${response.status}:`, error);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && absoluteOffset !== null) {
      fetchRankedEvents(absoluteOffset, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, absoluteOffset]);

  const renderEvent = ({ item }: { item: UserEvent }) => {
    let distanceText = "";
    if (
      userCoords &&
      typeof item.latitude === "number" &&
      typeof item.longitude === "number"
    ) {
      const distance = getDistanceFromLatLonInMiles(
        userCoords.latitude,
        userCoords.longitude,
        item.latitude,
        item.longitude
      );
      distanceText = `${distance.toFixed(1)} miles away`;
    }

    return (
      <Pressable
        style={styles.card}
        onPress={() => console.log("Clicked event:", item.title)}
      >
        <View style={styles.accent} />
        <View style={styles.cardContent}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>
            {new Date(item.start_time).toLocaleString()}
          </Text>
          <Text style={styles.meta}>{item.location_name}</Text>
          {distanceText ? (
            <Text style={styles.distance}>{distanceText}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.pageTitle}>Explore Events Nearby</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#333" />
          ) : events.length === 0 ? (
            <Text style={styles.text}>No events found nearby.</Text>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderEvent}
              contentContainerStyle={styles.listContent}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator size="small" color="#999" style={{ marginVertical: 16 }} />
                ) : !hasMore ? (
                  <Text style={styles.text}>You&apos;ve reached the end.</Text>
                ) : null
              }
            />
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
    paddingTop: 0,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  text: {
    fontSize: 20,
    color: "#444",
    textAlign: "center",
    padding: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  accent: {
    width: 8,
    backgroundColor: "#5e60ce",
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  meta: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  distance: {
    fontSize: 14,
    color: "#5e60ce",
    fontWeight: "600",
    marginTop: 6,
  },
});
