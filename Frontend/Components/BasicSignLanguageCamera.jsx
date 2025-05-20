import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
    ActivityIndicator
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AntDesign } from "@expo/vector-icons";
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import useSignLanguageProcessor from './SignLanguageProcessor';
import { processFrame as processMediaPipeFrame } from '../app/utils/mediapipe';

// Default empty functions to avoid undefined errors
const noop = () => { };

const BasicSignLanguageCamera = (props = {}) => {
    // Extract props with default values
    const onTranslationComplete = props?.onTranslationComplete || noop;
    const onTranslationUpdate = props?.onTranslationUpdate || noop;
    const isRecording = props?.isRecording || false;
    const onStartRecording = props?.onStartRecording || noop;
    const onStopRecording = props?.onStopRecording || noop;

    console.log("BasicSignLanguageCamera props:", {
        hasOnTranslationUpdate: !!onTranslationUpdate,
        hasOnTranslationComplete: !!onTranslationComplete,
        isRecording,
        hasOnStartRecording: !!onStartRecording,
        hasOnStopRecording: !!onStopRecording
    });

    // Camera permissions
    const [permissionResponse, requestPermission] = useCameraPermissions();

    // Camera states
    const [facing, setFacing] = useState('front');
    const [cameraReady, setCameraReady] = useState(false);
    const cameraRef = useRef(null);

    // Frame processing states
    const [isCapturing, setIsCapturing] = useState(false);
    const lastCaptureTime = useRef(0);

    // Loading state
    const [isLoading, setIsLoading] = useState(true);

    // Initialize detectedSigns state
    const [detectedSigns, setDetectedSigns] = useState([]);

    // Get sign language processor
    const {
        isModelReady,
        processFrame,
        translatedText,
        resetTranslation,
        startCapturing: startProcessing,
        stopCapturing: stopProcessing,
        isProcessing,
        detectedSigns: processorDetectedSigns
    } = useSignLanguageProcessor();

    // Update local detectedSigns when processor's detectedSigns change
    useEffect(() => {
        if (processorDetectedSigns) {
            setDetectedSigns(processorDetectedSigns);
        }
    }, [processorDetectedSigns]);

    // Set loading state when hook is ready
    useEffect(() => {
        setIsLoading(false);
    }, []);

    // Handle external recording state changes
    useEffect(() => {
        if (!isLoading && isRecording && !isCapturing) {
            handleStartCapture();
        } else if (!isLoading && !isRecording && isCapturing) {
            handleStopCapture();
        }
    }, [isRecording, isCapturing, isLoading]);

    // Send real-time updates to parent component
    useEffect(() => {
        if (!isLoading && translatedText) {
            try {
                onTranslationUpdate(translatedText, detectedSigns);
            } catch (error) {
                console.error("Error in onTranslationUpdate:", error);
            }
        }
    }, [translatedText, detectedSigns, onTranslationUpdate, isLoading]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (resetTranslation) {
                resetTranslation();
            }
        };
    }, [resetTranslation]);

    // Check camera permissions
    useEffect(() => {
        (async () => {
            if (!permissionResponse?.granted) {
                await requestPermission();
            }
        })();
    }, [permissionResponse, requestPermission]);

    // Toggle camera facing
    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    // Handle frame processor for continuous video
    const handleFrameProcessor = async (frame) => {
        if (!isCapturing || !isModelReady || isLoading) return;

        try {
            const now = Date.now();
            // Ensure we're not processing frames too quickly (throttle to ~5fps)
            if (now - lastCaptureTime.current < 200) {
                return;
            }

            lastCaptureTime.current = now;

            // Process the frame data directly
            const results = await processMediaPipeFrame({
                width: frame.width,
                height: frame.height,
                uri: frame.uri || 'frame-data'
            });

            if (processFrame) {
                await processFrame(results);
            }
        } catch (error) {
            console.error('Error processing video frame:', error);
        }
    };

    // Start capturing frames
    const handleStartCapture = async () => {
        if (!cameraReady) {
            Alert.alert("Camera not ready", "Please wait for the camera to initialize.");
            return;
        }

        if (!isModelReady) {
            Alert.alert("Model not ready", "Please wait for the sign language model to load.");
            return;
        }

        // Notify parent component
        try {
            onStartRecording();
        } catch (error) {
            console.error("Error in onStartRecording:", error);
        }

        setIsCapturing(true);
        if (startProcessing) {
            startProcessing();
        }
        console.log("Started capturing frames");
        lastCaptureTime.current = Date.now();
    };

    // Stop capturing frames
    const handleStopCapture = () => {
        setIsCapturing(false);
        if (stopProcessing) {
            stopProcessing();
        }
        console.log("Stopped capturing frames");

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
        if (resetTranslation) {
            resetTranslation();
        }

        // Also update the parent component
        try {
            onTranslationUpdate("", []);
        } catch (error) {
            console.error("Error in onTranslationUpdate during reset:", error);
        }

        console.log("Reset translation");
    };

    // If loading, show a loading indicator
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Initializing camera...</Text>
            </View>
        );
    }

    // If permissions are not granted, show a message
    if (!permissionResponse?.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>
                    We need camera permission to translate sign language.
                </Text>
                <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={requestPermission}
                >
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing={facing}
                ref={cameraRef}
                onCameraReady={() => setCameraReady(true)}
                frameProcessor={isCapturing ? handleFrameProcessor : undefined}
                frameProcessorFps={5}
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
                            <Text style={styles.statusTextWarning}>Model Loading...</Text>
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
                </View>
            </CameraView>
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
    }
});

export default BasicSignLanguageCamera; 