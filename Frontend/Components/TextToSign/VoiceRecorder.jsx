import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Platform, Alert } from 'react-native';
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
    const [audioLevel, setAudioLevel] = useState(0);
    const durationTimerRef = useRef(null);
    const audioMonitorRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Base URL for your API (replace with your actual computer's IP address)
    const API_URL = 'http://192.168.1.100:5000/api/transcribe';

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
                        interruptionModeIOS: 1, // DO_NOT_MIX
                        interruptionModeAndroid: 1, // DO_NOT_MIX
                    });
                }
            } catch (err) {
                console.error('Failed to get recording permissions', err);
                Alert.alert('Microphone Error', `Couldn't access the microphone: ${err.message}`);
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
            if (audioMonitorRef.current) {
                clearInterval(audioMonitorRef.current);
            }
        };
        // eslint-disable-next-line
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
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

            setRecording(newRecording);
            setIsRecording(true);
            setRecordingStatus('recording');
            setAudioLevel(0);

            // Start monitoring for audio levels
            startAudioLevelMonitoring(newRecording);

            // Start recording duration timer
            setRecordingDuration(0);
            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
            }

            durationTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    if (prev >= 30) {
                        stopRecording();
                        return 30;
                    }
                    return prev + 1;
                });
            }, 1000);

            // Setup auto-stop after 2 seconds of silence
            startSilenceDetection();

        } catch (err) {
            console.error('Failed to start recording', err);
            setRecordingStatus('idle');
            Alert.alert('Recording Error', `Couldn't start recording: ${err.message}`);
        }
    };

    // Start monitoring audio levels
    const startAudioLevelMonitoring = (recordingInstance) => {
        if (audioMonitorRef.current) {
            clearInterval(audioMonitorRef.current);
        }

        audioMonitorRef.current = setInterval(async () => {
            if (recordingInstance && recordingInstance._canRecord) {
                try {
                    const status = await recordingInstance.getStatusAsync();
                    if (status && status.metering !== undefined) {
                        const level = Math.max(0, (status.metering + 100) / 100);
                        setAudioLevel(level);
                        if (level > 0.1) {
                            resetSilenceDetection();
                        }
                    } else {
                        const simulatedLevel = Math.random() * 0.7 + 0.1;
                        setAudioLevel(simulatedLevel);
                    }
                } catch (err) {
                    console.log('Error monitoring audio levels:', err);
                }
            }
        }, 200);
    };

    // Start silence detection
    const startSilenceDetection = () => {
        resetSilenceDetection();
    };

    // Reset silence detection timer
    const resetSilenceDetection = () => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
            if (isRecording && recordingDuration >= 2) {
                stopRecording();
            }
        }, 2000);
    };

    // Stop recording
    const stopRecording = async () => {
        if (!recording) return;

        try {
            try {
                if (Platform.OS === 'ios') {
                    const Haptics = require('expo-haptics');
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } catch (err) {
                console.log('Haptics not available');
            }

            setIsRecording(false);
            setRecordingStatus('processing');

            if (durationTimerRef.current) {
                clearInterval(durationTimerRef.current);
                durationTimerRef.current = null;
            }
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            if (audioMonitorRef.current) {
                clearInterval(audioMonitorRef.current);
                audioMonitorRef.current = null;
            }

            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();

            processRecording(uri);

        } catch (err) {
            console.error('Error stopping recording', err);
            setRecordingStatus('idle');
        } finally {
            setRecording(null);
        }
    };

    // Process the recording with the backend API and AssemblyAI
    const processRecording = async (uri) => {
        setRecordingStatus('processing');

        try {
            // Check if the recording exists
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) throw new Error('Recording file not found');

            // Prepare form data
            const formData = new FormData();
            formData.append('audio', {
                uri,
                type: 'audio/m4a',
                name: `recording-${Date.now()}.m4a`
            });
            formData.append('language', getLanguageCode());

            console.log(`Attempting to send audio to ${API_URL}...`);

            // Use a longer timeout (AssemblyAI can be slow)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds

            let response;
            try {
                response = await fetch(API_URL, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const data = await response.json();

            if (data && data.text) {
                console.log('Transcription received:', data.text);
                if (onTranscriptionReceived) onTranscriptionReceived(data.text);
            } else {
                throw new Error('No transcription text received from server');
            }
        } catch (err) {
            console.error('Error processing recording:', err);

            let message = 'Unable to reach transcription service. Please check:';
            message += '\n- Is your backend running?';
            message += '\n- Is your phone and computer on the same WiFi?';
            message += '\n- Can you access /health from your phone browser?';
            message += `\n\nError: ${err.message}`;

            Alert.alert('Transcription Error', message, [{ text: 'OK' }]);
        } finally {
            setRecordingStatus('idle');
        }
    };

    return {
        isRecording,
        recordingStatus,
        recordingDuration,
        hasPermission,
        audioLevel,
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
        audioLevel,
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

    // Calculate dot size based on audio level
    const getDotSize = () => {
        return 10 + (audioLevel * 15);
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
                <Text style={styles.recordingStatusText}>Transcribing speech...</Text>
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
                            {
                                transform: [{ scale: pulseAnim }],
                                width: getDotSize(),
                                height: getDotSize(),
                            }
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
                                    '#9C27B0'
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
                                '#9C27B0'
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