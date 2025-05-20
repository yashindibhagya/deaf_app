import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import { AntDesign } from "@expo/vector-icons";
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

// Backend URL - must match the one in modelBridge.js
const BACKEND_URL = 'http://192.168.1.100:8000';

const ModelCamera = ({
    onTranslationUpdate = () => { },
    onTranslationComplete = () => { },
    isRecording = false,
    onStartRecording = () => { },
    onStopRecording = () => { }
}) => {
    // Camera states
    const [hasPermission, setHasPermission] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [facing, setFacing] = useState('front');
    const cameraRef = useRef(null);

    // Recognition states
    const [isCapturing, setIsCapturing] = useState(false);
    const [isModelReady, setIsModelReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [translatedText, setTranslatedText] = useState('');
    const [detectedSigns, setDetectedSigns] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Timers and counters
    const frameCount = useRef(0);
    const lastCaptureTime = useRef(0);
    const captureInterval = useRef(null);

    // Check camera permissions
    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
            if (status !== 'granted') {
                Alert.alert(
                    "Camera Permission Required",
                    "Please grant camera permissions to use this feature.",
                    [{ text: "OK" }]
                );
            }
        })();
    }, []);

    // Check if backend server is available
    useEffect(() => {
        const checkServer = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/`);
                if (response.ok) {
                    console.log("Connected to model server");
                    setIsModelReady(true);
                } else {
                    console.error("Model server is not responding correctly");
                    setIsModelReady(false);
                }
            } catch (error) {
                console.error("Failed to connect to model server:", error);
                setIsModelReady(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkServer();
    }, []);

    // Handle external recording state changes
    useEffect(() => {
        if (!isLoading && isRecording && !isCapturing) {
            handleStartCapture();
        } else if (!isLoading && !isRecording && isCapturing) {
            handleStopCapture();
        }
    }, [isRecording, isCapturing, isLoading]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (captureInterval.current) {
                clearInterval(captureInterval.current);
            }
        };
    }, []);

    // Toggle camera facing
    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    // Start capturing frames
    const handleStartCapture = async () => {
        if (!cameraReady) {
            Alert.alert("Camera not ready", "Please wait for the camera to initialize.");
            return;
        }

        if (!isModelReady) {
            Alert.alert("Model not ready", "Please ensure the model server is running.");
            return;
        }

        // Reset the sequence on the server
        try {
            await fetch(`${BACKEND_URL}/reset`, { method: 'POST' });
        } catch (error) {
            console.error("Failed to reset sequence:", error);
            Alert.alert("Connection Error", "Failed to connect to the model server.");
            return;
        }

        // Notify parent component
        try {
            onStartRecording();
        } catch (error) {
            console.error("Error in onStartRecording:", error);
        }

        setIsCapturing(true);
        setDetectedSigns([]);
        setTranslatedText('');
        frameCount.current = 0;
        lastCaptureTime.current = Date.now();

        // Start capturing frames at regular intervals
        captureInterval.current = setInterval(captureFrame, 200); // 5 fps
    };

    // Capture a single frame and send to server
    const captureFrame = async () => {
        if (!cameraRef.current || !isCapturing) return;

        try {
            setIsProcessing(true);

            // Take a picture
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                base64: true,
                skipProcessing: true
            });

            // Send frame to server
            const formData = new FormData();
            formData.append('file', {
                uri: photo.uri,
                type: 'image/jpeg',
                name: 'frame.jpg'
            });

            const response = await fetch(`${BACKEND_URL}/predict/frame`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            frameCount.current++;

            // Get prediction if we've sent enough frames
            if (frameCount.current % 15 === 0) { // Check for prediction every 15 frames
                await getPrediction();
            }

            setIsProcessing(false);
        } catch (error) {
            console.error('Error capturing frame:', error);
            setIsProcessing(false);
        }
    };

    // Get prediction from server
    const getPrediction = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/predict`);

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const prediction = await response.json();

            if (prediction.action && prediction.action !== 'unknown' && prediction.action !== 'insufficient_data') {
                // Update detected signs
                const newDetectedSigns = [...detectedSigns];

                // Only add if it's different from the last sign
                if (newDetectedSigns.length === 0 || newDetectedSigns[newDetectedSigns.length - 1] !== prediction.action) {
                    newDetectedSigns.push(prediction.action);
                    setDetectedSigns(newDetectedSigns);

                    // Update translated text
                    const newTranslatedText = formatTranslatedText(newDetectedSigns);
                    setTranslatedText(newTranslatedText);

                    // Send update to parent component
                    onTranslationUpdate(newTranslatedText, newDetectedSigns);
                }
            }
        } catch (error) {
            console.error('Error getting prediction:', error);
        }
    };

    // Format the translated text from detected signs
    const formatTranslatedText = (signs) => {
        if (!signs || signs.length === 0) return "";

        let formattedText = signs.join(" ");

        // Capitalize first letter
        formattedText = formattedText.charAt(0).toUpperCase() + formattedText.slice(1);

        // Add period at the end if there isn't one
        if (!formattedText.endsWith('.')) {
            formattedText += '.';
        }

        return formattedText;
    };

    // Stop capturing frames
    const handleStopCapture = () => {
        // Clear capture interval
        if (captureInterval.current) {
            clearInterval(captureInterval.current);
            captureInterval.current = null;
        }

        setIsCapturing(false);

        // Notify parent component
        try {
            onStopRecording();
        } catch (error) {
            console.error("Error in onStopRecording:", error);
        }

        // If we have a translation, pass it to the parent component
        try {
            if (translatedText) {
                onTranslationComplete(translatedText, detectedSigns);
            }
        } catch (error) {
            console.error("Error in onTranslationComplete:", error);
        }
    };

    // Reset everything
    const handleReset = () => {
        handleStopCapture();
        setTranslatedText("");
        setDetectedSigns([]);

        // Also update the parent component
        try {
            onTranslationUpdate("", []);
        } catch (error) {
            console.error("Error in onTranslationUpdate during reset:", error);
        }

        // Reset the sequence on the server
        fetch(`${BACKEND_URL}/reset`, { method: 'POST' })
            .catch(error => console.error("Failed to reset sequence:", error));
    };

    // If loading, show a loading indicator
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Connecting to model server...</Text>
            </View>
        );
    }

    // If permissions are not granted, show a message
    if (hasPermission === false) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>
                    We need camera permission to translate sign language.
                </Text>
                <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={() => Camera.requestCameraPermissionsAsync()}
                >
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                style={styles.camera}
                type={facing === 'front' ? Camera.Constants.Type.front : Camera.Constants.Type.back}
                ref={cameraRef}
                onCameraReady={() => setCameraReady(true)}
            >
                {/* Camera overlay with controls */}
                <View style={styles.overlay}>
                    {/* Top controls */}
                    <View style={styles.topControls}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={toggleCameraFacing}
                            disabled={isCapturing}
                        >
                            <AntDesign name="retweet" size={24} color="white" />
                        </TouchableOpacity>

                        {isModelReady ? (
                            <Text style={styles.statusText}>Model Ready</Text>
                        ) : (
                            <Text style={styles.statusTextWarning}>Model Not Connected</Text>
                        )}
                    </View>

                    {/* Bottom controls */}
                    <View style={styles.bottomControls}>
                        {isCapturing ? (
                            <TouchableOpacity
                                style={styles.stopButton}
                                onPress={handleStopCapture}
                                disabled={isProcessing}
                            >
                                <AntDesign name="stop" size={24} color="white" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.recordButton}
                                onPress={handleStartCapture}
                                disabled={!cameraReady || !isModelReady || isProcessing}
                            >
                                <AntDesign name="videocamera" size={24} color="white" />
                                <Text style={styles.recordButtonText}>Start</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handleReset}
                            disabled={isProcessing}
                        >
                            <AntDesign name="reload1" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Translation display */}
                    {translatedText && (
                        <View style={styles.translationContainer}>
                            <Text style={styles.translationText}>{translatedText}</Text>
                        </View>
                    )}

                    {/* Processing indicator */}
                    {isProcessing && (
                        <View style={styles.processingContainer}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.processingText}>Processing...</Text>
                        </View>
                    )}
                </View>
            </Camera>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 16,
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    recordButton: {
        backgroundColor: '#FF4136',
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
    },
    recordButtonText: {
        color: 'white',
        marginTop: 4,
        fontSize: 12,
    },
    stopButton: {
        backgroundColor: '#FF4136',
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
    },
    resetButton: {
        backgroundColor: '#0074D9',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    translationContainer: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    translationText: {
        color: 'white',
        fontSize: 18,
        textAlign: 'center',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    permissionText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    permissionButton: {
        backgroundColor: '#0074D9',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    permissionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    statusText: {
        color: '#4CAF50',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 8,
        borderRadius: 8,
        fontSize: 14,
    },
    statusTextWarning: {
        color: '#FFC107',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 8,
        borderRadius: 8,
        fontSize: 14,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        color: '#4CAF50',
        fontSize: 16,
        marginTop: 20,
    },
    processingContainer: {
        position: 'absolute',
        top: 60,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 8,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    processingText: {
        color: 'white',
        fontSize: 12,
        marginLeft: 8,
    }
});

export default ModelCamera; 