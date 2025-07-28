import { MaterialIcons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import type { User } from "@supabase/supabase-js";
import * as Location from 'expo-location';
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import MapView, { Callout, MAP_TYPES, Marker } from 'react-native-maps';
import { supabase } from "../../../lib/supabase";
import type { UserEvent } from "../../../types/user_event";

export default function GeoMap() {
  const router = useRouter();
  type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  const [mapRegion] = useState({
    latitude: 38.7946,
    longitude: -99.5348,
    latitudeDelta: 5,
    longitudeDelta: 5,
  });
  const mapRef = useRef<MapView | null>(null);

  const userLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Please enable location services in your device settings to use this feature.", [
        {text: "Cancel", style: "cancel"}, 
        {text: "Settings", onPress: () => {
          if (Platform.OS === 'ios') {
            Linking.openURL("app-settings:");
          } else {
            Linking.openSettings();
          }
        }},
      ]);
      return; // Add return here to prevent continuing without permission
    }

    let location = await Location.getCurrentPositionAsync({});

    mapRef.current?.animateToRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 1000);
  }

  const [currentRegion, setCurrentRegion] = useState<Region>({
    latitude:0,longitude:0,latitudeDelta:0,longitudeDelta:0
  });

  // Map types:
  const terrain_types = [MAP_TYPES.STANDARD, MAP_TYPES.TERRAIN, MAP_TYPES.HYBRID,  MAP_TYPES.SATELLITE];
  const [chosenType, setMapType] = useState({
    type: terrain_types[0],
  });
  const changeMapType = () => { 
    let currentIndex = terrain_types.indexOf(chosenType.type);
    if (currentIndex < terrain_types.length - 1) {
      setMapType({ type: terrain_types[currentIndex + 1] });
    } else {
      setMapType({ type: terrain_types[0] });
    }
  }

  const [eventsInView, setEvents] = useState<UserEvent[]>([]);
  const fetchEventsInView = async (region: Region) => {
    const minLat = region.latitude - region.latitudeDelta/2;
    const maxLat = region.latitude + region.latitudeDelta/2;
    const minLng = region.longitude - region.longitudeDelta/2;
    const maxLng = region.longitude + region.longitudeDelta/2;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("latitude", minLat)
      .lte("latitude", maxLat)
      .gte("longitude", minLng)
      .lte("longitude", maxLng)
      .lte("end_time", new Date(new Date().getTime() + 60 * 60 * 1000).toISOString()) // Ensure events are still ongoing or upcoming
      .order("upvotes", { ascending: false }) // Order by upvotes
      .limit(10);

    if (error) console.error(error);
    else setEvents(data || []);
  }

  // fetch events immediately after region stops changing
  const handleRegionChangeComplete = (region: Region) => {
    setCurrentRegion(region);
    fetchEventsInView(region);
  };

  // Add user state
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Fetch user on mount
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
    userLocation();
    fetchEventsInView(mapRegion);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const [showMapTypeOptions, setShowMapTypeOptions] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<UserEvent | null>(null);

  const formatTime = (dateStr: string | undefined, mode: 'short' | 'full' = 'full') => {
    if (!dateStr) return "N/A";
    const eventDate = new Date(dateStr);

    const timeStr = eventDate.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    if (mode === 'short') {
      const weekday = eventDate.toLocaleString('en-US', { weekday: 'long' });
      return `${weekday}, ${timeStr}`;
    }

    const day = eventDate.getDate();
    const month = eventDate.toLocaleString('en-US', { month: 'long' });
    const weekday = eventDate.toLocaleString('en-US', { weekday: 'long' });

    const getOrdinal = (n: number) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${month} ${day}${getOrdinal(day)}, ${weekday}, ${timeStr}`;
  };

  return (
    <>
      <Stack.Screen options={{ title: "Event Map", headerShown: false }}/> 
      <View style={{ flex: 1 }}>
        <MapView
          style={{ width: '100%', height: '100%' }}
          ref={mapRef}
          initialRegion={mapRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          mapType={chosenType.type}
          showsUserLocation={true}
        >
            {eventsInView
              .filter(event =>
                typeof event.latitude === 'number' &&
                typeof event.longitude === 'number' &&
                !isNaN(event.latitude) &&
                !isNaN(event.longitude)
              )
              .map((event) => (
                <Marker
                  key={event.id}
                  coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                >
                  <View>
                    <FontAwesome5 name="map-marker" size={24} color="#D2042D" />
                  </View>
                  <Callout onPress={() => setSelectedEvent(event)} tooltip={false}>
                    <View style={styles.previewCallout}>
                      <View style={styles.previewTextBox}>
                        <Text style={styles.previewTitle} numberOfLines={1}>
                          {event.title || 'Untitled Event'}
                        </Text>
                        <Text style={styles.previewInfo}>
                          {formatTime(event.start_time, 'short')}
                        </Text>
                        <Text style={styles.previewInfo}>
                          <FontAwesome6 name="circle-up" size={13} color="red" /> {event.upvotes || 0} upvotes
                        </Text>
                      </View>

                      {/* Image Placeholder */}
                      <View style={styles.calloutImageBox}>
                        <Text style={{ color: "#888" }}>Image Here</Text>
                      </View>
                    </View>
                  </Callout>
                </Marker>
            ))}
        </MapView>
        
        <Modal
          visible={!!selectedEvent}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedEvent(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedEvent(null)}
              >
                <MaterialIcons name="close" size={24} color="gray" />
              </TouchableOpacity>

              {/* Text Info */}
              <View style={styles.modalContent}>
                <Text style={styles.calloutTitle}>
                  {selectedEvent?.title || 'Untitled Event'}
                </Text>
                <Text style={styles.calloutDescription}>
                  {selectedEvent?.description || 'No description available'}
                </Text>
                <Text style={styles.calloutDetail}>
                  <Text style={styles.calloutLabel}>Time: </Text>
                  <Text>{formatTime(selectedEvent?.start_time)}</Text>
                </Text>
                <Text style={styles.calloutDetail}>
                  <Text style={styles.calloutLabel}>Location: </Text>
                  <Text>{selectedEvent?.location_name || 'No location specified'}</Text>
                </Text>
                <Text style={styles.calloutDetail}>
                  <FontAwesome6 name="circle-up" size={15} color="red" />
                  <Text> {selectedEvent?.upvotes || 0} upvotes</Text>
                </Text>
              </View>

              {/* Image Section */}
              <View style={styles.modalImageBox}>
                <Text style={{ color: "#888" }}>Image Here</Text>
              </View>

              {/* Open Event Button */}
              <TouchableOpacity
                style={styles.calloutButton}
                onPress={() => {
                  router.push({
                    pathname: "/(shared)/inspect_event",
                    params: {
                      event: JSON.stringify(selectedEvent),
                      user: JSON.stringify(user),
                    },
                  });
                  setSelectedEvent(null);
                }}
              >
                <Text style={styles.calloutButtonText}>Open Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        
        <View style={styles.mapOptionsContainer}>
          <TouchableOpacity style={styles.mapOptions} onPress={userLocation}>
            <MaterialIcons name="my-location" size={33} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapOptions}
            onPress={() => setShowMapTypeOptions((prev) => !prev)}
          >
            <MaterialIcons name="map" size={33} color="white" />
          </TouchableOpacity>
          {showMapTypeOptions && (
            <View style={styles.mapTypeOptionsContainer}>
              {terrain_types.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mapTypeOption,
                    chosenType.type === type && styles.selectedMapTypeOption,
                  ]}
                  onPress={() => {
                    setMapType({ type });
                    setShowMapTypeOptions(false);
                    console.log('Map type changed to', type);
                  }}
                >
                  <MaterialIcons
                    name={
                      type === MAP_TYPES.STANDARD
                        ? "map"
                        : type === MAP_TYPES.TERRAIN
                        ? "terrain"
                        : type === MAP_TYPES.HYBRID
                        ? "satellite"
                        : "layers"
                    }
                    size={24}
                    color={chosenType.type === type ? "white" : "black"}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </>
  );
}

