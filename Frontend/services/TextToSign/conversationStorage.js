/**
 * Conversation Storage Service
 * Handles saving, loading, and managing conversation history
 */
import * as FileSystem from 'expo-file-system';
import { doc, setDoc, collection, getDocs, deleteDoc, query, orderBy, limit, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';
import { MAX_RECENT_TRANSLATIONS } from './constants';

// Local storage file path
const STORAGE_PATH = FileSystem.documentDirectory + 'recentTranslations.json';

/**
 * Save a conversation to both Firestore (if authenticated) and local storage
 * 
 * @param {Object} conversation - The conversation data to save
 * @returns {Promise<Object>} The saved conversation with ID
 */
export const saveConversation = async (conversation) => {
    if (!conversation) {
        throw new Error('No conversation data provided');
    }

    try {
        // Generate an ID if not present
        const conversationWithId = {
            ...conversation,
            timestamp: conversation.timestamp || new Date().toISOString()
        };

        // If user is authenticated, save to Firestore
        if (auth.currentUser) {
            const conversationsRef = collection(db, "users", auth.currentUser.uid, "conversations");
            const newConversationRef = doc(conversationsRef);

            conversationWithId.id = newConversationRef.id;
            conversationWithId.userId = auth.currentUser.uid;

            await setDoc(newConversationRef, conversationWithId);
        }

        // Update local storage
        await updateLocalStorage(conversationWithId);

        return conversationWithId;
    } catch (error) {
        console.error('Failed to save conversation:', error);
        throw error;
    }
};

/**
 * Load recent conversations from Firestore and/or local storage
 * 
 * @param {number} limit - Maximum number of conversations to return
 * @returns {Promise<Array>} Array of recent conversations
 */
export const loadRecentConversations = async (maxLimit = MAX_RECENT_TRANSLATIONS) => {
    try {
        let conversations = [];

        // If user is authenticated, try to load from Firestore first
        if (auth.currentUser) {
            try {
                const conversationsRef = collection(db, "users", auth.currentUser.uid, "conversations");
                const q = query(conversationsRef, orderBy("timestamp", "desc"), limit(maxLimit));
                const querySnapshot = await getDocs(q);

                querySnapshot.forEach((doc) => {
                    conversations.push(doc.data());
                });
            } catch (error) {
                console.error('Error loading from Firestore:', error);
                // Fall back to local storage on error
            }
        }

        // If no conversations from Firestore or not authenticated, try local storage
        if (conversations.length === 0) {
            try {
                const storedData = await FileSystem.readAsStringAsync(STORAGE_PATH)
                    .catch(() => '[]');
                conversations = JSON.parse(storedData);
            } catch (error) {
                console.error('Error loading from local storage:', error);
                conversations = [];
            }
        }

        // Ensure well-formed data
        return conversations
            .filter(c => c && c.text) // Filter out invalid entries
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Sort by timestamp
            .slice(0, maxLimit); // Limit to specified maximum
    } catch (error) {
        console.error('Failed to load conversations:', error);
        return [];
    }
};

/**
 * Delete a conversation from both Firestore and local storage
 * 
 * @param {string} conversationId - ID of conversation to delete
 * @returns {Promise<Object>} The deleted conversation for undo functionality
 */
export const deleteConversation = async (conversationId) => {
    if (!conversationId) {
        throw new Error('No conversation ID provided');
    }

    try {
        // Find the conversation in local storage first
        const conversations = await loadRecentConversations();
        const index = conversations.findIndex(c => c.id === conversationId);

        if (index === -1) {
            throw new Error('Conversation not found');
        }

        // Store the deleted conversation for potential undo
        const deletedConversation = conversations[index];

        // Remove from array
        conversations.splice(index, 1);

        // Update local storage
        await FileSystem.writeAsStringAsync(
            STORAGE_PATH,
            JSON.stringify(conversations)
        );

        // If user is authenticated, delete from Firestore
        if (auth.currentUser && conversationId) {
            const conversationRef = doc(db, "users", auth.currentUser.uid, "conversations", conversationId);
            await deleteDoc(conversationRef);
        }

        return deletedConversation;
    } catch (error) {
        console.error('Failed to delete conversation:', error);
        throw error;
    }
};

/**
 * Restore a previously deleted conversation
 * 
 * @param {Object} conversation - The conversation to restore
 * @param {number} index - Original index position (optional)
 * @returns {Promise<void>}
 */
export const restoreConversation = async (conversation, index) => {
    if (!conversation) {
        throw new Error('No conversation data provided');
    }

    try {
        // Load current conversations
        const conversations = await loadRecentConversations();

        // Insert at specific index or add to beginning
        if (typeof index === 'number' && index >= 0 && index <= conversations.length) {
            conversations.splice(index, 0, conversation);
        } else {
            conversations.unshift(conversation);
        }

        // Update local storage
        await FileSystem.writeAsStringAsync(
            STORAGE_PATH,
            JSON.stringify(conversations.slice(0, MAX_RECENT_TRANSLATIONS))
        );

        // If user is authenticated and conversation has ID, restore to Firestore
        if (auth.currentUser && conversation.id) {
            const conversationRef = doc(
                db,
                "users",
                auth.currentUser.uid,
                "conversations",
                conversation.id
            );
            await setDoc(conversationRef, conversation);
        }
    } catch (error) {
        console.error('Failed to restore conversation:', error);
        throw error;
    }
};

/**
 * Clear all saved conversations
 * 
 * @returns {Promise<void>}
 */
export const clearAllConversations = async () => {
    try {
        // Clear local storage
        await FileSystem.writeAsStringAsync(STORAGE_PATH, '[]');

        // If user is authenticated, clear Firestore
        if (auth.currentUser) {
            const conversationsRef = collection(db, "users", auth.currentUser.uid, "conversations");
            const snapshot = await getDocs(conversationsRef);

            // Batch delete (Firebase has a limit of 500 operations per batch)
            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
    } catch (error) {
        console.error('Failed to clear conversations:', error);
        throw error;
    }
};

/**
 * Update local storage with new conversation
 * 
 * @param {Object} newConversation - The conversation to add
 * @returns {Promise<void>}
 */
const updateLocalStorage = async (newConversation) => {
    try {
        // Get existing conversations
        let conversations = [];
        try {
            const stored = await FileSystem.readAsStringAsync(STORAGE_PATH)
                .catch(() => '[]');
            conversations = JSON.parse(stored);
        } catch (error) {
            conversations = [];
        }

        // Filter out any existing versions of this conversation (by text)
        const filtered = conversations.filter(item =>
            item.text !== newConversation.text
        );

        // Add new conversation to the beginning
        const updated = [newConversation, ...filtered]
            .slice(0, MAX_RECENT_TRANSLATIONS);

        // Save back to local storage
        await FileSystem.writeAsStringAsync(
            STORAGE_PATH,
            JSON.stringify(updated)
        );
    } catch (error) {
        console.error('Failed to update local storage:', error);
        throw error;
    }
};

export default {
    saveConversation,
    loadRecentConversations,
    deleteConversation,
    restoreConversation,
    clearAllConversations
};