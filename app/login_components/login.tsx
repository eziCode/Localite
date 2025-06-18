import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function Auth() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    setShowError(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      setShowError(true);
    } else {
      router.replace("/");
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={text => {
              setEmail(text);
              setShowError(false);
            }}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={text => {
              setPassword(text);
              setShowError(false);
            }}
            style={styles.input}
            secureTextEntry
          />

          {showError && error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/login_components/signup")}>
            <Text style={styles.linkText}>Don&apos;t have an account? Sign up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFB", // Light neutral background
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF", // Card surface
    padding: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
    color: "#1E1E1F", // Dark slate text
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F1F1F3", // Light gray input
    color: "#1E1E1F",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#6C4FF6", // Electric Indigo
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  linkText: {
    textAlign: "center",
    fontSize: 14,
    color: "#4D4D4D", // Medium-dark gray
    marginTop: 8,
    fontWeight: "500",
    textDecorationLine: "underline",
    textDecorationColor: "#6C4FF6",
  },
  errorContainer: {
    backgroundColor: "rgba(255, 94, 91, 0.08)", // Soft coral background
    borderColor: "#FF5E5B",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#FF5E5B",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});
