// backend/services/cloudinaryService.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dxjb5lepy',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

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

    return `https://res.cloudinary.com/${cloudinary.config().cloud_name}/${version}/video/upload/${cleanName}.mp4`;
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

module.exports = {
    getVideoUrl,
    getThumbnailUrl,
    uploadVideo
};