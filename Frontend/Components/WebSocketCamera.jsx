import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import { AntDesign } from "@expo/vector-icons";
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { WS_CONFIG } from '../config/websocketConfig';

const WebSocketCamera = ({
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

    // WebSocket and recognition states
    const [isConnected, setIsConnected] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [translatedText, setTranslatedText] = useState('');
    const [detectedSigns, setDetectedSigns] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [framesCollected, setFramesCollected] = useState(0);
    const [framesNeeded, setFramesNeeded] = useState(30);
    const [connectionAttempts, setConnectionAttempts] = useState(0);

    // WebSocket reference
    const ws = useRef(null);
    const clientId = useRef(`client_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
    const captureInterval = useRef(null);
    const pingInterval = useRef(null);

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

    // Connect to WebSocket server
    useEffect(() => {
        connectWebSocket();

        // Clean up on unmount
        return () => {
            disconnectWebSocket();
        };
    }, [connectionAttempts]);

    // Handle external recording state changes
    useEffect(() => {
        if (!isLoading && isRecording && !isCapturing && isConnected) {
            handleStartCapture();
        } else if (!isLoading && !isRecording && isCapturing) {
            handleStopCapture();
        }
    }, [isRecording, isCapturing, isLoading, isConnected]);

    const connectWebSocket = () => {
        // Close existing connection if any
        if (ws.current) {
            ws.current.close();
        }

        try {
            // Connect to WebSocket server
            const socketUrl = `${WS_CONFIG.WS_URL}/${clientId.current}`;
            ws.current = new WebSocket(socketUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connection established');
                setIsConnected(true);
                setIsLoading(false);

                // Start ping interval to keep connection alive
                pingInterval.current = setInterval(() => {
                    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify({
                            type: 'ping',
                            timestamp: Date.now()
                        }));
                    }
                }, WS_CONFIG.CONNECTION.pingInterval); // Ping interval from config
            };

            ws.current.onmessage = (event) => {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsConnected(false);
            };

            ws.current.onclose = () => {
                console.log('WebSocket connection closed');
                setIsConnected(false);

                // Clear ping interval
                if (pingInterval.current) {
                    clearInterval(pingInterval.current);
                    pingInterval.current = null;
                }

                // Attempt to reconnect after delay if not intentionally closed
                if (connectionAttempts < WS_CONFIG.CONNECTION.maxRetries) {
                    setTimeout(() => {
                        setConnectionAttempts(prev => prev + 1);
                    }, WS_CONFIG.CONNECTION.retryDelay);
                } else {
                    setIsLoading(false);
                    Alert.alert(
                        "Connection Error",
                        "Failed to connect to the model server after multiple attempts. Please check your connection and try again."
                    );
                }
            };
        } catch (error) {
            console.error('Error connecting to WebSocket server:', error);
            setIsConnected(false);
            setIsLoading(false);
        }
    };

    const disconnectWebSocket = () => {
        // Clear intervals
        if (captureInterval.current) {
            clearInterval(captureInterval.current);
            captureInterval.current = null;
        }

        if (pingInterval.current) {
            clearInterval(pingInterval.current);
            pingInterval.current = null;
        }

        // Close WebSocket connection
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
    };

    const handleWebSocketMessage = (message) => {
        const messageType = message.type;

        switch (messageType) {
            case 'connection_established':
                console.log('Connection established with client ID:', message.client_id);
                // Reset sequence on server
                sendMessage({ type: 'reset' });
                break;

            case 'frame_processed':
                setFramesCollected(message.frames_collected);
                setFramesNeeded(message.frames_needed);
                setIsProcessing(false);
                break;

            case 'prediction':
                const result = message.result;
                if (result && result.action && result.action !== 'unknown' && result.action !== 'insufficient_data' && result.action !== 'error') {
                    // Update detected signs
                    const newDetectedSigns = [...detectedSigns];

                    // Only add if it's different from the last sign
                    if (newDetectedSigns.length === 0 || newDetectedSigns[newDetectedSigns.length - 1] !== result.action) {
                        newDetectedSigns.push(result.action);
                        setDetectedSigns(newDetectedSigns);

                        // Update translated text
                        const newTranslatedText = formatTranslatedText(newDetectedSigns);
                        setTranslatedText(newTranslatedText);

                        // Send update to parent component
                        onTranslationUpdate(newTranslatedText, newDetectedSigns);
                    }
                }
                break;

            case 'reset_confirmed':
                console.log('Sequence reset confirmed');
                break;

            case 'pong':
                // Ping-pong for keeping connection alive
                break;

            default:
                console.log('Unknown message type:', messageType);
                break;
        }
    };

    const sendMessage = (message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    };

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

        if (!isConnected) {
            Alert.alert("Server not connected", "Please wait for the connection to the model server.");
            return;
        }

        // Reset sequence on server
        sendMessage({ type: 'reset' });

        // Notify parent component
        try {
            onStartRecording();
        } catch (error) {
            console.error("Error in onStartRecording:", error);
        }

        setIsCapturing(true);
        setDetectedSigns([]);
        setTranslatedText('');
        setFramesCollected(0);

        // Start capturing frames at regular intervals
        captureInterval.current = setInterval(captureFrame, WS_CONFIG.CAPTURE.captureInterval);
    };

    // Capture a single frame and send to server
    const captureFrame = async () => {
        if (!cameraRef.current || !isCapturing || !isConnected) return;

        try {
            setIsProcessing(true);

            // Take a picture
            const photo = await cameraRef.current.takePictureAsync({
                quality: WS_CONFIG.CAPTURE.quality,
                base64: true,
                skipProcessing: true
            });

            // Send frame to server via WebSocket
            sendMessage({
                type: 'frame',
                frame: `data:image/jpeg;base64,${photo.base64}`
            });

        } catch (error) {
            console.error('Error capturing frame:', error);
            setIsProcessing(false);
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

        // Get final prediction
        sendMessage({ type: 'get_prediction' });

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
        setFramesCollected(0);

        // Reset sequence on server
        sendMessage({ type: 'reset' });

        // Also update the parent component
        try {
            onTranslationUpdate("", []);
        } catch (error) {
            console.error("Error in onTranslationUpdate during reset:", error);
        }
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

                        {isConnected ? (
                            <Text style={styles.statusText}>Model Connected</Text>
                        ) : (
                            <Text style={styles.statusTextWarning}>Model Disconnected</Text>
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
                                disabled={!cameraReady || !isConnected || isProcessing}
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
                            <Text style={styles.processingText}>
                                Processing... {framesCollected}/{framesNeeded}
                            </Text>
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

export default WebSocketCamera; 