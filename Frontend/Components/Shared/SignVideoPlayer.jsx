import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * SignVideoPlayer component for playing sign language videos
 * with playback controls and completion tracking
 * 
 * @param {Object} props - Component props
 * @param {string} props.videoUrl - URL of the video to play
 * @param {string} props.title - Title of the sign/video
 * @param {Function} props.onComplete - Callback function when video is completed
 * @param {boolean} props.autoPlay - Whether to autoplay the video
 * @param {Function} props.onNext - Callback function to go to next video
 * @param {Function} props.onPrevious - Callback function to go to previous video
 * @param {boolean} props.showControls - Whether to show video controls
 * @param {boolean} props.isCompleted - Whether this chapter/sign is already completed
 */
const SignVideoPlayer = ({
    videoUrl,
    title,
    onComplete,
    autoPlay = false,
    onNext,
    onPrevious,
    showControls = true,
    isCompleted = false
}) => {
    const videoRef = useRef(null);
    const [status, setStatus] = useState({});
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [isLoading, setIsLoading] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [error, setError] = useState(null);

    // Load the video when the component mounts or videoUrl changes
    useEffect(() => {
        if (!videoUrl) return;

        setIsLoading(true);
        setError(null);

        const loadVideo = async () => {
            try {
                if (videoRef.current) {
                    // Unload any previous video
                    await videoRef.current.unloadAsync();

                    // Load the new video
                    await videoRef.current.loadAsync(
                        { uri: videoUrl },
                        { shouldPlay: autoPlay, progressUpdateIntervalMillis: 100 }
                    );

                    setIsPlaying(autoPlay);
                }
            } catch (err) {
                console.error('Error loading video:', err);
                setError('Failed to load video. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        loadVideo();
    }, [videoUrl, autoPlay]);

    // Handle video playback status updates
    const handlePlaybackStatusUpdate = (playbackStatus) => {
        setStatus(playbackStatus);

        // Auto-mark as completed when video finishes
        if (playbackStatus.didJustFinish && !isCompleted && onComplete) {
            onComplete();
        }

        if (playbackStatus.isLoaded) {
            setIsLoading(false);
        }
    };

    // Toggle play/pause
    const togglePlayPause = async () => {
        if (!videoRef.current) return;

        if (status.isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }

        setIsPlaying(!status.isPlaying);
    };

    // Replay video from the beginning
    const replayVideo = async () => {
        if (!videoRef.current) return;

        try {
            await videoRef.current.setPositionAsync(0);
            await videoRef.current.playAsync();
            setIsPlaying(true);
        } catch (err) {
            console.error('Error replaying video:', err);
        }
    };

    // Change playback speed
    const togglePlaybackSpeed = async () => {
        const speeds = [0.5, 1.0, 1.5, 2.0];
        const currentIndex = speeds.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % speeds.length;
        const newRate = speeds[nextIndex];

        if (videoRef.current) {
            try {
                await videoRef.current.setRateAsync(newRate, true);
                setPlaybackRate(newRate);
            } catch (err) {
                console.error('Error changing playback rate:', err);
            }
        }
    };

    return (
        <View style={styles.container}>
            {/* Video Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Video Player */}
            <View style={styles.videoContainer}>
                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#4C9EFF" />
                        <Text style={styles.loadingText}>Loading video...</Text>
                    </View>
                )}

                {error ? (
                    <View style={styles.errorContainer}>
                        <MaterialIcons name="error-outline" size={48} color="#D32F2F" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                setIsLoading(true);
                                setError(null);
                                // Reload the video
                                if (videoRef.current) {
                                    videoRef.current.loadAsync({ uri: videoUrl })
                                        .catch(err => {
                                            setError('Failed to load video. Please try again.');
                                            setIsLoading(false);
                                        });
                                }
                            }}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Video
                        ref={videoRef}
                        style={styles.video}
                        source={{ uri: videoUrl }}
                        resizeMode="contain"
                        useNativeControls={false}
                        isLooping={false}
                        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                        onLoad={() => setIsLoading(false)}
                        onError={(err) => {
                            console.error('Video error:', err);
                            setError('Failed to play video. Please try again.');
                            setIsLoading(false);
                        }}
                    />
                )}

                {/* Completion Badge */}
                {isCompleted && (
                    <View style={styles.completedBadge}>
                        <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                        <Text style={styles.completedText}>Completed</Text>
                    </View>
                )}
            </View>

            {/* Playback Controls */}
            {showControls && (
                <View style={styles.controlsContainer}>
                    <TouchableOpacity
                        style={[styles.controlButton, !onPrevious && styles.disabledButton]}
                        onPress={onPrevious}
                        disabled={!onPrevious}
                    >
                        <MaterialIcons
                            name="skip-previous"
                            size={28}
                            color={onPrevious ? "#4C9EFF" : "#CCCCCC"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.playPauseButton}
                        onPress={togglePlayPause}
                        disabled={isLoading || !!error}
                    >
                        <MaterialIcons
                            name={isPlaying ? "pause" : "play-arrow"}
                            size={32}
                            color="#FFFFFF"
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={replayVideo}
                        disabled={isLoading || !!error}
                    >
                        <MaterialIcons name="replay" size={28} color="#4C9EFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, !onNext && styles.disabledButton]}
                        onPress={onNext}
                        disabled={!onNext}
                    >
                        <MaterialIcons
                            name="skip-next"
                            size={28}
                            color={onNext ? "#4C9EFF" : "#CCCCCC"}
                        />
                    </TouchableOpacity>
                </View>
            )}

            {/* Playback Speed Button */}
            <TouchableOpacity
                style={styles.speedButton}
                onPress={togglePlaybackSpeed}
                disabled={isLoading || !!error}
            >
                <MaterialIcons name="speed" size={18} color="#666" />
                <Text style={styles.speedText}>{playbackRate}x</Text>
            </TouchableOpacity>

            {/* Mark Complete Button (only show if not completed yet) */}
            {!isCompleted && onComplete && (
                <TouchableOpacity
                    style={styles.completeButton}
                    onPress={onComplete}
                >
                    <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.completeButtonText}>Mark as Completed</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
        color: '#333',
    },
    videoContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    loadingText: {
        color: '#FFFFFF',
        marginTop: 12,
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        padding: 16,
    },
    errorText: {
        color: '#D32F2F',
        textAlign: 'center',
        marginVertical: 12,
    },
    retryButton: {
        backgroundColor: '#4C9EFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    completedBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 16,
    },
    completedText: {
        marginLeft: 4,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    controlButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    disabledButton: {
        opacity: 0.5,
    },
    playPauseButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#4C9EFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 16,
    },
    speedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        marginTop: 12,
    },
    speedText: {
        marginLeft: 4,
        fontWeight: 'bold',
        color: '#666',
    },
    completeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        marginTop: 16,
        alignSelf: 'center',
    },
    completeButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginLeft: 8,
    },
});

export default SignVideoPlayer;