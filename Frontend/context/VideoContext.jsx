import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

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
    const [failedVideoUrls, setFailedVideoUrls] = useState({});
    const [hasInitializedProgress, setHasInitializedProgress] = useState(false);

    // Load sign data on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);

                // Load sign data
                const { signs, courses } = await loadAllSignData();

                if (signs) {
                    setSignsData(signs);
                }

                if (courses) {
                    setCoursesData(courses);
                }

                // After loading course data, load user progress
                await loadUserProgress();

            } catch (err) {
                console.error("Error loading sign data:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Track authentication changes to reload user progress when user logs in/out
    useEffect(() => {
        if (!auth) return;

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            // Clear progress when user logs out
            if (!user) {
                setUserProgress({});
                await AsyncStorage.removeItem('userProgress');
                setHasInitializedProgress(false);
            } else {
                // Load user progress when user logs in
                await loadUserProgress();
            }
        });

        return () => unsubscribe();
    }, []);

    // Load user progress from AsyncStorage and Firebase if available
    const loadUserProgress = async () => {
        try {
            // For new users, ensure we start with empty progress
            if (!hasInitializedProgress) {
                // Set initial empty progress
                setUserProgress({});
                setHasInitializedProgress(true);
            }

            // If user is logged in, load progress from Firebase
            if (auth.currentUser) {
                try {
                    // Get progress from user's subcollection
                    const progressSnapshot = await getDocs(
                        collection(db, 'users', auth.currentUser.uid, 'progress')
                    );

                    // Create user progress object from Firebase data
                    const firebaseProgress = {};
                    progressSnapshot.forEach(doc => {
                        firebaseProgress[doc.id] = doc.data();
                    });

                    // Update state with user's progress
                    setUserProgress(firebaseProgress);

                    // Save to local storage for offline access
                    await AsyncStorage.setItem('userProgress', JSON.stringify(firebaseProgress));

                } catch (error) {
                    console.error('Error getting progress from Firebase:', error);
                }
            } else {
                // For offline use, try to load from AsyncStorage
                const cachedProgress = await AsyncStorage.getItem('userProgress');
                if (cachedProgress) {
                    setUserProgress(JSON.parse(cachedProgress));
                }
            }

            // Load failed URL cache
            const cachedFailedUrls = await AsyncStorage.getItem('failedVideoUrls');
            if (cachedFailedUrls) {
                setFailedVideoUrls(JSON.parse(cachedFailedUrls));
            }
        } catch (err) {
            console.error('Error loading user progress:', err);
            // Continue with empty progress
            setUserProgress({});
        }
    };

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

    // Mark sign as completed - strictly per-user
    const markSignAsCompleted = async (signId) => {
        if (!signId) return false;

        try {
            const now = new Date().toISOString();
            const completionData = {
                completed: true,
                completedAt: now
            };

            // Update local state
            const updatedProgress = {
                ...userProgress,
                [signId]: completionData
            };

            setUserProgress(updatedProgress);

            // Save to AsyncStorage for offline use
            await AsyncStorage.setItem('userProgress', JSON.stringify(updatedProgress));

            // If user is logged in, save to Firebase in user's progress collection
            if (auth.currentUser) {
                await setDoc(
                    doc(db, 'users', auth.currentUser.uid, 'progress', signId),
                    completionData,
                    { merge: true }
                );
            }

            return true;
        } catch (err) {
            console.error('Error updating progress:', err);
            return false;
        }
    };

    // Get progress for a specific course
    const getCourseProgress = (courseId) => {
        // Get the course
        const course = coursesData.find(c => c.id === courseId);
        if (!course) return { completed: 0, total: 0, percentage: 0 };

        // Get all sign IDs in this course
        const signIds = course.signs?.map(sign => sign.signId) || [];

        // If there are no signs, return 0 progress
        if (signIds.length === 0) {
            return { completed: 0, total: 0, percentage: 0 };
        }

        // Count completed signs
        const completedCount = signIds.filter(id => userProgress[id]?.completed).length;

        // Calculate percentage
        const percentage = Math.round((completedCount / signIds.length) * 100);

        return {
            completed: completedCount,
            total: signIds.length,
            percentage: percentage
        };
    };

    // Get all courses with their progress information
    const getCoursesWithProgress = () => {
        return coursesData.map(course => {
            const progress = getCourseProgress(course.id);
            return {
                ...course,
                progress
            };
        });
    };

    // Check if a specific sign is completed
    const isSignCompleted = (signId) => {
        return !!userProgress[signId]?.completed;
    };

    // Get sign by ID
    const getSignById = (signId) => {
        return signsData.find(sign => sign.signId === signId);
    };

    // Get course by ID
    const getCourseById = (courseId) => {
        return coursesData.find(course => course.id === courseId);
    };

    // Get signs for a specific category
    const getSignsByCategory = (category) => {
        return signsData.filter(sign => sign.category === category);
    };

    // Get the next incomplete sign in a course
    const getNextIncompleteSign = (courseId) => {
        const course = coursesData.find(c => c.id === courseId);
        if (!course || !course.signs) return null;

        return course.signs.find(sign => !userProgress[sign.signId]?.completed);
    };

    // Reset progress (for testing or user-initiated reset)
    const resetAllProgress = async () => {
        setUserProgress({});
        await AsyncStorage.removeItem('userProgress');

        // If user is logged in, delete progress documents in Firebase
        if (auth.currentUser) {
            try {
                const progressSnapshot = await getDocs(
                    collection(db, 'users', auth.currentUser.uid, 'progress')
                );

                const batch = db.batch();
                progressSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
            } catch (error) {
                console.error('Error resetting progress in Firebase:', error);
            }
        }
    };

    // Get sign video by word
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
                getCoursesWithProgress,
                isSignCompleted,
                getSignById,
                getCourseById,
                getNextIncompleteSign,
                resetAllProgress,
                recordFailedVideoUrl
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