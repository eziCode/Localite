import { uploadUserInteraction } from '@/lib/helper_functions/uploadUserInteraction';
import { PublicUser } from '@/types/public_user';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
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

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = useCallback(async (pageIndex = 0) => {
    if (!hasMore && pageIndex > 0) return;
    setIsLoading(true);
    
    // Fetch groupData
    const {data: groupData, error: groupError} = await supabase
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

    // Sort or keep as-is
    const offset = pageIndex * PAGE_SIZE;
    const limit = PAGE_SIZE;

    const {data: batchData, error: dataError, count} = await supabase
      .from('users')
      .select('*', {count: 'exact'})
      .in('user_id', ids)
      .order('user_name', {ascending: true})
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
  }, [groupId, whoToFetch, isFocused]);


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
          {whoToFetch === 'leaders' ? 'Leaders' : 'Members'}
        </Text>
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
              uploadUserInteraction(userDoingInspectionId, item.id, "viewed profile of another user", "user");
            }}
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
        ListFooterComponent={isLoading ? <Text style={styles.loading}>Loading...</Text> : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#fafafa",
  },
  backButtonText: {
    fontSize: 18,
    color: "#7c3aed",
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#f9f9f9',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 16,
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
    backgroundColor: '#ddd',
    marginBottom: 6,
  },
  userName: {
    fontSize: 13,
    textAlign: 'center',
    color: '#333',
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    padding: 16,
    fontSize: 15,
  },
});

export default GroupPeopleList;
