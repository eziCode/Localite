import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ForeignGroupsViewProps = {
  onClose: () => void;
};

export default function ForeignGroupsView({ onClose }: ForeignGroupsViewProps) {
  return (
    <View style={styles.container}>
      <Text>
        Foreign Groups
      </Text>
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
});