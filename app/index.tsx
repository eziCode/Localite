import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { supabase } from "../lib/supabase";


export default function Index() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [destination, setDestination] = useState<null | "/tabs/groups" | "/login_components/login">(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let authDone = false;
    let timerDone = false;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setDestination(session ? "/tabs/groups" : "/login_components/login");
      authDone = true;
      if (timerDone) setReady(true);
    };

    const timer = setTimeout(() => {
      timerDone = true;
      if (authDone) setReady(true);
    }, 500);

    checkAuth();

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && destination) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        router.replace(destination);
      });
    }
  }, [ready, destination, fadeAnim, router]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.text}>Loading...</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    zIndex: 10,
  },
  text: {
    fontSize: 22,
    fontWeight: "600",
    color: "#222",
  },
});