import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';

const SignVideoPlayer = ({
    currentPlaylist,
    currentVideoIndex,
    setCurrentVideoIndex,
    isPlaying,
    setIsPlaying,
    translatedSigns,
    recordFailedVideoUrl
}) => {
    const videoRef = useRef(null);
    const [videoError, setVideoError] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.5);
    const retryCounter = useRef(0);
    const isLoadingVideo = useRef(false);

    // Enhanced video playback status update
    const handleVideoStatusUpdate = (status) => {
        if (status.didJustFinish && isPlaying) {
            // Move to the next video in the playlist
            const nextIndex = currentVideoIndex + 1;
            if (nextIndex < currentPlaylist.length) {
                setCurrentVideoIndex(nextIndex);
            } else {
                // End of playlist
                setIsPlaying(false);
            }
        }
    };

    // Enhanced video error handling
    const handleVideoError = (error) => {
        console.error('Video playback error:', error);
        setVideoError(true);

        // Extract the URL from the error if possible
        let errorUrl = '';
        try {
            if (error && error.error && error.error.uri) {
                errorUrl = error.error.uri;

                // Record this failed URL to avoid trying it again
                if (recordFailedVideoUrl) {
                    recordFailedVideoUrl(errorUrl);
                }
            }
        } catch (e) {
            console.error('Error extracting URL from error object:', e);
        }

        // Check if the error is a 404 (not found)
        const is404 = error && error.error && error.error.status === 404;

        if (is404) {
            // For 404 errors, just move to the next video
            if (currentVideoIndex < currentPlaylist.length - 1) {
                setTimeout(() => {
                    setCurrentVideoIndex(prevIndex => prevIndex + 1);
                }, 200);
            }
        } else {
            // For other errors, try to recover
            if (retryCounter.current < 2) {
                // Try to reload the current video up to 2 times
                retryCounter.current++;
                setTimeout(() => {
                    console.log(`Retrying video load attempt ${retryCounter.current}/2`);

                    // Try to reload the current video
                    if (videoRef.current && currentPlaylist.length > 0) {
                        videoRef.current.loadAsync(
                            { uri: currentPlaylist[currentVideoIndex] },
                            { shouldPlay: isPlaying, rate: playbackRate }
                        ).catch(err => {
                            console.error('Retry failed:', err);
                            // If retry fails, move to the next video
                            if (currentVideoIndex < currentPlaylist.length - 1) {
                                setCurrentVideoIndex(prevIndex => prevIndex + 1);
                            }
                        });
                    }
                }, 400);
            } else {
                // If we've exhausted retries, move to the next video
                if (currentVideoIndex < currentPlaylist.length - 1) {
                    setTimeout(() => {
                        retryCounter.current = 0; // Reset retry counter for next video
                        setCurrentVideoIndex(prevIndex => prevIndex + 1);
                    }, 200);
                }
            }
        }
    };

    // Start playback of the current video
    const startPlayback = async () => {
        if (videoRef.current) {
            setIsPlaying(true);
            try {
                await videoRef.current.playAsync();
                // Set the playback rate to faster speed
                await videoRef.current.setRateAsync(playbackRate, true);
            } catch (error) {
                console.error('Error starting playback:', error);
                handleVideoError(error);
            }
        }
    };

    // Stop playback
    const stopPlayback = async () => {
        if (videoRef.current) {
            setIsPlaying(false);
            try {
                await videoRef.current.pauseAsync();
            } catch (error) {
                console.error('Error stopping playback:', error);
            }
        }
    };

    // Reset playback to beginning
    const resetPlayback = async () => {
        setCurrentVideoIndex(0);
        retryCounter.current = 0; // Reset retry counter

        if (videoRef.current) {
            try {
                // First pause and unload any current video
                await videoRef.current.pauseAsync();
                await videoRef.current.unloadAsync();

                // Small delay to ensure clean unload
                await new Promise(resolve => setTimeout(resolve, 100));

                // Then load the first video
                if (currentPlaylist.length > 0) {
                    await videoRef.current.loadAsync(
                        { uri: currentPlaylist[0] },
                        { shouldPlay: true, rate: playbackRate }
                    );
                    setIsPlaying(true);
                }
            } catch (error) {
                console.error('Error resetting playback:', error);
                handleVideoError(error);
            }
        }
    };

    // Enhanced function to get the currently playing word
    const getCurrentWord = () => {
        if (!currentPlaylist.length || currentVideoIndex >= currentPlaylist.length) {
            return "";
        }

        // Get the URL of the currently playing video
        const currentUrl = currentPlaylist[currentVideoIndex];

        // Find the sign object that has this URL
        const sign = translatedSigns.find(sign => !sign.notFound && sign.videoUrl === currentUrl);

        // If this is a letter from a name
        if (sign && sign.isNameLetter) {
            // Find all the letters for this name (all signs with the same index)
            const lettersWithSameIndex = translatedSigns.filter(
                s => s.isNameLetter && s.index === sign.index
            );

            // If there are multiple letters for this name
            if (lettersWithSameIndex.length > 1) {
                const fullName = lettersWithSameIndex.map(l => l.word).join('');

                // Show which letter of the name we're on
                return `${sign.word} (${sign.letterPosition + 1}/${sign.nameLength} of "${fullName}")`;
            }

            return sign.word;
        }

        // If this is a single letter (not part of a name)
        if (sign && sign.isLetter) {
            return sign.word;
        }

        // If this is a name indicator
        if (sign && sign.isNameIndicator) {
            return sign.word === "🔤" ? "Name Indicator" : "End of Name";
        }

        // Regular word
        return sign ? sign.word : "";
    };

    // Load current video when it changes
    useEffect(() => {
        const loadCurrentVideo = async () => {
            // Prevent multiple concurrent loading attempts
            if (isLoadingVideo.current) return;

            // Only proceed if we have a valid video reference and playlist
            if (videoRef.current && currentPlaylist.length > 0 && currentVideoIndex < currentPlaylist.length) {
                isLoadingVideo.current = true;

                try {
                    // Get and validate the current video URL
                    const videoUrl = currentPlaylist[currentVideoIndex];

                    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
                        console.error(`Invalid video URL at index ${currentVideoIndex}:`, videoUrl);
                        setVideoError(true);

                        // Skip to next video if available
                        if (currentVideoIndex < currentPlaylist.length - 1) {
                            setCurrentVideoIndex(currentIndex => currentIndex + 1);
                        }
                        isLoadingVideo.current = false;
                        return;
                    }

                    // Reset error state
                    setVideoError(false);

                    // Unload any previous video completely
                    await videoRef.current.unloadAsync();

                    // Small delay to ensure clean slate for next video
                    await new Promise(resolve => setTimeout(resolve, 50));

                    // Use headers to improve caching and avoid network issues
                    const headers = {
                        'Cache-Control': 'max-age=3600',
                        'Pragma': 'no-cache'
                    };

                    // Load the new video with increased playback rate
                    await videoRef.current.loadAsync(
                        { uri: videoUrl, headers },
                        { shouldPlay: false, rate: playbackRate, progressUpdateIntervalMillis: 50 }
                    );

                    // Start playing after successful load
                    if (isPlaying) {
                        await videoRef.current.playAsync();
                        await videoRef.current.setRateAsync(playbackRate, true);
                    } else {
                        // If this is the first video, start playing automatically
                        if (currentVideoIndex === 0) {
                            setIsPlaying(true);
                            await videoRef.current.playAsync();
                            await videoRef.current.setRateAsync(playbackRate, true);
                        }
                    }

                    isLoadingVideo.current = false;
                } catch (error) {
                    console.error('Error loading video:', error);
                    setVideoError(true);
                    isLoadingVideo.current = false;

                    // Try to recover
                    handleVideoError(error);
                }
            } else {
                isLoadingVideo.current = false;
            }
        };

        loadCurrentVideo();
    }, [currentVideoIndex, currentPlaylist]);

    // Add auto-play when current video index changes
    useEffect(() => {
        if (currentPlaylist.length > 0 && !isPlaying) {
            // Start playing automatically when video changes
            setTimeout(() => {
                setIsPlaying(true);
            }, 300);
        }
    }, [currentVideoIndex, currentPlaylist]);

    return (
        <View style={styles.videoPlayerContainer}>
            {/* Now Playing section */}
            <Text style={styles.nowPlayingText}>
                Now signing:
            </Text>

            {/* Enhanced display for current word/letter */}
            <Text style={styles.currentWordText}>
                {getCurrentWord()}
            </Text>

            <Text style={{ color: '#666', marginTop: 4 }}>
                {currentVideoIndex + 1}/{currentPlaylist.length}
            </Text>

            {videoError ? (
                <View style={styles.videoErrorContainer}>
                    <MaterialIcons name="error-outline" size={48} color="#D32F2F" />
                    <Text style={styles.videoErrorText}>
                        Unable to load video. The video file may be missing or corrupted.
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            setVideoError(false);
                            retryCounter.current = 0;
                            // Try to reload the current video
                            if (videoRef.current && currentPlaylist.length > 0) {
                                videoRef.current.loadAsync(
                                    { uri: currentPlaylist[currentVideoIndex] },
                                    { shouldPlay: true }
                                ).catch(err => {
                                    console.error('Retry failed:', err);
                                    handleVideoError(err);
                                });
                            }
                        }}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>

                    {currentVideoIndex < currentPlaylist.length - 1 && (
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: '#4CAF50', marginTop: 8 }]}
                            onPress={() => {
                                retryCounter.current = 0;
                                setCurrentVideoIndex(prevIndex => prevIndex + 1);
                            }}
                        >
                            <Text style={styles.retryButtonText}>Next Word</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <Video
                    ref={videoRef}
                    style={styles.videoPlayer}
                    resizeMode="contain"
                    useNativeControls={false}
                    isLooping={false}
                    shouldPlay={isPlaying}
                    rate={playbackRate} // Set playback speed
                    onPlaybackStatusUpdate={handleVideoStatusUpdate}
                    onError={handleVideoError}
                    // Use a source prop with a key to force refresh when URL changes
                    source={currentPlaylist[currentVideoIndex] ? {
                        uri: currentPlaylist[currentVideoIndex],
                        // Add a timestamp to prevent caching issues
                        headers: { 'Cache-Control': 'max-age=3600' }
                    } : undefined}
                />
            )}

            <View style={styles.videoControls}>
                {isPlaying ? (
                    <TouchableOpacity style={styles.controlButton} onPress={stopPlayback}>
                        <Text style={styles.controlButtonText}>Pause</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.controlButton} onPress={startPlayback}>
                        <Text style={styles.controlButtonText}>Play</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.controlButton} onPress={resetPlayback}>
                    <Text style={styles.controlButtonText}>Restart</Text>
                </TouchableOpacity>

                {currentVideoIndex < currentPlaylist.length - 1 && !videoError && (
                    <TouchableOpacity
                        style={[styles.controlButton, { backgroundColor: '#4CAF50' }]}
                        onPress={() => {
                            retryCounter.current = 0;
                            setCurrentVideoIndex(currentIndex => currentIndex + 1);
                        }}
                    >
                        <Text style={styles.controlButtonText}>Next</Text>
                    </TouchableOpacity>
                )}

                {/* Display the current playback speed */}
                <View style={styles.speedIndicator}>
                    <Text style={styles.speedIndicatorText}>{playbackRate}x</Text>
                </View>
            </View>

            {/* Video progress indicator */}
            <View style={styles.progressContainer}>
                <View
                    style={[
                        styles.progressBar,
                        { width: `${(currentVideoIndex / Math.max(currentPlaylist.length - 1, 1)) * 100}%` }
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    videoPlayerContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginTop: 10
    },
    nowPlayingText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    currentWordText: {
        fontWeight: 'bold',
        color: '#4C9EFF',
        fontSize: 16,
    },
    videoPlayer: {
        width: '100%',
        height: 250,
        borderRadius: 4,
        backgroundColor: '#E0E0E0',
    },
    videoControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 12,
    },
    controlButton: {
        backgroundColor: '#4C9EFF',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 8,
        alignItems: 'center',
    },
    controlButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    speedIndicator: {
        backgroundColor: '#155658',
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginLeft: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    speedIndicatorText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    progressContainer: {
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        marginTop: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4C9EFF',
        borderRadius: 2,
    },
    videoErrorContainer: {
        width: '100%',
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        borderRadius: 4,
        padding: 16,
    },
    videoErrorText: {
        color: '#D32F2F',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#4C9EFF',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default SignVideoPlayer;