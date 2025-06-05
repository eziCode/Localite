import { useRouter } from "expo-router";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function CreateGroupModal() {
  const router = useRouter();

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Create New Group</Text>
        <TextInput placeholder="Group Name" style={styles.input} />
        <TextInput placeholder="Description" style={styles.input} />
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#fefefe",
  },
  button: {
    backgroundColor: "#7c5e99",
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  cancel: {
    textAlign: "center",
    color: "#888",
    marginTop: 8,
  },
});
