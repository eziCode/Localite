import { supabase } from '@/lib/supabase';
import { UserEvent } from '@/types/user_event';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
      Alert.alert("Error", "Failed to upvote event");
    }
  };

  const decrementEventUpvotes = async (eventId: string) => {
    const { error } = await supabase.rpc("decrement_event_upvotes", {
      event_id: eventId,
      user_id: user?.id,
    });
    if (!error) {
      setEventUpvotes((prev) => Math.max(prev - 1, 0));
      setHasUpvoted(false);
    } else {
      console.error("Error uploading downvote:", error);
      Alert.alert("Error", "Failed to remove upvote");
    }
  };

  const handleUpvotePress = () => {
    if (!event || !user) return;
    
    if (hasUpvoted) {
      decrementEventUpvotes(event.id);
    } else {
      incrementEventUpvotes(event.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDuration = () => {
    if (!event) return '';
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return diffMinutes > 0 ? `${diffHours}h ${diffMinutes}m` : `${diffHours}h`;
    }
    return `${diffMinutes}m`;
  };

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.fixedHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
        </View>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#333" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{event.title}</Text>
            {event.description && (
              <Text style={styles.description}>{event.description}</Text>
            )}
          </View>
        </View>

        {/* Upvote Section */}
        <View style={styles.upvoteSection}>
          <TouchableOpacity 
            onPress={handleUpvotePress}
            style={[
              styles.upvoteButton,
              hasUpvoted && styles.upvoteButtonActive
            ]}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={hasUpvoted ? "heart" : "heart-outline"} 
              size={28} 
              color={hasUpvoted ? "#fff" : "#ff4757"} 
              style={hasUpvoted ? { marginRight: 0 } : undefined}
            />
            <Text
              style={[
                styles.upvoteText,
                hasUpvoted && styles.upvoteTextActive
              ]}
            >
              {eventUpvotes} {eventUpvotes === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Event Info Cards */}
        <View style={styles.contentContainer}>
          
          {/* Date & Time Card */}
          <View style={styles.infoCard}>
            <View style={styles.cardIcon}>
              <Ionicons name="calendar" size={28} color="#5f27cd" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>When</Text>
              <Text style={styles.cardMainText}>{formatDate(event.start_time)}</Text>
              <Text style={styles.cardSubText}>
                {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </Text>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{getDuration()}</Text>
              </View>
            </View>
          </View>

          {/* Location Card */}
          <View style={styles.infoCard}>
            <View style={styles.cardIcon}>
              <Ionicons name="location" size={28} color="#ff6b6b" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Where</Text>
              <Text style={styles.cardMainText}>{event.location_name}</Text>
              <TouchableOpacity style={styles.mapLink}>
                <Ionicons name="map" size={18} color="#4834d4" />
                <Text style={styles.mapLinkText}>View on map</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Visibility Card - Only if private */}
          {event.post_only_to_group && (
            <View style={styles.infoCard}>
              <View style={styles.cardIcon}>
                <Ionicons name="people" size={28} color="#26de81" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Visibility</Text>
                <Text style={styles.cardMainText}>Private Event</Text>
                <Text style={styles.cardSubText}>Only group members can see this</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.primaryAction}>
            <Ionicons name="calendar-outline" size={24} color="#fff" />
            <Text style={styles.primaryActionText}>Add to Calendar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryAction}>
            <Ionicons name="share-outline" size={24} color="#5f27cd" />
            <Text style={styles.secondaryActionText}>Share Event</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFB',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(250,250,251,0.95)',
    marginTop: 18, // Increased space from the top (clock)
    paddingLeft: 16, // Added left padding for space from the left edge
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F1F3',
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
    alignSelf: 'flex-start', // Ensures the bubble only wraps content
  },
  backButtonText: {
    fontSize: 16,
    color: '#1E1E1F',
    marginLeft: 6,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    paddingTop: 120,
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: '#FAFAFB',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E1E1F',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    color: '#4D4D4D',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  upvoteSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECF0',
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF5E5B',
    shadowColor: '#FF5E5B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    transitionProperty: 'background-color,color', // for web, ignored on native
    transitionDuration: '200ms',
  },
  upvoteButtonActive: {
    backgroundColor: '#FF5E5B',
    borderWidth: 0,
    // Remove border and make background solid red
  },
  upvoteText: {
    marginLeft: 10,
    color: '#FF5E5B',
    fontSize: 16,
    fontWeight: '600',
    transitionProperty: 'color', // for web, ignored on native
    transitionDuration: '200ms',
  },
  upvoteTextActive: {
    color: '#fff',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#ECECF0',
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F1F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0A0AA',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardMainText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E1E1F',
    marginBottom: 6,
    lineHeight: 24,
  },
  cardSubText: {
    fontSize: 14,
    color: '#4D4D4D',
    lineHeight: 20,
  },
  durationBadge: {
    backgroundColor: '#6C4FF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  durationText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  mapLinkText: {
    fontSize: 14,
    color: '#6C4FF6',
    fontWeight: '600',
    marginLeft: 6,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 16,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: '#6C4FF6',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C4FF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6C4FF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryActionText: {
    color: '#6C4FF6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  bottomPadding: {
    height: 60,
  },
  errorText: {
    fontSize: 24,
    color: '#1E1E1F',
    textAlign: 'center',
    marginTop: 200,
  },
});


export default InspectEvent;