import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    StatusBar,
    Image,
    FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useVideo } from '../../context/VideoContext';
import Button from '../../Components/Shared/Button';

export default function CourseDetailsView() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { coursesData, userProgress, isLoading } = useVideo();

    const [courseDetails, setCourseDetails] = useState(null);
    const [isLocalLoading, setIsLocalLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('courses');
    const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });

    // Load course details
    useEffect(() => {
        if (!id) return;

        const fetchCourseDetails = async () => {
            setIsLocalLoading(true);
            try {
                // First try to get from context
                let foundCourse = coursesData?.find(c => c.id === id);

                // If not found in context, try to get from Firestore
                if (!foundCourse && db) {
                    const courseDoc = await getDoc(doc(db, 'Courses', id));
                    if (courseDoc.exists()) {
                        foundCourse = { ...courseDoc.data(), id };
                    }
                }

                if (foundCourse) {
                    setCourseDetails(foundCourse);

                    // Calculate progress
                    const totalSigns = foundCourse.signs?.length || 0;
                    const signIds = foundCourse.signs?.map(sign => sign.signId) || [];
                    const completedCount = signIds.filter(signId => userProgress[signId]?.completed).length;
                    const percentage = totalSigns > 0 ? Math.round((completedCount / totalSigns) * 100) : 0;

                    setProgress({
                        completed: completedCount,
                        total: totalSigns,
                        percentage: percentage
                    });
                }
            } catch (error) {
                console.error("Error fetching course:", error);
            } finally {
                setIsLocalLoading(false);
            }
        };

        fetchCourseDetails();
    }, [id, coursesData, userProgress]);

    // Function to navigate to chapter view
    const navigateToChapter = (sign) => {
        router.push({
            pathname: '/chapterView/[signId]',
            params: { signId: sign.signId, courseId: id }
        });
    };

    // Continue learning - takes you to the next incomplete chapter
    const handleContinueLearning = () => {
        if (!courseDetails || !courseDetails.signs || courseDetails.signs.length === 0) return;

        // Find the first incomplete sign
        const nextIncompleteSign = courseDetails.signs.find(sign => !userProgress[sign.signId]?.completed);

        // If all signs are completed, go to the first one
        const signToNavigate = nextIncompleteSign || courseDetails.signs[0];

        navigateToChapter(signToNavigate);
    };

    // Render each chapter/sign item
    const renderChapterItem = ({ item, index }) => {
        // Fix: Check if the sign is completed in user's progress
        const isCompleted = item.signId && userProgress[item.signId]?.completed;
        return (
            <TouchableOpacity
                style={[styles.chapterItem, isCompleted && styles.completedChapterItem]}
                onPress={() => navigateToChapter(item)}
            >

                <View style={styles.chapterInfo}>

                    <MaterialIcons
                        name={isCompleted ? "check-circle" : "play-circle-outline"}
                        size={24}
                        color={isCompleted ? "#4CAF50" : "#F7B316"}
                    />

                    <Text style={[styles.chapterTitle, isCompleted && styles.completedChapterTitle]}
                    >
                        {item.word}
                    </Text>

                </View>
            </TouchableOpacity >
        );
    };

    // Loading state
    if (isLoading || isLocalLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4C9EFF" />
                    <Text style={styles.loadingText}>Loading course...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // No course found
    if (!courseDetails) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Course Details</Text>
                </View>
                <View style={styles.noCourseContainer}>
                    <MaterialIcons name="error-outline" size={48} color="#999" />
                    <Text style={styles.noCourseText}>Course not found</Text>
                    <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
                        <Text style={styles.goBackButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#D0F3DA" barStyle="dark-content" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >

                {/* Course Banner */}
                <View style={[
                    styles.courseBanner,
                    { backgroundColor: '#155658' }
                ]}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.courseIconContainer}>
                        <Text style={styles.courseIcon}>{courseDetails.icon || '📚'}</Text>
                    </View>
                    <Text style={styles.courseTitle}>{courseDetails.title || 'Course Title'}</Text>
                </View>


                {/* Progress */}
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>
                        Complete {progress.percentage}%
                    </Text>
                    <View style={styles.progressBarContainer}>
                        <View
                            style={[styles.progressBar, { width: `${progress.percentage}%` }]}
                        />
                    </View>
                </View>

                {/* Lessons Counter */}
                <View style={styles.lessonsCountContainer}>
                    <MaterialIcons name="menu-book" size={20} color="#155658" />
                    <Text style={styles.lessonsCount}>
                        {courseDetails.signs?.length || 0} Lessons
                    </Text>
                </View>

                {/* Chapters List */}
                {courseDetails.signs && courseDetails.signs.length > 0 ? (
                    <FlatList
                        data={courseDetails.signs}
                        renderItem={renderChapterItem}
                        keyExtractor={(item) => item.signId}
                        scrollEnabled={false}
                        contentContainerStyle={styles.chaptersList}
                    />
                ) : (
                    <Text style={styles.noChaptersText}>No lessons available yet</Text>
                )}
            </ScrollView>

            {/* Continue Learning Button */}
            <View style={styles.continueButtonContainer}>
                <Button
                    text="Continue Learning"
                    onPress={handleContinueLearning}
                    style={styles.button}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#D0F3DA',
        marginTop: 50
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    noCourseContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noCourseText: {
        fontSize: 18,
        color: '#666',
        marginTop: 16,
    },
    goBackButton: {
        marginTop: 20,
        backgroundColor: '#4C9EFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    goBackButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 4,
        //marginTop: 20
        marginLeft: -10
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 19,
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 90, // Extra space for the fixed button
    },
    courseBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        margin: 16,
        borderRadius: 12,
        height: 100
    },
    courseIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgb(255, 255, 255)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginLeft: 10
    },
    courseIcon: {
        fontSize: 24,
    },
    courseTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    aboutCourseContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    aboutCourseTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 4,
    },
    aboutCourseText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tab: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 16,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#4C9EFF',
    },
    tabText: {
        fontSize: 16,
        color: '#888',
    },
    activeTabText: {
        fontWeight: 'bold',
        color: '#4C9EFF',
    },
    progressContainer: {
        marginHorizontal: 16,
        marginTop: 16,
    },
    progressText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
        marginBottom: 8,
    },
    progressBarContainer: {
        height: 10,
        backgroundColor: '#fff',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#F7B316',
        borderRadius: 3,
    },
    lessonsCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 24,
        marginBottom: 12,
    },
    lessonsCount: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        color: '#333',
    },
    chaptersList: {
        paddingHorizontal: 16,
    },
    chapterItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 8,
        overflow: 'hidden',
        height: 60,
        flexDirection: 'row'
    },
    completedChapterItem: {
        // backgroundColor: '#E8F5E9',
        backgroundColor: '#155658',

    },
    chapterContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    chapterTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    completedChapterTitle: {
        color: '#fff',
    },
    chapterInfo: {
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    noChaptersText: {
        textAlign: 'center',
        color: '#999',
        padding: 16,
    },
    continueButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 15
    },
    continueButton: {
        backgroundColor: '#4C9EFF',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});