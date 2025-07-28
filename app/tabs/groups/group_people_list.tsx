import { uploadUserInteraction } from '@/lib/helper_functions/uploadUserInteraction';
import { Group } from '@/types/group';
import { PublicUser } from '@/types/public_user';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import GroupMemberActionModal from '../../(shared)/GroupMemberActionModal';
import { useGroupMemberActions } from '../../../lib/helper_components/useGroupMemberAction';
import { supabase } from '../../../lib/supabase';

const PAGE_SIZE = 20;
const ITEM_WIDTH = Dimensions.get('window').width / 4;

const GroupPeopleList = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isFocused = useIsFocused();

  const groupId = params.groupId as string;
  const whoToFetch = params.whoToFetch as string;
  const userDoingInspectionId = params.userDoingInspection as string;
  const userDoingInspectRole = params.userDoingInspectRole as string;

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Group state for promote/demote/kick
  const [group, setGroup] = useState<Group>({} as Group);

  // Use shared group member actions hook
  const groupActions = useGroupMemberActions(groupId, {
    founder: group?.founder ?? '',
    leaders: group?.leaders ?? [],
    members: group?.members ?? [],
  }, setGroup);

  // Fetch group info for modal actions
  useEffect(() => {
    const fetchGroup = async () => {
      const { data } = await supabase
        .from('groups')
        .select('founder, leaders, members')
        .eq('id', groupId)
        .single();
      if (data) {
        setGroup(data as Group);
      }
    };
    fetchGroup();
  }, [groupId]);

  const fetchUsers = useCallback(async (pageIndex = 0) => {
    if (!hasMore && pageIndex > 0) return;
    setIsLoading(true);

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('members, leaders, founder')
      .eq('id', groupId)
      .single();

    if (groupError || !groupData) {
      setIsLoading(false);
      return;
    }

    const idsRaw = whoToFetch === 'leaders'
      ? groupData.leaders
      : groupData.members.filter((id: string) =>
          !groupData.leaders.includes(id) && id !== groupData.founder
        );

    const ids = idsRaw || [];
    if (ids.length === 0) {
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    const offset = pageIndex * PAGE_SIZE;
    const limit = PAGE_SIZE;

    const { data: batchData, error: dataError, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .in('user_id', ids)
      .order('user_name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (dataError) {
      if (pageIndex === 0) setUsers([]);
      setHasMore(false);
    } else {
      if (pageIndex === 0) {
        setUsers(batchData || []);
      } else {
        setUsers(prev => [...prev, ...(batchData ?? [])]);
      }
      const total = count ?? 0;
      setHasMore(offset + (batchData?.length ?? 0) < total);
    }

    setPage(pageIndex);
    setIsLoading(false);
  }, [groupId, whoToFetch, hasMore]);

  useEffect(() => {
    setUsers([]);
    setHasMore(true);
    setPage(0);
    fetchUsers(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, whoToFetch, isFocused, group.leaders, group.members]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {whoToFetch === 'leaders' ? 'Leaders' : 'Members'}
        </Text>
        <View style={{ width: 60 }} />
      </View>
      <FlatList
        data={users}
        keyExtractor={item => item.user_id}
        numColumns={4}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() => {
              router.push({
                pathname: "/tabs/groups/inspect_user",
                params: { userToInspectId: item.user_id },
              });
              uploadUserInteraction(userDoingInspectionId, item.user_id, "viewed_user_profile", "user");
            }}
            onLongPress={
              userDoingInspectRole === "founder"
                ? whoToFetch === "leaders"
                  ? () => groupActions.openActionModal(item, "demote")
                  : () => groupActions.handleMemberLongPress(item)
                : undefined
            }
            delayLongPress={200}
          >
            <Image
              source={{ uri: item.profile_picture_url ?? 'https://via.placeholder.com/80' }}
              style={styles.avatar}
            />
            <Text style={styles.userName} numberOfLines={1}>
              {item.user_name}
            </Text>
          </TouchableOpacity>
        )}
        onEndReached={() => {
          if (!isLoading && hasMore) {
            fetchUsers(page + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoading ? <Text style={styles.loading}>Loading more...</Text> : null}
      />

      {/* Action Modal (promote/demote/kick) */}
      <GroupMemberActionModal
        visible={groupActions.showActionModal}
        onClose={() => groupActions.setShowActionModal(false)}
        actionType={groupActions.actionType}
        selectedUser={groupActions.selectedUser}
        onConfirm={async () => {
          await groupActions.handleActionConfirm();
          fetchUsers(0); // Refresh list after action
        }}
      />

      {/* Member Options Modal (for founder on members) */}
      <Modal
        visible={groupActions.showMemberOptions}
        transparent
        animationType="fade"
        onRequestClose={() => groupActions.setShowMemberOptions(false)}
      >
        <View style={modalStyles.modalBackdrop}>
          <View style={modalStyles.modalContainer}>
            <Text style={modalStyles.modalTitle}>
              What would you like to do with {groupActions.memberOptionUser?.user_name}?
            </Text>
            <View style={modalStyles.modalButtons}>
              <TouchableOpacity
                style={[modalStyles.confirmButton, modalStyles.promoteColor, { marginRight: 8 }]}
                onPress={() => {
                  groupActions.setShowMemberOptions(false);
                  if (groupActions.memberOptionUser) {
                    groupActions.openActionModal(groupActions.memberOptionUser, "promote");
                  }
                }}
              >
                <Text style={modalStyles.confirmButtonText}>Promote</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.confirmButton, { backgroundColor: "#f43f5e" }]}
                onPress={() => {
                  groupActions.setShowMemberOptions(false);
                  if (groupActions.memberOptionUser) {
                    groupActions.openActionModal(groupActions.memberOptionUser, "kick");
                  }
                }}
              >
                <Text style={modalStyles.confirmButtonText}>Kick</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={modalStyles.cancelButton}
              onPress={() => groupActions.setShowMemberOptions(false)}
            >
              <Text style={modalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7c5e99',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 8,
  },
  userItem: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    marginBottom: 6,
  },
  userName: {
    fontSize: 13,
    textAlign: 'center',
    color: '#374151',
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    padding: 16,
    fontSize: 15,
  },
});

// Modal styles (copied from own_groups_view)
const modalStyles = StyleSheet.create({
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

export default GroupPeopleList;
