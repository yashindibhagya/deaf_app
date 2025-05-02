import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Platform,
    Animated
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import voiceRecognitionService from '../../services/TextToSign/voiceRecognitionService';

const VoiceRecorder = ({
    languageMode,
    setInputText,
    setSinhalaScript,
    setTamilScript,
    handleTranslate
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState(null);
    const [hasRecordingPermission, setHasRecordingPermission] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState('idle');
    const [recordingDuration, setRecordingDuration] = useState(0);
    const durationTimerRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Request microphone permissions on component mount
    useEffect(() => {
        (async () => {
            const { status } = await Audio.requestPermissionsAsync();
            setHasRecordingPermission(status === 'granted');
        })();

        // Set up audio recording session
        Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
        }).catch(err => console.log('Failed to set audio mode', err));

        // Clean up recording resources when component unmounts
        return () => {
            if (recording) {
                stopRecording();
            }
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
            }
        };
    }, []);

    // Animation for the recording indicator pulse
    useEffect(() => {
        let pulseAnimation;
        if (isRecording) {
            // Create a repeating pulse animation
            pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.5,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            );

            // Start the animation
            pulseAnimation.start();
        } else {
            // Reset the animation when not recording
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }

        // Clean up animation
        return () => {
            if (pulseAnimation) {
                pulseAnimation.stop();
            }
        };
    }, [isRecording, pulseAnim]);

    // Start recording audio
    const startRecording = async () => {
        try {
            // Check permissions
            if (!hasRecordingPermission) {
                const { status } = await Audio.requestPermissionsAsync();
                setHasRecordingPermission(status === 'granted');
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Microphone permission is needed to record audio.');
                    return;
                }
            }

            // First provide feedback to the user
            if (Platform.OS === 'ios') {
                // On iOS, haptic feedback
                try {
                    const Haptics = await import('expo-haptics');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch (err) {
                    console.log('Haptics not available:', err);
                }
            }

            // Make sure audio mode is set for recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                playThroughEarpieceAndroid: false, // Use speaker
            });

            // Get optimized recording options for speech recognition
            const recordingOptions = voiceRecognitionService.getRecordingOptions();

            // Initialize recording
            const newRecording = new Audio.Recording();

            try {
                // Show that we're getting ready to record
                setRecordingStatus('preparing');

                // Prepare and start the recording
                await newRecording.prepareToRecordAsync(recordingOptions);
                await newRecording.startAsync();

                // Update state after successful start
                setRecording(newRecording);
                setIsRecording(true);
                setRecordingStatus('recording');

                // Reset and start the duration timer
                setRecordingDuration(0);
                if (durationTimerRef.current) {
                    clearInterval(durationTimerRef.current);
                }
                durationTimerRef.current = setInterval(() => {
                    setRecordingDuration(prev => {
                        // Add maximum recording duration (30 seconds)
                        if (prev >= 30) {
                            stopRecording();
                            return 30;
                        }
                        return prev + 1;
                    });
                }, 1000);
            } catch (err) {
                console.error('Recording preparation failed', err);
                throw err;
            }
        } catch (error) {
            console.error('Failed to start recording:', error);
            Alert.alert(
                'Recording Error',
                'Failed to start recording. Please check your microphone and try again.',
                [{ text: 'OK' }]
            );
            setRecordingStatus('idle');
        }
    };

    // Stop recording and process the audio
    const stopRecording = async () => {
        if (!recording) return;

        try {
            // First provide feedback to the user
            if (Platform.OS === 'ios') {
                // On iOS, haptic feedback
                try {
                    const Haptics = await import('expo-haptics');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (err) {
                    console.log('Haptics not available:', err);
                }
            }

            // Update UI state first to provide immediate feedback
            setIsRecording(false);
            setRecordingStatus('stopping');

            // Clear the duration timer
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
                durationTimerRef.current = null;
            }

            let recordingUri = null;

            // Try to stop the recording gracefully
            try {
                // Stop the recording and get its status
                const status = await recording.stopAndUnloadAsync();

                // Get the recording URI
                recordingUri = recording.getURI();

                if (!recordingUri) {
                    throw new Error('Recording URI is undefined');
                }

                // Check if recording is too short (less than 0.5 seconds)
                if (recordingDuration < 1) {
                    setRecordingStatus('idle');
                    Alert.alert(
                        'Recording Too Short',
                        'Please record for at least 1 second.',
                        [{ text: 'OK' }]
                    );
                    return;
                }

                // Process the recording for speech-to-text
                await processRecording(recordingUri);

            } catch (stopError) {
                console.error('Error stopping recording:', stopError);

                // Try a fallback method to ensure recording stops
                try {
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: false,
                        playsInSilentModeIOS: false,
                    });

                    setRecordingStatus('idle');
                    Alert.alert(
                        'Recording Note',
                        'Recording may not have saved properly. Please try again.',
                        [{ text: 'OK' }]
                    );
                } catch (fallbackError) {
                    console.error('Fallback error handling failed:', fallbackError);
                    throw fallbackError;
                }
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
            Alert.alert(
                'Recording Error',
                'Failed to process recording. Please try again.',
                [{ text: 'OK' }]
            );
            setRecordingStatus('idle');
        } finally {
            // Ensure we clean up and reset states
            setRecording(null);
        }
    };

    // Process the recording with speech recognition service
    const processRecording = async (uri) => {
        try {
            // Update UI state to show processing
            setRecordingStatus('processing');

            // Process the recording and get text
            const text = await voiceRecognitionService.processRecording(uri, languageMode);

            if (text && text.trim()) {
                // Update input text field with recognized text
                setInputText(text);

                // Also update the appropriate script based on language
                if (languageMode === 'sinhala') {
                    const sinhalaText = await voiceRecognitionService.translateToSinhalaScript(text);
                    setSinhalaScript(sinhalaText);
                } else if (languageMode === 'tamil') {
                    const tamilText = await voiceRecognitionService.translateToTamilScript(text);
                    setTamilScript(tamilText);
                }

                // Trigger translation automatically after a slight delay
                setTimeout(() => {
                    handleTranslate();
                }, 300);
            }

            setRecordingStatus('idle');
        } catch (error) {
            console.error('Speech processing error:', error);
            Alert.alert(
                'Speech Recognition Error',
                'Could not process your speech. Please type your message instead.',
                [{ text: 'OK' }]
            );
            setRecordingStatus('idle');
        }
    };

    // Don't show if we don't have permission
    if (!hasRecordingPermission && recordingStatus === 'idle') {
        return (
            <TouchableOpacity
                style={styles.micPermissionButton}
                onPress={async () => {
                    const { status } = await Audio.requestPermissionsAsync();
                    setHasRecordingPermission(status === 'granted');
                }}
            >
                <MaterialIcons name="mic-off" size={24} color="#D32F2F" />
                <Text style={styles.micPermissionText}>Enable Microphone</Text>
            </TouchableOpacity>
        );
    }

    if (recordingStatus === 'preparing') {
        return (
            <View style={styles.recordingStatusContainer}>
                <ActivityIndicator size="small" color="#FF9800" />
                <Text style={styles.recordingStatusText}>Preparing...</Text>
            </View>
        );
    }

    if (recordingStatus === 'processing') {
        return (
            <View style={styles.recordingStatusContainer}>
                <ActivityIndicator size="small" color="#4C9EFF" />
                <Text style={styles.recordingStatusText}>Processing speech...</Text>
            </View>
        );
    }

    if (recordingStatus === 'stopping') {
        return (
            <View style={styles.recordingStatusContainer}>
                <ActivityIndicator size="small" color="#FF9800" />
                <Text style={styles.recordingStatusText}>Finalizing...</Text>
            </View>
        );
    }

    if (isRecording) {
        const remainingTime = 30 - recordingDuration;
        const isTimeRunningOut = remainingTime <= 5;

        return (
            <View style={styles.recordingContainer}>
                <View style={styles.recordingIndicator}>
                    <Animated.View
                        style={[
                            styles.recordingDot,
                            isTimeRunningOut && styles.recordingDotWarning,
                            { transform: [{ scale: pulseAnim }] }
                        ]}
                    />
                    <Text style={[
                        styles.recordingTime,
                        isTimeRunningOut && styles.recordingTimeWarning
                    ]}>
                        {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:
                        {(recordingDuration % 60).toString().padStart(2, '0')}
                        {isTimeRunningOut && ` (${remainingTime}s left)`}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.stopRecordingButton}
                    onPress={stopRecording}
                >
                    <FontAwesome name="stop" size={20} color="white" />
                </TouchableOpacity>
            </View>
        );
    }

    // Language-specific mic button tooltip
    const getLanguageTooltip = () => {
        switch (languageMode) {
            case 'english':
                return "Speak in English";
            case 'sinhala':
                return "Speak in Sinhala";
            case 'tamil':
                return "Speak in Tamil";
            default:
                return "Speak now";
        }
    };

    return (
        <View style={styles.micButtonContainer}>
            <TouchableOpacity
                style={[
                    styles.micButton,
                    {
                        borderColor:
                            languageMode === 'english' ? '#FF9800' :
                                languageMode === 'sinhala' ? '#4C9EFF' :
                                    '#9C27B0' // Tamil
                    }
                ]}
                onPress={startRecording}
            >
                <MaterialIcons
                    name="mic"
                    size={24}
                    color={
                        languageMode === 'english' ? '#FF9800' :
                            languageMode === 'sinhala' ? '#4C9EFF' :
                                '#9C27B0' // Tamil
                    }
                />
            </TouchableOpacity>
            <Text style={styles.micButtonTooltip}>{getLanguageTooltip()}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    micButtonContainer: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 15,
    },
    micButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#155658',
    },
    micButtonTooltip: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    micPermissionButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFEBEE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D32F2F',
        alignSelf: 'center',
        marginVertical: 10,
    },
    micPermissionText: {
        fontSize: 10,
        color: '#D32F2F',
        textAlign: 'center',
        marginTop: 4,
    },
    recordingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFEBEE',
        borderRadius: 25,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginVertical: 10,
        width: 130,
        alignSelf: 'center',
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
        marginRight: 8,
    },
    recordingDotWarning: {
        backgroundColor: '#FF9500',
    },
    recordingTime: {
        fontSize: 14,
        color: '#333',
    },
    recordingTimeWarning: {
        color: '#FF3B30',
        fontWeight: 'bold',
    },
    stopRecordingButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        maxWidth: 170,
        alignSelf: 'center',
        marginVertical: 10,
    },
    recordingStatusText: {
        color: '#1976D2',
        marginLeft: 8,
        fontSize: 14,
    },
});

export default VoiceRecorder;