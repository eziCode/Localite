import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function ForeignGroupsView() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Foreign Groups</Text>
      </View>
    </>
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
    fontSize: 24,
    fontWeight: "700",
    color: "#3a3a3a",
  },
});