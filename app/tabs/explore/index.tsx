import { supabase } from "@/lib/supabase";
import { UserEvent } from "@/types/user_event";
import { User } from "@supabase/supabase-js";
import * as Location from "expo-location";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
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

export default function Explore() {
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Move these outside fetchEvents so they're accessible in render
  const [eventsToday, setEventsToday] = useState<UserEvent[]>([]);
  const [eventsThisWeek, setEventsThisWeek] = useState<UserEvent[]>([]);
  const [eventsLater, setEventsLater] = useState<UserEvent[]>([]);

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
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserCoords({ latitude, longitude });
      fetchEvents(user, latitude, longitude);
    };
    initialize();
     
  }, []);

  const fetchEvents = async (user: User, lat: number, lon: number) => {
    try {
      const response = await fetch("https://axdnmsjjofythsclelgu.functions.supabase.co/rank_events", {
        method: "POST",
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZG5tc2pqb2Z5dGhzY2xlbGd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA1Mjg4MSwiZXhwIjoyMDY0NjI4ODgxfQ.BVL_pmvhI_f6W_c8iXN6dSxOyPL5yzru5m_dCxg2JmE`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          userLatitude: lat,
          userLongitude: lon,
          userAge: user.user_metadata?.age,
          offset: 0,
          pageSize: 25,
        }),
      });

      const data = await response.json();

      // Ensure data is an array
      if (!data.events || !Array.isArray(data.events)) {
        console.error("Invalid data from API:", data);
        setEvents([]);
        setEventsToday([]);
        setEventsThisWeek([]);
        setEventsLater([]);
        setLoading(false);
        return;
      }

      setEvents(data.events);

      // Categorize events
      const now = new Date();
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const weekEnd = new Date();
      weekEnd.setDate(now.getDate() + 7);

      setEventsToday(
        data.events.filter((e: UserEvent) => new Date(e.start_time) <= todayEnd)
      );
      setEventsThisWeek(
        data.events.filter(
          (e: UserEvent) =>
            new Date(e.start_time) > todayEnd && new Date(e.start_time) <= weekEnd
        )
      );
      setEventsLater(
        data.events.filter((e: UserEvent) => new Date(e.start_time) > weekEnd)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderEventCard = (event: UserEvent, index: number) => {
    const distance =
      userCoords && event.latitude && event.longitude
        ? `${getDistanceFromLatLonInMiles(
            userCoords.latitude,
            userCoords.longitude,
            event.latitude,
            event.longitude
          ).toFixed(1)} mi`
        : null;

    return (
      <Animated.View entering={FadeInUp.delay(index * 60)} key={event.id}>
        <Pressable
          style={styles.card}
          onPress={() => {
            router.push({
              pathname: "/(shared)/inspect_event",
              params: { user: JSON.stringify(user), event: JSON.stringify(event) },
            });
          }}
        >
          <View style={styles.accent} />
          <View style={styles.cardContent}>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.subtitle}>
              {new Date(event.start_time).toLocaleString()}
            </Text>
            <Text style={styles.meta}>{event.location_name}</Text>
            {distance && <Text style={styles.distance}>{distance}</Text>}
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Explore</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#6C4FF6" />
        ) : (
          <>
            {eventsToday.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Today</Text>
                {eventsToday.map(renderEventCard)}
              </>
            )}
            {eventsThisWeek.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>This Week</Text>
                {eventsThisWeek.map(renderEventCard)}
              </>
            )}
            {eventsLater.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Later</Text>
                {eventsLater.map(renderEventCard)}
              </>
            )}
            {eventsToday.length === 0 &&
              eventsThisWeek.length === 0 &&
              eventsLater.length === 0 && (
                <Text style={styles.sectionTitle}>No events found</Text>
              )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFAFB" },
  container: { padding: 20 },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E1E1F",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#444",
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  accent: {
    width: 8,
    backgroundColor: "#6C4FF6",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1E1F",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  meta: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  distance: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C4FF6",
    marginTop: 6,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },
  tag: {
    backgroundColor: "#ECE9FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: "#6C4FF6",
    fontWeight: "600",
  },
});
