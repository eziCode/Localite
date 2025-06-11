// import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

export default function GeoMap() {
  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ width: '100%', height: '100%' }} provider={PROVIDER_GOOGLE}/>
    </View>


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
    marginTop: 16,
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