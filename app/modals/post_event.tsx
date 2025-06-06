import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PostEventModalProps = {
  onClose: () => void;
};

const PostEventModal = ({ onClose }: PostEventModalProps) => {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [vibes, setVibes] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const handlePost = () => {
    const missing: string[] = [];
    if (!title.trim()) missing.push("title");
    if (!location.trim()) missing.push("location");
    if (!vibes.trim()) missing.push("vibes");
    if (!type.trim()) missing.push("type");

    if (missing.length > 0) {
      setErrors(missing);
      return;
    }

    // Handle posting the event here
    
    onClose();
  };

  const hasError = (field: string) => errors.includes(field);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.header}>Post New Event</Text>

          {errors.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Please fill out all required fields.
              </Text>
            </View>
          )}

          <TextInput
          placeholder="Event Title"
          placeholderTextColor="#6b7280"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (errors.length) setErrors([]);
          }}
          style={[
            styles.input,
            hasError("title") && styles.inputError
          ]}
        />

        <TextInput
          placeholder="Location (autocomplete coming soon)"
          placeholderTextColor="#6b7280"
          value={location}
          onChangeText={(text) => {
            setLocation(text);
            if (errors.length) setErrors([]);
          }}
          style={[
            styles.input,
            hasError("location") && styles.inputError
          ]}
        />

        <TextInput
          placeholder="Vibes (e.g., fun, chill, energetic)"
          placeholderTextColor="#6b7280"
          value={vibes}
          onChangeText={(text) => {
            setVibes(text);
            if (errors.length) setErrors([]);
          }}
          style={[
            styles.input,
            hasError("vibes") && styles.inputError
          ]}
        />

        <TextInput
          placeholder="Type (e.g., Study Jam, Game Night)"
          placeholderTextColor="#6b7280"
          value={type}
          onChangeText={(text) => {
            setType(text);
            if (errors.length) setErrors([]);
          }}
          style={[
            styles.input,
            hasError("type") && styles.inputError
          ]}
        />

        <TextInput
          placeholder="Description (optional)"
          placeholderTextColor="#6b7280"
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            if (errors.length) setErrors([]);
          }}
          multiline
          numberOfLines={4}
          style={[styles.input, styles.descriptionInput]}
        />


          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.postButton} onPress={handlePost}>
              <Text style={styles.postText}>Post</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostEventModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputError: {
    borderColor: "#f87171",
    backgroundColor: "#fef2f2",
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderColor: "#f87171",
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  postButton: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#7c3aed",
    alignItems: "center",
  },
  cancelText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  postText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});