import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PublicUser } from "../../types/public_user";

type Props = {
  visible: boolean;
  onClose: () => void;
  actionType: "promote" | "demote" | "kick" | null;
  selectedUser: PublicUser | null;
  onConfirm: () => void;
};

export default function GroupMemberActionModal({
  visible,
  onClose,
  actionType,
  selectedUser,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {actionType === "promote"
              ? `Promote ${selectedUser?.user_name} to Leader?`
              : actionType === "demote"
              ? `Demote ${selectedUser?.user_name} to Member?`
              : actionType === "kick"
              ? `Kick ${selectedUser?.user_name} from the group?`
              : ""}
          </Text>
          <Text style={styles.modalSubtext}>
            {actionType === "kick"
              ? "This member will be removed from the group immediately."
              : "This change will take effect immediately."}
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 0, marginRight: 10, width: "48%" }]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                { width: "48%" },
                actionType === "promote"
                  ? styles.promoteColor
                  : actionType === "demote"
                  ? styles.demoteColor
                  : actionType === "kick"
                  ? { backgroundColor: "#f43f5e" }
                  : {},
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>
                {actionType === "promote"
                  ? "Promote"
                  : actionType === "demote"
                  ? "Demote"
                  : actionType === "kick"
                  ? "Kick"
                  : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 20,
  },
  modalSubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 16,
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "500",
  },
  promoteColor: {
    backgroundColor: "#7c3aed",
  },
  demoteColor: {
    backgroundColor: "#f43f5e",
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "600",
  },
});