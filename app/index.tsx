import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { supabase } from "../lib/supabase";
import Login from "./login_components/login";
import Main from "./tabs/main";


export default function Index() {
  const [ready, setReady] = useState(false);
  const [destination, setDestination] = useState<null | "main" | "login">(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let authDone = false;
    let timerDone = false;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setDestination(session ? "main" : "login");
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
      }).start();
    }
  }, [ready, destination]);

  // Render the correct page under the loading overlay
  let Page = null;
  if (destination === "main") Page = <Main />;
  if (destination === "login") Page = <Login />;

  return (
    <>
      {Page}
      <Animated.View pointerEvents="none" style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.text}>Loading...</Text>
      </Animated.View>
    </>
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