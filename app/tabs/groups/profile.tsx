import { supabase } from '@/lib/supabase';
import { Group } from '@/types/group';
import { UserEvent } from '@/types/user_event';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import ImagePicker from 'react-native-image-crop-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const groups: Group[] = React.useMemo(
    () => JSON.parse(params.groups as string) || [],
    [params.groups]
  );
  const user: import('@supabase/supabase-js').User | null = JSON.parse(params.user as string);
  const userName = user?.user_metadata?.username || 'User';

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const [events, setEvents] = useState<UserEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const [profilePicture, setProfilePicture] = useState<React.ReactNode>(
    <Ionicons name="person-circle-outline" size={80} color="#d1d5db" />
  );

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .in('group_id', groups.map((g) => g.id));

    if (error) console.error('Error fetching events:', error);
    else setEvents(data || []);
  }, [groups]);

  const fetchUserProfilePicture = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('profile_picture_url')
      .eq('user_id', user?.id)
      .single();

    if (error || !data?.profile_picture_url) {
      setProfilePicture(
        <Ionicons name="person-circle-outline" size={80} color="#d1d5db" />
      );
    } else {
      setProfilePicture(
        <Image
          source={{ uri: data.profile_picture_url }}
          style={{ width: 80, height: 80, borderRadius: 40 }}
          resizeMode="cover"
        />
      );
    }
  }, [user?.id]);

  const handleProfileImageChange = async () => {
    try {
      const result = await ImagePicker.openPicker({
        width: 300,
        height: 300,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });

      const uri = result.path;
      setProfilePicture(
        <Image
          source={{ uri }}
          style={{ width: 80, height: 80, borderRadius: 40 }}
          resizeMode="cover"
        />
      );

      if (!user) {
        console.error("No user found to update profile picture.");
        return;
      }

      // Upload to Supabase Storage and get public URL
      const publicUrl = await uploadToSupabase(uri, user.id);

      // Update user's profile_picture_url in the users table
      const { error } = await supabase
        .from('users')
        .update({ profile_picture_url: publicUrl })
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to update user profile picture URL:', error);
      }
    } catch (e) {
      console.log('Image selection cancelled or failed:', e);
    }
  };

  const uploadToSupabase = async (uri: string, userId: string) => {
    const fileExt = uri.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `${fileName}`;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { error } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  useEffect(() => {
    if (!user?.id || !groups.length) return;
    fetchEvents();
    fetchUserProfilePicture();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, groups]);


  const eventsByDate = events.reduce<Record<string, UserEvent[]>>((acc, event) => {
    if (event.start_time) {
      const date = format(new Date(event.start_time), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
    }
    return acc;
  }, {});

  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
      {/* Fixed Header */}
      <SafeAreaView edges={['top']} style={styles.fixedHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#7c3aed" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ height: 110 }} />
        <View style={styles.profileRow}>
          <TouchableOpacity
            style={styles.profilePicContainer}
            activeOpacity={0.7}
            onPress={handleProfileImageChange}
          >
            {profilePicture}
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.headerText}>Welcome, {userName}!</Text>
            {joinDate && <Text style={styles.subtext}>Joined on {joinDate}</Text>}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                router.push({ 
                  pathname: "/tabs/groups/show_all_groups",
                  params: { groupsAlreadyFetched: JSON.stringify(groups), user: JSON.stringify(user), type: "user" } 
                });
              }}
            >
              <Text style={styles.groupSummary}>
                You&apos;re in {groups.length} group{groups.length !== 1 ? 's' : ''}.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.calendarContainer}>
          <Text style={styles.sectionTitle}>Your Group Events</Text>
          <Calendar
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#7c3aed' },
              ...Object.keys(eventsByDate).reduce((acc, date) => {
                acc[date] = { marked: true };
                return acc;
              }, {} as Record<string, any>),
            }}
            theme={{
              selectedDayBackgroundColor: '#7c3aed',
              todayTextColor: '#7c3aed',
            }}
            style={styles.calendar}
          />

          {eventsByDate[selectedDate]?.length ? (
            eventsByDate[selectedDate]
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {event.location_name && (
                    <Text style={styles.eventLocation}>{event.location_name}</Text>
                  )}
                </View>
              ))
          ) : (
            <Text style={styles.noEventsText}>No events on this day.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(250,250,251,0.95)',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingLeft: 16,
  },
  scroll: {
    padding: 20,
    paddingBottom: 80,
  },
  headerText: { fontSize: 28, fontWeight: '700', color: '#1f2937' },
  subtext: { fontSize: 16, color: '#6b7280', marginBottom: 4 },
  groupSummary: { fontSize: 18, fontWeight: '500', marginBottom: 16, color: '#374151' },
  calendarContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f3f0ff',
    borderRadius: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#6b21a8', marginBottom: 12 },
  calendar: { borderRadius: 10, marginBottom: 16 },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  eventTime: { color: '#6b7280', fontSize: 14, marginTop: 2 },
  eventLocation: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  noEventsText: { fontStyle: 'italic', color: '#6b7280', marginTop: 10, textAlign: 'center' },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
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
});
