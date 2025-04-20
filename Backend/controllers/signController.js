// backend/controllers/signController.js
const { db } = require('../config/firebaseConfig');
const translationService = require('../services/translationService');
const cloudinaryService = require('../services/cloudinaryService');

// Get all signs
exports.getAllSigns = async (req, res, next) => {
    try {
        const signsSnapshot = await db.collection('signs').get();
        const signs = [];

        signsSnapshot.forEach(doc => {
            signs.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({ signs });
    } catch (error) {
        next(error);
    }
};

// Get sign by ID
exports.getSignById = async (req, res, next) => {
    try {
        const { signId } = req.params;
        const signDoc = await db.collection('signs').doc(signId).get();

        if (!signDoc.exists) {
            return res.status(404).json({ error: 'Sign not found' });
        }

        res.status(200).json({
            sign: {
                id: signDoc.id,
                ...signDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get signs by category
exports.getSignsByCategory = async (req, res, next) => {
    try {
        const { category } = req.params;
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

        res.status(200).json({ signs });
    } catch (error) {
        next(error);
    }
};

// Translate text to sign
exports.translateTextToSign = async (req, res, next) => {
    try {
        const { text, language } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const sourceLang = language || 'english';
        let translatedText = text;

        // Translate to English if not already in English
        if (sourceLang !== 'english') {
            translatedText = await translationService.translateToEnglish(text, sourceLang);
        }

        // Find signs that match the translated text
        const words = translatedText.toLowerCase().split(/\s+/);
        const signPromises = words.map(async (word) => {
            // Find matching sign in database
            const signsSnapshot = await db.collection('signs')
                .where('word', '==', word)
                .limit(1)
                .get();

            if (!signsSnapshot.empty) {
                const signDoc = signsSnapshot.docs[0];
                return {
                    word,
                    signId: signDoc.id,
                    videoUrl: signDoc.data().videoUrl,
                    notFound: false
                };
            }

            return {
                word,
                notFound: true
            };
        });

        const signs = await Promise.all(signPromises);

        res.status(200).json({
            originalText: text,
            translatedText,
            signs
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;