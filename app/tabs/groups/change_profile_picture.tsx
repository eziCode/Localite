import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';

const PROFILE_SIZE = 160;

export default function ProfileImageSelector() {
  const [image, setImage] = useState<string | null>(null);

  const selectImage = async () => {
    try {
      const result = await ImagePicker.openPicker({
        width: PROFILE_SIZE,
        height: PROFILE_SIZE,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });
      setImage(result.path);
    } catch (e) {
      console.log('User cancelled picker', e);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={selectImage} style={styles.imageWrapper}>
        {image ? (
          <Image source={{ uri: image }} style={styles.profileImage} />
        ) : (
          <Text style={styles.placeholderText}>Tap to select</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  imageWrapper: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  placeholderText: {
    color: '#666',
  },
});
