import { hasInappropriateLanguage } from "@/lib/helper_functions/hasInappropriateLanguage";
import { uploadUserInteraction } from "@/lib/helper_functions/uploadUserInteraction";
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
  placeId: string;
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
  const [checkingLanguage, setCheckingLanguage] = useState(false);

  // Separate user location and selected location coordinates
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);

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
      setUserCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  const fetchAutocompletePredictions = async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      // Clear selected location coordinates when user starts typing new location
      setSelectedLocationCoords(null);
      return;
    }

    try {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": "AIzaSyB3FvzVv3IFEEDqPI_7170CgYk0NWudrMI",
            "X-Goog-FieldMask":
              "suggestions.placePrediction.text.text,suggestions.placePrediction.placeId",
          },
          body: JSON.stringify({
            input,
            locationBias: {
              circle: {
                center: userCoords || { latitude: 37.7749, longitude: -122.4194 },
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

      const parsed: Prediction[] = suggestions
        .map((s: any, idx: number) => {
          const placePrediction = s.placePrediction;
          const queryPrediction = s.queryPrediction;
          
          if (placePrediction) {
            return {
              id: idx.toString(),
              text: placePrediction.text?.text || "",
              placeId: placePrediction.placeId || "",
            };
          } else if (queryPrediction) {
            // Query predictions don't have placeIds, so we'll skip them
            return null;
          }
          return null;
        })
        .filter((item: { placeId: string; } | null): item is Prediction => item !== null && item.placeId !== "");

      setPredictions(parsed);
    } catch (err) {
      console.error("Prediction error:", err);
      setPredictions([]);
    }
  };

  const fetchPlaceCoordinates = async (placeId: string) => {
    if (!placeId) {
      console.error("No placeId provided");
      return;
    }

    try {
      console.log("Fetching coordinates for placeId:", placeId);
      
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": "AIzaSyB3FvzVv3IFEEDqPI_7170CgYk0NWudrMI",
            "X-Goog-FieldMask": "location",
          },
        }
      );

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        console.error("HTTP error:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error response body:", errorText);
        return;
      }

      const responseText = await response.text();
      console.log("Raw response:", responseText);

      if (!responseText.trim()) {
        console.error("Empty response received");
        return;
      }

      const json = JSON.parse(responseText);
      
      if (json.error) {
        console.error("API error:", json.error);
        return;
      }

      const location = json.location;
      if (location?.latitude && location?.longitude) {
        console.log("Setting selected location coordinates:", location);
        setSelectedLocationCoords({ 
          latitude: location.latitude, 
          longitude: location.longitude 
        });
      } else {
        console.error("No location data in response:", json);
      }
    } catch (error) {
      console.error("Error in fetchPlaceCoordinates:", error);
      if (typeof error === "object" && error !== null && "message" in error) {
        console.error("Error details:", (error as { message: string }).message);
      }
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

    // Check if we have coordinates for the selected location
    if (!selectedLocationCoords) {
      newErrors.push("locationCoordinates");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);

    const { data: existingEvents, error: fetchExistingEventsError } = await supabase
      .from("events")
      .select("*")
      .eq("title", title.trim())
      .eq("location_name", location.trim())
      .eq("organizer_id", user.id)

    if (fetchExistingEventsError) {
      console.error("Error fetching existing events:", fetchExistingEventsError);
      return;
    }
    if (existingEvents.length > 0) {
      setErrors(["eventExists"]);
      return;
    }

    const pushEvent = async () => {
      const { data, error } = await supabase.rpc("average_group_age_w_group_id_as_uuid", { group_id: current_group?.id || null });
      if (error) {
        console.error("Error fetching average age:", error);
        return;
      }
      
      // Use selected location coordinates instead of user coordinates
      console.log("Using coordinates for event:", selectedLocationCoords);
      const { latitude: locationLatitude, longitude: locationLongitude } = selectedLocationCoords || {};

      const { minAge, maxAge } = getAgeRange(data);
      const { error: insertError } = await supabase
        .from("events")
        .insert({
          title,
          description,
          location_name: location,
          latitude: locationLatitude,
          longitude: locationLongitude,
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

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("title", title.trim())
      .eq("organizer_id", user.id);

    if (eventError) {
      console.error("Error fetching event data:", eventError);
      return;
    }

    uploadUserInteraction(user.id, eventData[0]?.id, "posted_event", "event");
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
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
              setErrors((prev) => prev.filter(e => e !== "title" && e !== "eventExists"));
              // Do NOT remove "title contains inappropriate language" here
            }}
            onBlur={async () => {
              if (title.trim()) {
                setCheckingLanguage(true);
                if (await hasInappropriateLanguage(title)) {
                  setErrors((prev) =>
                    prev.includes("title contains inappropriate language")
                      ? prev
                      : [...prev, "title contains inappropriate language"]
                  );
                } else {
                  setErrors((prev) =>
                    prev.filter(e => e !== "title contains inappropriate language")
                  );
                }
                setCheckingLanguage(false);
              }
            }}
            style={[styles.input, hasError("title") && styles.inputError]}
          />
          {errors.includes("title contains inappropriate language") && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Title contains inappropriate language.
              </Text>
            </View>
          )}
          {hasError("title") && <Text style={styles.fieldErrorText}>Title is required.</Text>}

          <TextInput
            placeholder="Description (optional)"
            placeholderTextColor="#6b7280"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              // Do NOT remove "description contains inappropriate language" here
            }}
            multiline
            numberOfLines={4}
            style={[
              styles.input,
              styles.descriptionInput,
              errors.includes("description contains inappropriate language") && styles.inputError
            ]}
            blurOnSubmit={true}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            onBlur={async () => {
              if (description.trim()) {
                setCheckingLanguage(true);
                if (await hasInappropriateLanguage(description)) {
                  setErrors((prev) =>
                    prev.includes("description contains inappropriate language")
                      ? prev
                      : [...prev, "description contains inappropriate language"]
                  );
                } else {
                  setErrors((prev) =>
                    prev.filter(e => e !== "description contains inappropriate language")
                  );
                }
                setCheckingLanguage(false);
              }
            }}
          />
          {errors.includes("description contains inappropriate language") && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Description contains inappropriate language.
              </Text>
            </View>
          )}

          <TextInput
            placeholder="Location"
            placeholderTextColor="#6b7280"
            value={location}
            onChangeText={(text) => {
              setLocation(text);
              setErrors((prev) =>
                prev.filter(
                  e =>
                    e !== "location" &&
                    e !== "eventExists" &&
                    e !== "locationCoordinates"
                  // Do NOT remove inappropriate language errors here
                )
              );
              fetchAutocompletePredictions(text);
            }}
            style={[styles.input, hasError("location") && styles.inputError]}
          />
          {hasError("location") && <Text style={styles.fieldErrorText}>Location is required.</Text>}
          {errors.includes("locationCoordinates") && (
            <Text style={styles.fieldErrorText}>Please select a location from the dropdown.</Text>
          )}

          {predictions.length > 0 && (
            <ScrollView
              style={styles.suggestionBox}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {predictions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={async () => {
                    setLocation(item.text);
                    setPredictions([]);
                    // Clear location coordinates error when user selects a location
                    setErrors((prev) => prev.filter(e => e !== "locationCoordinates"));
                    // Fetch coordinates for the selected place
                    await fetchPlaceCoordinates(item.placeId);
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
              setErrors((prev) =>
                prev.filter(
                  e =>
                    e !== "startTime" &&
                    e !== "startTimeInvalid" &&
                    e !== "endTimeInvalid"
                  // Do NOT remove inappropriate language errors here
                )
              );
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
              Keyboard.dismiss();
              setShowEndPicker(true);
              setErrors((prev) =>
                prev.filter(
                  e =>
                    e !== "endTime" &&
                    e !== "endTimeInvalid" &&
                    e !== "startTimeInvalid"
                  // Do NOT remove inappropriate language errors here
                )
              );
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
              setErrors((prev) =>
                prev.filter(
                  e =>
                    e !== "startTime" &&
                    e !== "startTimeInvalid" &&
                    e !== "endTimeInvalid"
                  // Do NOT remove inappropriate language errors here
                )
              );
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
              setErrors((prev) =>
                prev.filter(
                  e =>
                    e !== "endTime" &&
                    e !== "endTimeInvalid" &&
                    e !== "startTimeInvalid"
                  // Do NOT remove inappropriate language errors here
                )
              );
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

          {errors.includes("eventExists") && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                An event with this name, location, and time already exists.
              </Text>
            </View>
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.postButton,
                (errors.includes("title contains inappropriate language") ||
                  errors.includes("description contains inappropriate language") ||
                  checkingLanguage) && { opacity: 0.5 }
              ]}
              onPress={handlePost}
              disabled={
                errors.includes("title contains inappropriate language") ||
                errors.includes("description contains inappropriate language") ||
                checkingLanguage
              }
            >
              <Text style={styles.postText}>
                {checkingLanguage ? "Checking..." : "Post"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostEventModal;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFB" },
  scroll: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60 },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E1E1F",
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1E1E1F",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E2EA",
  },
  inputError: {
    borderColor: "#FF5E5B",
    backgroundColor: "#FFF5F5",
  },
  fieldErrorText: {
    color: "#FF5E5B",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    paddingLeft: 4,
  },
  suggestionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E2EA",
    maxHeight: 200,
  },
  suggestion: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F5",
  },
  suggestionText: {
    fontSize: 16,
    color: "#1E1E1F",
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },
  errorBox: {
    backgroundColor: "rgba(255, 94, 91, 0.08)",
    borderColor: "#FF5E5B",
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: "#FF5E5B",
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
    backgroundColor: "#F2F2F5",
    alignItems: "center",
  },
  postButton: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#6C4FF6",
    alignItems: "center",
    shadowColor: "#6C4FF6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  cancelText: {
    color: "#4D4D4D",
    fontSize: 16,
    fontWeight: "600",
  },
  postText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});