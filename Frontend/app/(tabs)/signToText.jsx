import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Camera } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import Common from "../../Components/Container/Common";

export default function SignToText() {
  // State
  const [hasPermission, setHasPermission] = useState(null);

  // Request camera permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error('Permission error:', error);
        setHasPermission(false);
      }
    })();
  }, []);

  // Permission is still being determined
  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Common />
        <View style={styles.center}>
          <Text>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission was denied
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <Common />
        <View style={styles.center}>
          <Text>No access to camera</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              const { status } = await Camera.requestCameraPermissionsAsync();
              setHasPermission(status === 'granted');
            }}
          >
            <Text style={styles.buttonText}>Request Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Permission granted, show camera
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Common />
      <Text style={styles.title}>Sign Language to Text</Text>

      <View style={styles.cameraContainer}>
        <Camera style={styles.camera} />
      </View>

      <View style={styles.footer}>
        <Text>Camera is working! More features coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D0F3DA",
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#155658',
    marginBottom: 15,
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#F7B316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});