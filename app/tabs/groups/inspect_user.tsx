import { supabase } from '@/lib/supabase';
import { Group } from '@/types/group';
import { PublicUser } from '@/types/public_user';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InspectUser() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const userIdToInspect: string = JSON.parse(params.userToInspect as string);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [profilePicture, setProfilePicture] = useState<React.ReactNode>(
    <Ionicons name="person-circle-outline" size={80} color="#d1d5db" />
  );

  const fetchUserInfo = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userIdToInspect)
      .single();

    if (error) console.error('Error fetching user:', error);
    else setUser(data as PublicUser);
  }, [userIdToInspect]);

  const fetchGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .filter("members", "cs", JSON.stringify([userIdToInspect]));

    if (error) console.error('Error fetching groups:', error);
    else setGroups(data as Group[]);
  }, [userIdToInspect]);

  const fetchProfilePicture = useCallback(async () => {
    const profilePictureURL = user?.profile_picture_url
    if (!profilePictureURL) {
      setProfilePicture(
        <Ionicons name="person-circle-outline" size={80} color="#d1d5db" />
      );
    } else {
      setProfilePicture(
        <Image
          source={{ uri: profilePictureURL }}
          style={{ width: 80, height: 80, borderRadius: 40 }}
          resizeMode="cover"
        />
      );
    }
  }, [user?.profile_picture_url]);

  useEffect(() => {
    fetchUserInfo();
    fetchGroups();
    fetchProfilePicture();
  }, [fetchUserInfo, fetchGroups, fetchProfilePicture]);

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#7c3aed" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {/* Profile Header */}
        <View style={styles.profileRow}>
          <View style={styles.profilePicContainer}>{profilePicture}</View>
          <View style={styles.profileInfo}>
            <Text style={styles.headerText}>
              {user?.user_name || 'User'}
            </Text>
            {joinDate && (
              <Text style={styles.subtext}>Joined on {joinDate}</Text>
            )}
            <Text style={styles.groupSummary}>
              In {groups.length} group{groups.length !== 1 ? 's' : ''}.
            </Text>
          </View>
        </View>

        {/* Group Preview */}
        {groups.length > 0 && (
          <View style={styles.groupsContainer}>
            <Text style={styles.sectionTitle}>Groups</Text>
            {groups.slice(0, 5).map((group) => (
              <View key={group.id} style={styles.groupCard}>
                <Text style={styles.groupName}>{group.name}</Text>
              </View>
            ))}
            {groups.length > 5 && (
              <Text style={styles.moreGroupsText}>...and more</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fafafa', flex: 1 },
  scroll: { padding: 20, paddingBottom: 80 },
  headerText: { fontSize: 26, fontWeight: '700', color: '#1f2937' },
  subtext: { fontSize: 15, color: '#6b7280', marginBottom: 4 },
  groupSummary: { fontSize: 16, fontWeight: '500', color: '#374151' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#7c3aed',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  profilePicContainer: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  groupsContainer: {
    marginTop: 16,
    backgroundColor: '#f3f0ff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b21a8',
    marginBottom: 12,
  },
  groupCard: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  moreGroupsText: {
    fontStyle: 'italic',
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
