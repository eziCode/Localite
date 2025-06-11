import { PublicUser } from '@/types/public_user';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
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

const PAGE_SIZE = 24; // Number of users to fetch per request
const ITEM_WIDTH = Dimensions.get('window').width / 4;

const GroupPeopleList = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const groupId = params.groupId as string;
  const whoToFetch = params.whoToFetch as string; // 'members' or 'leaders'

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchUsers = useCallback(async (reset = false) => {
    if (loading || (!hasMore && !reset)) return;
    setLoading(true);

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('members, leaders')
      .eq('id', groupId)
      .single();

    if (groupError || !groupData) {
      setLoading(false);
      return;
    }

    const ids = whoToFetch === 'leaders' ? groupData.leaders : groupData.members;
    if (!ids || ids.length === 0) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('users')
      .select('*')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor && !reset) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      setLoading(false);
      return;
    }

    if (reset) {
      setUsers(data);
    } else {
      setUsers(prev => [...prev, ...data]);
    }

    setHasMore(data.length >= PAGE_SIZE);
    if (data.length > 0) {
      setCursor(data[data.length - 1].created_at);
    }

    setLoading(false);
  }, [groupId, whoToFetch, cursor, loading, hasMore]);

  useEffect(() => {
    setUsers([]);
    setCursor(null);
    setHasMore(true);
    fetchUsers(true);

    // Cleanup on unmount to free memory
    return () => {
      setUsers([]);
      setCursor(null);
      setHasMore(true);
      setLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, whoToFetch]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {whoToFetch === 'leaders' ? 'Leaders' : 'Members'}
        </Text>
        {/* Spacer for symmetry */}
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
            onPress={() =>
              router.push({
                pathname: "/tabs/groups/inspect_user",
                params: { userToInspectId: item.user_id },
              })
            }
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
          if (hasMore && !loading) fetchUsers();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 20 }} /> : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  backButtonText: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: '600',
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
});

export default GroupPeopleList;
