/**
 * Constants for the Text to Sign Language application
 * Central location for all configuration constants
 */

// Define common words that typically don't have sign language videos
export const COMMON_WORDS_WITHOUT_SIGNS = [
    'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been',
    'and', 'or', 'but', 'if', 'of', 'at', 'by', 'for', 'with', 'about',
    'to', 'from', 'up', 'down', 'in', 'on', 'off', 'over', 'under',
    'this', 'that', 'these', 'those',
];

// Punctuation to ignore in text processing
export const PUNCTUATION_TO_IGNORE = /[.,!?;:()[\]{}'"]/g;

// Language options
export const LANGUAGE_MODES = {
    ENGLISH: 'english',
    SINHALA: 'sinhala',
    TAMIL: 'tamil'
};

// Recording options optimized for speech recognition
export const RECORDING_OPTIONS = {
    android: {
        extension: '.m4a',
        outputFormat: 4, // MPEG_4 format
        audioEncoder: 2, // AAC encoder
        sampleRate: 44100,
        numberOfChannels: 1, // Mono is better for speech recognition
        bitRate: 128000,
    },
    ios: {
        extension: '.m4a',
        audioQuality: 0x7F, // High quality
        sampleRate: 44100,
        numberOfChannels: 1, // Mono is better for speech recognition
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
    },
};

// Maximum recording duration in seconds
export const MAX_RECORDING_DURATION = 30;

// Maximum number of recent translations to store
export const MAX_RECENT_TRANSLATIONS = 10;

// Minimum recording duration to process (in seconds)
export const MIN_RECORDING_DURATION = 1;

// Playback speeds for video player
export const PLAYBACK_SPEEDS = [0.5, 1.0, 1.5, 2.0];

// Default playback speed
export const DEFAULT_PLAYBACK_SPEED = 1.5;

// Translation API endpoints (for future expansion)
export const API_ENDPOINTS = {
    TRANSLATION: 'https://api.example.com/translation',
    SPEECH_RECOGNITION: 'https://api.example.com/speech'
};

// Video cache settings
export const VIDEO_CACHE_SETTINGS = {
    MAX_CACHE_SIZE: 50, // Maximum number of videos to cache
    CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// Retry settings for video loading
export const VIDEO_RETRY_SETTINGS = {
    MAX_RETRIES: 2,
    RETRY_DELAY: 400, // ms
};

// Toast notification display duration
export const TOAST_DURATION = 3000; // 3 seconds

export default {
    COMMON_WORDS_WITHOUT_SIGNS,
    PUNCTUATION_TO_IGNORE,
    LANGUAGE_MODES,
    RECORDING_OPTIONS,
    MAX_RECORDING_DURATION,
    MAX_RECENT_TRANSLATIONS,
    MIN_RECORDING_DURATION,
    PLAYBACK_SPEEDS,
    DEFAULT_PLAYBACK_SPEED,
    API_ENDPOINTS,
    VIDEO_CACHE_SETTINGS,
    VIDEO_RETRY_SETTINGS,
    TOAST_DURATION
};