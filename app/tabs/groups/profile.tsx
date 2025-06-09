import { supabase } from '@/lib/supabase';
import { Group } from '@/types/group';
import { UserEvent } from '@/types/user_event';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const UserProfile = () => {
    const router = useRouter();

    const params = useLocalSearchParams();

    // List of groups (user has option to click on the number to see all joined groups)
    const [groups, setGroups] = useState<Group[]>(JSON.parse(params.groups as string) || []);
    const [numberOfGroups, setNumberOfGroups] = useState<number>(groups.length);

    const user: import("@supabase/supabase-js").User | null = JSON.parse(params.user as string);
    const [userName, setUserName] = useState<string>(user?.user_metadata?.username || 'User');
    const joinDate = user?.created_at
      ? new Date(user.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";


    // Graphic showing all events for groups the user is part of
    // Currently have groups the user is part of
    // Need to get all events for those groups
    // Option to link event calendar to google calendar/apple calendar
    const [events, setEvents] = useState<UserEvent[]>([]);

    const fetchEvents = useCallback(async () => {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .in('group_id', groups.map(group => group.id));

        if (error) {
            console.error('Error fetching events:', error);
            return;
        }

        setEvents(data);
    }, [groups]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return (
        <View style={styles.container}>
            <Text style={styles.welcome}>Welcome</Text>
            <Text style={styles.groupCount}>You are part of {numberOfGroups} groups.</Text>
            {joinDate ? (
              <Text style={styles.joinDate}>Joined on {joinDate}</Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    welcome: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    groupCount: {
        fontSize: 18,
    },
    joinDate: {
        fontSize: 16,
        color: '#666',
    },
});

export default UserProfile;