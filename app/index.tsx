import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text
} from "react-native";
import { supabase } from "../lib/supabase";

export default function Index() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [destination, setDestination] = useState<null | "/tabs/groups" | "/login_components/login">(null);
  const [firstLoad, setFirstLoad] = useState(true);
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
      setFirstLoad(false); // Hide splash visual if it’s been longer than 1s
      if (authDone) setReady(true);
    }, 1000);

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
      {firstLoad ? (
        <>
          <Image
            source={require("../assets/images/localite_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </>
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
    backgroundColor: "#f9f5ef",
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
