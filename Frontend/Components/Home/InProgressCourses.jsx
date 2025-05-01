import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from "@expo/vector-icons";

const InProgressCourses = ({ courses }) => {
    const router = useRouter();

    // Render a single course item in the horizontal list
    const renderCourseItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.courseCard,
                { backgroundColor: item.backgroundColor || '#fff' }
            ]}
            onPress={() =>
                router.push({
                    pathname: '/courseView/courseDetails',
                    params: { id: item.id }
                })
            }
        >
            <Text style={styles.courseIcon}>{item.icon || '📚'}</Text>
            <Text style={styles.courseTitle}>{item.title}</Text>
            <Text style={styles.courseDescription} numberOfLines={2}>
                {item.description || `Learn ${item.title.toLowerCase()}`}
            </Text>

            <View style={styles.progressInfo}>
                <Text style={styles.chapterCount}>
                    {item.signs?.length || 0} Chapters
                </Text>
                <Text style={styles.completedCount}>
                    {item.progress.completed} Out of {item.progress.total} Completed
                </Text>
            </View>

            <View style={styles.progressBarContainer}>
                <View
                    style={[
                        styles.progressBar,
                        { width: `${item.progress.percentage}%` }
                    ]}
                />
            </View>

            {item.progress.percentage === 100 && (
                <View style={styles.completedBadge}>
                    <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.completedBadgeText}>Completed</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    if (courses.length === 0) {
        return <WelcomeCard />;
    }

    return (
        <View>
            <Text style={styles.subsectionTitle}>Courses In Progress</Text>
            <FlatList
                data={courses}
                renderItem={renderCourseItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    subsectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#000",
        marginBottom: 10,
    },
    noProgressText: {
        fontSize: 14,
        color: "#666",
        fontStyle: "italic",
        marginBottom: 20,
    },
    horizontalList: {
        paddingRight: 20,
        paddingBottom: 5,
    },
    courseCard: {
        width: 200,
        height: 180,
        borderRadius: 16,
        marginRight: 16,
        padding: 16,
        position: 'relative',
    },
    courseIcon: {
        fontSize: 30,
        marginBottom: 8,
    },
    courseTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    courseDescription: {
        fontSize: 12,
        color: "#555",
        marginBottom: 10,
        flex: 1,
    },
    progressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    chapterCount: {
        fontSize: 10,
        color: "#000",
    },
    completedCount: {
        fontSize: 10,
        color: "#333",
        fontWeight: "500",
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: "#F7B316",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        backgroundColor: "#155658",
        borderRadius: 3,
    },
    completedBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    completedBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
});

export default InProgressCourses;