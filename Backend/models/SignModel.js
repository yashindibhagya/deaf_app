// backend/models/signModel.js
const { db } = require('../config/firebaseConfig');

class SignModel {
    /**
     * Create a new sign
     * @param {Object} signData - The sign data
     * @returns {Promise} - The created sign
     */
    static async create(signData) {
        try {
            const signRef = db.collection('signs').doc();
            await signRef.set({
                ...signData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            return {
                id: signRef.id,
                ...signData
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get a sign by ID
     * @param {string} signId - The sign ID
     * @returns {Promise} - The sign
     */
    static async findById(signId) {
        try {
            const signDoc = await db.collection('signs').doc(signId).get();

            if (!signDoc.exists) {
                return null;
            }

            return {
                id: signDoc.id,
                ...signDoc.data()
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get signs by category
     * @param {string} category - The category
     * @returns {Promise} - Array of signs
     */
    static async findByCategory(category) {
        try {
            const signsSnapshot = await db.collection('signs')
                .where('category', '==', category)
                .get();

            const signs = [];
            signsSnapshot.forEach(doc => {
                signs.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return signs;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Find sign by word
     * @param {string} word - The word to search for
     * @returns {Promise} - The sign
     */
    static async findByWord(word) {
        try {
            if (!word) return null;

            const cleanWord = word.toLowerCase().trim();

            const signsSnapshot = await db.collection('signs')
                .where('word', '==', cleanWord)
                .limit(1)
                .get();

            if (signsSnapshot.empty) {
                return null;
            }

            const signDoc = signsSnapshot.docs[0];
            return {
                id: signDoc.id,
                ...signDoc.data()
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = SignModel;