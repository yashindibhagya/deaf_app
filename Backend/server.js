const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Add logging

// Setup file upload with multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// AssemblyAI API configuration
const assemblyAI = {
    baseUrl: "https://api.assemblyai.com/v2",
    headers: {
        authorization: "6413c2bb1dba48d19501dd62400a30ee", // Your API key
        "Content-Type": "application/json"
    }
};

// Endpoint to handle audio transcription
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const filePath = req.file.path;
        console.log(`Processing audio file: ${filePath}`);

        // Get language parameter or default to English
        const language = req.body.language || 'en-US';
        console.log(`Language selected: ${language}`);

        // Upload the audio file to Assembly AI
        const audioData = await fs.readFile(filePath);
        console.log(`File size: ${audioData.length} bytes`);

        const uploadResponse = await axios.post(
            `${assemblyAI.baseUrl}/upload`,
            audioData,
            { headers: assemblyAI.headers }
        );

        const audioUrl = uploadResponse.data.upload_url;
        console.log(`Audio uploaded successfully: ${audioUrl}`);

        // Start transcription
        const transcriptionOptions = {
            audio_url: audioUrl,
            language_code: language,
            punctuate: true,
            format_text: true
        };

        const transcriptionResponse = await axios.post(
            `${assemblyAI.baseUrl}/transcript`,
            transcriptionOptions,
            { headers: assemblyAI.headers }
        );

        const transcriptId = transcriptionResponse.data.id;
        console.log(`Transcription started with ID: ${transcriptId}`);

        const pollingEndpoint = `${assemblyAI.baseUrl}/transcript/${transcriptId}`;

        // Poll for transcription results
        let transcriptionResult;
        let maxRetries = 60; // 60 seconds timeout
        let retryCount = 0;

        while (true) {
            if (retryCount >= maxRetries) {
                throw new Error('Transcription timed out after 60 seconds');
            }

            const pollingResponse = await axios.get(pollingEndpoint, {
                headers: assemblyAI.headers
            });

            transcriptionResult = pollingResponse.data;
            console.log(`Transcription status: ${transcriptionResult.status}`);

            if (transcriptionResult.status === "completed") {
                break;
            } else if (transcriptionResult.status === "error") {
                throw new Error(`Transcription failed: ${transcriptionResult.error}`);
            } else {
                // Wait before checking again
                await new Promise(resolve => setTimeout(resolve, 1000));
                retryCount++;
            }
        }

        // Clean up - remove the temporary file
        await fs.remove(filePath);
        console.log(`Temporary file deleted: ${filePath}`);

        // Send the transcription back to the client
        res.json({
            text: transcriptionResult.text,
            words: transcriptionResult.words,
            confidence: transcriptionResult.confidence
        });

    } catch (error) {
        console.error('Error in transcription process:', error.message);

        // Clean up in case of error
        if (req.file && req.file.path) {
            try {
                await fs.remove(req.file.path);
                console.log(`Cleaned up file after error: ${req.file.path}`);
            } catch (cleanupErr) {
                console.error('Error cleaning up file:', cleanupErr);
            }
        }

        res.status(500).json({
            error: 'Transcription failed',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});