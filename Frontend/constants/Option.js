// constants/Option.js - Create this file if it doesn't exist

export const imageAssets = {
    // Course banner images
    courseImage1: require('../assets/images/gesture.png'),
    courseImage2: require('../assets/images/gesture.png'),
    // Add more image mappings as needed

    // Default fallback for any banner image
    default: require('../assets/images/gesture.png')
};

// Other constants can be added here as needed
export const COLORS = {
    primary: '#3c0061',
    secondary: '#D0F3DA',
    background: '#FFFFFF',
    text: '#333333',
    accent: '#F5A623'
};

export const FONTS = {
    regular: {
        fontFamily: 'System', // Use system font as fallback
        fontWeight: 'normal'
    },
    medium: {
        fontFamily: 'System',
        fontWeight: '500'
    },
    bold: {
        fontFamily: 'System',
        fontWeight: 'bold'
    }
};