import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    FlatList,
    Alert
} from 'react-native';
import { Video } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useVideo } from '../../context/VideoContext';
import Common from '../../Components/Container/Common';
import Button from '../../Components/Shared/Button';
import { transliterateToSinhalaScript } from '../utils/sinhalaTransliteratin';
import { transliterateToTamilScript } from '../utils/TamilTransliteration';
import { translateSinhalaToEnglish, translateTamilToEnglish } from '../utils/translationApi';

// Define common words that typically don't have sign language videos
const commonWordsWithoutSigns = [
    'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been',
    'and', 'or', 'but', 'if', 'of', 'at', 'by', 'for', 'with', 'about',
    'to', 'from', 'up', 'down', 'in', 'on', 'off', 'over', 'under',
    'this', 'that', 'these', 'those',
];

/**
 * TextToSign screen for translating text to sign language videos
 */
export default function TextToSign() {
    const { getSignVideoByWord, isLoading, markSignAsCompleted } = useVideo();

    const [inputText, setInputText] = useState('');
    const [sinhalaScript, setSinhalaScript] = useState('');
    const [tamilScript, setTamilScript] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [translatedSigns, setTranslatedSigns] = useState([]);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isTransliterating, setIsTransliterating] = useState(false);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [languageMode, setLanguageMode] = useState('sinhala'); // 'sinhala', 'tamil', or 'english'
    const [recentTranslations, setRecentTranslations] = useState([]);

    const videoRef = useRef(null);
    const scrollViewRef = useRef(null);

    // Convert input text to appropriate script as the user types
    const handleInputChange = (text) => {
        setInputText(text);

        if (text) {
            if (languageMode === 'sinhala') {
                const sinhalaText = transliterateToSinhalaScript(text);
                setSinhalaScript(sinhalaText);
                setTamilScript('');
            } else if (languageMode === 'tamil') {
                const tamilText = transliterateToTamilScript(text);
                setTamilScript(tamilText);
                setSinhalaScript('');
            } else {
                setSinhalaScript('');
                setTamilScript('');
            }
        } else {
            setSinhalaScript('');
            setTamilScript('');
        }
    };

    // Translate from source language to English
    const translateToEnglish = async (text) => {
        if (!text.trim()) return '';

        setIsTransliterating(true);
        try {
            let translatedText = '';

            // First do the translation
            switch (languageMode) {
                case 'sinhala':
                    translatedText = await translateSinhalaToEnglish(text);
                    break;
                case 'tamil':
                    translatedText = await translateTamilToEnglish(text);
                    break;
                default:
                    translatedText = text;
            }

            // Remove common words
            const filteredText = removeCommonWords(translatedText);

            setTranslatedText(filteredText);
            setIsTransliterating(false);
            return filteredText;
        } catch (error) {
            console.error("Translation error:", error);
            setIsTransliterating(false);
            Alert.alert(
                "Translation Error",
                "Failed to translate text. Please try again."
            );
            return '';
        }
    };

    // Helper function to remove common words from text
    const removeCommonWords = (text) => {
        if (!text) return '';
        const words = text.split(/\s+/);
        const filtered = words.filter(word => {
            // Keep words that are not in the common words list
            const cleanWord = word.toLowerCase().replace(/[.,!?;:()[\]{}'"]/g, "");
            return !commonWordsWithoutSigns.includes(cleanWord);
        });
        return filtered.join(' ');
    };

    // Handle text translation to sign videos
    const handleTranslate = async () => {
        if (!inputText.trim()) return;

        setIsTranslating(true);
        setTranslatedSigns([]);
        setCurrentVideoIndex(0);
        setIsPlaying(false);
        setVideoError(false);

        // Process text based on language mode
        let textToProcess = inputText;

        // If not in English mode, translate to English first
        if (languageMode !== 'english') {
            textToProcess = await translateToEnglish(inputText);
            if (!textToProcess) {
                setIsTranslating(false);
                return;
            }
        } else {
            // For English mode, apply the same filters (remove common words)
            textToProcess = removeCommonWords(inputText);
            setTranslatedText(textToProcess);
        }

        // Save to recent translations
        const newTranslation = {
            text: inputText,
            sinhalaScript: languageMode === 'sinhala' ? sinhalaScript : '',
            tamilScript: languageMode === 'tamil' ? tamilScript : '',
            translated: textToProcess,
            timestamp: new Date().toISOString(),
            language: languageMode
        };

        setRecentTranslations(prev => [newTranslation, ...prev.slice(0, 9)]);

        // Split the text into words, removing punctuation
        const words = textToProcess
            .replace(/[.,!?;:()[\]{}'"]/g, '')
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 0);

        // Process each word to find sign videos
        const signs = [];
        let hasValidSigns = false;

        for (const word of words) {
            const sign = getSignVideoByWord(word);

            if (sign && sign.videoUrl) {
                signs.push({
                    word: word,
                    videoUrl: sign.videoUrl,
                    signId: sign.signId,
                    notFound: false
                });
                hasValidSigns = true;
            } else {
                signs.push({
                    word: word,
                    notFound: true
                });
            }
        }

        setTranslatedSigns(signs);
        setIsTranslating(false);

        if (!hasValidSigns) {
            Alert.alert(
                "No Signs Available",
                "We don't have sign language videos for the words in your text."
            );
        } else {
            // Set first video to play
            setCurrentVideoIndex(signs.findIndex(sign => !sign.notFound));
            setTimeout(() => {
                setIsPlaying(true);
            }, 500);
        }

        // Scroll to bottom to show results
        setTimeout(() => {
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollToEnd({ animated: true });
            }
        }, 300);
    };

    // Toggle language mode between Sinhala, Tamil, and English
    const toggleLanguageMode = () => {
        setLanguageMode(prevMode => {
            if (prevMode === 'sinhala') return 'tamil';
            if (prevMode === 'tamil') return 'english';
            return 'sinhala';
        });

        // Reset state when changing language
        setInputText('');
        setSinhalaScript('');
        setTamilScript('');
        setTranslatedText('');
        setTranslatedSigns([]);
    };

    // Handle video playback status update
    const handleVideoStatusUpdate = (status) => {
        if (status.didJustFinish && isPlaying) {
            // Mark sign as completed if it has an ID
            const currentSign = translatedSigns[currentVideoIndex];
            if (currentSign && currentSign.signId) {
                markSignAsCompleted(currentSign.signId);
            }

            // Find next sign with a video
            let nextIndex = findNextVideoIndex(currentVideoIndex);
            if (nextIndex !== -1) {
                setCurrentVideoIndex(nextIndex);
            } else {
                // End of videos
                setIsPlaying(false);
            }
        }
    };

    // Find the next sign with a video
    const findNextVideoIndex = (currentIndex) => {
        for (let i = currentIndex + 1; i < translatedSigns.length; i++) {
            if (!translatedSigns[i].notFound) {
                return i;
            }
        }
        return -1;
    };

    // Find the previous sign with a video
    const findPrevVideoIndex = (currentIndex) => {
        for (let i = currentIndex - 1; i >= 0; i--) {
            if (!translatedSigns[i].notFound) {
                return i;
            }
        }
        return -1;
    };

    // Handle video error
    const handleVideoError = (error) => {
        console.error('Video playback error:', error);
        setVideoError(true);

        // Try to move to next video
        const nextIndex = findNextVideoIndex(currentVideoIndex);
        if (nextIndex !== -1) {
            setCurrentVideoIndex(nextIndex);
            setVideoError(false);
        } else {
            setIsPlaying(false);
        }
    };

    // Start playback of the current video
    const startPlayback = async () => {
        if (videoRef.current && translatedSigns.length > 0) {
            setIsPlaying(true);
            try {
                await videoRef.current.playAsync();
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

    // Play next video
    const playNextVideo = () => {
        const nextIndex = findNextVideoIndex(currentVideoIndex);
        if (nextIndex !== -1) {
            setCurrentVideoIndex(nextIndex);
            setVideoError(false);
        }
    };

    // Play previous video
    const playPrevVideo = () => {
        const prevIndex = findPrevVideoIndex(currentVideoIndex);
        if (prevIndex !== -1) {
            setCurrentVideoIndex(prevIndex);
            setVideoError(false);
        }
    };

    // Reset playback to beginning
    const resetPlayback = () => {
        const firstIndex = translatedSigns.findIndex(sign => !sign.notFound);
        if (firstIndex !== -1) {
            setCurrentVideoIndex(firstIndex);
            setVideoError(false);
            setIsPlaying(true);
        }
    };

    // Load previous translation
    const loadTranslation = (item) => {
        setInputText(item.text);
        setLanguageMode(item.language || 'sinhala');

        if (item.language === 'sinhala') {
            setSinhalaScript(item.sinhalaScript || '');
            setTamilScript('');
        } else if (item.language === 'tamil') {
            setTamilScript(item.tamilScript || '');
            setSinhalaScript('');
        } else {
            setSinhalaScript('');
            setTamilScript('');
        }

        // If we already have the translation, use it directly
        if (item.translated) {
            setTranslatedText(item.translated);
            handleTranslate();
        }
    };

    // Render a recent translation item
    const renderRecentItem = ({ item, index }) => (
        <TouchableOpacity
            style={styles.recentItem}
            onPress={() => loadTranslation(item)}
        >
            <View style={styles.recentItemContent}>
                {item.language === 'sinhala' && item.sinhalaScript ? (
                    <>
                        <Text style={styles.recentItemScript}>{item.sinhalaScript}</Text>
                        <Text style={styles.recentItemText} numberOfLines={1}>({item.text})</Text>
                    </>
                ) : item.language === 'tamil' && item.tamilScript ? (
                    <>
                        <Text style={styles.recentItemScript}>{item.tamilScript}</Text>
                        <Text style={styles.recentItemText} numberOfLines={1}>({item.text})</Text>
                    </>
                ) : (
                    <Text style={styles.recentItemText} numberOfLines={1}>{item.text}</Text>
                )}
                {(item.language === 'sinhala' || item.language === 'tamil') && item.translated && (
                    <Text style={styles.recentItemTranslated} numberOfLines={1}>
                        → {item.translated}
                    </Text>
                )}
            </View>
            <View style={[
                styles.languageIndicator,
                {
                    backgroundColor:
                        item.language === 'sinhala' ? '#4C9EFF' :
                            item.language === 'tamil' ? '#9C27B0' :
                                '#FF9800'  // English
                }
            ]}>
                <Text style={styles.languageIndicatorText}>
                    {item.language === 'sinhala' ? 'SI' :
                        item.language === 'tamil' ? 'TA' :
                            'EN'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeAreaView}>
                <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#155658" />
                    <Text>Loading sign language data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeAreaView}>
            <StatusBar backgroundColor="#D0F3DA" barStyle="dark-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.container}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Common />
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>Text to Sign Language</Text>
                        <TouchableOpacity
                            style={styles.languageToggle}
                            onPress={toggleLanguageMode}
                        >
                            <Text style={styles.languageToggleText}>
                                {languageMode === 'sinhala'
                                    ? 'Sinhala → English'
                                    : languageMode === 'tamil'
                                        ? 'Tamil → English'
                                        : 'English'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textInput}
                            placeholder={
                                languageMode === 'sinhala'
                                    ? "Type Sinhala words using English letters..."
                                    : languageMode === 'tamil'
                                        ? "Type Tamil words using English letters..."
                                        : "Enter English text to translate..."
                            }
                            value={inputText}
                            onChangeText={handleInputChange}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />

                        {/* Display Sinhala script as user types */}
                        {languageMode === 'sinhala' && sinhalaScript && (
                            <View style={styles.scriptContainer}>
                                <Text style={styles.scriptLabel}>Sinhala:</Text>
                                <Text style={styles.scriptText}>{sinhalaScript}</Text>
                            </View>
                        )}

                        {/* Display Tamil script as user types */}
                        {languageMode === 'tamil' && tamilScript && (
                            <View style={styles.scriptContainer}>
                                <Text style={styles.scriptLabel}>Tamil:</Text>
                                <Text style={styles.scriptText}>{tamilScript}</Text>
                            </View>
                        )}

                        {(languageMode === 'sinhala' || languageMode === 'tamil') && translatedText && (
                            <View style={styles.translatedTextContainer}>
                                <Text style={styles.scriptLabel}>English Translation:</Text>
                                <Text style={styles.translatedTextContent}>{translatedText}</Text>
                            </View>
                        )}

                        <Button
                            text={isTranslating || isTransliterating ? 'Translating...' : 'Translate'}
                            type="fill"
                            onPress={handleTranslate}
                            loading={isTranslating || isTransliterating}
                            disabled={!inputText.trim()}
                        />
                    </View>

                    {/* Results Section */}
                    {translatedSigns.length > 0 && (
                        <View style={styles.resultsContainer}>
                            <Text style={styles.resultsTitle}>Translation Results:</Text>

                            {/* Word chips to show the translated words */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.wordChipsContainer}
                            >
                                {translatedSigns.map((sign, index) => (
                                    <View
                                        key={`word-${index}`}
                                        style={[
                                            styles.wordChip,
                                            sign.notFound ? styles.wordChipNotFound : {},
                                            currentVideoIndex === index && isPlaying ? styles.wordChipActive : {}
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.wordChipText,
                                                sign.notFound ? styles.wordChipTextNotFound : {},
                                                currentVideoIndex === index && isPlaying ? styles.wordChipTextActive : {}
                                            ]}
                                        >
                                            {sign.word}
                                        </Text>
                                        {sign.notFound && (
                                            <Ionicons
                                                name="videocam-off"
                                                size={12}
                                                color="#D32F2F"
                                                style={styles.missingVideoIcon}
                                            />
                                        )}
                                    </View>
                                ))}
                            </ScrollView>

                            {/* Video Player */}
                            {translatedSigns.some(sign => !sign.notFound) ? (
                                <View style={styles.videoPlayerContainer}>
                                    {/* Now Playing section */}
                                    <Text style={styles.nowPlayingText}>
                                        Now signing:
                                    </Text>

                                    <Text style={styles.currentWordText}>
                                        {translatedSigns[currentVideoIndex]?.word || ""}
                                    </Text>

                                    <Text style={styles.videoCounter}>
                                        {currentVideoIndex + 1}/
                                        {translatedSigns.filter(sign => !sign.notFound).length}
                                    </Text>

                                    {videoError ? (
                                        <View style={styles.videoErrorContainer}>
                                            <Ionicons name="alert-circle" size={48} color="#D32F2F" />
                                            <Text style={styles.videoErrorText}>
                                                Unable to load video. Please try again or skip to the next word.
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.retryButton}
                                                onPress={() => {
                                                    setVideoError(false);
                                                    if (videoRef.current) {
                                                        videoRef.current.loadAsync({ uri: translatedSigns[currentVideoIndex].videoUrl });
                                                    }
                                                }}
                                            >
                                                <Text style={styles.retryButtonText}>Retry</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Video
                                            ref={videoRef}
                                            style={styles.videoPlayer}
                                            source={{ uri: translatedSigns[currentVideoIndex]?.videoUrl }}
                                            resizeMode="contain"
                                            useNativeControls={false}
                                            isLooping={false}
                                            shouldPlay={isPlaying}
                                            onPlaybackStatusUpdate={handleVideoStatusUpdate}
                                            onError={handleVideoError}
                                        />
                                    )}

                                    <View style={styles.videoControls}>
                                        <TouchableOpacity
                                            style={[styles.controlButton, findPrevVideoIndex(currentVideoIndex) === -1 && styles.disabledButton]}
                                            onPress={playPrevVideo}
                                            disabled={findPrevVideoIndex(currentVideoIndex) === -1}
                                        >
                                            <Ionicons name="play-skip-back" size={24} color="#4C9EFF" />
                                        </TouchableOpacity>

                                        {isPlaying ? (
                                            <TouchableOpacity style={styles.controlButton} onPress={stopPlayback}>
                                                <Ionicons name="pause" size={24} color="#4C9EFF" />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity style={styles.controlButton} onPress={startPlayback}>
                                                <Ionicons name="play" size={24} color="#4C9EFF" />
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            style={[styles.controlButton, findNextVideoIndex(currentVideoIndex) === -1 && styles.disabledButton]}
                                            onPress={playNextVideo}
                                            disabled={findNextVideoIndex(currentVideoIndex) === -1}
                                        >
                                            <Ionicons name="play-skip-forward" size={24} color="#4C9EFF" />
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.controlButton} onPress={resetPlayback}>
                                            <Ionicons name="refresh" size={24} color="#4C9EFF" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : translatedSigns.every(sign => sign.notFound) ? (
                                <View style={styles.missingVideoBanner}>
                                    <Ionicons name="information-circle" size={24} color="#D32F2F" />
                                    <Text style={styles.missingVideoText}>
                                        No sign language videos are available for the words in this translation.
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    )}

                    {/* Recent Translations */}
                    {recentTranslations.length > 0 && (
                        <>
                            <View style={styles.recentHeaderContainer}>
                                <Text style={styles.recentTitle}>Recent Translations</Text>
                                {recentTranslations.length > 1 && (
                                    <TouchableOpacity
                                        onPress={() => setRecentTranslations([])}
                                        style={styles.clearButton}
                                    >
                                        <Text style={styles.clearButtonText}>Clear All</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <FlatList
                                data={recentTranslations}
                                renderItem={renderRecentItem}
                                keyExtractor={(item, index) => `recent-${index}`}
                                style={styles.recentList}
                                scrollEnabled={false}
                            />
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeAreaView: {
        flex: 1,
        backgroundColor: "#D0F3DA",
    },
    keyboardView: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 25,
    },
    contentContainer: {
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#155658',
    },
    languageToggle: {
        backgroundColor: '#F7B316',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    languageToggleText: {
        color: '#fff',
        fontWeight: '500',
    },
    inputContainer: {
        marginBottom: 20,
    },
    textInput: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        borderWidth: 1,
        borderColor: '#DDD',
        marginBottom: 10,
    },
    scriptContainer: {
        backgroundColor: '#155658',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
    },
    scriptLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    scriptText: {
        fontSize: 16,
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    translatedTextContainer: {
        backgroundColor: '#155658',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
    },
    translatedTextContent: {
        color: '#fff',
        fontSize: 16,
    },
    resultsContainer: {
        marginTop: 20,
        marginBottom: 30,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#155658',
    },
    wordChipsContainer: {
        marginBottom: 15,
    },
    wordChip: {
        backgroundColor: '#155658',
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    wordChipNotFound: {
        backgroundColor: '#FFEBEE',
        borderColor: '#FFCDD2',
    },
    wordChipActive: {
        backgroundColor: '#2196F3',
    },
    wordChipText: {
        fontSize: 14,
        color: '#fff',
    },
    wordChipTextNotFound: {
        color: '#D32F2F',
    },
    wordChipTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    missingVideoIcon: {
        marginLeft: 5,
    },
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
    },
    nowPlayingText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    currentWordText: {
        fontWeight: 'bold',
        color: '#4C9EFF',
        fontSize: 18,
        marginBottom: 4,
    },
    videoCounter: {
        color: '#666',
        marginBottom: 8,
    },
    videoPlayer: {
        width: '100%',
        height: 250,
        borderRadius: 4,
        backgroundColor: '#E0E0E0',
        marginBottom: 12,
    },
    videoControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    controlButton: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    videoErrorContainer: {
        width: '100%',
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        borderRadius: 4,
        padding: 16,
        marginBottom: 12,
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
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    missingVideoBanner: {
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    missingVideoText: {
        color: '#D32F2F',
        marginLeft: 8,
        flex: 1,
    },
    recentHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    recentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#155658',
    },
    clearButton: {
        padding: 5,
    },
    clearButtonText: {
        color: '#4C9EFF',
        fontWeight: '500',
    },
    recentList: {
        maxHeight: 200,
    },
    recentItem: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 6,
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recentItemContent: {
        flex: 1,
        paddingRight: 8,
    },
    recentItemScript: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    recentItemText: {
        fontSize: 14,
        color: '#666',
    },
    recentItemTranslated: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    languageIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    languageIndicatorText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});