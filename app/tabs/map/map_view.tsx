import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Callout, MAP_TYPES, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from "../../../lib/supabase";
import type { UserEvent } from "../../../types/user_event";

export default function GeoMap() {
  type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  const [mapRegion] = useState({
    latitude: 38.7946,
    longitude: -99.5348,
    latitudeDelta: 35,
    longitudeDelta: 35,
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
      .order("upvotes", { ascending: false })
      .limit(10);

    if (error) console.error(error);
    else setEvents(data || []);
  }

  // No debounce: fetch events immediately on region change
  const handleRegionChangeComplete = (region: Region) => {
    setCurrentRegion(region);
    fetchEventsInView(region);
  };

  useEffect(() => {
    userLocation();
    fetchEventsInView(mapRegion);
  },[]);

  const [showMapTypeOptions, setShowMapTypeOptions] = useState(false);

  return (
    <>
      <Stack.Screen options={{ title: "Event Map", headerShown: false }}/> 
      <View style={{ flex: 1 }}>
        <MapView
          style={{ width: '100%', height: '100%' }}
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          initialRegion={mapRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          mapType={chosenType.type}
          showsUserLocation={true}
        >
            {eventsInView.map((event) => (
            <Marker
              key={event.id}
              coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            >
              <Callout tooltip={false}>
              <View style={styles.calloutContainer}>
                {/* X button to remove event */}
                <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 2,
                  padding: 4,
                }}
                onPress={() => setEvents((prev) => prev.filter(e => e.id !== event.id))}
                >
                <MaterialIcons name="close" size={20} color="#888" />
                </TouchableOpacity>
                <Text style={[styles.calloutTitle, {paddingRight: 28}]}>{event.title}</Text>
                <Text style={styles.calloutDescription}>{event.description}</Text>
                <Text style={styles.calloutDetail}>
                <Text style={styles.calloutLabel}>Time: </Text>
                {event.start_time
                  ? new Date(event.start_time).toLocaleString()
                  : "N/A"}
                </Text>
                <Text style={styles.calloutDetail}>
                <Text style={styles.calloutLabel}>Location: </Text>
                {`${event.location_name}`}
                </Text>
                <TouchableOpacity style={styles.calloutButton}>
                <Text style={styles.calloutButtonText}>Open Event</Text>
                </TouchableOpacity>
              </View>
              </Callout>
            </Marker>
            ))}
        </MapView>
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
              {terrain_types.map((type, idx) => (
              <TouchableOpacity
                key={type}
                style={[
                styles.mapTypeOption,
                chosenType.type === type && styles.selectedMapTypeOption,
                ]}
                onPress={() => {
                setMapType({ type });
                setShowMapTypeOptions(false);
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
    backgroundColor: '#fff',
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
