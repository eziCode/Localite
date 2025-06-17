import { hasInappropriateLanguage } from "@/lib/helper_functions/hasInappropriateLanguage";
import { uploadUserInteraction } from "@/lib/helper_functions/uploadUserInteraction";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";

type CreateGroupModalProps = {
  onClose: () => void;
  onGroupCreated: () => void;
};

const vibeOptions = ["Music", "Hiking", "Photography", "Gaming", "Study", "Chill", "Dance", "Spiritual"];

export default function CreateGroupModal({ onClose, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"open" | "request" | "hidden">("open");
  const [error, setError] = useState<string | null>(null);

  const toggleVibe = (vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      return setError("Group name is required");
    }
    if (await hasInappropriateLanguage(groupName)) {
      return setError("Group name contains inappropriate language");
    }
    if (groupName.length < 3) {
      return setError("Group name must be at least 3 characters");
    }
    if (description.length > 150) {
      return setError("Description must be 150 characters or less");
    }
    if (!description.trim()) {
      return setError("Description is required");
    }

    const fetchUser = async () => {
      const { data: existingGroups, error: fetchExistingGroupsError } = await supabase
        .from("groups")
        .select("id")
        .eq("name", groupName.trim())
        .neq("visibility", "hidden");
      
      if (fetchExistingGroupsError) {
        console.error(fetchExistingGroupsError);
        return setError("Failed to check existing groups. Try again.");
      }
      if (existingGroups.length > 0) {
        return setError("A group with this name already exists.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return setError("You must be logged in to create a group.");
      }

      const { error } = await supabase
        .from("groups")
        .insert({
          name: groupName,
          description,
          creator_id: user.id,
          members: [user.id],
          vibes: selectedVibes,
          visibility: visibility,
          founder: user.id,
          leaders: [],
        });

      if (error) {
        console.error(error);
        return setError("Failed to create group. Try again.");
      }

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("name", groupName)
        .eq("creator_id", user.id)
        .single();
      
      if (groupError) {
        console.error(groupError);
        return setError("Failed to retrieve created group. Try again.");
      }

      uploadUserInteraction(user.id, group.id as number, "created_group", "group");
      onGroupCreated();
      onClose();
    };

    fetchUser();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Group</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TextInput
        placeholder="Group Name"
        value={groupName}
        onChangeText={setGroupName}
        style={styles.input}
        placeholderTextColor="#b3a3c7"
      />
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
        multiline
        placeholderTextColor="#b3a3c7"
      />

      <Text style={styles.sectionLabel}>Pick a vibe</Text>
      <View style={styles.vibeContainer}>
        {vibeOptions.map((vibe) => (
          <TouchableOpacity
            key={vibe}
            onPress={() => toggleVibe(vibe)}
            style={[
              styles.vibeChip,
              selectedVibes.includes(vibe) && styles.vibeChipSelected,
            ]}
          >
            <Text
              style={[
                styles.vibeChipText,
                selectedVibes.includes(vibe) && styles.vibeChipTextSelected,
              ]}
            >
              {vibe}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Visibility</Text>
      <View style={styles.visibilityOptions}>
        {["open", "request", "hidden"].map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => setVisibility(option as "open" | "request" | "hidden")}
            style={[
              styles.visibilityChip,
              visibility === option && styles.visibilityChipSelected,
            ]}
          >
            <Text
              style={[
                styles.visibilityText,
                visibility === option && styles.visibilityTextSelected,
              ]}
            >
              {option === "open"
                ? "🌐 Open"
                : option === "request"
                ? "📝 Request to Join"
                : "🙈 Hidden"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>


      <TouchableOpacity style={styles.button} onPress={handleCreate}>
        <Text style={styles.buttonText}>Create</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose}>
        <Text style={styles.cancel}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 24,
    backgroundColor: "#fff8f2",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
    color: "#3e2a2a",
  },
  errorBox: {
    backgroundColor: "#ffe8e8",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff5f5f",
    marginBottom: 12,
  },
  errorText: {
    color: "#802020",
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9cce3",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "#fff",
    fontSize: 16,
    color: "#3e2a2a",
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    color: "#6a4e77",
  },
  vibeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 8,
  },
  vibeChip: {
    backgroundColor: "#f2ecf8",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: "#bba5d2",
    borderWidth: 1,
  },
  vibeChipSelected: {
    backgroundColor: "#7c5e99",
    borderColor: "#7c5e99",
  },
  vibeChipText: {
    color: "#7c5e99",
    fontWeight: "500",
  },
  vibeChipTextSelected: {
    color: "#fff",
  },
  privacyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  privacyLabel: {
    fontSize: 16,
    color: "#444",
  },
  button: {
    backgroundColor: "#7c5e99",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  cancel: {
    textAlign: "center",
    color: "#888",
    marginTop: 12,
    fontSize: 15,
  },
  visibilityOptions: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 20,
  },
  visibilityChip: {
    backgroundColor: "#f2ecf8",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: "#bba5d2",
    borderWidth: 1,
  },
  visibilityChipSelected: {
    backgroundColor: "#7c5e99",
    borderColor: "#7c5e99",
  },
  visibilityText: {
    color: "#7c5e99",
    fontWeight: "500",
  },
  visibilityTextSelected: {
    color: "#fff",
  },
});
