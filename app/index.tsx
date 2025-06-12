import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text
} from "react-native";
import { supabase } from "../lib/supabase";

// Module-level counter to track mounts in this session
let mountCount = 0;

export default function Index() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [destination, setDestination] = useState<null | "/tabs/groups" | "/login_components/login">(null);
  const [showSplash, setShowSplash] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;
    let timerDone = false;
    let authDone = false;

    mountCount += 1;
    const isFirstMount = mountCount === 1;
    setShowSplash(isFirstMount);

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setDestination(session ? "/tabs/groups" : "/login_components/login");
      authDone = true;
      if (isFirstMount || timerDone) setReady(true);
    };

    // If not first mount, show loading for at least 1s
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (!isFirstMount) {
      timer = setTimeout(() => {
        timerDone = true;
        if (authDone) setReady(true);
      }, 1000);
    }

    checkAuth();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
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
      {showSplash ? (
        <Image
          source={require("../assets/images/localite_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.text}>Loading...</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#faf7f3",
    zIndex: 10,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 24,
    fontWeight: "600",
    color: "#444",
  },
  text: {
    fontSize: 22,
    fontWeight: "600",
    color: "#222",
  },
});
