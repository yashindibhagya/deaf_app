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
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { useVideo } from '../../../context/VideoContext';

export default function CourseDetailsView() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { coursesData, userProgress, isLoading } = useVideo();

    const [courseDetails, setCourseDetails] = useState(null);
    const [isLocalLoading, setIsLocalLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('chapters');
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
                        foundCourse = { ...courseDoc.data(), id: courseId };
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

    // Navigate to a specific sign/chapter
    const handleChapterPress = (sign) => {
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

        router.push({
            pathname: '/chapterView/[signId]',
            params: { signId: signToNavigate.signId, courseId: id }
        });
    };

    // Render each chapter/sign item
    const renderChapterItem = ({ item, index }) => {
        const isCompleted = userProgress[item.signId]?.completed;

        return (
            <TouchableOpacity
                style={[styles.chapterItem, isCompleted && styles.completedChapterItem]}
                onPress={() => handleChapterPress(item)}
            >
                <View style={[styles.chapterIconContainer, isCompleted && styles.completedChapterIconContainer]}>
                    {isCompleted ? (
                        <MaterialIcons name="check" size={16} color="#fff" />
                    ) : (
                        <Text style={styles.chapterNumber}>{index + 1}</Text>
                    )}
                </View>

                <View style={styles.chapterInfo}>
                    <Text style={styles.chapterTitle}>
                        {index + 1}. {item.word}
                    </Text>
                    {item.sinhalaWord && (
                        <Text style={styles.chapterSubtitle}>
                            {typeof item.sinhalaWord === 'string'
                                ? item.sinhalaWord
                                : Array.isArray(item.sinhalaWord)
                                    ? item.sinhalaWord[0]
                                    : ''}
                        </Text>
                    )}
                </View>

                <MaterialIcons
                    name={isCompleted ? "check-circle" : "play-circle-outline"}
                    size={24}
                    color={isCompleted ? "#4CAF50" : "#4C9EFF"}
                />
            </TouchableOpacity>
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
            <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{courseDetails.title || 'Course Details'}</Text>
                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Feather name="bookmark" size={22} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Course Banner */}
                <View style={[
                    styles.courseBanner,
                    { backgroundColor: courseDetails.backgroundColor || '#4C9EFF' }
                ]}>
                    <View style={styles.courseIconContainer}>
                        <Text style={styles.courseIcon}>{courseDetails.icon || '📚'}</Text>
                    </View>
                    <View style={styles.courseTitleContainer}>
                        <Text style={styles.courseTitle}>{courseDetails.title || 'Course Title'}</Text>
                        <Text style={styles.courseDescription}>{courseDetails.description || ''}</Text>
                    </View>
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressTitle}>Your Progress</Text>
                        <Text style={styles.progressPercentage}>{progress.percentage}%</Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${progress.percentage}%` }]} />
                    </View>

                    <Text style={styles.progressDetails}>
                        {progress.completed} of {progress.total} completed
                    </Text>
                </View>

                {/* Tabs Navigation */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'chapters' && styles.activeTab]}
                        onPress={() => setSelectedTab('chapters')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'chapters' && styles.activeTabText]}>
                            Chapters
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'info' && styles.activeTab]}
                        onPress={() => setSelectedTab('info')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'info' && styles.activeTabText]}>
                            Info
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Chapters List */}
                {selectedTab === 'chapters' && (
                    <View style={styles.chaptersContainer}>
                        <View style={styles.chaptersHeader}>
                            <MaterialIcons name="playlist-play" size={20} color="#4C9EFF" />
                            <Text style={styles.chaptersTitle}>
                                {courseDetails.signs?.length || 0} Signs to Learn
                            </Text>
                        </View>

                        {courseDetails.signs && courseDetails.signs.length > 0 ? (
                            <FlatList
                                data={courseDetails.signs}
                                renderItem={renderChapterItem}
                                keyExtractor={(item) => item.signId}
                                scrollEnabled={false}
                                contentContainerStyle={styles.chaptersList}
                            />
                        ) : (
                            <Text style={styles.noChaptersText}>No chapters available yet</Text>
                        )}
                    </View>
                )}

                {/* Course Info */}
                {selectedTab === 'info' && (
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoTitle}>About This Course</Text>
                        <Text style={styles.infoDescription}>
                            {courseDetails.description || 'No description available.'}
                        </Text>

                        <Text style={styles.infoTitle}>What You'll Learn</Text>
                        <View style={styles.learningPoints}>
                            <View style={styles.learningPoint}>
                                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                                <Text style={styles.learningPointText}>Learn sign language alphabet</Text>
                            </View>
                            <View style={styles.learningPoint}>
                                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                                <Text style={styles.learningPointText}>Master common signs for everyday use</Text>
                            </View>
                            <View style={styles.learningPoint}>
                                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                                <Text style={styles.learningPointText}>Practice with video demonstrations</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Continue Learning Button */}
            <View style={styles.continueButtonContainer}>
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleContinueLearning}
                >
                    <Text style={styles.continueButtonText}>Continue Learning</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 16,
        flex: 1,
    },
    headerIcons: {
        flexDirection: 'row',
    },
    headerIcon: {
        padding: 4,
        marginLeft: 16,
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
    },
    courseIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    courseIcon: {
        fontSize: 32,
    },
    courseTitleContainer: {
        flex: 1,
    },
    courseTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    courseDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    progressContainer: {
        margin: 16,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    progressPercentage: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressDetails: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        textAlign: 'right',
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        marginHorizontal: 16,
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
        color: '#666',
    },
    activeTabText: {
        fontWeight: 'bold',
        color: '#4C9EFF',
    },
    chaptersContainer: {
        marginHorizontal: 16,
        marginTop: 16,
    },
    chaptersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    chaptersTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        color: '#333',
    },
    chaptersList: {
        paddingBottom: 16,
    },
    chapterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    completedChapterItem: {
        backgroundColor: '#E8F5E9',
    },
    chapterIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#DDD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    completedChapterIconContainer: {
        backgroundColor: '#4CAF50',
    },
    chapterNumber: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    },
    chapterInfo: {
        flex: 1,
    },
    chapterTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    chapterSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    noChaptersText: {
        textAlign: 'center',
        color: '#999',
        padding: 16,
    },
    infoContainer: {
        margin: 16,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    infoDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    learningPoints: {
        marginTop: 8,
    },
    learningPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    learningPointText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
    },
    continueButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    continueButton: {
        backgroundColor: '#4C9EFF',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});