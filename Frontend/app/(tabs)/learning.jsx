import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    SafeAreaView,
    StatusBar,
    TextInput,
    ActivityIndicator,
    Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVideo } from '../../context/VideoContext';
import Common from '../../Components/Container/Common';
import { MaterialIcons } from "@expo/vector-icons";

export default function Learning() {
    const router = useRouter();
    const { coursesData, isLoading, getCourseProgress } = useVideo();
    const [activeTab, setActiveTab] = useState('courses'); // Default to 'courses' tab
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [completedCourses, setCompletedCourses] = useState([]);

    // Filter courses based on active tab and search query
    useEffect(() => {
        if (!coursesData) return;

        // Process all courses to calculate completion
        const processed = coursesData.map(course => {
            const progress = getCourseProgress(course.id);
            return { ...course, progress };
        });

        // Filter based on search
        const searchFiltered = processed.filter(
            course => course.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Set all filtered courses
        setFilteredCourses(searchFiltered);

        // Set completed courses (100% completed)
        setCompletedCourses(
            searchFiltered.filter(course => course.progress.percentage === 100)
        );
    }, [coursesData, searchQuery, getCourseProgress]);

    // Function to render each course card
    const renderCourseCard = ({ item }) => {
        const isCompleted = item.progress.percentage === 100;

        return (
            <TouchableOpacity
                style={[
                    styles.courseCard,
                    { backgroundColor: item.backgroundColor || '#fff' }
                ]}
                onPress={() => handleCoursePress(item)}
            >
                <View style={styles.iconContainer}>
                    <Text style={styles.courseIcon}>{item.icon || '📚'}</Text>
                </View>
                <View style={styles.courseInfoContainer}>
                    <Text style={styles.courseTitle}>{item.title}</Text>
                    {item.progress.total > 0 && (
                        <View style={styles.progressContainer}>
                            <View
                                style={[
                                    styles.progressBar,
                                    { width: `${item.progress.percentage}%` }
                                ]}
                            />
                        </View>
                    )}
                    <Text style={styles.chapterCount}>
                        {item.progress.total > 0 ?
                            `${item.progress.completed}/${item.progress.total} chapters` :
                            'Coming soon'}
                    </Text>
                </View>

                {/* Achievement Badge for Completed Courses */}
                {isCompleted && activeTab === 'completed' && (
                    <View style={styles.achievementBadge}>
                        <MaterialIcons name="star" size={24} color="#FFD700" />
                        <Text style={styles.achievementText}>Completed!</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const handleCoursePress = (course) => {
        console.log(`Navigating to ${course.title} course with ID: ${course.id}`);

        try {
            router.push({
                pathname: '/courseView/courseDetails',
                params: { id: course.id }
            });
        } catch (error) {
            console.error("Navigation error:", error);
            router.push(`/courseView/${course.id}`);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4C9EFF" />
                    <Text>Loading courses...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Determine which courses to display based on active tab
    const coursesToDisplay = activeTab === 'courses' ? filteredCourses : completedCourses;

    // Header component for the FlatList
    const ListHeader = () => (
        <>
            <StatusBar backgroundColor="#D0F3DA" barStyle="dark-content" />
            <Common />

            <Text style={styles.pageTitle}>Explore</Text>

            {/* Tab navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'courses' && styles.activeTab
                    ]}
                    onPress={() => setActiveTab('courses')}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === 'courses' && styles.activeTabText
                    ]}>
                        Courses
                    </Text>
                    {activeTab === 'courses' && <View style={styles.activeTabIndicator} />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'completed' && styles.activeTab
                    ]}
                    onPress={() => setActiveTab('completed')}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === 'completed' && styles.activeTabText
                    ]}>
                        Completed {completedCourses.length > 0 && `(${completedCourses.length})`}
                    </Text>
                    {activeTab === 'completed' && <View style={styles.activeTabIndicator} />}
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={activeTab === 'courses' ?
                            "Search for signs or collections" :
                            "Search completed courses"}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>
        </>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            {coursesToDisplay.length > 0 ? (
                <FlatList
                    ListHeaderComponent={ListHeader}
                    data={coursesToDisplay}
                    renderItem={renderCourseCard}
                    keyExtractor={(item) => item.docId || item.id || Math.random().toString()}
                    contentContainerStyle={{ ...styles.courseList, paddingBottom: 70 }}
                    numColumns={2}
                    showsVerticalScrollIndicator={false}
                    columnWrapperStyle={styles.row}
                    keyboardShouldPersistTaps="handled"
                />
            ) : (
                <View style={styles.container}>
                    <ListHeader />
                    <View style={styles.noCoursesContainer}>
                        <Text style={styles.noCoursesText}>
                            {activeTab === 'courses' ?
                                (searchQuery ? `No courses matching "${searchQuery}"` : "No courses available") :
                                (searchQuery ? `No completed courses matching "${searchQuery}"` : "You haven't completed any courses yet!")}
                        </Text>

                        {activeTab === 'completed' && completedCourses.length === 0 && (
                            <View style={styles.motivationContainer}>
                                <MaterialIcons name="school" size={48} color="#155658" />
                                <Text style={styles.motivationText}>
                                    Complete a course to earn achievement badges!
                                </Text>
                                <TouchableOpacity
                                    style={styles.startLearningButton}
                                    onPress={() => setActiveTab('courses')}
                                >
                                    <Text style={styles.startLearningText}>Start Learning</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#D0F3DA',
        padding: 25,
    },
    container: {
        flex: 1,
        padding: 25,
    },
    contentContainer: {
        paddingBottom: 60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333333',
    },
    searchContainer: {
        marginBottom: 16,
    },
    searchInputContainer: {
        borderWidth: 1,
        borderColor: '#DDDDDD',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
    },
    searchInput: {
        fontSize: 16,
        color: '#333333',
        padding: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    tab: {
        paddingVertical: 12,
        marginRight: 24,
        position: 'relative',
    },
    activeTab: {
        position: 'relative',
    },
    tabText: {
        fontSize: 16,
        color: '#999999',
    },
    activeTabText: {
        color: '#155658',
        fontWeight: 'bold',
    },
    activeTabIndicator: {
        position: 'absolute',
        bottom: -1,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: '#155658',
        borderRadius: 3,
    },
    courseList: {
        paddingBottom: 24,
    },
    courseCard: {
        flex: 1,
        margin: 8,
        borderRadius: 16,
        overflow: 'hidden',
        padding: 16,
        height: 170,
        position: 'relative',
    },
    iconContainer: {
        alignItems: 'flex-end',
    },
    courseIcon: {
        fontSize: 50,
        marginBottom: 10,
    },
    courseInfoContainer: {
        justifyContent: 'flex-end',
        flex: 1,
    },
    courseTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 8,
    },
    progressContainer: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 2,
    },
    chapterCount: {
        fontSize: 12,
        color: '#666666',
    },
    noCoursesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    noCoursesText: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 20,
    },
    row: {
        justifyContent: 'space-between',
    },
    // Achievement Badge Styles
    achievementBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 15,
        padding: 5,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    achievementText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 4,
    },
    // Motivation container styles
    motivationContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 16,
        maxWidth: 300,
    },
    motivationText: {
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 20,
        fontSize: 16,
        color: '#333',
    },
    startLearningButton: {
        backgroundColor: '#F7B316',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    startLearningText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});