import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import type { Group } from "../../types/group";


type PostEventModalProps = {
  onClose: () => void;
  user: import("@supabase/supabase-js").User;
  current_group: Group | null
};

type Prediction = {
  id: string;
  text: string;
};

function getAgeRange(avgAge: number) {
  const spread = Math.log(avgAge) * 4;
  const minAge = Math.max(13, Math.floor(avgAge - spread));
  const maxAge = Math.min(100, Math.ceil(avgAge + spread));
  return { minAge, maxAge };
}

const PostEventModal = ({ onClose, user, current_group }: PostEventModalProps) => {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [postOnlyToGroup, setPostOnlyToGroup] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn("Permission to access location was denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

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
                center: coords || { latitude: 37.7749, longitude: -122.4194 },
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

  const handlePost = async () => {
    const newErrors: string[] = [];

    if (!title.trim()) newErrors.push("title");
    if (!location.trim()) newErrors.push("location");
    if (!startTime) newErrors.push("startTime");
    if (!endTime) newErrors.push("endTime");
    if (startTime && endTime && endTime <= startTime) {
      newErrors.push("startTimeInvalid");
      newErrors.push("endTimeInvalid");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);

    const pushEvent = async () => {
      const { data, error } = await supabase.rpc("average_group_age", { group_id: current_group?.id || null });
      if (error) {
        console.error("Error fetching average age:", error);
        return;
      }
      const { minAge, maxAge } = getAgeRange(data);
      const { error: insertError } = await supabase
        .from("events")
        .insert({
          title,
          description,
          location_name: location,
          start_time: startTime,
          end_time: endTime,
          organizer_id: user.id,
          group_id: current_group?.id || null,
          post_only_to_group: postOnlyToGroup,
          min_age: minAge,
          max_age: maxAge,
        });

      if (insertError) {
        console.error("Error posting event:", insertError);
        return;
      }
    };

    pushEvent();
    onClose();
  };

  const hasError = (field: string) =>
    errors.includes(field) ||
    (field === "startTime" && errors.includes("startTimeInvalid")) ||
    (field === "endTime" && errors.includes("endTimeInvalid"));

  const showPostOnlyToggle = current_group?.visibility === "hidden" || current_group?.visibility === "request";

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0} // <-- add this line
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.header}>Post New Event</Text>

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
          {hasError("title") && <Text style={styles.fieldErrorText}>Title is required.</Text>}

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
          {hasError("location") && <Text style={styles.fieldErrorText}>Location is required.</Text>}

          {predictions.length > 0 && (
            <ScrollView
              style={styles.suggestionBox}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {predictions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setLocation(item.text);
                    setPredictions([]);
                  }}
                  style={styles.suggestion}
                >
                  <Text style={styles.suggestionText}>{item.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}


          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setShowStartPicker(true);
              setErrors([]);
            }}
            style={styles.input}
          >
            <Text
              style={{
                color: startTime ? "#111827" : "#6b7280",
                fontSize: 16,
                fontFamily: "System",
                fontWeight: "normal",
              }}
            >
              {startTime
                ? startTime.toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "Select Start Time"}
            </Text>
          </TouchableOpacity>
          {hasError("startTime") && <Text style={styles.fieldErrorText}>Start time is required.</Text>}
          {errors.includes("startTimeInvalid") && <Text style={styles.fieldErrorText}>Start time must be before end time.</Text>}

          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss(); // <-- dismiss keyboard
              setShowEndPicker(true);
              setErrors([]);
            }}
            style={styles.input}
          >
            <Text
              style={{
                color: endTime ? "#111827" : "#6b7280",
                fontSize: 16,
                fontFamily: "System",
                fontWeight: "normal",
              }}
            >
              {endTime
                ? endTime.toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "Select End Time"}
            </Text>
          </TouchableOpacity>
          {hasError("endTime") && <Text style={styles.fieldErrorText}>End time is required.</Text>}
          {errors.includes("endTimeInvalid") && <Text style={styles.fieldErrorText}>End time must be after start time.</Text>}

          <DateTimePickerModal
            isVisible={showStartPicker}
            mode="datetime"
            onConfirm={(date) => {
              setStartTime(date);
              setErrors([]);
              setShowStartPicker(false);
            }}
            onCancel={() => setShowStartPicker(false)}
            {...(Platform.OS === "ios" ? { minuteInterval: 5 } : {})}
          />

          <DateTimePickerModal
            isVisible={showEndPicker}
            mode="datetime"
            minimumDate={startTime || undefined}
            onConfirm={(date) => {
              setEndTime(date);
              setErrors([]);
              setShowEndPicker(false);
            }}
            onCancel={() => setShowEndPicker(false)}
            {...(Platform.OS === "ios" ? { minuteInterval: 5 } : {})}
          />
          {showPostOnlyToggle && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <Switch
                value={postOnlyToGroup}
                onValueChange={setPostOnlyToGroup}
              />
              <Text
                style={{
                  marginLeft: 8,
                  color: "#6b7280",
                  fontSize: 16,
                  fontFamily: "System",
                  fontWeight: "normal",
                }}
              >
                Post only to group members
              </Text>
            </View>
          )}

          <TextInput
            placeholder="Description (optional)"
            placeholderTextColor="#6b7280"
            value={description}
            onChangeText={(text) => setDescription(text)}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.descriptionInput]}
            blurOnSubmit={true} // <-- add this
            returnKeyType="done" // <-- add this
            onSubmitEditing={() => Keyboard.dismiss()} // <-- add this
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
  fieldErrorText: {
    color: "#b91c1c",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    paddingLeft: 4,
  },
  suggestionBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: 200,
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
