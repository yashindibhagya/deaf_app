// Frontend/config/websocketConfig.js

// WebSocket server configuration
// Replace with your actual server IP and port
export const WS_CONFIG = {
    // WebSocket URL - update with your server's IP address and port
    WS_URL: 'ws://192.168.1.100:8000/ws',

    // Connection settings
    CONNECTION: {
        maxRetries: 5,
        retryDelay: 3000, // ms
        pingInterval: 30000 // ms
    },

    // Frame capture settings
    CAPTURE: {
        frameRate: 5, // frames per second
        quality: 0.5, // image quality (0-1)
        captureInterval: 200 // ms between frames
    }
};

export default WS_CONFIG; 