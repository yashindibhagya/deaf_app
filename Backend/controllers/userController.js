// backend/controllers/userController.js
const { db } = require('../config/firebaseConfig');

// Get user progress
exports.getUserProgress = async (req, res, next) => {
    try {
        const { uid } = req.user;

        // Get user progress from Firestore
        const progressSnapshot = await db.collection('users')
            .doc(uid)
            .collection('progress')
            .get();

        const progress = {};
        progressSnapshot.forEach(doc => {
            progress[doc.id] = doc.data();
        });

        res.status(200).json({ progress });
    } catch (error) {
        next(error);
    }
};

// Update user progress for a specific sign
exports.updateSignProgress = async (req, res, next) => {
    try {
        const { uid } = req.user;
        const { signId } = req.params;

        if (!signId) {
            return res.status(400).json({ error: 'Sign ID is required' });
        }

        // Update progress in Firestore
        await db.collection('users')
            .doc(uid)
            .collection('progress')
            .doc(signId)
            .set({
                completed: true,
                completedAt: new Date().toISOString()
            }, { merge: true });

        res.status(200).json({
            message: 'Progress updated successfully',
            signId
        });
    } catch (error) {
        next(error);
    }
};

// Save user conversation
exports.saveConversation = async (req, res, next) => {
    try {
        const { uid } = req.user;
        const { text, sinhalaScript, tamilScript, translated, language } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Create a new conversation document
        const conversationRef = db.collection('users')
            .doc(uid)
            .collection('conversations')
            .doc();

        await conversationRef.set({
            id: conversationRef.id,
            text,
            sinhalaScript: sinhalaScript || '',
            tamilScript: tamilScript || '',
            translated: translated || '',
            language: language || 'english',
            timestamp: new Date().toISOString(),
            userId: uid
        });

        res.status(201).json({
            message: 'Conversation saved successfully',
            conversationId: conversationRef.id
        });
    } catch (error) {
        next(error);
    }
};

// Get user conversations
exports.getConversations = async (req, res, next) => {
    try {
        const { uid } = req.user;

        // Get conversations from Firestore
        const conversationsSnapshot = await db.collection('users')
            .doc(uid)
            .collection('conversations')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        const conversations = [];
        conversationsSnapshot.forEach(doc => {
            conversations.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({ conversations });
    } catch (error) {
        next(error);
    }
};

// Delete a conversation
exports.deleteConversation = async (req, res, next) => {
    try {
        const { uid } = req.user;
        const { conversationId } = req.params;

        if (!conversationId) {
            return res.status(400).json({ error: 'Conversation ID is required' });
        }

        // Delete conversation from Firestore
        await db.collection('users')
            .doc(uid)
            .collection('conversations')
            .doc(conversationId)
            .delete();

        res.status(200).json({
            message: 'Conversation deleted successfully',
            conversationId
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;