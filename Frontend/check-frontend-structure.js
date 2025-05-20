/**
 * Frontend Structure Checker for GestureConnect
 * This file helps you understand the structure of the frontend codebase
 * and checks if key files and components exist.
 * 
 * To use: Run this file with Node.js to verify frontend structure is correct
 */

const fs = require('fs');
const path = require('path');

// Define the frontend root directory
const FRONTEND_ROOT = '../Frontend';

// Defining the expected structure of the Frontend directory
const expectedStructure = {
    // App directory - contains main screens
    'app': {
        'index.jsx': 'Main entry point / welcome screen',
        '_layout.jsx': 'Root layout component with providers',
        '(tabs)': {
            '_layout.jsx': 'Tab navigator layout',
            'home.jsx': 'Home tab screen',
            'learning.jsx': 'Learning tab screen',
            'textToSign.jsx': 'Text to Sign Language tab screen',
            'signToText.jsx': 'Sign Language to Text tab screen',
            'profile.jsx': 'User profile tab screen'
        },
        'auth': {
            'signIn.jsx': 'Sign in screen',
            'signUp.jsx': 'Sign up screen',
            'gestureSignIn.jsx': 'Gesture-based sign in screen',
        },
        'onboarding': {
            'index.jsx': 'Onboarding entry point',
            '_layout.jsx': 'Onboarding layout',
            'screen1.jsx': 'First onboarding screen',
            'screen2.jsx': 'Second onboarding screen',
            'screen3.jsx': 'Third onboarding screen',
        },
        'courseView': {
            'index.jsx': 'Course view entry point',
            '[id].jsx': 'Dynamic course view by ID',
            '[id]/details.jsx': 'Course details screen',
            'courseDetails.jsx': 'Course details screen',
        },
        'chapterView': {
            'index.jsx': 'Chapter view entry point',
            '[signId].jsx': 'Dynamic sign/chapter view',
        },
        'signView': {
            'index.jsx': 'Sign view screen',
        },
        'selectOption': {
            'optionSignIn.jsx': 'Sign in options screen',
            'optionSignUp.jsx': 'Sign up options screen',
        },
        'utils': {
            'CloudinaryUtils.js': 'Utilities for Cloudinary video URLs',
            'sinhalaTransliteration.js': 'Sinhala transliteration utilities',
            'TamilTransliteration.js': 'Tamil transliteration utilities',
            'GeminiTranslationService.js': 'Google Gemini translation service',
            'translationApi.js': 'Translation API integration',
            'CameraContants.js': 'Camera-related constants and utilities',
        }
    },

    // Components directory - contains reusable components
    'Components': {
        'Container': {
            'Common.jsx': 'Common header component'
        },
        'Shared': {
            'Button.jsx': 'Reusable button component',
            'SignVideoPlayer.jsx': 'Sign language video player component'
        },
        'Home': {
            'Header.jsx': 'Home screen header',
            'InProgressCourses.jsx': 'In-progress courses component',
            'NewCourses.jsx': 'New courses component',
            'WelcomeCard.jsx': 'Welcome card component'
        },
        'CourseView': {
            'Intro.jsx': 'Course introduction component',
            'Chapters.jsx': 'Course chapters component'
        },
        'Learning': {
            'AllCourses.jsx': 'All courses component',
            'CompletedCourses.jsx': 'Completed courses component',
            'SearchResults.jsx': 'Search results component'
        },
        'TextToSign': {
            'VoiceRecorder.jsx': 'Voice recorder component for text-to-sign'
        }
    },

    // Context directory - contains React context providers
    'context': {
        'UserDetailContext.jsx': 'User details context provider',
        'VideoContext.jsx': 'Video data context provider'
    },

    // Services directory - contains service files
    'services': {
        'authService.js': 'Authentication service',
        'signDataService.js': 'Sign data service',
        'speechService.js': 'Speech recognition service',
        'SearchService.jsx': 'Search service for learning content'
    },

    // Config directory - contains configuration files
    'config': {
        'firebaseConfig.jsx': 'Firebase configuration',
        'constants.js': 'Application constants'
    },

    // Assets directory - contains images and other assets
    'assets': {
        'Data': {
            'whQuestions.json': 'Question signs data',
            'conversationSigns.json': 'Conversation signs data',
            'categories.json': 'Categories data',
            'englishAlphabet.json': 'English alphabet signs data',
            'sentenceSigns.json': 'Sentence signs data',
            'sinhalaAlphabet.json': 'Sinhala alphabet signs data',
            'people.json': 'People/family signs data',
            'numbers.json': 'Number signs data'
        },
        'images': {
            // Image files would be listed here
        }
    }
};

// Function to check if a file exists
function checkFileExists(filePath) {
    return fs.existsSync(filePath);
}

// Function to check a directory against the expected structure
function checkDirectory(directory, structure, basePath = FRONTEND_ROOT) {
    console.log(`\nChecking directory: ${directory}`);
    const directoryPath = path.join(basePath, directory);

    if (!checkFileExists(directoryPath)) {
        console.error(`❌ Directory not found: ${directoryPath}`);
        return false;
    }

    let allValid = true;

    for (const [name, details] of Object.entries(structure)) {
        const itemPath = path.join(directoryPath, name);

        if (typeof details === 'object') {
            // This is a directory
            const nestedPath = path.join(directory, name);
            if (!checkDirectory(nestedPath, details, basePath)) {
                allValid = false;
            }
        } else {
            // This is a file
            if (checkFileExists(itemPath)) {
                console.log(`✅ Found file: ${itemPath} - ${details}`);
            } else {
                console.error(`❌ Missing file: ${itemPath} - ${details}`);
                allValid = false;
            }
        }
    }

    return allValid;
}

// Function to check for API endpoints in the frontend code
function checkApiEndpoints() {
    console.log('\nChecking for API endpoints referenced in frontend code:');

    const apiEndpoints = [
        {
            endpoint: 'http://localhost:5000/api/transcribe',
            description: 'Speech-to-text transcription API endpoint',
            files: ['Components/TextToSign/VoiceRecorder.jsx']
        },
        {
            endpoint: 'firebase authentication',
            description: 'Firebase Authentication services',
            files: ['services/authService.js', 'context/UserDetailContext.jsx']
        },
        {
            endpoint: 'firebase firestore',
            description: 'Firebase Firestore database',
            files: ['app/(tabs)/home.jsx', 'app/(tabs)/textToSign.jsx', 'context/VideoContext.jsx']
        },
        {
            endpoint: 'https://res.cloudinary.com',
            description: 'Cloudinary for sign language videos',
            files: ['app/utils/CloudinaryUtils.js']
        },
        {
            endpoint: 'gemini translation api',
            description: 'Google Gemini Translation API',
            files: ['app/utils/GeminiTranslationService.js']
        }
    ];

    apiEndpoints.forEach(api => {
        console.log(`\n🔍 API: ${api.endpoint}`);
        console.log(`   Description: ${api.description}`);
        console.log(`   Referenced in: ${api.files.join(', ')}`);
    });
}

// Main function to check the frontend structure
function checkFrontendStructure() {
    console.log('=== CHECKING FRONTEND STRUCTURE ===');

    if (!checkFileExists(FRONTEND_ROOT)) {
        console.error(`❌ Frontend root directory not found: ${FRONTEND_ROOT}`);
        return;
    }

    let allValid = true;

    for (const [directory, structure] of Object.entries(expectedStructure)) {
        if (!checkDirectory(directory, structure)) {
            allValid = false;
        }
    }

    // Check for API endpoints
    checkApiEndpoints();

    if (allValid) {
        console.log('\n✅ All frontend files and directories found!');
    } else {
        console.log('\n⚠️ Some frontend files or directories are missing. See errors above.');
    }
}

// Run the check
checkFrontendStructure();