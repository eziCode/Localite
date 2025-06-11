import { PublicUser } from '@/types/public_user';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const PAGE_SIZE = 24;
const ITEM_WIDTH = Dimensions.get('window').width / 4;

const GroupPeopleList = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const groupId = params.groupId as string;
  const whoToFetch = params.whoToFetch as string;

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // ✅ Robust fetch guard
  const fetchingRef = useRef(false);

  const fetchUsers = useCallback(async (reset = false) => {
    if (fetchingRef.current || (!hasMore && !reset)) return;

    fetchingRef.current = true;
    setLoading(true);

    // Fetch groupData to get ids
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('members, leaders, founder')
      .eq('id', groupId)
      .single();

    if (groupError || !groupData) {
      setLoading(false);
      fetchingRef.current = false;
      return;
    }

    const ids = whoToFetch === 'leaders'
      ? groupData.leaders
      : groupData.members.filter((id: string) => !groupData.leaders.includes(id) && id !== groupData.founder);
    if (!ids || ids.length === 0) {
      setHasMore(false);
      setLoading(false);
      fetchingRef.current = false;
      return;
    }

    let query = supabase
      .from('users')
      .select('*')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (!reset && cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      setUsers(prev => reset ? data : [...prev, ...data]);
      setCursor(data[data.length - 1].created_at);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }

    setLoading(false);
    fetchingRef.current = false;
  }, [cursor, groupId, hasMore, whoToFetch]);

  useEffect(() => {
    setUsers([]);
    setCursor(null);
    setHasMore(true);
    setLoading(false);
    fetchUsers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, whoToFetch]);

  useEffect(() => {
    return () => {
      setUsers([]);
      setCursor(null);
      setHasMore(true);
      setLoading(false);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
          console.log("onEndReached triggered");
          if (hasMore && !loading) fetchUsers();
        }}
        onEndReachedThreshold={0.01} // ✅ Tighter threshold
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 20 }} /> : null}
        removeClippedSubviews={true}
        windowSize={7}
        initialNumToRender={16}
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
