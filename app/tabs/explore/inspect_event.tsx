import { supabase } from '@/lib/supabase';
import { UserEvent } from '@/types/user_event';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const InspectEvent = () => {
    const params = useLocalSearchParams();

    const user: import("@supabase/supabase-js").User | null = params.user ? JSON.parse(params.user as string) : null;
    const event: UserEvent | null = params.event ? JSON.parse(params.event as string) : null;

    const [eventUpvotes, setEventUpvotes] = useState<number>(event?.upvotes || 0);

    const incrementEventUpvotes = async (eventId: string) => {
        const { error } = await supabase
            .rpc("increment_event_upvote", {event_id: eventId, user_id: user?.id})

        if (error) {
            console.error("Error uploading upvote:", error);
        }
        else {
            setEventUpvotes(prev => prev + 1);
        }
    };

    const decremenetEventUpvotes = async (eventId: string) => {
        const { error } = await supabase
            .rpc("decrement_event_upvote", {event_id: eventId, user_id: user?.id})
        if (error) {
            console.error("Error uploading downvote:", error);
        }
        else {
            setEventUpvotes(prev => prev - 1);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Welcome</Text>
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
    text: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});

export default InspectEvent;