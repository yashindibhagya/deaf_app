import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ProgressBarAndroid,
    ProgressViewIOS,
    Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AntDesign } from "@expo/vector-icons";
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import useSignLanguageProcessor from './SignLanguageProcessor';
import { processFrame as processMediaPipeFrame } from '../app/utils/mediapipe';

const SignLanguageCamera = React.memo(function SignLanguageCamera(props) {
    // Debug props
    console.log("SignLanguageCamera props:", props);

    // Extract props with default values
    const {
        onTranslationComplete = () => { },
        onTranslationUpdate = () => { },
        isRecording = false,
        onStartRecording = () => { },
        onStopRecording = () => { }
    } = props || {};

    // Safe function calls
    const safeOnTranslationComplete = (text, signs) => {
        try {
            if (typeof onTranslationComplete === 'function') {
                onTranslationComplete(text, signs);
            }
        } catch (error) {
            console.error("Error calling onTranslationComplete:", error);
        }
    };

    const safeOnTranslationUpdate = (text, signs) => {
        try {
            if (typeof onTranslationUpdate === 'function') {
                onTranslationUpdate(text, signs);
            }
        } catch (error) {
            console.error("Error calling onTranslationUpdate:", error);
        }
    };

    const safeOnStartRecording = () => {
        try {
            if (typeof onStartRecording === 'function') {
                onStartRecording();
            }
        } catch (error) {
            console.error("Error calling onStartRecording:", error);
        }
    };

    const safeOnStopRecording = () => {
        try {
            if (typeof onStopRecording === 'function') {
                onStopRecording();
            }
        } catch (error) {
            console.error("Error calling onStopRecording:", error);
        }
    };

    // Camera permissions
    const [permissionResponse, requestPermission] = useCameraPermissions();

    // Camera states
    const [facing, setFacing] = useState('front');
    const [cameraReady, setCameraReady] = useState(false);
    const cameraRef = useRef(null);

    // Frame processing states
    const [isCapturing, setIsCapturing] = useState(false);
    const lastCaptureTime = useRef(0);

    // Get sign language processor
    const {
        isModelReady,
        processFrame,
        prediction,
        confidence,
        detectedSigns,
        translatedText,
        resetTranslation,
        startCapturing: startProcessing,
        stopCapturing: stopProcessing,
        isProcessing,
        frameCount,
        totalFramesNeeded,
        modelLoadingError,
        modelLoadingProgress,
        setIsModelReady,
        setModelLoadingProgress
    } = useSignLanguageProcessor();

    // Handle external recording state changes
    useEffect(() => {
        if (isRecording && !isCapturing) {
            handleStartCapture();
        } else if (!isRecording && isCapturing) {
            handleStopCapture();
        }
    }, [isRecording, isCapturing]);

    // Send real-time updates to parent component
    useEffect(() => {
        if (translatedText) {
            console.log("Updating translation in parent:", translatedText);
            safeOnTranslationUpdate(translatedText, detectedSigns);
        }
    }, [translatedText, detectedSigns]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            resetTranslation();
        };
    }, []);

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
        if (!isCapturing || !isModelReady) return;

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

            await processFrame(results);
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
        safeOnStartRecording();

        setIsCapturing(true);
        startProcessing();
        console.log("Started capturing frames");
        lastCaptureTime.current = Date.now();
    };

    // Stop capturing frames
    const handleStopCapture = () => {
        setIsCapturing(false);
        stopProcessing();
        console.log("Stopped capturing frames");

        // Notify parent component
        safeOnStopRecording();

        // If we have a translation, pass it to the parent component
        if (translatedText) {
            console.log("Sending final translation to parent:", translatedText);
            safeOnTranslationComplete(translatedText, detectedSigns);
        }
    };

    // Reset everything
    const handleReset = () => {
        handleStopCapture();
        resetTranslation();

        // Also update the parent component
        safeOnTranslationUpdate("", []);

        console.log("Reset translation");
    };

    const ModelLoadingError = ({ error, onRetry }) => {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error loading model:</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const ModelLoadingIndicator = ({ progress }) => {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading sign language model...</Text>
                {Platform.OS === 'android' ? (
                    <ProgressBarAndroid
                        styleAttr="Horizontal"
                        indeterminate={progress === 0}
                        progress={progress / 100}
                        style={styles.progressBar}
                        color="#4CAF50"
                    />
                ) : (
                    <ProgressViewIOS
                        progress={progress / 100}
                        progressTintColor="#4CAF50"
                        style={styles.progressBar}
                    />
                )}
                <Text style={styles.progressText}>{progress}%</Text>
            </View>
        );
    };

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

                    {/* Center content - prediction display */}
                    {prediction && confidence > 0.7 && (
                        <View style={styles.predictionContainer}>
                            <Text style={styles.predictionText}>{prediction}</Text>
                            <Text style={styles.confidenceText}>{Math.round(confidence * 100)}% confident</Text>
                        </View>
                    )}

                    {/* Frame counter */}
                    {isCapturing && (
                        <View style={styles.frameCounter}>
                            <Text style={styles.frameCounterText}>
                                {frameCount}/{totalFramesNeeded}
                            </Text>
                        </View>
                    )}

                    {/* Loading progress */}
                    {modelLoadingError ? (
                        <ModelLoadingError
                            error={modelLoadingError}
                            onRetry={() => {
                                setModelLoadingError(null);
                                // Reset model loading state to trigger the useEffect hook again
                                setIsModelReady(false);
                                setModelLoadingProgress(0);
                            }}
                        />
                    ) : !isModelReady ? (
                        <ModelLoadingIndicator progress={modelLoadingProgress} />
                    ) : null}

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
});

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
    predictionContainer: {
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
    },
    predictionText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    confidenceText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 4,
    },
    frameCounter: {
        position: 'absolute',
        top: 70,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 8,
        borderRadius: 8,
    },
    frameCounterText: {
        color: 'white',
        fontSize: 14,
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
    loadingContainer: {
        position: 'absolute',
        top: '40%',
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        fontSize: 16,
        marginBottom: 10,
    },
    progressBar: {
        width: '100%',
        height: 10,
        marginVertical: 10,
    },
    progressText: {
        color: 'white',
        fontSize: 14,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8d7da',
    },
    errorText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#721c24',
        marginBottom: 10,
    },
    errorMessage: {
        fontSize: 16,
        color: '#721c24',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default SignLanguageCamera;