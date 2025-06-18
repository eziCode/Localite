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
            style={[styles.upvoteButton, hasUpvoted && styles.upvoteButtonActive]}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={hasUpvoted ? "heart" : "heart-outline"} 
              size={28} 
              color={hasUpvoted ? "#ff4757" : "#ff4757"} 
            />
            <Text style={styles.upvoteText}>{eventUpvotes} likes</Text>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2f3640',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    color: '#57606f',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ff4757',
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  upvoteText: {
    marginLeft: 10,
    color: '#ff4757',
    fontSize: 16,
    fontWeight: '600',
  },
  
  cardMainText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2f3640',
    marginBottom: 6,
    lineHeight: 24,
  },
  cardSubText: {
    fontSize: 14,
    color: '#57606f',
    lineHeight: 20,
  },
  mapLinkText: {
    fontSize: 14,
    color: '#4834d4',
    fontWeight: '600',
    marginLeft: 6,
  },
  
  primaryAction: {
    flex: 1,
    backgroundColor: '#5f27cd',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5f27cd',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5f27cd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryActionText: {
    color: '#5f27cd',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f2f6',
    justifyContent: 'flex-start',
    paddingLeft: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#fff',
  },
  titleContainer: {
    alignItems: 'center',
  },
  upvoteSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  upvoteButtonActive: {
    backgroundColor: '#ff4757',
  },

  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f2f6',
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a4b0be',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  durationBadge: {
    backgroundColor: '#5f27cd',
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
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 16,
  },
  bottomPadding: {
    height: 60,
  },
  errorText: {
    fontSize: 24,
    color: '#2f3640',
    textAlign: 'center',
      marginTop: 200,
    },
});
  
export default InspectEvent;