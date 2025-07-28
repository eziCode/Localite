import { hasInappropriateLanguage } from "@/lib/helper_functions/hasInappropriateLanguage";
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

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setError("");
    if (!email || !username || !age || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (await hasInappropriateLanguage(username)) {
      setError("Username contains inappropriate language.");
      return;
    }
    
    if (isNaN(Number(age)) || Number(age) < 0) {
      setError("Please enter a valid age.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, age: Number(age) },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
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
          <Text style={styles.title}>Create an Account</Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError("");
            }}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <TextInput
            placeholder="Username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              if (error) setError("");
            }}
            style={styles.input}
            autoCapitalize="none"
            textContentType="username"
          />

          <TextInput
            placeholder="Age"
            placeholderTextColor="#999"
            value={age}
            onChangeText={(text) => {
              setAge(text.replace(/[^0-9]/g, ""));
              if (error) setError("");
            }}
            style={styles.input}
            keyboardType="numeric"
            maxLength={3}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError("");
            }}
            style={styles.input}
            secureTextEntry
            textContentType="oneTimeCode"
          />

          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (error) setError("");
            }}
            style={styles.input}
            secureTextEntry
            textContentType="oneTimeCode"
          />

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Already have an account? Log in</Text>
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
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
    color: "#1E1E1F", // Dark slate text
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F1F1F3", // Light gray input background
    color: "#1E1E1F",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    fontSize: 16,
    width: "100%",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#FF5E5B", // Neon Coral
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
    letterSpacing: 0.5,
  },
  linkText: {
    textAlign: "center",
    fontSize: 14,
    color: "#4D4D4D", // Medium gray text
    marginTop: 8,
    fontWeight: "500",
    textDecorationLine: "underline",
    textDecorationColor: "#FF5E5B",
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