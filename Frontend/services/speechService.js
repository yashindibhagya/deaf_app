/**
 * Speech recognition service using Speech Recognition API
 */
import * as FileSystem from 'expo-file-system';

// The endpoint for your speech recognition service
// Replace with your actual backend URL when you have it
const API_ENDPOINT = 'https://your-backend-url.com/api/speech/recognize';

/**
 * Recognize speech using the device's native speech recognition if available
 * @param {string} audioUri - The URI of the audio recording
 * @param {string} languageCode - The language code ('en-US', 'si-LK', 'ta-IN')
 * @returns {Promise<string>} - The recognized text
 */
export const recognizeSpeech = async (audioUri, languageCode) => {
    try {
        // Here you would normally send the audio to your speech recognition service
        // For now, since we don't have the backend integration ready, we'll use
        // the Web Speech API if available (in development/web environment)

        // TEMPORARY SOLUTION FOR TESTING:
        // In a real implementation, you would send the audio file to your backend

        if (typeof window !== 'undefined' && window.SpeechRecognition || window.webkitSpeechRecognition) {
            // If in a web environment with speech recognition support
            return await recognizeWithWebSpeechAPI(languageCode);
        }

        // For real device testing, read file info to check it exists
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) {
            throw new Error("Audio file not found");
        }

        console.log(`Audio file recorded: ${fileInfo.size} bytes`);

        // PLACEHOLDER FOR ACTUAL API CALL
        // In a production app, you would convert the audio to base64 and send to your API
        /*
        const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
            encoding: FileSystem.EncodingType.Base64
        });
        
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio: base64Audio,
                languageCode: languageCode
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.transcript;
        */

        // FOR TESTING: Return empty string to show the UI is working
        // When you connect to a real API, it will return the actual transcription
        return "";
    } catch (error) {
        console.error('Speech recognition error:', error);
        throw new Error('Failed to recognize speech. Please try again.');
    }
};

/**
 * Web Speech API implementation (only works in web browser environments)
 * @param {string} languageCode - The language code
 * @returns {Promise<string>} - The recognized text
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
 * Fallback implementation that allows for testing the UI flow
 * @param {string} audioUri - The URI of the audio recording
 * @param {string} languageCode - The language code
 * @returns {Promise<string>} - Empty string for UI testing
 */
export const recognizeSpeechOffline = async (audioUri, languageCode) => {
    console.log('Speech recognition fallback activated - UI testing only');
    return "";
};

export default {
    recognizeSpeech,
    recognizeSpeechOffline
};