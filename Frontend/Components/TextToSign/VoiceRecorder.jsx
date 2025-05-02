import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

// Custom hook for voice recording functionality
const useVoiceRecorder = (onTranscriptionReceived, languageMode) => {
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState('idle');
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [hasPermission, setHasPermission] = useState(false);
    const [speechDetected, setSpeechDetected] = useState(false);
    const durationTimerRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Get appropriate language code based on current language mode
    const getLanguageCode = () => {
        switch (languageMode) {
            case 'english': return 'en-US';
            case 'sinhala': return 'si-LK';
            case 'tamil': return 'ta-IN';
            default: return 'en-US';
        }
    };

    // Initialize voice recording
    useEffect(() => {
        const requestPermissions = async () => {
            try {
                const { status } = await Audio.requestPermissionsAsync();
                setHasPermission(status === 'granted');

                if (status === 'granted') {
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: true,
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: false,
                        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
                        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
                    });
                }
            } catch (err) {
                console.error('Failed to get recording permissions', err);
            }
        };

        requestPermissions();

        // Cleanup function
        return () => {
            if (recording) {
                stopRecording();
            }
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
            }
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, []);

    // Animate the recording indicator
    useEffect(() => {
        let pulseAnimation;

        if (isRecording) {
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
            pulseAnimation.start();
        } else {
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }

        return () => {
            if (pulseAnimation) {
                pulseAnimation.stop();
            }
        };
    }, [isRecording, pulseAnim]);

    // Start recording
    const startRecording = async () => {
        if (!hasPermission) {
            console.log('No recording permission');
            return;
        }

        try {
            // Add haptic feedback if available
            try {
                if (Platform.OS === 'ios') {
                    const Haptics = require('expo-haptics');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
            } catch (err) {
                console.log('Haptics not available');
            }

            setRecordingStatus('preparing');

            // Prepare recording options optimized for speech
            const recordingOptions = {
                android: {
                    extension: '.m4a',
                    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
                    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
                    sampleRate: 44100,
                    numberOfChannels: 1,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.m4a',
                    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
                    sampleRate: 44100,
                    numberOfChannels: 1,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
            };

            // Create and start a new recording
            const newRecording = new Audio.Recording();
            await newRecording.prepareToRecordAsync(recordingOptions);
            await newRecording.startAsync();

            // Update state
            setRecording(newRecording);
            setIsRecording(true);
            setRecordingStatus('recording');
            setSpeechDetected(false);

            // Start recording duration timer
            setRecordingDuration(0);
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
            }

            durationTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    // Auto-stop recording after 30 seconds
                    if (prev >= 30) {
                        stopRecording();
                        return 30;
                    }
                    return prev + 1;
                });
            }, 1000);

            // Setup auto-stop after 2 seconds of silence (simulated)
            resetSilenceDetection();

        } catch (err) {
            console.error('Failed to start recording', err);
            setRecordingStatus('idle');
        }
    };

    // Reset silence detection timer
    const resetSilenceDetection = () => {
        // Clear any existing silence timer
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }

        // Set a new silence timer - if no speech is detected for 2 seconds, stop recording
        silenceTimerRef.current = setTimeout(() => {
            if (isRecording && !speechDetected) {
                // If we've been recording for at least 1 second, stop and process
                if (recordingDuration >= 1) {
                    stopRecording();
                }
            }
        }, 2000);
    };

    // Simulate speech detection (in a real implementation, this would use audio level detection)
    const detectSpeech = () => {
        if (isRecording) {
            setSpeechDetected(true);
            resetSilenceDetection();
        }
    };

    // Call this function periodically to simulate speech detection
    useEffect(() => {
        let speechDetectionInterval;

        if (isRecording) {
            // Simulate periodic speech detection by randomly triggering detection
            speechDetectionInterval = setInterval(() => {
                if (Math.random() > 0.3) {  // 70% chance of detecting speech each check
                    detectSpeech();
                }
            }, 500);
        }

        return () => {
            if (speechDetectionInterval) {
                clearInterval(speechDetectionInterval);
            }
        };
    }, [isRecording]);

    // Stop recording
    const stopRecording = async () => {
        if (!recording) return;

        try {
            // Provide haptic feedback
            try {
                if (Platform.OS === 'ios') {
                    const Haptics = require('expo-haptics');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } catch (err) {
                console.log('Haptics not available');
            }

            // Update UI immediately
            setIsRecording(false);
            setRecordingStatus('processing');

            // Clear timers
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
            }

            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }

            // Stop the recording
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();

            // Process the recording for speech recognition
            processRecording(uri);

        } catch (err) {
            console.error('Error stopping recording', err);
            setRecordingStatus('idle');
        } finally {
            setRecording(null);
        }
    };

    // Process the recording - here we simulate speech recognition
    const processRecording = async (uri) => {
        // Here you would normally send the audio to a speech recognition service
        // For now, we'll simulate recognition with a mock response based on language

        setRecordingStatus('processing');

        try {
            // First check if the recording exists
            const fileInfo = await FileSystem.getInfoAsync(uri);

            if (!fileInfo.exists) {
                throw new Error('Recording file not found');
            }

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Generate a mock transcription based on selected language
            let transcription = '';

            switch (languageMode) {
                case 'english':
                    transcription = getMockEnglishTranscription();
                    break;
                case 'sinhala':
                    transcription = getMockSinhalaTranscription();
                    break;
                case 'tamil':
                    transcription = getMockTamilTranscription();
                    break;
                default:
                    transcription = getMockEnglishTranscription();
            }

            // Pass the transcription back to the parent component
            if (onTranscriptionReceived) {
                onTranscriptionReceived(transcription);
            }

        } catch (err) {
            console.error('Error processing recording', err);
        } finally {
            setRecordingStatus('idle');
        }
    };

    // Generate mock transcriptions for demo purposes
    const getMockEnglishTranscription = () => {
        const phrases = [
            "Hello, how are you?",
            "Nice to meet you",
            "Thank you for your help",
            "What is your name?",
            "I am learning sign language"
        ];
        return phrases[Math.floor(Math.random() * phrases.length)];
    };

    const getMockSinhalaTranscription = () => {
        const phrases = [
            "ayubowan",
            "kohomada",
            "sthutiyi",
            "oyage nama mokakda",
            "mama sinhala igena gannawa"
        ];
        return phrases[Math.floor(Math.random() * phrases.length)];
    };

    const getMockTamilTranscription = () => {
        const phrases = [
            "vanakkam",
            "neenga eppadi irukeenga",
            "nandri",
            "ungal peyar enna",
            "naan tamil karkireen"
        ];
        return phrases[Math.floor(Math.random() * phrases.length)];
    };

    return {
        isRecording,
        recordingStatus,
        recordingDuration,
        hasPermission,
        pulseAnim,
        startRecording,
        stopRecording,
    };
};

// Voice Recorder Component
const VoiceRecorder = ({ onTranscriptionReceived, languageMode }) => {
    const {
        isRecording,
        recordingStatus,
        recordingDuration,
        hasPermission,
        pulseAnim,
        startRecording,
        stopRecording,
    } = useVoiceRecorder(onTranscriptionReceived, languageMode);

    // Request permission if not granted
    const requestPermission = async () => {
        const { status } = await Audio.requestPermissionsAsync();
        return status === 'granted';
    };

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

    if (!hasPermission && recordingStatus === 'idle') {
        return (
            <TouchableOpacity
                style={styles.micPermissionButton}
                onPress={requestPermission}
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
    // Voice recording button styles
    micButtonContainer: {
        alignItems: 'center',
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
        alignSelf: 'flex-start',
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
        alignSelf: 'flex-start',
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
        width: 130,
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
        backgroundColor: '#FFC107',
    },
    recordingTime: {
        fontSize: 14,
        color: '#333',
    },
    recordingTimeWarning: {
        color: '#D32F2F',
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
    },
    recordingStatusText: {
        color: '#1976D2',
        marginLeft: 8,
        fontSize: 14,
    },
});

export default VoiceRecorder;