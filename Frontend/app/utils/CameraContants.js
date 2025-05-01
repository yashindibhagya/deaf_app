import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Platform,
} from "react-native";
import { Camera } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { FontAwesome } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import Common from "../../Components/Container/Common";
import Button from "../../Components/Shared/Button";

// Fallback constants for camera types
const CAMERA_TYPES = {
    front: 1, // These are the actual values used by expo-camera internally
    back: 0
};

// Simple memoization to avoid recreating these objects
const getTypes = () => {
    // Try to use the actual Camera constants if available
    if (Camera && Camera.Constants && Camera.Constants.Type) {
        return Camera.Constants.Type;
    }
    // Otherwise use our fallback values
    return CAMERA_TYPES;
};

/**
 * SignToText screen for translating sign language to text
 * Uses camera and simulates sign language processing
 */
export default function SignToText() {
    const [hasPermission, setHasPermission] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [translatedText, setTranslatedText] = useState("");
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordingTimer, setRecordingTimer] = useState(null);
    // Use the front camera type from our fallback or real constants
    const [cameraType, setCameraType] = useState(undefined);
    const [selectedLanguage, setSelectedLanguage] = useState("english");
    const [cameraInitialized, setCameraInitialized] = useState(false);
    const cameraRef = useRef(null);
    const videoUri = useRef(null);

    // Request camera permissions
    useEffect(() => {
        let isMounted = true;

        const requestCameraPermission = async () => {
            console.log("Requesting camera permission...");
            try {
                const { status } = await Camera.requestCameraPermissionsAsync();
                console.log("Camera permission status:", status);

                if (isMounted) {
                    setHasPermission(status === "granted");
                }
            } catch (error) {
                console.error("Error requesting camera permission:", error);
                if (isMounted) {
                    setHasPermission(false);
                    Alert.alert("Error", "Failed to request camera permissions");
                }
            }
        };

        requestCameraPermission();

        return () => {
            isMounted = false;
            if (recordingTimer) {
                clearInterval(recordingTimer);
            }
        };
    }, []);

    // Initialize camera when permission is granted
    useEffect(() => {
        if (hasPermission !== true) return;

        // Try to set camera type after permissions are granted
        const initializeCamera = () => {
            try {
                console.log("Initializing camera...");
                // First try with Camera constants
                const types = getTypes();
                setCameraType(types.front);
                console.log("Camera type set to:", types.front);
                setCameraInitialized(true);
            } catch (error) {
                console.error("Error initializing camera:", error);
                // In case of error, try with our fallback
                setCameraType(CAMERA_TYPES.front);
                setCameraInitialized(true);
            }
        };

        // Add a delay to ensure the Camera component is fully loaded
        const timer = setTimeout(initializeCamera, 500);
        return () => clearTimeout(timer);
    }, [hasPermission]);

    // Function to toggle camera type (front/back)
    const toggleCameraType = () => {
        try {
            console.log("Toggling camera...");
            const types = getTypes();

            setCameraType(prevType => {
                // Compare with front value to determine if we should switch to back
                return prevType === types.front ? types.back : types.front;
            });
        } catch (error) {
            console.error("Error toggling camera:", error);
        }
    };

    // Start timer for recording
    const startTimer = () => {
        const timer = setInterval(() => {
            setRecordingDuration((prev) => {
                // Auto-stop recording after 10 seconds
                if (prev >= 10) {
                    stopRecording();
                    return 0;
                }
                return prev + 1;
            });
        }, 1000);

        setRecordingTimer(timer);
    };

    // Stop the timer
    const stopTimer = () => {
        if (recordingTimer) {
            clearInterval(recordingTimer);
            setRecordingTimer(null);
        }
        setRecordingDuration(0);
    };

    // Handle camera readiness
    const onCameraReady = () => {
        console.log("Camera is ready!");
        setCameraReady(true);
    };

    // Handle camera mounting errors
    const onCameraMountError = (error) => {
        console.error("Camera mount error:", error);
        Alert.alert("Camera Error", "Could not start camera. Please restart the app.");
        setCameraReady(false);
    };

    // Start recording sign language video
    const startRecording = async () => {
        if (!cameraRef.current || isRecording || !cameraReady) {
            console.warn("Cannot start recording: camera not ready or already recording");
            return;
        }

        try {
            setIsRecording(true);
            startTimer();

            // Safely access video quality or use fallback
            let videoQuality = "720p";
            if (Camera && Camera.Constants && Camera.Constants.VideoQuality) {
                videoQuality = Camera.Constants.VideoQuality["720p"] || "720p";
            }

            const videoOptions = {
                maxDuration: 10,
                quality: videoQuality,
                mute: true,
            };

            console.log("Starting video recording...");
            cameraRef.current.recordAsync(videoOptions)
                .then((recordedVideo) => {
                    console.log("Recording completed:", recordedVideo.uri);
                    videoUri.current = recordedVideo.uri;
                    // Process the recorded video
                    processRecordedVideo(recordedVideo.uri);
                })
                .catch(error => {
                    console.error("Error during recording:", error);
                    setIsRecording(false);
                    stopTimer();
                    Alert.alert("Recording Error", "Failed to record video");
                });
        } catch (error) {
            console.error("Error starting recording:", error);
            setIsRecording(false);
            stopTimer();
            Alert.alert("Error", "Failed to start recording");
        }
    };

    // Stop the current recording
    const stopRecording = async () => {
        if (!cameraRef.current || !isRecording) {
            return;
        }

        try {
            console.log("Stopping video recording...");
            cameraRef.current.stopRecording();
            setIsRecording(false);
            stopTimer();
        } catch (error) {
            console.error("Error stopping recording:", error);
            setIsRecording(false);
            stopTimer();
        }
    };

    // Process the recorded video to translate to text
    const processRecordedVideo = async (uri) => {
        setIsProcessing(true);

        try {
            // Check if the video exists
            const fileInfo = await FileSystem.getInfoAsync(uri);

            if (!fileInfo.exists) {
                throw new Error("Video file doesn't exist");
            }

            console.log(`Processing video (${fileInfo.size} bytes)...`);

            // Simulate processing with a delay
            await simulateLocalProcessing();
        } catch (error) {
            console.error("Error processing video:", error);

            // Still show a result even if there's an error
            await simulateLocalProcessing();
        } finally {
            setIsProcessing(false);
        }
    };

    // Simulates local processing for demo purposes
    const simulateLocalProcessing = async () => {
        // Add a delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Example responses for demonstration
        const demoResponses = [
            "Hello! How are you?",
            "Thank you",
            "My name is John",
            "Nice to meet you",
            "I am learning sign language"
        ];

        const randomIndex = Math.floor(Math.random() * demoResponses.length);
        setTranslatedText(demoResponses[randomIndex]);
    };

    // Save the conversation to history (just logs it for now)
    const saveConversationToHistory = (text) => {
        console.log("Saving conversation:", {
            text,
            language: selectedLanguage,
            timestamp: new Date().toISOString()
        });

        Alert.alert(
            "Saved!",
            "Your translation has been saved.",
            [{ text: "OK" }]
        );
    };

    // Reset the translation
    const resetTranslation = () => {
        setTranslatedText("");
        videoUri.current = null;
    };

    // Toggle language selection
    const toggleLanguage = () => {
        setSelectedLanguage(prev => prev === "english" ? "sinhala" : "english");
    };

    // Reinitialize camera (for error recovery)
    const reinitializeCamera = () => {
        setCameraInitialized(false);
        setCameraReady(false);

        // Briefly set camera type to undefined to force remounting
        setCameraType(undefined);

        // Re-initialize after a short delay
        setTimeout(() => {
            try {
                const types = getTypes();
                setCameraType(types.front);
                setCameraInitialized(true);
            } catch (error) {
                console.error("Error reinitializing camera:", error);
                setCameraType(CAMERA_TYPES.front);
                setCameraInitialized(true);
            }
        }, 500);
    };

    // Handle loading state
    if (hasPermission === null) {
        return (
            <SafeAreaView style={styles.container}>
                <Common />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F7B316" />
                    <Text style={styles.loadingText}>Requesting camera permission...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Handle permission denied
    if (hasPermission === false) {
        return (
            <SafeAreaView style={styles.container}>
                <Common />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Camera access denied</Text>
                    <Text style={styles.errorSubtext}>
                        Please enable camera permissions in your device settings to use this feature.
                    </Text>
                    <Button
                        text="Request Permission Again"
                        onPress={async () => {
                            const { status } = await Camera.requestCameraPermissionsAsync();
                            setHasPermission(status === "granted");
                        }}
                        type="primary"
                        style={styles.permissionButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    // Main component render
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <Common />

            <View style={styles.header}>
                <Text style={styles.title}>Sign Language to Text</Text>
                <Text style={styles.subtitle}>
                    Record yourself signing and get a text translation
                </Text>

                {/* Language toggle button */}
                <TouchableOpacity
                    style={styles.languageToggle}
                    onPress={toggleLanguage}
                >
                    <Text style={styles.languageText}>
                        {selectedLanguage === "english" ? "English" : "Sinhala"}
                    </Text>
                    <FontAwesome name="language" size={18} color="#155658" />
                </TouchableOpacity>
            </View>

            <View style={styles.cameraContainer}>
                {cameraType !== undefined && cameraInitialized ? (
                    <Camera
                        ref={cameraRef}
                        style={styles.camera}
                        type={cameraType}
                        onCameraReady={onCameraReady}
                        onMountError={onCameraMountError}
                        useCamera2Api={Platform.OS === 'android'}
                    >
                        {/* Camera overlay with controls */}
                        <View style={styles.cameraOverlay}>
                            {/* Camera type toggle button */}
                            <TouchableOpacity
                                style={styles.cameraToggleButton}
                                onPress={toggleCameraType}
                            >
                                <FontAwesome name="refresh" size={20} color="#fff" />
                            </TouchableOpacity>

                            {/* Recording duration indicator */}
                            {isRecording && (
                                <View style={styles.recordingIndicator}>
                                    <View style={styles.recordingDot} />
                                    <Text style={styles.recordingTime}>
                                        {recordingDuration}s
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Camera>
                ) : (
                    <View style={styles.cameraPlaceholder}>
                        <Text style={styles.cameraPlaceholderText}>Initializing camera...</Text>
                        {cameraInitialized === false && hasPermission === true && (
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={reinitializeCamera}
                            >
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {translatedText ? (
                <View style={styles.translationContainer}>
                    <Text style={styles.translationLabel}>Translation:</Text>
                    <Text style={styles.translationText}>{translatedText}</Text>
                    <View style={styles.buttonRow}>
                        <Button
                            text="New Translation"
                            onPress={resetTranslation}
                            type="outline"
                            style={styles.actionButton}
                        />
                        <Button
                            text="Save"
                            onPress={() => saveConversationToHistory(translatedText)}
                            type="primary"
                            style={styles.actionButton}
                        />
                    </View>
                </View>
            ) : (
                <View style={styles.controlsContainer}>
                    {isRecording ? (
                        <TouchableOpacity
                            style={styles.stopButton}
                            onPress={stopRecording}
                            disabled={!cameraReady || isProcessing}
                        >
                            <FontAwesome name="stop" size={24} color="#FFF" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.recordButton,
                                (!cameraReady || isProcessing) && styles.disabledButton
                            ]}
                            onPress={startRecording}
                            disabled={!cameraReady || isProcessing}
                        >
                            <FontAwesome name="circle" size={24} color="#FFF" />
                        </TouchableOpacity>
                    )}

                    {isProcessing && (
                        <View style={styles.processingContainer}>
                            <ActivityIndicator size="large" color="#F7B316" />
                            <Text style={styles.processingText}>Processing sign language...</Text>
                        </View>
                    )}

                    <Text style={styles.instructionText}>
                        {isRecording
                            ? "Recording... Tap stop when finished"
                            : cameraReady
                                ? "Tap the button to start recording"
                                : "Waiting for camera to initialize..."}
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#D0F3DA",
        padding: 20,
    },
    header: {
        marginBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#155658",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginBottom: 10,
    },
    languageToggle: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: "flex-start",
        marginBottom: 10,
    },
    languageText: {
        color: "#155658",
        marginRight: 8,
        fontWeight: "500",
    },
    cameraContainer: {
        width: "100%",
        aspectRatio: 9 / 16,
        borderRadius: 20,
        overflow: "hidden",
        marginBottom: 20,
        backgroundColor: "#000",
    },
    camera: {
        flex: 1,
    },
    cameraPlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#222",
    },
    cameraPlaceholderText: {
        color: "#fff",
        fontSize: 16,
        marginBottom: 15,
    },
    retryButton: {
        backgroundColor: "#F7B316",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 10,
    },
    retryButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: "transparent",
        justifyContent: "flex-start",
        alignItems: "flex-end",
    },
    cameraToggleButton: {
        margin: 20,
        padding: 10,
        borderRadius: 20,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    recordingIndicator: {
        position: "absolute",
        top: 20,
        left: 20,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#F44336",
        marginRight: 5,
    },
    recordingTime: {
        color: "#FFF",
        fontWeight: "bold",
    },
    controlsContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
        flex: 1,
    },
    recordButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#F44336",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        borderWidth: 4,
        borderColor: "rgba(255, 255, 255, 0.5)",
    },
    stopButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#F44336",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    disabledButton: {
        opacity: 0.5,
    },
    instructionText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        color: "#666",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#F44336",
        marginBottom: 10,
    },
    errorSubtext: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
    },
    permissionButton: {
        marginTop: 10,
    },
    processingContainer: {
        marginBottom: 20,
        alignItems: "center",
    },
    processingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },
    translationContainer: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        marginTop: 10,
        flex: 1,
    },
    translationLabel: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#155658",
        marginBottom: 10,
    },
    translationText: {
        fontSize: 18,
        color: "#333",
        marginBottom: 20,
        lineHeight: 24,
        flex: 1,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    actionButton: {
        flex: 1,
        marginHorizontal: 5,
    },
});