import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from "@expo/vector-icons";

/**
 * CompletedCourses component for displaying completed courses in the learning platform
 * 
 * @param {Object} props Component props
 * @param {Array} props.courses Array of completed courses to display
 * @param {string} props.searchQuery Current search query
 * @param {Function} props.onStartLearning Function to handle "Start Learning" button press
 * @returns {React.Component} CompletedCourses component
 */
const CompletedCourses = ({ courses, searchQuery, onStartLearning }) => {
    const router = useRouter();

    // Navigate to a specific course
    const handleCoursePress = (course) => {
        router.push({
            pathname: '/courseView/courseDetails',
            params: { id: course.id }
        });
    };

    // Render a course item
    const renderCourseCard = ({ item }) => (
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

                <View style={styles.progressContainer}>
                    <View
                        style={[
                            styles.progressBar,
                            { width: `${item.progress.percentage}%` }
                        ]}
                    />
                </View>

                <Text style={styles.chapterCount}>
                    {item.progress.completed}/{item.progress.total} completed
                </Text>
            </View>

            {/* Achievement Badge for Completed Courses */}
            <View style={styles.achievementBadge}>
                <MaterialIcons name="star" size={24} color="#fff" />
                <Text style={styles.achievementText}>Completed!</Text>
            </View>
        </TouchableOpacity>
    );

    // No completed courses message
    if (courses.length === 0) {
        return (
            <View style={styles.noCoursesContainer}>
                <Text style={styles.noCoursesText}>
                    {searchQuery
                        ? `No completed courses matching "${searchQuery}"`
                        : "You haven't completed any courses yet!"}
                </Text>

                <View style={styles.motivationContainer}>
                    <MaterialIcons name="school" size={48} color="#155658" />
                    <Text style={styles.motivationText}>
                        Complete a course to earn achievement badges!
                    </Text>
                    <TouchableOpacity
                        style={styles.startLearningButton}
                        onPress={onStartLearning}
                    >
                        <Text style={styles.startLearningText}>Start Learning</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Render the list of completed courses
    return (
        <FlatList
            data={courses}
            renderItem={renderCourseCard}
            keyExtractor={(item) => item.docId || item.id || Math.random().toString()}
            contentContainerStyle={styles.courseList}
            numColumns={2}
            columnWrapperStyle={styles.row}
        />
    );
};

const styles = StyleSheet.create({
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
    row: {
        justifyContent: 'space-between',
    },
    noCoursesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    noCoursesText: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 20,
    },
    // Achievement Badge Styles
    achievementBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#F7B316',
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
        color: '#fff',
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

export default CompletedCourses;