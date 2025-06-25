import { supabase } from '@/lib/supabase';
import { Group } from '@/types/group';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const PAGE_SIZE = 25;

const ShowAllGroups = () => {
  const params = useLocalSearchParams();
  const router = useRouter();

  const initialGroups: Group[] = params.groupsAlreadyFetched ? JSON.parse(params.groupsAlreadyFetched as string) : [];
  const initialPage = Math.floor(initialGroups.length / PAGE_SIZE);

  const [groupsToDisplay, setGroupsToDisplay] = useState<Group[]>(initialGroups);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const user: import("@supabase/supabase-js").User = params.user ? JSON.parse(params.user as string) : null;
  const type: string = Array.isArray(params.type) ? params.type[0] : params.type;

  const [searchQuery, setSearchQuery] = useState("");
  const filteredGroups = groupsToDisplay.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const fetchRemainingGroups = async (page: number) => {
    if (!user) return;
    setLoading(true);

    try {
      if (type === 'user') {
        const { data, error } = await supabase
          .from("groups")
          .select("*")
          .filter("members", "cs", JSON.stringify([user.id]))
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw error;

        setGroupsToDisplay(prev => {
          const existingIds = new Set(prev.map(g => g.id));
          const uniqueGroups = (data || []).filter(g => !existingIds.has(g.id));
          return [...prev, ...uniqueGroups];
        });

        if (!data || data.length < PAGE_SIZE) setHasMore(false);

      } else if (type === 'suggested') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data: requests, error: requestError } = await supabase
          .from("group_join_requests")
          .select("group_id, status, created_at")
          .eq("from_id", user.id);

        if (requestError) throw requestError;

        const blockedGroupIds = new Set(
          requests?.filter(req =>
            req.status === "pending" || (req.created_at && new Date(req.created_at) > oneWeekAgo)
          ).map(req => req.group_id)
        );

        const { data: groups, error: groupError } = await supabase
          .from("groups")
          .select("*")
          .not("members", "cs", JSON.stringify([user.id]))
          .neq("visibility", "hidden")
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (groupError) throw groupError;

        const filteredGroups = (groups || []).filter(group => !blockedGroupIds.has(group.id));

        setGroupsToDisplay(prev => {
          const existingIds = new Set(prev.map(g => g.id));
          const uniqueGroups = filteredGroups.filter(g => !existingIds.has(g.id));
          return [...prev, ...uniqueGroups];
        });

        if (!groups || groups.length < PAGE_SIZE) setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRemainingGroups(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleNavigate = (group: Group) => {
    if (type === 'user') {
      router.push({
        pathname: "/tabs/groups/own_groups_view",
        params: { group: JSON.stringify(group), user: JSON.stringify(user) }
      });
    } else {
      router.push({
        pathname: "/tabs/groups/foreign_groups_view",
        params: { group: JSON.stringify(group), user: JSON.stringify(user) }
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6C4FF6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Groups</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && groupsToDisplay.length === 0 ? (
        <ActivityIndicator size="large" color="#6C4FF6" style={{ marginTop: 32 }} />
      ) : (
        <>
  <View style={styles.searchContainer}>
    <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
    <TextInput
      placeholder="Search groups..."
      value={searchQuery}
      onChangeText={setSearchQuery}
      placeholderTextColor="#9CA3AF"
      style={styles.searchInput}
    />
  </View>

  {loading && groupsToDisplay.length === 0 ? (
    <ActivityIndicator size="large" color="#6C4FF6" style={{ marginTop: 32 }} />
  ) : (
      <FlatList
            data={filteredGroups}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed && { backgroundColor: "#ece9fc" },
                ]}
                onPress={() => handleNavigate(item)}
              >
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupDesc} numberOfLines={1}>
                  {item.description || 'No description'}
                </Text>
              </Pressable>
            )}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            onEndReached={() => hasMore && setPage(p => p + 1)}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loading ? <ActivityIndicator color="#6C4FF6" style={{ marginVertical: 16 }} /> : null}
          />
        )}
      </>

      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1F',
  },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1E1F',
  },
  groupDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E1E1F',
  },

});

export default ShowAllGroups;
