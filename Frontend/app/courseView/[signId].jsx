import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    ActivityIndicator,
    StatusBar,
} from "react-native";
import { Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideo } from "../../context/VideoContext";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

/**
 * Chapter View screen that shows a specific sign language video
 * and allows users to mark it as completed
 */
export default function ChapterView() {
    const router = useRouter();
    const { signId, courseId } = useLocalSearchParams();
    const { signsData, coursesData, markSignAsCompleted, userProgress, isLoading } = useVideo();

    const [sign, setSign] = useState(null);
    const [course, setCourse] = useState(null);
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const [isVideoError, setIsVideoError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [nextSign, setNextSign] = useState(null);
    const [prevSign, setPrevSign] = useState(null);

    const videoRef = useRef(null);

    // Load sign and course data
    useEffect(() => {
        if (isLoading || !signsData || !coursesData) return;

        // Find the sign by ID
        const currentSign = signsData.find((s) => s.signId === signId);
        if (currentSign) {
            setSign(currentSign);

            // Check if the sign is already marked as completed
            setIsCompleted(userProgress[signId]?.completed || false);
        }

        // Find the course by ID
        if (courseId) {
            const currentCourse = coursesData.find((c) => c.id === courseId);
            if (currentCourse) {
                setCourse(currentCourse);

                // Find next and previous signs in this course
                const courseSignIds = currentCourse.signs.map(s => s.signId);
                const currentIndex = courseSignIds.indexOf(signId);

                if (currentIndex > 0) {
                    setPrevSign(currentCourse.signs[currentIndex - 1]);
                }

                if (currentIndex < courseSignIds.length - 1) {
                    setNextSign(currentCourse.signs[currentIndex + 1]);
                }
            }
        }
    }, [signId, courseId, signsData, coursesData, userProgress, isLoading]);

    // Handle video playback status updates
    const handlePlaybackStatusUpdate = (status) => {
        if (status.isLoaded) {
            setIsVideoLoading(false);

            if (status.didJustFinish && isPlaying) {
                setIsPlaying(false);
                // Auto-mark as completed when video finishes playing
                if (!isCompleted) {
                    handleMarkCompleted();
                }
            }
        }
    };

    // Handle video load error
    const handleVideoError = (error) => {
        console.error("Video error:", error);
        setIsVideoLoading(false);
        setIsVideoError(true);
    };

    // Toggle video play/pause
    const togglePlayPause = async () => {
        if (!videoRef.current) return;

        try {
            if (isPlaying) {
                await videoRef.current.pauseAsync();
            } else {
                await videoRef.current.playAsync();
            }
            setIsPlaying(!isPlaying);
        } catch (error) {
            console.error("Error toggling play/pause:", error);
        }
    };

    // Replay the video from the beginning
    const replayVideo = async () => {
        if (!videoRef.current) return;

        try {
            await videoRef.current.setPositionAsync(0);
            await videoRef.current.playAsync();
            setIsPlaying(true);
        } catch (error) {
            console.error("Error replaying video:", error);
        }
    };

    // Mark the sign as completed
    const handleMarkCompleted = async () => {
        if (!signId) return;

        try {
            await markSignAsCompleted(signId);
            setIsCompleted(true);

            // Show success message
            Alert.alert(
                "Progress Saved",
                "This sign has been marked as completed!",
                [{ text: "OK" }]
            );
        } catch (error) {
            console.error("Error marking as completed:", error);
            Alert.alert("Error", "Failed to save progress");
        }
    };

    // Navigate to the next sign
    const goToNextSign = () => {
        if (nextSign) {
            router.replace({
                pathname: "/chapterView/[signId]",
                params: { signId: nextSign.signId, courseId }
            });
        }
    };

    // Navigate to the previous sign
    const goToPrevSign = () => {
        if (prevSign) {
            router.replace({
                pathname: "/chapterView/[signId]",
                params: { signId: prevSign.signId, courseId }
            });
        }
    };

    // Return to the course view
    const returnToCourse = () => {
        if (courseId) {
            router.replace({
                pathname: "/courseView/[id]",
                params: { id: courseId }
            });
        } else {
            router.back();
        }
    };

    // Loading state
    if (isLoading || !sign) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4C9EFF" />
                    <Text style={styles.loadingText}>Loading sign...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={returnToCourse}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{sign.word}</Text>
                {isCompleted && (
                    <MaterialIcons name="check-circle" size={24} color="#4CAF50" style={styles.completedIcon} />
                )}
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
                {/* Video Player */}
                <View style={styles.videoContainer}>
                    {isVideoLoading && (
                        <View style={styles.videoLoadingOverlay}>
                            <ActivityIndicator size="large" color="#FFFFFF" />
                        </View>
                    )}

                    {isVideoError ? (
                        <View style={styles.videoErrorContainer}>
                            <Ionicons name="alert-circle" size={48} color="#FFA726" />
                            <Text style={styles.videoErrorText}>
                                Failed to load video. Please try again.
                            </Text>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => {
                                    setIsVideoError(false);
                                    setIsVideoLoading(true);
                                    if (videoRef.current) {
                                        videoRef.current.loadAsync({ uri: sign.videoUrl });
                                    }
                                }}
                            >
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Video
                            ref={videoRef}
                            source={{ uri: sign.videoUrl }}
                            style={styles.video}
                            resizeMode="contain"
                            shouldPlay={false}
                            isLooping={false}
                            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                            onError={handleVideoError}
                            useNativeControls={false}
                        />
                    )}

                    {/* Video Controls */}
                    <View style={styles.videoControls}>
                        <TouchableOpacity
                            style={[styles.controlButton, !prevSign && styles.disabledButton]}
                            onPress={goToPrevSign}
                            disabled={!prevSign}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={24}
                                color={prevSign ? "#4C9EFF" : "#CCCCCC"}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.playButton}
                            onPress={togglePlayPause}
                            disabled={isVideoLoading || isVideoError}
                        >
                            <Ionicons
                                name={isPlaying ? "pause" : "play"}
                                size={32}
                                color="#FFFFFF"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={replayVideo}
                            disabled={isVideoLoading || isVideoError}
                        >
                            <Ionicons name="refresh" size={24} color="#4C9EFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.controlButton, !nextSign && styles.disabledButton]}
                            onPress={goToNextSign}
                            disabled={!nextSign}
                        >
                            <Ionicons
                                name="chevron-forward"
                                size={24}
                                color={nextSign ? "#4C9EFF" : "#CCCCCC"}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Sign Details */}
                <View style={styles.signDetailsContainer}>
                    <Text style={styles.signTitle}>{sign.word}</Text>

                    {sign.sinhalaWord && (
                        <View style={styles.translationContainer}>
                            <Text style={styles.translationLabel}>Sinhala:</Text>
                            <Text style={styles.translationText}>
                                {typeof sign.sinhalaWord === 'string'
                                    ? sign.sinhalaWord
                                    : Array.isArray(sign.sinhalaWord)
                                        ? sign.sinhalaWord.join(', ')
                                        : ''}
                            </Text>
                        </View>
                    )}

                    {sign.sinhalaTranslit && (
                        <View style={styles.translationContainer}>
                            <Text style={styles.translationLabel}>Pronunciation:</Text>
                            <Text style={styles.translationText}>
                                {typeof sign.sinhalaTranslit === 'string'
                                    ? sign.sinhalaTranslit
                                    : Array.isArray(sign.sinhalaTranslit)
                                        ? sign.sinhalaTranslit.join(', ')
                                        : ''}
                            </Text>
                        </View>
                    )}

                    {sign.relatedSigns && sign.relatedSigns.length > 0 && (
                        <View style={styles.relatedSignsContainer}>
                            <Text style={styles.relatedSignsLabel}>Related Signs:</Text>
                            <Text style={styles.relatedSignsText}>
                                {sign.relatedSigns.join(', ')}
                            </Text>
                        </View>
                    )}

                    {/* Mark as Completed Button */}
                    <TouchableOpacity
                        style={[
                            styles.markCompletedButton,
                            isCompleted && styles.alreadyCompletedButton
                        ]}
                        onPress={handleMarkCompleted}
                        disabled={isCompleted}
                    >
                        <Text style={styles.markCompletedButtonText}>
                            {isCompleted ? "Already Completed" : "Mark as Completed"}
                        </Text>
                        {isCompleted && (
                            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                        )}
                    </TouchableOpacity>

                    {/* Navigation Buttons */}
                    <View style={styles.navigationButtonsContainer}>
                        {prevSign && (
                            <TouchableOpacity
                                style={[styles.navigationButton, styles.prevButton]}
                                onPress={goToPrevSign}
                            >
                                <Ionicons name="chevron-back" size={20} color="#4C9EFF" />
                                <Text style={styles.navigationButtonText}>Previous</Text>
                            </TouchableOpacity>
                        )}

                        {nextSign && (
                            <TouchableOpacity
                                style={[styles.navigationButton, styles.nextButton]}
                                onPress={goToNextSign}
                            >
                                <Text style={styles.navigationButtonText}>Next</Text>
                                <Ionicons name="chevron-forward" size={20} color="#4C9EFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>
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
        flex: 1,
        color: "#333",
    },
    completedIcon: {
        marginLeft: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 16,
    },
    videoContainer: {
        aspectRatio: 16 / 9,
        backgroundColor: "#000000",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 16,
        position: "relative",
    },
    video: {
        width: "100%",
        height: "100%",
    },
    videoLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    videoErrorContainer: {
        width: "100%",
        height: "100%",
        backgroundColor: "#FFECB3",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    videoErrorText: {
        textAlign: "center",
        marginVertical: 12,
        color: "#333",
    },
    retryButton: {
        backgroundColor: "#FFA726",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    videoControls: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 8,
    },
    controlButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    disabledButton: {
        opacity: 0.5,
    },
    playButton: {
        width: 60,
        height: 60,
        backgroundColor: "#F7B316",
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
    },
    signDetailsContainer: {
        backgroundColor: "#F5F5F5",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    signTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 16,
        color: "#333",
    },
    translationContainer: {
        flexDirection: "row",
        marginBottom: 8,
        flexWrap: "wrap",
    },
    translationLabel: {
        fontSize: 16,
        fontWeight: "bold",
        marginRight: 8,
        color: "#666",
    },
    translationText: {
        fontSize: 16,
        color: "#333",
        flex: 1,
    },
    relatedSignsContainer: {
        marginTop: 12,
        marginBottom: 16,
    },
    relatedSignsLabel: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4,
        color: "#666",
    },
    relatedSignsText: {
        fontSize: 16,
        color: "#333",
    },
    markCompletedButton: {
        backgroundColor: "#F7B316",
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 16,
        flexDirection: "row",
    },
    alreadyCompletedButton: {
        backgroundColor: "#4CAF50",
    },
    markCompletedButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    navigationButtonsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16,
    },
    navigationButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
    },
    prevButton: {
        alignSelf: "flex-start",
    },
    nextButton: {
        alignSelf: "flex-end",
    },
    navigationButtonText: {
        fontSize: 16,
        color: "#4C9EFF",
        fontWeight: "500",
    },
});