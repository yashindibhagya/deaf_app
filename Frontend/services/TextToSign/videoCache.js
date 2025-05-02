/**
 * Video cache to store and prefetch videos
 */
const videoCache = {};

/**
 * Prefetch and cache a video
 * 
 * @param {string} url - Video URL to prefetch
 * @param {string} cacheKey - Key to store video in cache
 * @returns {Promise<void>}
 */
const prefetchVideo = async (url, cacheKey) => {
    if (!url || videoCache[cacheKey]) return; // Skip if URL is invalid or already cached

    try {
        // Start loading the video but don't wait for it to complete
        videoCache[cacheKey] = { url, isLoading: true };

        // We're just initiating the fetch here, not awaiting it
        // This allows multiple videos to load in parallel
        fetch(url, { method: 'HEAD' })
            .then(() => {
                videoCache[cacheKey] = { url, isLoading: false, isLoaded: true };
            })
            .catch(error => {
                console.error(`Error prefetching video ${url}:`, error);
                delete videoCache[cacheKey]; // Remove from cache on error
            });
    } catch (error) {
        console.error(`Error setting up prefetch for ${url}:`, error);
    }
};

/**
 * Check if a video is cached
 * 
 * @param {string} cacheKey - Key to check in cache
 * @returns {boolean} - True if video is cached
 */
const isCached = (cacheKey) => {
    return !!videoCache[cacheKey] && videoCache[cacheKey].isLoaded;
};

/**
 * Get a video from cache
 * 
 * @param {string} cacheKey - Key to get from cache
 * @returns {Object|null} - Cached video object or null
 */
const getFromCache = (cacheKey) => {
    return videoCache[cacheKey] || null;
};

/**
 * Clear the entire video cache
 */
const clearCache = () => {
    Object.keys(videoCache).forEach(key => {
        delete videoCache[key];
    });
};

export default {
    prefetchVideo,
    isCached,
    getFromCache,
    clearCache
};