import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react"; //useEffect
import { StyleSheet, TouchableOpacity, View } from "react-native"; //TouchableOpacity
import MapView, { MAP_TYPES, PROVIDER_GOOGLE } from 'react-native-maps';

export default function GeoMap() {
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
      console.log("Permission to access location was denied.") // LATER: Show a popup to user to enable location services <---- #$*(#*@($*@#(*$(REU(#@*$(*@#($*())))))))
    }

    let location = await Location.getCurrentPositionAsync({});

    mapRef.current?.animateToRegion({ // smooth 1sec animation to user's current location
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 1000);
  }

  const [currentRegion, setCurrentRegion] = useState({}); // The region that the user is currently looking at (lat, long, latDelta, longDelta)
  const handleRegionChangeComplete = (region: React.SetStateAction<{}>) => {
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



  useEffect(() => {
    userLocation()
  },[]); // empty brackets means that this function runs only once when the page renders

  return (
<>
    <Stack.Screen options={{ title: "Event Map", headerShown: false }}/> 
    <View style={{ flex: 1 }}>
      <MapView style={{ width: '100%', height: '100%' }} ref={mapRef} provider={PROVIDER_GOOGLE} initialRegion={mapRegion} onRegionChangeComplete={handleRegionChangeComplete} mapType={chosenType.type} showsUserLocation={true} />
        <View style={styles.mapOptionsContainer}>
          
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