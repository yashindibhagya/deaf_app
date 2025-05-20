// Backend/controllers/speechController.js
const geminiSpeechService = require('../services/geminiSpeechService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure multer for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create the uploads directory if it doesn't exist
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename
        const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueFileName);
    }
});

// Create multer upload instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limit to 10MB
    },
    fileFilter: function (req, file, cb) {
        // Accept only audio files
        const filetypes = /wav|mp3|m4a|ogg|webm|aac/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports audio files!"));
    }
}).single('audio');

// Controller for handling file uploads and recognition
exports.recognizeSpeechFromFile = async (req, res, next) => {
    // Use multer middleware
    upload(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            // Check if file exists
            if (!req.file) {
                return res.status(400).json({ error: 'No audio file uploaded' });
            }

            // Get language code from request
            const languageCode = req.body.languageCode || 'en-US';

            // Read file buffer
            const audioBuffer = fs.readFileSync(req.file.path);

            // Process with Gemini speech recognition service
            const transcription = await geminiSpeechService.recognizeSpeech(
                audioBuffer,
                languageCode
            );

            // Delete temporary file
            fs.unlinkSync(req.file.path);

            // Return the transcription
            res.status(200).json({
                success: true,
                transcript: transcription
            });
        } catch (error) {
            // Clean up file if it exists
            if (req.file && req.file.path) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }

            next(error);
        }
    });
};

// Controller for handling base64 audio data
exports.recognizeSpeechFromBase64 = async (req, res, next) => {
    try {
        const { audioBase64, languageCode } = req.body;

        // Validate input
        if (!audioBase64) {
            return res.status(400).json({ error: 'No audio data provided' });
        }

        // Process with Gemini speech recognition service
        const transcription = await geminiSpeechService.recognizeSpeechFromBase64(
            audioBase64,
            languageCode || 'en-US'
        );

        // Return the transcription
        res.status(200).json({
            success: true,
            transcript: transcription
        });
    } catch (error) {
        next(error);
    }
};