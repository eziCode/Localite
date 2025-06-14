import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react"; //useEffect
import { Alert, Linking, Platform, StyleSheet, TouchableOpacity, View } from "react-native"; //TouchableOpacity
import MapView, { MAP_TYPES, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from "../../../lib/supabase";
import type { UserEvent } from "../../../types/user_event";

export default function GeoMap() {
  type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  const [mapRegion] = useState({ // U.S. coordiantes -- if user location is not set, this will be the default map region
    latitude: 38.7946,
    longitude: -99.5348,
    latitudeDelta: 35,
    longitudeDelta: 35,
  });
  const mapRef = useRef<MapView | null>(null);
  const userLocation = async () => { // Retrieve user's current location function
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { // If denied
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

    mapRef.current?.animateToRegion({ // smooth 1sec animation to user's current location
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 1000);
  }

  const [currentRegion, setCurrentRegion] = useState<Region>({latitude:0,longitude:0,latitudeDelta:0,longitudeDelta:0}); // The region that the user is currently looking at (lat, long, latDelta, longDelta)
  const handleRegionChangeComplete = (region: Region) => {
    setCurrentRegion(region);

    console.log('Current Region:', region); 
  };


  // Map types:
  const terrain_types = [MAP_TYPES.STANDARD, MAP_TYPES.TERRAIN, MAP_TYPES.HYBRID,  MAP_TYPES.SATELLITE]; // Map types compatible with Android and iOS
  const [chosenType, setMapType] = useState({
    type: terrain_types[0], // Default map type is standard
  });
  const changeMapType = () => { 
    let currentIndex = terrain_types.indexOf(chosenType.type); // Get the current index of the map type
    if (currentIndex < terrain_types.length - 1) { // If not the last type
      setMapType({ type: terrain_types[currentIndex + 1] });
    } else { // If the last type, reset to the first type
      setMapType({ type: terrain_types[0] });
    }
  }

  // display 20 most upvoted events in the current view of the map
  const [eventsInView, setEvents] = useState<UserEvent[]>([]); // State to hold events data
  const fetchEventsInView = async () => {
    const minLat = currentRegion.latitude - currentRegion.latitudeDelta/2;
    const maxLat = currentRegion.latitude + currentRegion.latitudeDelta/2;
    const minLng = currentRegion.longitude - currentRegion.longitudeDelta/2;
    const maxLng = currentRegion.longitude + currentRegion.longitudeDelta/2;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("latitude", minLat)
      .lte("latitude", maxLat)
      .gte("longitude", minLng)
      .lte("longitude", maxLng)
      .gte("start_time", new Date().toISOString()) // only get events that haven't started yet
      .order("upvotes", { ascending: false }) // order by # of upvotes
      .limit(20); // get top 20 events

      if (error) console.error(error);
      else setEvents(data);

    // NEXT: DISPLAY EVENTS ON MAP WITH MARKERS <-- #$*()#@*$(*)@#&*$*#@&*$&@#*(&$*@(#&$(*@&#$*(@#))))
  }



  useEffect(() => {
    userLocation();

    fetchEventsInView();
  },[]); // empty brackets means that this runs only once when the page renders

  return (
<>
    <Stack.Screen options={{ title: "Event Map", headerShown: false }}/> 
    <View style={{ flex: 1 }}>
      <MapView style={{ width: '100%', height: '100%' }} ref={mapRef} provider={PROVIDER_GOOGLE} initialRegion={mapRegion} onRegionChangeComplete={handleRegionChangeComplete} mapType={chosenType.type} showsUserLocation={true} />
        <View style={styles.mapOptionsContainer}>
          <Marker id="1" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="2" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="3" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="4" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="5" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="6" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="7" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="8" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="9" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="10" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="11" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="12" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="13" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="14" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="15" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="16" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="17" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="18" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="19" coordinate={{ latitude: 0, longitude: 0 }}></Marker>
          <Marker id="20" coordinate={{ latitude: 0, longitude: 0 }}></Marker>

          <TouchableOpacity style={styles.mapOptions} onPress={userLocation}><MaterialIcons name="my-location" size={33} color="white" /></TouchableOpacity>
          <TouchableOpacity style={styles.mapOptions} onPress={changeMapType}><MaterialIcons name="map" size={33} color="white" /></TouchableOpacity>
        </View>
      <MapView/>
      <MapView/>
    </View>
</>
  // NEXT: FIND A WAY TO FIND ELEVATION FROM GROUND or sea level, IF HIGHER THAN A CERTAIN ELEVATION, SHOW TOP 10 EVENTS FROM USERS CURRENT VIEW OF THE MAP, OTHERWISE..
  // .. IF UNDER ELEVATION THRESHOLD (like looking close up at a city), SHOW 20(?) EVENTS IN THE CITY/LOCATION THEY'RE LOOKING AT.

      // {/* <Stack.Screen options={{ headerShown: false }}/>
      // <View style={styles.container}>
      //   <Text style={styles.text}>Event Map</Text>
      // </View> */}
      


      // {/* <Stack.Screen options={{ headerShown: false }} />
      // <View style={styles.container}>
      //   <Text style={styles.text}>Welcome to Maps</Text>
      //   <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
      //     <Text style={styles.logoutText}>Log In</Text>
      //   </TouchableOpacity>
      // </View> */}
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
  mapOptions: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'green', 
    borderRadius: 100, //circle
    width: 50,
    height: 50,
    marginBottom: 10,
    opacity: 0.8,
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