// backend/services/cloudinaryService.js
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure Cloudinary with either environment variables or default values
const configureCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dxjb5lepy';
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiKey || !apiSecret) {
        console.log('Cloudinary API key or secret not found in environment variables');
        console.log('Using read-only configuration for Cloudinary (limited functionality)');
    } else {
        console.log(`Using Cloudinary configuration with API key for cloud: ${cloudName}`);
    }

    // Configure Cloudinary
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });

    return {
        cloudName,
        hasFullAccess: !!(apiKey && apiSecret)
    };
};

// Initialize Cloudinary
const { cloudName, hasFullAccess } = configureCloudinary();
console.log(`Cloudinary initialized for cloud: ${cloudName} with ${hasFullAccess ? 'full' : 'limited'} access`);

// Constants
const DEFAULT_VERSION = 'v1742644992';

/**
 * Get a video URL from Cloudinary
 * @param {string} videoName - The name of the video
 * @param {string} version - Optional version tag
 * @returns {string} - Cloudinary URL
 */
const getVideoUrl = (videoName, version = DEFAULT_VERSION) => {
    if (!videoName) return null;

    // Clean the video name
    const cleanName = videoName.toLowerCase().trim().replace(/\s+/g, '_');

    return `https://res.cloudinary.com/${cloudinary.config().cloud_name}/video/upload/${version}/${cleanName}.mp4`;
};

/**
 * Get a thumbnail URL from Cloudinary
 * @param {string} imageName - The name of the image
 * @param {string} folder - Optional folder path
 * @returns {string} - Cloudinary URL
 */
const getThumbnailUrl = (imageName, folder = 'thumbnails') => {
    if (!imageName) return null;

    // Clean the image name
    const cleanName = imageName.toLowerCase().trim().replace(/\s+/g, '_');

    return `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/v1742374651/${folder}/${cleanName}.jpg`;
};

/**
 * Upload a video to Cloudinary
 * @param {string} filePath - Path to the file
 * @param {string} publicId - Public ID for the upload
 * @returns {Promise} - Upload result
 */
const uploadVideo = (filePath, publicId) => {
    if (!hasFullAccess) {
        return Promise.reject(new Error('Cannot upload to Cloudinary: API credentials not configured'));
    }

    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(filePath, {
            resource_type: 'video',
            public_id: publicId,
            overwrite: true
        }, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
    });
};

/**
 * Generate a Cloudinary signed URL (for secure access if needed)
 * @param {string} publicId - The public ID of the resource
 * @param {Object} options - Options for the URL
 * @returns {string} - Signed Cloudinary URL
 */
const generateSignedUrl = (publicId, options = {}) => {
    if (!hasFullAccess) {
        console.warn('Generating unsigned URL: API credentials not configured');
        return getVideoUrl(publicId);
    }

    const defaultOptions = {
        resource_type: 'video',
        format: 'mp4',
        secure: true,
        ...options
    };

    return cloudinary.url(publicId, defaultOptions);
};

module.exports = {
    getVideoUrl,
    getThumbnailUrl,
    uploadVideo,
    generateSignedUrl,
    cloudinary,
    hasFullAccess
};