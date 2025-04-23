import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
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
    // Cache of attempted but failed video URLs
    const [failedVideoUrls, setFailedVideoUrls] = useState({});

    // Load user progress and sign data on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);

                // Start by loading user progress
                await loadUserProgress();

                // Then load sign data
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

        loadData();
    }, []);

    // Load user progress from AsyncStorage and Firebase if available
    const loadUserProgress = async () => {
        try {
            // First try to load from AsyncStorage for quick start
            const cachedProgress = await AsyncStorage.getItem('userProgress');
            const initialProgress = cachedProgress ? JSON.parse(cachedProgress) : {};
            setUserProgress(initialProgress);

            // Load failed URL cache
            const cachedFailedUrls = await AsyncStorage.getItem('failedVideoUrls');
            if (cachedFailedUrls) {
                setFailedVideoUrls(JSON.parse(cachedFailedUrls));
            }

            // Then try to sync with Firebase if user is logged in
            if (auth.currentUser) {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));

                if (userDoc.exists()) {
                    // Get progress subcollection
                    const progressSnapshot = await db.collection('users')
                        .doc(auth.currentUser.uid)
                        .collection('progress')
                        .get();

                    const firebaseProgress = {};
                    progressSnapshot.forEach(doc => {
                        firebaseProgress[doc.id] = doc.data();
                    });

                    // Merge with local progress, prioritizing Firebase data
                    const mergedProgress = { ...initialProgress, ...firebaseProgress };
                    setUserProgress(mergedProgress);

                    // Update AsyncStorage with merged data
                    await AsyncStorage.setItem('userProgress', JSON.stringify(mergedProgress));
                }
            }
        } catch (err) {
            console.error('Error loading user progress:', err);
            // Continue with whatever progress we have
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

    // In VideoContext.jsx - Update the markSignAsCompleted function
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

            // Save to AsyncStorage
            await AsyncStorage.setItem('userProgress', JSON.stringify(updatedProgress));

            // If user is logged in, also save to Firebase
            if (auth.currentUser) {
                // Save to user's progress collection
                await setDoc(
                    doc(db, 'users', auth.currentUser.uid, 'progress', signId),
                    completionData,
                    { merge: true }
                );

                // Find courses this sign belongs to
                const coursesWithSign = coursesData.filter(
                    course => course.signs?.some(sign => sign.signId === signId)
                );

                // Update each course
                for (const course of coursesWithSign) {
                    if (course.id) {
                        try {
                            // Check if document exists
                            const courseDocRef = doc(db, 'Courses', course.id);
                            const courseSnap = await getDoc(courseDocRef);

                            if (courseSnap.exists()) {
                                // Update existing document
                                await updateDoc(courseDocRef, {
                                    completedChapter: arrayUnion(signId)
                                });
                            } else {
                                // Create new document with initial data
                                await setDoc(courseDocRef, {
                                    id: course.id,
                                    title: course.title || '',
                                    description: course.description || '',
                                    completedChapter: [signId]
                                });
                            }
                        } catch (err) {
                            console.error(`Error with course ${course.id}:`, err);
                            // Continue with other courses
                        }
                    }
                }
            }

            return true;
        } catch (err) {
            console.error('Error updating progress:', err);
            return false;
        }
    };

    // Get progress for a specific course
    const getCourseProgress = (courseId) => {
        const course = coursesData.find(c => c.id === courseId);
        if (!course) return { completed: 0, total: 0, percentage: 0 };

        const signIds = course.signs?.map(sign => sign.signId) || [];
        const completedCount = signIds.filter(id => userProgress[id]?.completed).length;
        const total = signIds.length;

        return {
            completed: completedCount,
            total: total,
            percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0
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

    // Reset progress (for testing)
    const resetAllProgress = async () => {
        setUserProgress({});
        await AsyncStorage.removeItem('userProgress');

        // If user is logged in, also reset Firebase data
        if (auth.currentUser) {
            // This would need to delete all documents in the progress subcollection
            // Implementation depends on Firebase version and structure
        }
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