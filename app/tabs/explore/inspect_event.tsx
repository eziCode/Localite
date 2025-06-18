import { supabase } from '@/lib/supabase';
import { UserEvent } from '@/types/user_event';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ThumbsUp } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const InspectEvent = () => {
  const params = useLocalSearchParams();
  const router = useRouter();

  const user: import("@supabase/supabase-js").User | null = params.user ? JSON.parse(params.user as string) : null;
  const event: UserEvent | null = params.event ? JSON.parse(params.event as string) : null;

  const [eventUpvotes, setEventUpvotes] = useState<number>(event?.upvotes || 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  const incrementEventUpvotes = async (eventId: string) => {
    const { error } = await supabase.rpc("increment_event_upvotes", {
      event_id: eventId,
      user_id: user?.id,
    });
    if (!error) {
      setEventUpvotes((prev) => prev + 1);
      setHasUpvoted(true);
    } else {
      console.error("Error uploading upvote:", error);
    }
  };

  const decremenetEventUpvotes = async (eventId: string) => {
    const { error } = await supabase.rpc("decrement_event_upvotes", {
      event_id: eventId,
      user_id: user?.id,
    });
    if (!error) {
      setEventUpvotes((prev) => prev - 1);
      setHasUpvoted(false);
    } else {
      console.error("Error uploading downvote:", error);
    }
  };

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>No event data available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.card}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.subtitle}>{new Date(event.start_time).toLocaleString()}</Text>
        <Text style={styles.meta}>{event.location_name}</Text>

        {event.description ? (
          <Text style={styles.description}>{event.description}</Text>
        ) : null}

        <View style={styles.upvoteSection}>
          <TouchableOpacity
            style={[styles.upvoteButton, hasUpvoted && styles.upvoted]}
            onPress={() =>
              hasUpvoted
                ? decremenetEventUpvotes(event.id)
                : incrementEventUpvotes(event.id)
            }
          >
            <ThumbsUp
              size={20}
              color={hasUpvoted ? "#fff" : "#5e60ce"}
            />
            <Text style={[styles.upvoteText, hasUpvoted && styles.upvotedText]}>
              {hasUpvoted ? "Upvoted" : "Upvote"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.voteCount}>{eventUpvotes} upvotes</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  card: {
    padding: 24,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
  },
  meta: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
    lineHeight: 22,
  },
  upvoteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  upvoted: {
    backgroundColor: '#5e60ce',
  },
  upvoteText: {
    marginLeft: 6,
    fontWeight: '600',
    color: '#5e60ce',
  },
  upvotedText: {
    color: '#fff',
  },
  voteCount: {
    fontSize: 14,
    color: '#555',
  },
  text: {
    fontSize: 20,
    textAlign: 'center',
    padding: 20,
    color: '#444',
  },
});

export default InspectEvent;
