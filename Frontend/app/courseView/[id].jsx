import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Image,
    ActivityIndicator,
    StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideo } from "../../context/VideoContext";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * Course View screen that shows details of a specific course
 * and its associated sign language videos
 */
export default function CourseView() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { coursesData, userProgress, markSignAsCompleted, isLoading } = useVideo();
    const [courseDetails, setCourseDetails] = useState(null);
    const [courseProgress, setCourseProgress] = useState({ completed: 0, total: 0, percentage: 0 });

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
        } else {
            console.error(`Course with id ${id} not found`);
        }
    }, [id, coursesData, userProgress, isLoading]);

    // Handle press on a sign item
    const handleSignPress = (sign) => {
        if (!sign) return;

        // Navigate to chapter view with the sign details
        router.push({
            pathname: "/chapterView/[signId]",
            params: { signId: sign.signId, courseId: id }
        });
    };

    // Render each sign item in the list
    const renderSignItem = ({ item, index }) => {
        const isCompleted = userProgress[item.signId]?.completed;

        return (
            <TouchableOpacity
                style={[styles.signItem, isCompleted && styles.completedSignItem]}
                onPress={() => handleSignPress(item)}
            >
                <View style={styles.signNumberContainer}>
                    <Text style={styles.signNumber}>{index + 1}</Text>
                </View>

                <View style={styles.signInfo}>
                    <Text style={styles.signTitle}>{item.word}</Text>
                    {item.sinhalaWord && (
                        <Text style={styles.signSubtitle}>
                            {typeof item.sinhalaWord === 'string'
                                ? item.sinhalaWord
                                : Array.isArray(item.sinhalaWord)
                                    ? item.sinhalaWord[0]
                                    : ''}
                        </Text>
                    )}
                </View>

                {isCompleted ? (
                    <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                ) : (
                    <MaterialIcons name="play-circle-outline" size={24} color="#666" />
                )}
            </TouchableOpacity>
        );
    };

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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{courseDetails.title}</Text>
            </View>

            {/* Course Info */}
            <View style={[styles.courseInfoCard, { backgroundColor: courseDetails.backgroundColor || '#FFD8B9' }]}>
                <View style={styles.courseIconContainer}>
                    <Text style={styles.courseIcon}>{courseDetails.icon || '📚'}</Text>
                </View>

                <Text style={styles.courseTitle}>{courseDetails.title}</Text>
                <Text style={styles.courseDescription}>{courseDetails.description}</Text>

                <View style={styles.progressInfoContainer}>
                    <View style={styles.progressBarContainer}>
                        <View
                            style={[
                                styles.progressBar,
                                { width: `${courseProgress.percentage}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {courseProgress.completed}/{courseProgress.total} completed
                    </Text>
                </View>
            </View>

            {/* Sign List */}
            <Text style={styles.sectionTitle}>Signs in this course</Text>

            {courseDetails.signs && courseDetails.signs.length > 0 ? (
                <FlatList
                    data={courseDetails.signs}
                    renderItem={renderSignItem}
                    keyExtractor={(item) => item.signId}
                    contentContainerStyle={styles.signsList}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateText}>
                        No signs available in this course yet.
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#EEEEEE",
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginLeft: 16,
        color: "#333",
    },
    courseInfoCard: {
        margin: 16,
        padding: 16,
        borderRadius: 12,
    },
    courseIconContainer: {
        alignItems: "center",
        marginBottom: 12,
    },
    courseIcon: {
        fontSize: 60,
    },
    courseTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
    },
    courseDescription: {
        fontSize: 16,
        color: "#555",
        marginBottom: 16,
    },
    progressInfoContainer: {
        marginTop: 8,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: "rgba(255, 255, 255, 0.5)",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressBar: {
        height: "100%",
        backgroundColor: "#4CAF50",
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        color: "#333",
        fontWeight: "500",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 12,
        color: "#333",
    },
    signsList: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    signItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    completedSignItem: {
        backgroundColor: "#E8F5E9",
    },
    signNumberContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#4C9EFF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    signNumber: {
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    signInfo: {
        flex: 1,
    },
    signTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    signSubtitle: {
        fontSize: 14,
        color: "#666",
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    emptyStateText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
});