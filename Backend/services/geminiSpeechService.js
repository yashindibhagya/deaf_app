// Backend/services/geminiSpeechService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Get API key from environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini API with your API key
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Convert audio buffer to a format Gemini can use
 * @param {Buffer} audioBuffer - Audio file buffer
 * @returns {Promise<string>} - Path to temporary file
 */
async function prepareAudioFile(audioBuffer) {
    // Create a temporary file
    const tempFileName = `speech-${uuidv4()}.mp3`; // Use .mp3 or appropriate format
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    // Write buffer to temporary file
    await fs.promises.writeFile(tempFilePath, audioBuffer);

    return tempFilePath;
}

/**
 * Recognize speech from audio using Gemini API
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} languageCode - Language code like 'en-US', 'si-LK', 'ta-IN'
 * @returns {Promise<string>} - Transcribed text
 */
exports.recognizeSpeech = async (audioBuffer, languageCode) => {
    try {
        // Prepare the audio file
        const audioFilePath = await prepareAudioFile(audioBuffer);

        // Read file as binary data
        const audioData = await fs.promises.readFile(audioFilePath);

        // Create a parts array with the audio file
        const parts = [{
            inlineData: {
                data: Buffer.from(audioData).toString('base64'),
                mimeType: 'audio/mp3' // Adjust based on your actual audio format
            }
        }];

        // Add a text prompt as a part
        const languageName = getLanguageName(languageCode);
        parts.push({
            text: `This is a speech recording in ${languageName}. Please transcribe exactly what is being said, word for word. Only provide the transcription, with no additional text or explanation.`
        });

        // Use Gemini model that supports multimodal content
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        // Generate content with Gemini
        const result = await model.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig: {
                temperature: 0,
                topP: 0.1,
                topK: 16,
            }
        });

        const response = await result.response;
        const transcript = response.text().trim();

        // Clean up temporary file
        await fs.promises.unlink(audioFilePath);

        return transcript;
    } catch (error) {
        console.error('Gemini speech recognition error:', error);
        throw new Error(`Speech recognition failed: ${error.message}`);
    }
};

/**
 * Recognize speech from base64-encoded audio
 * @param {string} audioBase64 - Base64-encoded audio data
 * @param {string} languageCode - Language code
 * @returns {Promise<string>} - Transcribed text
 */
exports.recognizeSpeechFromBase64 = async (audioBase64, languageCode) => {
    try {
        // Convert Base64 to buffer
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        return await exports.recognizeSpeech(audioBuffer, languageCode);
    } catch (error) {
        console.error('Gemini base64 speech recognition error:', error);
        throw new Error(`Base64 speech recognition failed: ${error.message}`);
    }
};

/**
 * Get language name from language code
 * @param {string} languageCode - BCP-47 language code
 * @returns {string} - Language name
 */
function getLanguageName(languageCode) {
    const languages = {
        'en-US': 'English',
        'si-LK': 'Sinhala',
        'ta-IN': 'Tamil'
    };

    return languages[languageCode] || 'unknown language';
}