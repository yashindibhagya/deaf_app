import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video } from 'expo-av';
import { useVideo } from '../../context/VideoContext';

export default function CourseDetailsView() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { coursesData, signsData, userProgress, isLoading } = useVideo();

    const [courseDetails, setCourseDetails] = useState(null);
    const [courseProgress, setCourseProgress] = useState({ completed: 0, total: 0, percentage: 0 });
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [videoRef, setVideoRef] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Load course details when component mounts or id changes
    useEffect(() => {
        if (!coursesData || isLoading) return;

        // Find the course by id
        const course = coursesData.find((course) => course.id === id);

        if (course) {
            setCourseDetails(course);

            // Calculate progress
            const signIds = course.signs?.map(sign => sign.signId) || [];
            const completedCount = signIds.filter(signId => userProgress[signId]?.completed).length;

            setCourseProgress({
                completed: completedCount,
                total: signIds.length,
                percentage: signIds.length > 0 ? Math.round((completedCount / signIds.length) * 100) : 0
            });

            // Set first lesson as default selected lesson
            if (course.signs && course.signs.length > 0) {
                setSelectedLesson(course.signs[0]);
            }
        }
    }, [id, coursesData, userProgress, isLoading]);

    // Handle lesson selection
    const handleLessonSelect = (lesson) => {
        setSelectedLesson(lesson);

        // Stop current video if playing
        if (videoRef) {
            videoRef.pauseAsync();
            setIsPlaying(false);
        }

        // Scroll to top
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
        }
    };

    // Handle continue learning button press
    const handleContinueLearning = () => {
        if (selectedLesson) {
            router.push({
                pathname: "/chapterView/[signId]",
                params: { signId: selectedLesson.signId, courseId: id }
            });
        }
    };

    const scrollViewRef = React.useRef(null);

    // Loading state
    if (isLoading || !courseDetails) {
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

    // Get instructor info based on course category
    const getInstructorInfo = () => {
        switch (courseDetails.id) {
            case 'alphabet':
                return {
                    name: 'Tim Marshall',
                    role: 'Alphabet Signing',
                    courses: '5 Courses',
                    image: require('../../assets/images/gesture.png')
                };
            case 'wh-questions':
                return {
                    name: 'Sarah Johnson',
                    role: 'Questions Expert',
                    courses: '3 Courses',
                    image: require('../../assets/images/gesture.png')
                };
            default:
                return {
                    name: 'Sign Language Tutor',
                    role: 'Professional Signer',
                    courses: '7 Courses',
                    image: require('../../assets/images/gesture.png')
                };
        }
    };

    const instructor = getInstructorInfo();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Details</Text>
                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Feather name="bookmark" size={22} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Feather name="more-vertical" size={22} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Course Banner */}
                <View style={[
                    styles.courseBanner,
                    { backgroundColor: courseDetails.backgroundColor || '#4C9EFF' }
                ]}>
                    <View style={styles.courseIconContainer}>
                        <Text style={styles.courseIcon}>{courseDetails.icon || '📚'}</Text>
                    </View>
                    <Text style={styles.courseTitle}>{courseDetails.title}</Text>
                </View>

                {/* About Course */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>About Course:</Text>
                    <Text style={styles.courseDescription}>
                        {courseDetails.description || 'Learn sign language with our comprehensive course. Master the fundamentals and build your skills step by step. Perfect for beginners and those looking to improve their signing abilities.'}
                    </Text>
                </View>

                {/* Instructor */}
                <View style={styles.instructorContainer}>
                    <Image source={instructor.image} style={styles.instructorImage} />
                    <View style={styles.instructorInfo}>
                        <Text style={styles.instructorName}>{instructor.name}</Text>
                        <Text style={styles.instructorRole}>{instructor.role}</Text>
                    </View>
                    <View style={styles.instructorStats}>
                        <Text style={styles.instructorCourses}>{instructor.courses}</Text>
                        <MaterialIcons name="chevron-right" size={20} color="#999" />
                    </View>
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressTabs}>
                        <TouchableOpacity style={[styles.progressTab, styles.activeTab]}>
                            <Text style={styles.progressTabText}>Courses</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.progressTab}>
                            <Text style={styles.progressTabText}>Projects</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.progressInfoContainer}>
                        <Text style={styles.progressPercentage}>Complete {courseProgress.percentage}%</Text>
                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${courseProgress.percentage}%` }]} />
                        </View>
                    </View>
                </View>

                {/* Current Video Preview (if lesson is selected) */}
                {selectedLesson && (
                    <View style={styles.videoPreviewContainer}>
                        <Video
                            ref={ref => setVideoRef(ref)}
                            source={{ uri: selectedLesson.videoUrl }}
                            style={styles.videoPreview}
                            resizeMode="contain"
                            useNativeControls
                            isLooping={false}
                            onPlaybackStatusUpdate={status => {
                                setIsPlaying(status.isPlaying);
                            }}
                        />
                        <View style={styles.videoTitleContainer}>
                            <Text style={styles.videoTitle}>{selectedLesson.word}</Text>
                            {selectedLesson.sinhalaWord && (
                                <Text style={styles.videoSubtitle}>
                                    {typeof selectedLesson.sinhalaWord === 'string'
                                        ? selectedLesson.sinhalaWord
                                        : Array.isArray(selectedLesson.sinhalaWord)
                                            ? selectedLesson.sinhalaWord[0]
                                            : ''}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Lessons List */}
                <View style={styles.lessonsContainer}>
                    <View style={styles.lessonsHeader}>
                        <MaterialIcons name="play-lesson" size={20} color="#4C9EFF" />
                        <Text style={styles.lessonsTitle}>{courseDetails.signs?.length || 0} Lessons</Text>
                    </View>

                    {courseDetails.signs && courseDetails.signs.length > 0 ? (
                        courseDetails.signs.map((sign, index) => {
                            const isCompleted = userProgress[sign.signId]?.completed;
                            const isSelected = selectedLesson && selectedLesson.signId === sign.signId;

                            return (
                                <TouchableOpacity
                                    key={sign.signId}
                                    style={[
                                        styles.lessonItem,
                                        isSelected && styles.selectedLessonItem,
                                        isCompleted && styles.completedLessonItem
                                    ]}
                                    onPress={() => handleLessonSelect(sign)}
                                >
                                    <View style={[
                                        styles.lessonIconContainer,
                                        isCompleted && styles.completedLessonIconContainer,
                                        isSelected && styles.selectedLessonIconContainer
                                    ]}>
                                        {isCompleted ? (
                                            <MaterialIcons name="check" size={16} color="#fff" />
                                        ) : (
                                            <Text style={styles.lessonNumber}>{index + 1}</Text>
                                        )}
                                    </View>

                                    <View style={styles.lessonInfo}>
                                        <Text style={[
                                            styles.lessonTitle,
                                            isSelected && styles.selectedLessonTitle
                                        ]}>
                                            {index + 1}. {sign.word}
                                        </Text>
                                        {sign.sinhalaTranslit && (
                                            <Text style={styles.lessonSubtitle}>
                                                {typeof sign.sinhalaTranslit === 'string'
                                                    ? sign.sinhalaTranslit
                                                    : Array.isArray(sign.sinhalaTranslit)
                                                        ? sign.sinhalaTranslit[0]
                                                        : ''}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <Text style={styles.noLessonsText}>No lessons available yet</Text>
                    )}
                </View>
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
        paddingBottom: 90,
    },
    courseBanner: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        margin: 16,
    },
    courseIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    courseIcon: {
        fontSize: 36,
    },
    courseTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
    },
    sectionContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    courseDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    instructorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
    },
    instructorImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    instructorInfo: {
        flex: 1,
    },
    instructorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    instructorRole: {
        fontSize: 12,
        color: '#777',
    },
    instructorStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    instructorCourses: {
        color: '#4C9EFF',
        marginRight: 4,
    },
    progressContainer: {
        margin: 16,
    },
    progressTabs: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    progressTab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 16,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#4C9EFF',
    },
    progressTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    progressInfoContainer: {
        marginBottom: 16,
    },
    progressPercentage: {
        fontSize: 14,
        marginBottom: 8,
        color: '#333',
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: '#eee',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4C9EFF',
        borderRadius: 3,
    },
    videoPreviewContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
    },
    videoPreview: {
        width: '100%',
        height: 200,
        backgroundColor: '#000',
    },
    videoTitleContainer: {
        padding: 12,
    },
    videoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    videoSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    lessonsContainer: {
        marginHorizontal: 16,
    },
    lessonsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    lessonsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        color: '#333',
    },
    lessonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedLessonItem: {
        backgroundColor: '#f0f9ff',
    },
    completedLessonItem: {
        backgroundColor: '#f0fff0',
    },
    lessonIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    completedLessonIconContainer: {
        backgroundColor: '#4CAF50',
    },
    selectedLessonIconContainer: {
        backgroundColor: '#4C9EFF',
    },
    lessonNumber: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    },
    lessonInfo: {
        flex: 1,
    },
    lessonTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    selectedLessonTitle: {
        fontWeight: 'bold',
        color: '#4C9EFF',
    },
    lessonSubtitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    noLessonsText: {
        textAlign: 'center',
        color: '#999',
        padding: 16,
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