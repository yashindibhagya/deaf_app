// Frontend/config/constants.js

// API configuration
export const API_BASE_URL = 'http://localhost:5000'; // Change to your backend URL

// Sign recognition configuration
export const RECOGNITION_CONFIG = {
    sequenceLength: 30,
    confidenceThreshold: 0.7,
    predictionCooldown: 500, // ms
    minConsistentPredictions: 3
};

// Development mode flag
export const DEV_MODE = __DEV__;