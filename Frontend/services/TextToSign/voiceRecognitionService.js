/**
 * Voice Recognition Service
 * Handles speech-to-text conversion for the Text to Sign Language application
 */
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { RECORDING_OPTIONS, LANGUAGE_MODES } from './constants';

// Get language code for speech recognition based on language mode
const getLanguageCode = (languageMode) => {
    switch (languageMode) {
        case LANGUAGE_MODES.ENGLISH:
            return 'en-US';
        case LANGUAGE_MODES.SINHALA:
            return 'si-LK';
        case LANGUAGE_MODES.TAMIL:
            return 'ta-IN';
        default:
            return 'en-US';
    }
};

/**
 * Initialize recording session with optimal settings
 * 
 * @returns {Promise<void>}
 */
export const initializeAudioSession = async () => {
    try {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            playThroughEarpieceAndroid: false,
        });
    } catch (error) {
        console.error('Failed to initialize audio session:', error);
        throw error;
    }
};

/**
 * Check and request microphone permissions
 * 
 * @returns {Promise<boolean>} Whether permission is granted
 */
export const checkPermissions = async () => {
    try {
        const { status } = await Audio.requestPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error checking permissions:', error);
        return false;
    }
};

/**
 * Start a new audio recording
 * 
 * @returns {Promise<Audio.Recording>} The recording object
 */
export const startRecording = async () => {
    try {
        const hasPermission = await checkPermissions();
        if (!hasPermission) {
            throw new Error('Microphone permission not granted');
        }

        await initializeAudioSession();

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(RECORDING_OPTIONS);
        await recording.startAsync();

        return recording;
    } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
    }
};

/**
 * Stop an active recording
 * 
 * @param {Audio.Recording} recording - The recording to stop
 * @returns {Promise<string>} URI of the recording
 */
export const stopRecording = async (recording) => {
    if (!recording) {
        throw new Error('No recording provided');
    }

    try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        if (!uri) {
            throw new Error('Recording URI is undefined');
        }

        // Verify the file exists
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
            throw new Error('Recording file does not exist');
        }

        return uri;
    } catch (error) {
        console.error('Failed to stop recording:', error);
        throw error;
    }
};

/**
 * Process a recorded audio file and convert to text
 * Uses the native Speech Recognition API when available
 * 
 * @param {string} audioUri - URI of the audio recording
 * @param {string} languageMode - Language mode (english, sinhala, tamil)
 * @returns {Promise<string>} The transcribed text
 */
export const processRecording = async (audioUri, languageMode = LANGUAGE_MODES.ENGLISH) => {
    if (!audioUri) {
        throw new Error('No audio URI provided');
    }

    try {
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) {
            throw new Error('Audio file not found');
        }

        console.log(`Processing audio file (${fileInfo.size} bytes) for language: ${languageMode}`);

        // Web Speech API is available in web environments
        if (typeof window !== 'undefined' &&
            (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            return await recognizeWithWebSpeechAPI(getLanguageCode(languageMode));
        }

        // For actual speech recognition, we would integrate with a backend API here
        // This is a placeholder for the actual implementation

        // In a real implementation, we would:
        // 1. Convert the audio to a suitable format if needed
        // 2. Send to a speech recognition service (Google, Azure, etc.)
        // 3. Process the response and return the transcribed text

        // For demonstration purposes, we'll just return a placeholder text
        return simulateRecognition(languageMode);
    } catch (error) {
        console.error('Speech processing error:', error);
        throw new Error('Failed to process speech. Please try again.');
    }
};

/**
 * Recognize speech using the Web Speech API (browser environments only)
 * 
 * @param {string} languageCode - Language code for recognition
 * @returns {Promise<string>} Transcribed text
 */
const recognizeWithWebSpeechAPI = (languageCode) => {
    return new Promise((resolve, reject) => {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.lang = languageCode;
            recognition.continuous = false;
            recognition.interimResults = false;

            let finalTranscript = '';

            recognition.onresult = (event) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                reject(new Error(`Recognition error: ${event.error}`));
            };

            recognition.onend = () => {
                resolve(finalTranscript);
            };

            recognition.start();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Simulate speech recognition for testing purposes
 * 
 * @param {string} languageMode - The language mode
 * @returns {string} Simulated transcription based on language
 */
const simulateRecognition = (languageMode) => {
    // Sample responses based on language mode
    const sampleResponses = {
        [LANGUAGE_MODES.ENGLISH]: [
            "Hello! How are you?",
            "Thank you for your help",
            "My name is John",
            "Nice to meet you",
            "I am learning sign language"
        ],
        [LANGUAGE_MODES.SINHALA]: [
            "ආයුබෝවන්! ඔබ කොහොමද?",
            "ඔබට ස්තුතියි",
            "මගේ නම ජෝන්",
            "ඔබව හමුවීම සතුටක්",
            "මම සංඥා භාෂාව ඉගෙන ගන්නවා"
        ],
        [LANGUAGE_MODES.TAMIL]: [
            "வணக்கம்! நீங்கள் எப்படி இருக்கிறீர்கள்?",
            "உங்களுக்கு நன்றி",
            "என் பெயர் ஜான்",
            "உங்களை சந்தித்ததில் மகிழ்ச்சி",
            "நான் சைகை மொழியைக் கற்றுக்கொண்டிருக்கிறேன்"
        ]
    };

    // Get the sample responses for the current language
    const responses = sampleResponses[languageMode] || sampleResponses[LANGUAGE_MODES.ENGLISH];

    // Return a random response
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
};

export default {
    initializeAudioSession,
    checkPermissions,
    startRecording,
    stopRecording,
    processRecording,
    getLanguageCode
};