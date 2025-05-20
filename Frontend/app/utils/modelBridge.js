import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system';

// Path to model files - update these to point to your model location
const MODEL_PATH = FileSystem.documentDirectory + 'sign_language_model';
const MODEL_JSON = MODEL_PATH + '/model.json';
const MODEL_WEIGHTS = MODEL_PATH + '/weights.bin';

// Backend server URL - update this to your actual backend URL
// Use local IP address instead of localhost for mobile devices to connect
const BACKEND_URL = 'http://192.168.1.100:8000';

// Model URL - this should point to where your model is hosted
// This will be constructed based on the backend server URL
const MODEL_URL = `${BACKEND_URL}/model/tfjs_model/model.json`;

// Configuration constants
export const SEQUENCE_LENGTH = 30;
export const PREDICTION_THRESHOLD = 0.7;

// Supported sign language actions
export const ACTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "what", "your", "name", "how", "you", "thankyou", "old"];

// Flag to use simulated model for testing - set to false to use real model
// Change to false when your real model is ready
export const USE_SIMULATED_MODEL = false;

// Cache for model to avoid reloading
let cachedModel = null;

/**
 * Check if the model exists in the file system
 * @returns {Promise<boolean>} True if the model exists, false otherwise
 */
export const checkModelExists = async () => {
    try {
        const modelInfo = await FileSystem.getInfoAsync(MODEL_JSON);
        return modelInfo.exists;
    } catch (error) {
        console.error('Error checking if model exists:', error);
        return false;
    }
};

/**
 * Create a simulated model for testing
 * @returns {Promise<tf.LayersModel>} A simple model for testing
 */
export const createSimulatedModel = async () => {
    console.error('Simulated model has been removed from the system');
    return null;
};

/**
 * Check if the backend server is available and has the model
 * @returns {Promise<boolean>} True if the server is available and has the model, false otherwise
 */
export const checkBackendAvailability = async () => {
    try {
        console.log('Checking backend server availability...');

        // Check server health
        const healthResponse = await fetch(`${BACKEND_URL}/`);
        if (!healthResponse.ok) {
            console.error('Backend server health check failed');
            return false;
        }

        // Check if actions are available (which means model is loaded)
        const actionsResponse = await fetch(`${BACKEND_URL}/actions`);
        if (!actionsResponse.ok) {
            console.error('Failed to get actions from backend');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error checking backend availability:', error);
        return false;
    }
};

/**
 * Ensure the model is converted to TensorFlow.js format on the server
 * @returns {Promise<boolean>} True if conversion was successful or already done, false otherwise
 */
export const ensureModelConverted = async () => {
    try {
        console.log('Checking if model is ready on server...');

        // In our API, the model is already loaded when the server starts
        // We can check if the actions endpoint works to confirm the model is ready
        const response = await fetch(`${BACKEND_URL}/actions`);
        if (!response.ok) {
            console.error('Model not ready on server');
            return false;
        }

        // Get the actions from the server
        const result = await response.json();
        if (result.actions && Array.isArray(result.actions)) {
            // Update our local ACTIONS array with the server's actions
            // This ensures we're using the same action labels as the server
            if (result.actions.length > 0) {
                ACTIONS.splice(0, ACTIONS.length, ...result.actions);
            }
        }

        return true;
    } catch (error) {
        console.error('Error checking model readiness:', error);
        return false;
    }
};

/**
 * Download the model from a URL
 * @returns {Promise<tf.LayersModel|null>} The downloaded model or null if it failed
 */
export const downloadModelFromURL = async () => {
    try {
        console.log(`Attempting to connect to model server at ${BACKEND_URL}`);

        // Ensure the model is ready on the server
        const isReady = await ensureModelConverted();
        if (!isReady) {
            console.error('Model not ready on server');
            return null;
        }

        // For this implementation, we're using the server API directly
        // rather than downloading the model to the device
        console.log('Successfully connected to model server');

        // Create a simple proxy model that will forward requests to the server
        const proxyModel = {
            predict: async (sequence) => {
                // This will be handled by makePrediction function
                return { action: null, confidence: 0 };
            },
            dispose: () => {
                // Nothing to dispose
            }
        };

        // Cache the proxy model
        cachedModel = proxyModel;

        return proxyModel;
    } catch (error) {
        console.error('Error connecting to model server:', error);
        return null;
    }
};

/**
 * Load the model from the file system or download it if not available
 * @returns {Promise<tf.LayersModel|null>} The loaded model or null if it failed
 */
export const loadModel = async () => {
    try {
        // Check if TensorFlow.js is ready
        await tf.ready();
        console.log('TensorFlow.js is ready');

        // If we already have a cached model, return it
        if (cachedModel) {
            console.log('Using cached model');
            return cachedModel;
        }

        // Check if model exists locally
        const modelExists = await checkModelExists();

        if (modelExists) {
            // Load model from file system
            try {
                const model = await tf.loadLayersModel(`file://${MODEL_JSON}`);
                console.log('Model loaded from file system');

                // Cache the model
                cachedModel = model;

                return model;
            } catch (loadError) {
                console.error('Error loading model from file system:', loadError);
                console.log('Attempting to download model from URL instead');
                return await downloadModelFromURL();
            }
        } else {
            // Check if backend is available
            const backendAvailable = await checkBackendAvailability();

            if (backendAvailable) {
                console.log('Model not found in file system, downloading from backend');
                return await downloadModelFromURL();
            } else {
                console.error('Backend server not available and no local model found');
                throw new Error('No model available. Please ensure the backend server is running.');
            }
        }
    } catch (error) {
        console.error('Error loading model:', error);
        throw error;
    }
};

/**
 * Save the model to the file system
 * @param {tf.LayersModel} model - The model to save
 * @returns {Promise<boolean>} True if the model was saved successfully, false otherwise
 */
export const saveModel = async (model) => {
    try {
        // Create directory if it doesn't exist
        const dirInfo = await FileSystem.getInfoAsync(MODEL_PATH);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(MODEL_PATH, { intermediates: true });
        }

        // Save model to file system
        await model.save(`file://${MODEL_PATH}`);
        console.log('Model saved to file system');

        // Update cached model
        cachedModel = model;

        return true;
    } catch (error) {
        console.error('Error saving model:', error);
        return false;
    }
};

/**
 * Download the model from a server
 * @param {string} backendUrl - URL of the backend server
 * @returns {Promise<tf.LayersModel|null>} The downloaded model or null if it failed
 */
export const downloadModel = async (backendUrl = 'http://localhost:8000') => {
    try {
        console.log(`Attempting to download model from ${backendUrl}`);

        // Check if backend is available
        const backendAvailable = await checkBackendAvailability();
        if (!backendAvailable) {
            console.error('Backend server not available');
            throw new Error('Backend server not available');
        }

        // Download the model
        const model = await downloadModelFromURL();
        if (!model) {
            throw new Error('Failed to download model');
        }

        return model;
    } catch (error) {
        console.error('Error downloading model:', error);
        throw error;
    }
};

/**
 * Convert an ArrayBuffer to a base64 string
 * @param {ArrayBuffer} buffer - The ArrayBuffer to convert
 * @returns {string} The base64 string
 */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}

// Keep track of recent predictions to smooth out results
const recentPredictions = [];
const MAX_RECENT_PREDICTIONS = 5;

/**
 * Make a prediction using the model
 * @param {tf.LayersModel} model - The model to use for prediction
 * @param {Array} sequence - The sequence of keypoints
 * @returns {Promise<Object>} The prediction results
 */
export const makePrediction = async (model, sequence) => {
    if (!model || sequence.length < SEQUENCE_LENGTH) {
        return {
            action: null,
            confidence: 0,
            allProbabilities: {}
        };
    }

    try {
        // If we're using a proxy model, send the data to the server
        // Convert sequence to a format that can be sent to the server
        // First, we need to reset the sequence on the server
        await fetch(`${BACKEND_URL}/reset`, { method: 'POST' });

        // Then send each frame's keypoints to the server
        for (const keypoints of sequence) {
            const response = await fetch(`${BACKEND_URL}/predict/keypoints`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    frame_index: sequence.indexOf(keypoints),
                    keypoints: Array.from(keypoints) // Convert Float32Array to regular array
                })
            });

            if (!response.ok) {
                console.error('Error sending keypoints to server:', await response.text());
            }
        }

        // Get prediction from server
        const predictionResponse = await fetch(`${BACKEND_URL}/predict`);
        if (!predictionResponse.ok) {
            throw new Error('Failed to get prediction from server');
        }

        const prediction = await predictionResponse.json();

        // Map the server response to our expected format
        return {
            action: prediction.action !== 'unknown' ? prediction.action : null,
            confidence: prediction.confidence,
            allProbabilities: prediction.all_probabilities || {}
        };
    } catch (error) {
        console.error('Error making prediction:', error);
        return {
            action: null,
            confidence: 0,
            allProbabilities: {}
        };
    }
};

/**
 * Dispose of the model and clear cache
 */
export const disposeModel = () => {
    if (cachedModel) {
        cachedModel.dispose();
        cachedModel = null;
        console.log('Model disposed and cache cleared');
    }
}; 