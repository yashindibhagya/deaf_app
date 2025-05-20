import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Share,
  TextInput,
  Alert
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { AntDesign, MaterialIcons, Ionicons } from "@expo/vector-icons";
import Common from "../../Components/Container/Common";
import Button from "../../Components/Shared/Button";
import SignLanguageCamera from "../../Components/SignLanguageCamera";
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';

// Firebase imports
import { doc, setDoc, collection, getDocs, deleteDoc, query, where, orderBy, limit, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';

/**
 * SignToText screen for translating sign language to text
 * Uses the SignLanguageCamera component for real-time sign language recognition
 */
export default function SignToText() {
  // Router for navigation
  const router = useRouter();

  // State for recognition
  const [translatedText, setTranslatedText] = useState("");
  const [detectedSigns, setDetectedSigns] = useState([]);
  const [translationHistory, setTranslationHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingInProgress, setRecordingInProgress] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [isSaved, setIsSaved] = useState(false);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [deletedConversation, setDeletedConversation] = useState(null);
  const undoTimerRef = useRef(null);

  // Load saved translations on component mount
  useEffect(() => {
    loadSavedTranslations();
  }, []);

  // Handle recording timeout
  useEffect(() => {
    if (recordingInProgress && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (recordingInProgress && timeRemaining === 0) {
      handleStopRecording();
    }
  }, [recordingInProgress, timeRemaining]);

  // Load saved translations from storage
  const loadSavedTranslations = async () => {
    try {
      // First try to load from local storage
      const savedTranslationsPath = FileSystem.documentDirectory + 'savedSignTranslations.json';
      const fileInfo = await FileSystem.getInfoAsync(savedTranslationsPath);

      if (fileInfo.exists) {
        const savedData = await FileSystem.readAsStringAsync(savedTranslationsPath);
        const parsedData = JSON.parse(savedData);
        setTranslationHistory(parsedData);
      }

      // If user is logged in, try to load from Firestore
      if (auth.currentUser) {
        const conversationsRef = collection(db, "users", auth.currentUser.uid, "signConversations");
        const snapshot = await getDocs(conversationsRef);

        if (!snapshot.empty) {
          const firestoreData = snapshot.docs.map(doc => doc.data());
          // Merge with local data, prioritizing Firestore data
          const mergedData = [...firestoreData];
          setTranslationHistory(mergedData);

          // Update local storage with merged data
          await FileSystem.writeAsStringAsync(
            savedTranslationsPath,
            JSON.stringify(mergedData)
          );
        }
      }
    } catch (error) {
      console.error("Error loading saved translations:", error);
    }
  };

  // Navigate to saved translations screen
  const navigateToSavedTranslations = () => {
    router.push('/savedTranslations');
  };

  // Start recording
  const handleStartRecording = () => {
    setRecordingInProgress(true);
    setTimeRemaining(10);
    setTranslatedText("");
    setDetectedSigns([]);
    setIsSaved(false);
  };

  // Stop recording
  const handleStopRecording = () => {
    setRecordingInProgress(false);
    setIsProcessing(true);

    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false);

      // Create current conversation object
      const newConversation = {
        text: translatedText || "No translation available",
        timestamp: new Date(),
        signs: detectedSigns
      };

      setCurrentConversation(newConversation);
    }, 2000);
  };

  // Handle real-time translation update
  const handleTranslationUpdate = (text, signs) => {
    if (text && text.trim() !== "") {
      setTranslatedText(text);
      setDetectedSigns(signs);
    }
  };

  // Handle translation completion
  const handleTranslationComplete = (text, signs) => {
    if (text && text.trim() !== "") {
      setTranslatedText(text);
      setDetectedSigns(signs);

      // Create current conversation object
      const newConversation = {
        text: text,
        timestamp: new Date(),
        signs: signs
      };

      setCurrentConversation(newConversation);
    }
  };

  // Reset the translation
  const resetTranslation = () => {
    setTranslatedText("");
    setDetectedSigns([]);
    setIsSaved(false);
    setCurrentConversation(null);
  };

  // Save the current translation
  const saveTranslation = async () => {
    if (!currentConversation) return;

    try {
      if (auth.currentUser) {
        // Firebase is available and user is logged in
        const conversationsRef = collection(db, "users", auth.currentUser.uid, "signConversations");
        const newConversationRef = doc(conversationsRef);

        // Prepare the data to save
        const conversationData = {
          ...currentConversation,
          id: newConversationRef.id,
          userId: auth.currentUser.uid
        };

        // Save to Firestore
        await setDoc(newConversationRef, conversationData);

        // Update local state
        const newHistory = [
          conversationData,
          ...translationHistory.filter(item =>
            item.text !== currentConversation.text ||
            item.timestamp !== currentConversation.timestamp
          )
        ].slice(0, 10);

        setTranslationHistory(newHistory);
        setIsSaved(true);

        // Also save to local storage as backup
        await FileSystem.writeAsStringAsync(
          FileSystem.documentDirectory + 'savedSignTranslations.json',
          JSON.stringify(newHistory)
        );

        Alert.alert("Success", "Translation saved successfully!");
      } else {
        // Fall back to local storage if no user is logged in
        const newHistory = [
          currentConversation,
          ...translationHistory.filter(item =>
            item.text !== currentConversation.text ||
            item.timestamp !== currentConversation.timestamp
          )
        ].slice(0, 10);

        setTranslationHistory(newHistory);
        setIsSaved(true);

        await FileSystem.writeAsStringAsync(
          FileSystem.documentDirectory + 'savedSignTranslations.json',
          JSON.stringify(newHistory)
        );

        Alert.alert("Success", "Translation saved to device!");
      }
    } catch (error) {
      console.error("Error saving translation:", error);
      Alert.alert("Error", "Failed to save translation. Please try again.");
    }
  };

  // Delete a saved translation
  const deleteTranslation = async (index) => {
    try {
      const itemToDelete = translationHistory[index];

      // Store the deleted item and its index for potential undo
      setDeletedConversation({
        item: itemToDelete,
        index: index
      });

      // Create a new array without the item to delete
      const updatedHistory = [
        ...translationHistory.slice(0, index),
        ...translationHistory.slice(index + 1)
      ];

      // Update state
      setTranslationHistory(updatedHistory);

      if (auth.currentUser && itemToDelete.id) {
        // Delete from Firestore if user is logged in and the item has an ID
        const conversationRef = doc(db, "users", auth.currentUser.uid, "signConversations", itemToDelete.id);
        await deleteDoc(conversationRef);
      }

      // Also update local storage
      await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + 'savedSignTranslations.json',
        JSON.stringify(updatedHistory)
      );

      // Show undo toast
      setShowUndoToast(true);

      // Clear any existing timer
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }

      // Set timer to hide toast after 3 seconds
      undoTimerRef.current = setTimeout(() => {
        setShowUndoToast(false);
        setDeletedConversation(null);
      }, 3000);

    } catch (error) {
      console.error("Error deleting translation:", error);
      Alert.alert("Error", "Failed to delete translation. Please try again.");
    }
  };

  // Undo delete
  const undoDelete = async () => {
    if (!deletedConversation) return;

    try {
      // Create a new array with the deleted item restored
      const restoredHistory = [...translationHistory];
      restoredHistory.splice(
        deletedConversation.index,
        0,
        deletedConversation.item
      );

      // Update state
      setTranslationHistory(restoredHistory);

      // Restore to Firestore if user is logged in and the item has an ID
      if (auth.currentUser && deletedConversation.item.id) {
        const conversationRef = doc(
          db,
          "users",
          auth.currentUser.uid,
          "signConversations",
          deletedConversation.item.id
        );
        await setDoc(conversationRef, deletedConversation.item);
      }

      // Also update local storage
      await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + 'savedSignTranslations.json',
        JSON.stringify(restoredHistory)
      );

      // Clear undo state
      setShowUndoToast(false);
      setDeletedConversation(null);

      // Clear timer
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }

    } catch (error) {
      console.error("Error restoring translation:", error);
    }
  };

  // Share the translation
  const shareTranslation = async () => {
    if (!translatedText) return;

    try {
      await Share.share({
        message: `Sign Language Translation: ${translatedText}`,
      });
    } catch (error) {
      console.error("Error sharing translation:", error);
    }
  };

  // Format timestamp for history
  const formatTime = (date) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for history
  const formatDate = (date) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <Common />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Sign Language to Text</Text>
          <Text style={styles.subtitle}>
            Record yourself signing and get a text translation
          </Text>

          {/* Saved translations button */}
          <TouchableOpacity
            style={styles.savedButton}
            onPress={navigateToSavedTranslations}
          >
            <MaterialIcons name="history" size={20} color="#155658" />
            <Text style={styles.savedButtonText}>View Saved Translations</Text>
          </TouchableOpacity>
        </View>

        {/* Camera always visible at the top */}
        <View style={styles.cameraContainer}>
          <SignLanguageCamera
            onTranslationUpdate={handleTranslationUpdate}
            onTranslationComplete={handleTranslationComplete}
            isRecording={recordingInProgress}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />

          {/* Recording timer overlay */}
          {recordingInProgress && (
            <View style={styles.timerOverlay}>
              <Text style={styles.timerText}>Recording: {timeRemaining}s</Text>
            </View>
          )}
        </View>

        {/* Translation textbox below camera */}
        <View style={styles.translationBoxContainer}>
          <Text style={styles.translationLabel}>Translation:</Text>

          {isProcessing ? (
            <View style={styles.processingContainer}>
              <AntDesign name="loading1" size={24} color="#155658" style={styles.loadingIcon} />
              <Text style={styles.processingText}>Processing sign language...</Text>
            </View>
          ) : (
            <View style={styles.textBoxContainer}>
              <TextInput
                style={styles.translationTextBox}
                value={translatedText}
                multiline
                editable={false}
                placeholder="Translations will appear here after recording..."
                placeholderTextColor="#999"
              />
            </View>
          )}

          <View style={styles.actionButtons}>
            <Button
              text="Clear"
              onPress={resetTranslation}
              type="outline"
              style={styles.actionButton}
              disabled={isProcessing || recordingInProgress}
            />

            <TouchableOpacity
              style={[styles.actionIconButton, (!translatedText || isSaved) && styles.disabledButton]}
              onPress={saveTranslation}
              disabled={!translatedText || isSaved || isProcessing || recordingInProgress}
            >
              <MaterialIcons
                name={isSaved ? "check" : "save"}
                size={20}
                color={(!translatedText || isSaved) ? "#aaa" : "#155658"}
              />
              <Text style={[styles.actionButtonText, (!translatedText || isSaved) && styles.disabledText]}>
                {isSaved ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionIconButton, !translatedText && styles.disabledButton]}
              onPress={shareTranslation}
              disabled={!translatedText || isProcessing || recordingInProgress}
            >
              <MaterialIcons
                name="share"
                size={20}
                color={!translatedText ? "#aaa" : "#155658"}
              />
              <Text style={[styles.actionButtonText, !translatedText && styles.disabledText]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent signs detected */}
        {detectedSigns.length > 0 && (
          <View style={styles.recentSignsContainer}>
            <Text style={styles.recentSignsLabel}>Detected Signs:</Text>
            <View style={styles.signBadgesContainer}>
              {detectedSigns.slice(-8).map((sign, index) => (
                <View
                  key={index}
                  style={[
                    styles.signBadge,
                    index === detectedSigns.length - 1 && styles.lastSignBadge
                  ]}
                >
                  <Text style={styles.signBadgeText}>{sign}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent translations section */}
        {translationHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Translations</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => Alert.alert("Info", "View all saved translations in the Saved tab")}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <AntDesign name="right" size={14} color="#155658" />
              </TouchableOpacity>
            </View>

            {translationHistory.slice(0, 3).map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyItemHeader}>
                  <Text style={styles.historyTime}>
                    {formatDate(item.timestamp)} at {formatTime(item.timestamp)}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteTranslation(index)}
                  >
                    <AntDesign name="close" size={16} color="#999" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.historyText}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Undo delete toast */}
        {showUndoToast && (
          <View style={styles.undoToast}>
            <Text style={styles.undoToastText}>Translation deleted</Text>
            <TouchableOpacity onPress={undoDelete}>
              <Text style={styles.undoButton}>UNDO</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Add bottom padding for scrolling */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D0F3DA",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  headerContainer: {
    paddingTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#155658",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  savedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  savedButtonText: {
    color: "#155658",
    marginLeft: 5,
    fontWeight: "500",
  },
  cameraContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#333",
    marginBottom: 20,
    position: "relative",
  },
  timerOverlay: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  timerText: {
    color: "#fff",
    fontWeight: "bold",
  },
  translationBoxContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  translationLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#155658",
    marginBottom: 10,
  },
  processingContainer: {
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingIcon: {
    marginBottom: 10,
  },
  processingText: {
    color: "#155658",
    fontSize: 16,
  },
  textBoxContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    padding: 10,
    marginBottom: 15,
    minHeight: 100,
  },
  translationTextBox: {
    fontSize: 18,
    color: "#333",
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    marginRight: 10,
  },
  actionIconButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginLeft: 5,
  },
  actionButtonText: {
    color: "#155658",
    marginLeft: 5,
    fontWeight: "500",
  },
  disabledButton: {
    backgroundColor: "#f0f0f0",
  },
  disabledText: {
    color: "#aaa",
  },
  recentSignsContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  recentSignsLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#155658",
    marginBottom: 10,
  },
  signBadgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  signBadge: {
    backgroundColor: "#E0F2F1",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    margin: 3,
  },
  lastSignBadge: {
    backgroundColor: "#26A69A",
  },
  signBadgeText: {
    color: "#155658",
    fontSize: 12,
    fontWeight: "bold",
  },
  historyContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginTop: 5,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#155658",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    color: "#155658",
    fontSize: 14,
    marginRight: 5,
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  historyTime: {
    fontSize: 12,
    color: "#999",
  },
  deleteButton: {
    padding: 5,
  },
  historyText: {
    fontSize: 14,
    color: "#333",
  },
  undoToast: {
    position: "absolute",
    bottom: 20,
    left: 25,
    right: 25,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 5,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  undoToastText: {
    color: "#fff",
    fontSize: 14,
  },
  undoButton: {
    color: "#4CAF50",
    fontWeight: "bold",
    fontSize: 14,
  },
  bottomPadding: {
    height: 60,
  }
});