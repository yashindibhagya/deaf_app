import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVideo } from '../../context/VideoContext';
import Common from '../../Components/Container/Common';

// Import our new components
import InputSection from '../../Components/TextToSign/InputSection';
import TranslationControls from '../../Components/TextToSign/TranslationControls';
import SignVideoPlayer from '../../Components/TextToSign/SignVideoPlayer';
import WordChips from '../../Components/TextToSign/WordChips';
import RecentTranslations from '../../Components/TextToSign/RecentTranslations';
import VoiceRecorder from '../../Components/TextToSign/VoiceRecorder';
import UndoToast from '../../Components/TextToSign/UndoToast';

// Import our services
import translationService from '../../services/TextToSign/translationService';
import conversationStorage from '../../services/TextToSign/conversationStorage';
import wordProcessor from '../../services/TextToSign/wordProcessor';

export default function TextToSign() {
    const router = useRouter();
    const scrollViewRef = useRef(null);
    const { getSignVideoByWord, recordFailedVideoUrl } = useVideo();

    // State management
    const [inputText, setInputText] = useState('');
    const [sinhalaScript, setSinhalaScript] = useState('');
    const [tamilScript, setTamilScript] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [translatedSigns, setTranslatedSigns] = useState([]);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isTransliterating, setIsTransliterating] = useState(false);
    const [currentPlaylist, setCurrentPlaylist] = useState([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [playlistReady, setPlaylistReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recentTranslations, setRecentTranslations] = useState([]);
    const [languageMode, setLanguageMode] = useState('sinhala');
    const [isSaved, setIsSaved] = useState(false);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [deletedConversation, setDeletedConversation] = useState(null);
    const [showUndoToast, setShowUndoToast] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Translation handler
    const handleTranslate = async () => {
        if (!inputText.trim()) return;

        setIsTranslating(true);
        setPlaylistReady(false);
        setIsPlaying(false);
        setIsSaved(false);

        try {
            // Process text based on language mode
            const processedText = await translationService.processTextByLanguage(
                inputText,
                languageMode,
                setTranslatedText,
                setSinhalaScript,
                setTamilScript,
                setIsTransliterating
            );

            // Create conversation object
            const conversation = conversationStorage.createConversation(
                inputText,
                languageMode,
                sinhalaScript,
                tamilScript,
                processedText
            );
            setCurrentConversation(conversation);

            // Process tokens and build sign videos
            const { signs, playlist } = await wordProcessor.processTokens(
                inputText,
                getSignVideoByWord
            );

            setTranslatedSigns(signs);

            // Set up video playback if we have videos
            if (playlist.length > 0) {
                setCurrentPlaylist(playlist);
                setCurrentVideoIndex(0);
                setPlaylistReady(true);
                setTimeout(() => {
                    scrollToBottom();
                }, 500);
            }
        } catch (error) {
            console.error("Translation error:", error);
        } finally {
            setIsTranslating(false);
        }
    };

    // Load recent translations
    useEffect(() => {
        conversationStorage.loadRecentTranslations()
            .then(translations => setRecentTranslations(translations))
            .catch(error => console.error("Failed to load recent translations:", error));
    }, []);

    // Toggle language mode
    const toggleLanguageMode = () => {
        setLanguageMode(prevMode => {
            if (prevMode === 'sinhala') return 'tamil';
            if (prevMode === 'tamil') return 'english';
            return 'sinhala';
        });

        // Reset states
        setInputText('');
        setSinhalaScript('');
        setTamilScript('');
        setTranslatedText('');
        setTranslatedSigns([]);
        setPlaylistReady(false);
        setCurrentConversation(null);
        setIsSaved(false);
    };

    // Save conversation
    const saveConversation = async () => {
        if (!currentConversation) return;

        try {
            const updatedTranslations = await conversationStorage.saveConversation(
                currentConversation,
                recentTranslations
            );
            setRecentTranslations(updatedTranslations);
            setIsSaved(true);
        } catch (error) {
            console.error("Failed to save conversation:", error);
        }
    };

    // Delete conversation
    const deleteConversation = async (index) => {
        try {
            const result = await conversationStorage.deleteConversation(
                index,
                recentTranslations,
                setRecentTranslations
            );

            setDeletedConversation(result.itemToDelete);
            setShowUndoToast(true);

            // Set timer to hide toast after 3 seconds
            setTimeout(() => {
                setShowUndoToast(false);
                setDeletedConversation(null);
            }, 3000);
        } catch (error) {
            console.error("Failed to delete conversation:", error);
        }
    };

    // Undo delete
    const undoDelete = async () => {
        try {
            await conversationStorage.undoDelete(
                deletedConversation,
                recentTranslations,
                setRecentTranslations
            );
            setShowUndoToast(false);
            setDeletedConversation(null);
        } catch (error) {
            console.error("Failed to restore conversation:", error);
        }
    };

    // Scroll to bottom
    const scrollToBottom = () => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    };

    // Refresh handler
    const onRefresh = async () => {
        setRefreshing(true);

        // Reset states
        setInputText('');
        setSinhalaScript('');
        setTamilScript('');
        setTranslatedText('');
        setTranslatedSigns([]);
        setPlaylistReady(false);
        setCurrentConversation(null);
        setIsSaved(false);

        // Reload data
        await conversationStorage.loadRecentTranslations()
            .then(translations => setRecentTranslations(translations))
            .catch(error => console.error("Failed to load recent translations:", error));

        setRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#D0F3DA" barStyle="dark-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.container}
                keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={scrollToBottom}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#155658']}
                            tintColor={'#155658'}
                        />
                    }
                >
                    <Common />

                    {/* Input Section */}
                    <InputSection
                        inputText={inputText}
                        setInputText={setInputText}
                        sinhalaScript={sinhalaScript}
                        tamilScript={tamilScript}
                        translatedText={translatedText}
                        languageMode={languageMode}
                        toggleLanguageMode={toggleLanguageMode}
                        isTranslating={isTranslating}
                        isTransliterating={isTransliterating}
                        handleTranslate={handleTranslate}
                    />

                    {/* Voice Recorder */}
                    <VoiceRecorder
                        languageMode={languageMode}
                        setInputText={setInputText}
                        setSinhalaScript={setSinhalaScript}
                        setTamilScript={setTamilScript}
                        handleTranslate={handleTranslate}
                    />

                    {/* Translation Results */}
                    {translatedSigns.length > 0 && (
                        <>
                            <WordChips
                                translatedSigns={translatedSigns}
                                currentPlaylist={currentPlaylist}
                                currentVideoIndex={currentVideoIndex}
                                isPlaying={isPlaying}
                            />

                            {/* Save Button */}
                            {currentConversation && !isSaved && (
                                <TranslationControls
                                    saveConversation={saveConversation}
                                    isSaved={isSaved}
                                />
                            )}

                            {/* Video Player */}
                            {playlistReady && currentPlaylist.length > 0 && (
                                <SignVideoPlayer
                                    currentPlaylist={currentPlaylist}
                                    currentVideoIndex={currentVideoIndex}
                                    setCurrentVideoIndex={setCurrentVideoIndex}
                                    isPlaying={isPlaying}
                                    setIsPlaying={setIsPlaying}
                                    translatedSigns={translatedSigns}
                                    recordFailedVideoUrl={recordFailedVideoUrl}
                                />
                            )}
                        </>
                    )}

                    {/* Recent Translations */}
                    <RecentTranslations
                        recentTranslations={recentTranslations}
                        deleteConversation={deleteConversation}
                        setInputText={setInputText}
                        setLanguageMode={setLanguageMode}
                        setSinhalaScript={setSinhalaScript}
                        setTamilScript={setTamilScript}
                        setTranslatedText={setTranslatedText}
                        handleTranslate={handleTranslate}
                    />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Undo Toast */}
            {showUndoToast && (
                <UndoToast
                    undoDelete={undoDelete}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#D0F3DA',
    },
    container: {
        flex: 1,
        padding: 25,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
        flexGrow: 1,
    }
});