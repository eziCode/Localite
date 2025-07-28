import { MaterialIcons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import * as Location from 'expo-location';
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Callout, MAP_TYPES, Marker } from 'react-native-maps';
import { supabase } from "../../../lib/supabase";
import type { UserEvent } from "../../../types/user_event";

// EZRA Todo: add user implementation like you did in own_groups_view.tsx below:    (Only if its necessary to do so, I'm not completely sure what that part of the code does, so im leaving it to you)
//                                                                                 ---->     go to line 253 and 256  <----
// const { group: groupStr, user: userStr } = useLocalSearchParams();
// const [group, setGroup] = useState<Group>(JSON.parse(groupStr as string));
// const user: import("@supabase/supabase-js").User = JSON.parse(userStr as string);      delete these comments after

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
      .gte("start_time", new Date().toISOString())
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

  useEffect(() => {
    userLocation();
    fetchEventsInView(mapRegion);
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
                  onCalloutPress={() => { {/* Callout appears after tapping on Marker */}
                    router.push({
                      pathname: "/(shared)/inspect_event",
                      params: {
                        event: JSON.stringify({
                          id: event.id,
                          title: event.title,
                          description: event.description,
                          start_time: event.start_time,
                          location_name: event.location_name,
                          upvotes: event.upvotes,
                        }),
                        user: JSON.stringify(null),
                      },
                    });
                  }}
                >
                  <FontAwesome5 name="map-marker" size={24} color="#D2042D" /> 
                  <Callout onPress={() => setSelectedEvent(event)}>
                    <View style={styles.previewCallout}>
                      <View style={styles.previewTextBox}>
                        <Text style={styles.previewTitle} numberOfLines={1}>{event.title ?? 'Untitled Event'}</Text>
                        <Text style={styles.previewInfo}>{formatTime(event.start_time, 'short')}</Text>
                        <Text style={styles.previewInfo}><FontAwesome6 name="circle-up" size={13} color="red" /> {event.upvotes ?? 0} upvotes</Text>
                      </View>

                      {/* Image Placeholder */}
                      <View style={styles.calloutImageBox}>
                        <Text style={{ color: "#888" }}>[Image Here]</Text>
                      </View>
                    </View>
                  </Callout>
                </Marker>
            ))}
        </MapView>
        <Modal
          visible={!!selectedEvent}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedEvent(null)}
        >
          <View style={styles.modalOverlay}> {/* Modal appears after tapping on Callout */}
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
                <Text style={styles.calloutTitle}>{selectedEvent?.title}</Text>
                <Text style={styles.calloutDescription}>{selectedEvent?.description}</Text>
                <Text style={styles.calloutDetail}>
                  <Text style={styles.calloutLabel}>Time: </Text>
                  {formatTime(selectedEvent?.start_time)}
                </Text>
                <Text style={styles.calloutDetail}>
                  <Text style={styles.calloutLabel}>Location: </Text>
                  {selectedEvent?.location_name}
                </Text>
                <Text style={styles.calloutDetail}>
                  <FontAwesome6 name="circle-up" size={15} color="red" />{" "}
                  {selectedEvent?.upvotes ?? 0} upvotes
                </Text>
              </View>

              {/* Image Section */}
              <View style={styles.modalImageBox}>
                <Text style={{ color: "#888" }}>[Image Here]</Text>
              </View>

              {/* Open Event Button */}
              <TouchableOpacity
                style={styles.calloutButton}
                onPress={() => {
                  router.push({
                    pathname: "/(shared)/inspect_event",
                    params: {
                      event: JSON.stringify(selectedEvent),
                      user: JSON.stringify(null),                  // Ezra implement this if necessary.
                    },
                  });
                  // uploadUserInteraction(user.id, event.id, "viewed_event", "event");     <--------   Ezra: Implement this if necessary. 
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

const styles = StyleSheet.create({
previewCallout: {
  flexDirection: 'column',
  width: 240,
  height: 180,
  backgroundColor: '#fff',
  borderRadius: 12,
  overflow: 'hidden',
  padding: 8,
},

previewTextBox: {
  paddingBottom: 6,
},

previewTitle: {
  fontWeight: 'bold',
  fontSize: 16,
  color: '#222',
  marginBottom: 2,
},

previewInfo: {
  fontSize: 13,
  color: '#555',
},

calloutImageBox: {
  flex: 1,
  backgroundColor: '#f0f0f0',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  marginTop: 6,
},

modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},

modalBox: {
  backgroundColor: 'white',
  borderRadius: 16,
  paddingTop: 30,
  paddingBottom: 20,
  paddingHorizontal: 20,
  width: '90%',
  alignItems: 'center',
},

modalCloseButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  padding: 5,
  zIndex: 10,
},

modalContent: {
  width: '100%',
  paddingBottom: 12,
},

modalImageBox: {
  height: 160,
  width: '100%',
  backgroundColor: '#f0f0f0',
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 12,
  marginBottom: 12,
},
  mapOptionsContainer: {
    position: 'absolute', 
    bottom: 10, 
    right: 10,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  mapTypeOptionsContainer: {
    position: 'absolute',
    bottom: 70,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 10,
  },
  mapTypeOption: {
    padding: 8,
    borderRadius: 6,
    marginVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMapTypeOption: {
    backgroundColor: 'green',
  },
  mapOptions: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'green', 
    borderRadius: 100,
    width: 50,
    height: 50,
    marginBottom: 10,
    opacity: 0.8,
  },
  // Callout styles
  calloutContainer: {
    minWidth: 240,
    maxWidth: 300,
    padding: 16,
    backgroundColor: 'transparent',
    borderRadius: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    alignItems: 'flex-start',
  },
  calloutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#222',
  },
  calloutDescription: {
    fontSize: 15,
    marginBottom: 10,
    color: '#444',
  },
  calloutDetail: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  calloutLabel: {
    fontWeight: 'bold',
    color: '#222',
  },
  calloutButton: {
    marginTop: 10,
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 7,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  calloutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 22,
    fontWeight: "600",
    color: "#222",
    marginBottom: 32,
  },
  logoutButton: {
    marginTop: 500,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: "#7c3aed",
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});

