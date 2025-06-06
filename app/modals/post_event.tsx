import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PostEventModalProps = {
  onClose: () => void;
};

type Prediction = {
  id: string;
  text: string;
};

const PostEventModal = ({ onClose }: PostEventModalProps) => {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [vibes, setVibes] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const fetchAutocompletePredictions = async (input: string) => {
    if (input.length < 2) return setPredictions([]);

    try {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": "AIzaSyB3FvzVv3IFEEDqPI_7170CgYk0NWudrMI",
            "X-Goog-FieldMask":
              "suggestions.placePrediction.text.text,suggestions.queryPrediction.text.text",
          },
          body: JSON.stringify({
            input,
            locationBias: {
              circle: {
                center: { latitude: 37.7749, longitude: -122.4194 },
                radius: 5000.0,
              },
            },
          }),
        }
      );

      const json = await response.json();

      if (json.error) {
        console.error("Error fetching predictions:", json.error);
        setPredictions([]);
        return;
      }

      const suggestions = json.suggestions ?? [];

      const parsed: Prediction[] = suggestions.map((s: any, idx: number) => {
        const text =
          s.placePrediction?.text?.text || s.queryPrediction?.text?.text || "";
        return { id: idx.toString(), text };
      });

      setPredictions(parsed);
    } catch (err) {
      console.error("Prediction error:", err);
      setPredictions([]);
    }
  };

  const handlePost = () => {
    const missing = [];
    if (!title.trim()) missing.push("title");
    if (!location.trim()) missing.push("location");
    if (!vibes.trim()) missing.push("vibes");
    if (!type.trim()) missing.push("type");

    if (missing.length > 0) {
      setErrors(missing);
      return;
    }

    // Handle post logic here
    onClose();
  };

  const hasError = (field: string) => errors.includes(field);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.scroll}>
          <Text style={styles.header}>Post New Event</Text>

          {errors.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Please fill out all required fields.</Text>
            </View>
          )}

          <TextInput
            placeholder="Event Title"
            placeholderTextColor="#6b7280"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              setErrors([]);
            }}
            style={[styles.input, hasError("title") && styles.inputError]}
          />

          <TextInput
            placeholder="Location"
            placeholderTextColor="#6b7280"
            value={location}
            onChangeText={(text) => {
              setLocation(text);
              setErrors([]);
              fetchAutocompletePredictions(text);
            }}
            style={[styles.input, hasError("location") && styles.inputError]}
          />

          {predictions.length > 0 && (
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setLocation(item.text);
                    setPredictions([]);
                  }}
                  style={styles.suggestion}
                >
                  <Text style={styles.suggestionText}>{item.text}</Text>
                </TouchableOpacity>
              )}
              style={styles.suggestionBox}
              keyboardShouldPersistTaps="handled"
            />
          )}

          <TextInput
            placeholder="Vibes (e.g., fun, chill, energetic)"
            placeholderTextColor="#6b7280"
            value={vibes}
            onChangeText={(text) => {
              setVibes(text);
              setErrors([]);
            }}
            style={[styles.input, hasError("vibes") && styles.inputError]}
          />

          <TextInput
            placeholder="Type (e.g., Study Jam, Game Night)"
            placeholderTextColor="#6b7280"
            value={type}
            onChangeText={(text) => {
              setType(text);
              setErrors([]);
            }}
            style={[styles.input, hasError("type") && styles.inputError]}
          />

          <TextInput
            placeholder="Description (optional)"
            placeholderTextColor="#6b7280"
            value={description}
            onChangeText={(text) => setDescription(text)}
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60 },
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
  suggestionBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: 150,
  },
  suggestion: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  suggestionText: {
    fontSize: 16,
    color: "#1f2937",
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

export default PostEventModal;
