import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Service for loading sign data
import { loadAllSignData } from '../services/signDataService';
import CloudinaryUtils from '../app/utils/CloudinaryUtils';

export const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
    const [signsData, setSignsData] = useState([]);
    const [coursesData, setCoursesData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userProgress, setUserProgress] = useState({});
    // Cache of attempted but failed video URLs
    const [failedVideoUrls, setFailedVideoUrls] = useState({});

    useEffect(() => {
        const fetchSignsData = async () => {
            try {
                setIsLoading(true);

                // Load user progress from AsyncStorage
                const cachedProgress = await AsyncStorage.getItem('userProgress');
                if (cachedProgress) {
                    setUserProgress(JSON.parse(cachedProgress));
                }

                // Load failed URL cache
                const cachedFailedUrls = await AsyncStorage.getItem('failedVideoUrls');
                if (cachedFailedUrls) {
                    setFailedVideoUrls(JSON.parse(cachedFailedUrls));
                }

                // Load all sign data from the service
                const { signs, courses } = await loadAllSignData();

                if (signs) {
                    setSignsData(signs);
                }

                if (courses) {
                    setCoursesData(courses);
                }
            } catch (err) {
                console.error("Error loading sign data:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSignsData();
    }, []);

    // Record a failed video URL attempt
    const recordFailedVideoUrl = async (url) => {
        if (!url) return;

        const newFailedUrls = {
            ...failedVideoUrls,
            [url]: new Date().toISOString()
        };

        setFailedVideoUrls(newFailedUrls);

        // Save to AsyncStorage
        try {
            await AsyncStorage.setItem('failedVideoUrls', JSON.stringify(newFailedUrls));
        } catch (err) {
            console.error('Error saving failed URL:', err);
        }
    };

    // Helper function to mark a sign as completed
    const markSignAsCompleted = async (signId) => {
        try {
            const updatedProgress = { ...userProgress };

            if (!updatedProgress[signId]) {
                updatedProgress[signId] = {
                    completed: true,
                    completedAt: new Date().toISOString()
                };

                // Save to state and storage
                setUserProgress(updatedProgress);
                await AsyncStorage.setItem('userProgress', JSON.stringify(updatedProgress));
            }

            return true;
        } catch (err) {
            console.error('Error updating progress:', err);
            return false;
        }
    };

    // Helper function to get course progress
    const getCourseProgress = (courseId) => {
        const course = coursesData.find(c => c.id === courseId);
        if (!course) return { completed: 0, total: 0, percentage: 0 };

        const signIds = course.signs.map(sign => sign.signId);
        const completedCount = signIds.filter(id => userProgress[id]?.completed).length;

        return {
            completed: completedCount,
            total: course.totalChapters || signIds.length,
            percentage: signIds.length > 0 ? Math.round((completedCount / signIds.length) * 100) : 0
        };
    };

    // Improved findSignForPhrase function with CloudinaryUtils and multi-language support
    const findSignForPhrase = (phrase) => {
        if (!phrase || phrase.trim() === '') return null;

        const searchPhrase = phrase.toLowerCase().trim();

        // Try to find an exact match first
        let sign = signsData.find(sign => {
            const signWord = sign.word ? sign.word.toLowerCase() : '';
            return signWord === searchPhrase ||
                (sign.sinhalaTranslit && (typeof sign.sinhalaTranslit === 'string'
                    ? sign.sinhalaTranslit.toLowerCase() === searchPhrase
                    : sign.sinhalaTranslit.some(t => t.toLowerCase() === searchPhrase))) ||
                (sign.tamilTranslit && (typeof sign.tamilTranslit === 'string'
                    ? sign.tamilTranslit.toLowerCase() === searchPhrase
                    : sign.tamilTranslit.some(t => t.toLowerCase() === searchPhrase)));
        });

        // Validate the sign has a valid videoUrl before returning
        if (sign && sign.videoUrl && typeof sign.videoUrl === 'string') {
            return sign;
        } else if (sign) {
            // Try to update the URL using CloudinaryUtils
            sign.videoUrl = CloudinaryUtils.getSignVideoUrl(phrase);
            if (sign.videoUrl) return sign;
            return null;
        }

        // If no exact match, try partial match
        sign = signsData.find(sign => {
            if (!sign.word) return false;  // Skip if the sign doesn't have a word property

            const signWord = sign.word.toLowerCase();
            // Check if the search phrase contains the sign word or vice versa
            return (signWord.includes(searchPhrase) || searchPhrase.includes(signWord)) &&
                sign.videoUrl && typeof sign.videoUrl === 'string';
        });

        if (sign) {
            return sign;
        }

        // If no match found in the database, try to dynamically generate a sign with URL
        const videoUrl = CloudinaryUtils.getSignVideoUrl(phrase);
        if (videoUrl) {
            // Create a temporary sign object
            return {
                word: phrase,
                videoUrl: videoUrl,
                thumbnailUrl: CloudinaryUtils.getSignThumbnailUrl(phrase),
                category: 'generated',
                signId: `${searchPhrase.replace(/\s+/g, '-')}-gen`
            };
        }

        return null;
    };

    // Improved getSignVideoByWord function with CloudinaryUtils and multi-language support
    const getSignVideoByWord = (word) => {
        if (!word || word.trim() === '') return null;

        const searchWord = word.toLowerCase().trim();

        // Try to find an exact match first (case insensitive)
        let sign = signsData.find(sign => {
            if (!sign.word) return false;

            return sign.word.toLowerCase() === searchWord ||
                (sign.sinhalaTranslit && (typeof sign.sinhalaTranslit === 'string'
                    ? sign.sinhalaTranslit.toLowerCase() === searchWord
                    : sign.sinhalaTranslit.some(t => t.toLowerCase() === searchWord))) ||
                (sign.tamilTranslit && (typeof sign.tamilTranslit === 'string'
                    ? sign.tamilTranslit.toLowerCase() === searchWord
                    : sign.tamilTranslit.some(t => t.toLowerCase() === searchWord)));
        });

        // Verify the sign has a valid videoUrl
        if (sign && sign.videoUrl && typeof sign.videoUrl === 'string') {
            return sign;
        } else if (sign) {
            // Try to update the URL using CloudinaryUtils
            sign.videoUrl = CloudinaryUtils.getSignVideoUrl(word);
            if (sign.videoUrl) return sign;
        }

        // If exact match failed or had no videoUrl, try a more flexible match
        sign = signsData.find(sign => {
            if (!sign.word) return false;

            const signWord = sign.word.toLowerCase();
            return (
                // Word is contained in the sign (like "you" in "thank you")
                (signWord.includes(searchWord) || searchWord.includes(signWord)) &&
                // Must have a valid videoUrl
                sign.videoUrl && typeof sign.videoUrl === 'string'
            );
        });

        if (sign) {
            return sign;
        }

        // If still no match found, dynamically generate a sign with URL
        const videoUrl = CloudinaryUtils.getSignVideoUrl(word);
        if (videoUrl) {
            // Create a temporary sign object
            return {
                word: word,
                videoUrl: videoUrl,
                thumbnailUrl: CloudinaryUtils.getSignThumbnailUrl(word),
                category: 'generated',
                signId: `${searchWord.replace(/\s+/g, '-')}-gen`
            };
        }

        return null;
    };

    const getSignsByCategory = (category) => {
        return signsData.filter(sign => sign.category === category);
    };

    // Reset progress (for testing)
    const resetAllProgress = async () => {
        setUserProgress({});
        await AsyncStorage.removeItem('userProgress');
    };

    // Clear the failed URL cache (for testing or when videos are updated)
    const clearFailedUrlCache = async () => {
        setFailedVideoUrls({});
        await AsyncStorage.removeItem('failedVideoUrls');
    };

    return (
        <VideoContext.Provider
            value={{
                signsData,
                coursesData,
                isLoading,
                error,
                userProgress,
                failedVideoUrls,
                getSignVideoByWord,
                getSignsByCategory,
                markSignAsCompleted,
                getCourseProgress,
                resetAllProgress,
                recordFailedVideoUrl,
                clearFailedUrlCache,
                findSignForPhrase
            }}
        >
            {children}
        </VideoContext.Provider>
    );
};

// Custom hook to use the video context
export const useVideo = () => {
    const context = useContext(VideoContext);
    if (context === undefined) {
        throw new Error("useVideo must be used within a VideoProvider");
    }
    return context;
};