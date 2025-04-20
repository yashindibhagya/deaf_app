// backend/models/userModel.js
const { db } = require('../config/firebaseConfig');

class UserModel {
    /**
     * Create a new user
     * @param {string} uid - The user ID
     * @param {Object} userData - The user data
     * @returns {Promise} - The created user
     */
    static async create(uid, userData) {
        try {
            await db.collection('users').doc(uid).set({
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            return {
                uid,
                ...userData
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get a user by ID
     * @param {string} uid - The user ID
     * @returns {Promise} - The user
     */
    static async findById(uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();

            if (!userDoc.exists) {
                return null;
            }

            return {
                uid,
                ...userDoc.data()
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update user progress
     * @param {string} uid - The user ID
     * @param {string} signId - The sign ID
     * @returns {Promise} - Success status
     */
    static async updateProgress(uid, signId) {
        try {
            if (!uid || !signId) {
                throw new Error('User ID and Sign ID are required');
            }

            await db.collection('users')
                .doc(uid)
                .collection('progress')
                .doc(signId)
                .set({
                    completed: true,
                    completedAt: new Date().toISOString()
                }, { merge: true });

            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get user progress
     * @param {string} uid - The user ID
     * @returns {Promise} - User progress
     */
    static async getProgress(uid) {
        try {
            const progressSnapshot = await db.collection('users')
                .doc(uid)
                .collection('progress')
                .get();

            const progress = {};
            progressSnapshot.forEach(doc => {
                progress[doc.id] = doc.data();
            });

            return progress;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Save user conversation
     * @param {string} uid - The user ID
     * @param {Object} conversationData - The conversation data
     * @returns {Promise} - The saved conversation
     */
    static async saveConversation(uid, conversationData) {
        try {
            const conversationRef = db.collection('users')
                .doc(uid)
                .collection('conversations')
                .doc();

            const conversation = {
                ...conversationData,
                id: conversationRef.id,
                userId: uid,
                timestamp: new Date().toISOString()
            };

            await conversationRef.set(conversation);

            return conversation;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get user conversations
     * @param {string} uid - The user ID
     * @param {number} limit - Max number of conversations to return
     * @returns {Promise} - Array of conversations
     */
    static async getConversations(uid, limit = 10) {
        try {
            const conversationsSnapshot = await db.collection('users')
                .doc(uid)
                .collection('conversations')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            const conversations = [];
            conversationsSnapshot.forEach(doc => {
                conversations.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return conversations;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserModel;