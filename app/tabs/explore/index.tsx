import { supabase } from "@/lib/supabase"; // adjust to your actual path
import * as Location from "expo-location";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Explore() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);

  useEffect(() => {
    const fetchRankedEvents = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        setLoading(false);
        return;
      }

      // Request location permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        setLoading(false);
        return;
      }

      // Get current location
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Call Supabase function with real location
      const response = await fetch("https://axdnmsjjofythsclelgu.functions.supabase.co/rank_events", {
        method: "POST",
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZG5tc2pqb2Z5dGhzY2xlbGd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA1Mjg4MSwiZXhwIjoyMDY0NjI4ODgxfQ.BVL_pmvhI_f6W_c8iXN6dSxOyPL5yzru5m_dCxg2JmE`, // use your real key or user token
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id, userLatitude: latitude, userLongitude: longitude }),
      });

      // handle response and potential error codes

    };

    fetchRankedEvents();
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {loading ? (
          <Text style={styles.text}>Loading ranked events...</Text>
        ) : (
          <Text style={styles.text}>
            Got {events.length} ranked event{events.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 22,
    fontWeight: "600",
    color: "#222",
    textAlign: "center",
    paddingHorizontal: 16,
  },
});