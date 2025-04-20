// backend/utils/cloudinaryUtils.js
/**
 * Utility functions for Cloudinary
 */
const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/dxjb5lepy';
const DEFAULT_VERSION = 'v1742644992';

// Map of known version numbers for specific sign videos
const VERSION_MAP = {
    'hello': 'v1742374651',
    'thank_you': 'v1742377081',
    'you': 'v1742377081',
    'world': 'v1742377081',
    'please': 'v1742374651',
    'sorry': 'v1742374651',
    'yes': 'v1742374651',
    'no': 'v1742374651',
    // Single letters
    'a': 'v1742644992',
    'b': 'v1742644992',
    'c': 'v1742644993',
    // Add other mappings as needed
};

/**
 * Convert a word to a standardized key format
 * @param {string} word - The word to convert
 * @returns {string} - Standardized key
 */
const wordToKey = (word) => {
    if (!word) return '';
    return word.toLowerCase().trim().replace(/\s+/g, '_');
};

/**
 * Generate a Cloudinary URL for a video
 * @param {string} word - The word for the video
 * @returns {string} - Cloudinary URL
 */
const getSignVideoUrl = (word) => {
    const key = wordToKey(word);

    // Determine public ID
    let publicId = key;

    // Get version
    const version = VERSION_MAP[key] || DEFAULT_VERSION;

    return `${CLOUDINARY_BASE_URL}/video/upload/${version}/${publicId}.mp4`;
};

/**
 * Generate a Cloudinary URL for a thumbnail
 * @param {string} word - The word for the thumbnail
 * @returns {string} - Cloudinary URL
 */
const getSignThumbnailUrl = (word) => {
    const key = wordToKey(word);

    return `${CLOUDINARY_BASE_URL}/image/upload/v1742374651/thumbnails/${key}.jpg`;
};

module.exports = {
    getSignVideoUrl,
    getSignThumbnailUrl,
    wordToKey
};