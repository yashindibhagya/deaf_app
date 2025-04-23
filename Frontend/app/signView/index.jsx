import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    useWindowDimensions,
    ActivityIndicator,
    Platform
} from 'react-native';
import { Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export default function SignView() {
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const { sign, category, index } = useLocalSearchParams();

    const videoRef = useRef(null);
    const [signData, setSignData] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentSpeed, setCurrentSpeed] = useState(1.0);
    const [currentIndex, setCurrentIndex] = useState(parseInt(index) || 0);
    const [categoryData, setCategoryData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Parse sign data from params if available
        if (sign) {
            try {
                const signInfo = JSON.parse(sign);
                setSignData(signInfo);
                setIsLoading(false);
            } catch (error) {
                console.error("Error parsing sign data:", error);
                setError("Couldn't load sign data");
                setIsLoading(false);
            }
        } else {
            setError("No sign data provided");
            setIsLoading(false);
        }
    }, [sign]);

    const handlePrevious = () => {
        if (currentIndex > 0 && categoryData?.signs) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            setSignData(categoryData.signs[prevIndex]);
        } else {
            // No previous sign - could show message or just return
            router.back();
        }
    };

    const handleNext = () => {
        if (categoryData?.signs && currentIndex < categoryData.signs.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setSignData(categoryData.signs[nextIndex]);
        } else {
            // No next sign - could show message or just return
            router.back();
        }
    };

    const handleSpeedChange = () => {
        // Toggle speed between 0.5, 1.0, and 1.5
        const speeds = [0.5, 1.0, 1.5];
        const currentIndexInSpeeds = speeds.indexOf(currentSpeed);
        const nextIndex = (currentIndexInSpeeds + 1) % speeds.length;
        const newSpeed = speeds[nextIndex];

        setCurrentSpeed(newSpeed);

        // Apply speed to video if playing
        if (videoRef.current) {
            videoRef.current.setRateAsync(newSpeed, true);
        }
    };

    const togglePlayback = async () => {
        if (!videoRef.current) return;

        try {
            if (isPlaying) {
                await videoRef.current.pauseAsync();
                setIsPlaying(false);
            } else {
                await videoRef.current.playAsync();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error("Error toggling playback:", error);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4C9EFF" />
                    <Text>Loading sign language video...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={48} color="#F44336" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

            {/* Header with back button and title */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{category || "Alphabet"}</Text>
            </View>

            {/* Main video container */}
            <View style={styles.videoContainer}>
                <Video
                    ref={videoRef}
                    source={{ uri: signData?.videoUrl }}
                    style={styles.video}
                    useNativeControls={false}
                    resizeMode="contain"
                    isLooping={true}
                    onPlaybackStatusUpdate={(status) => {
                        if (status.isLoaded) {
                            setIsPlaying(status.isPlaying);
                        }
                    }}
                    rate={currentSpeed}
                />

                {/* Video control overlay */}
                <View style={styles.videoControls}>
                    <TouchableOpacity
                        style={styles.playPauseButton}
                        onPress={togglePlayback}
                    >
                        <MaterialIcons
                            name={isPlaying ? "pause" : "play-arrow"}
                            size={36}
                            color="#fff"
                        />
                    </TouchableOpacity>
                </View>

                {/* Current sign label at bottom of video */}
                <View style={styles.signLabel}>
                    <Text style={styles.signText}>{signData?.word || "A"}</Text>
                </View>
            </View>

            {/* Navigation section below video */}
            <View style={styles.navigationContainer}>
                {/* Current sign indicator */}
                <Text style={styles.currentSignText}>Current sign</Text>
                <Text style={styles.signLetter}>{signData?.word || "A"}</Text>

                {/* Previous/Next buttons */}
                <View style={styles.navButtonsContainer}>
                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={handlePrevious}
                    >
                        <MaterialIcons name="chevron-left" size={30} color="black" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={handleNext}
                    >
                        <MaterialIcons name="chevron-right" size={30} color="black" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tools section at bottom */}
            <View style={styles.toolsContainer}>
                <TouchableOpacity style={styles.toolButton} onPress={handleSpeedChange}>
                    <View style={styles.toolIconContainer}>
                        <MaterialIcons name="speed" size={24} color="#666" />
                    </View>
                    <Text style={styles.toolText}>Speed</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolButton}>
                    <View style={styles.toolIconContainer}>
                        <MaterialIcons name="quiz" size={24} color="#666" />
                    </View>
                    <Text style={styles.toolText}>Quiz</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolButton}>
                    <View style={styles.toolIconContainer}>
                        <MaterialIcons name="style" size={24} color="#666" />
                    </View>
                    <Text style={styles.toolText}>Flashcards</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        marginVertical: 10,
        textAlign: 'center',
        color: '#666',
    },
    backButtonLarge: {
        backgroundColor: '#4C9EFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 20,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        paddingVertical: 8,
        paddingRight: 16, // More touch area
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        marginRight: 40, // Balance the back button
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: '#fff',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoControls: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    playPauseButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signLabel: {
        position: 'absolute',
        bottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    signText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    navigationContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        alignItems: 'center',
    },
    currentSignText: {
        fontSize: 14,
        color: '#666',
    },
    signLetter: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 8,
    },
    navButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        marginTop: 8,
    },
    navButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
    },
    toolsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    toolButton: {
        alignItems: 'center',
    },
    toolIconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolText: {
        fontSize: 12,
        marginTop: 4,
        color: '#666',
    },
});