// comprehensive_test.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:5000';
const AUDIO_FILE_PATH = path.join(__dirname, 'test_audio.mp3');

async function testHealthEndpoint() {
    try {
        console.log('Testing health endpoint...');
        const response = await axios.get(`${API_URL}/health`);
        console.log('Health endpoint response:', response.data);
        console.log('Health endpoint test: PASSED ✅');
        return true;
    } catch (error) {
        console.error('Health endpoint test FAILED ❌');
        console.error('Error:', error.message);
        return false;
    }
}

async function testTranscriptionEndpoint() {
    try {
        console.log('Testing transcription endpoint...');
        console.log(`Using audio file: ${AUDIO_FILE_PATH}`);

        if (!fs.existsSync(AUDIO_FILE_PATH)) {
            console.error(`File not found: ${AUDIO_FILE_PATH}`);
            return false;
        }

        const formData = new FormData();
        formData.append('audio', fs.createReadStream(AUDIO_FILE_PATH));
        formData.append('language', 'en-US');

        console.log('Uploading file and waiting for transcription...');

        const response = await axios.post(`${API_URL}/api/transcribe`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 60000,
        });

        console.log('Transcription endpoint response:');
        console.log('Text:', response.data.text);
        console.log('Confidence:', response.data.confidence);
        console.log('Transcription endpoint test: PASSED ✅');
        return true;
    } catch (error) {
        console.error('Transcription endpoint test FAILED ❌');
        if (error.response) {
            console.error('Server response:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        return false;
    }
}

async function testSignTranslation() {
    try {
        console.log('Testing sign translation endpoint...');

        const testTexts = [
            "hello",
            "thank you",
            "please help me"
        ];

        let allPassed = true;

        for (const text of testTexts) {
            console.log(`Testing translation for: "${text}"`);

            const response = await axios.post(`${API_URL}/api/signs/translate`, {
                text: text,
                language: 'english'
            });

            console.log('Translation response:');
            console.log('Original text:', response.data.originalText);
            console.log('Signs found:', response.data.signs.length);

            if (response.data.signs.some(sign => !sign.notFound)) {
                console.log(`Translation for "${text}": PASSED ✅`);
            } else {
                console.log(`No signs found for "${text}": PARTIAL ⚠️`);
                allPassed = false;
            }
        }

        console.log('Sign translation endpoint test:', allPassed ? 'PASSED ✅' : 'PARTIAL ⚠️');
        return allPassed;
    } catch (error) {
        //console.error('Sign translation endpoint test FAILED ❌');
        if (error.response) {
            console.error('Server response:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        return false;
    }
}

async function runTests() {
    console.log('======= GestureConnect Backend Comprehensive Tests =======');

    const healthResult = await testHealthEndpoint();
    console.log('\n');

    const transcriptionResult = await testTranscriptionEndpoint();
    console.log('\n');

    const translationResult = await testSignTranslation();
    console.log('\n');

    console.log('======= Test Summary =======');
    console.log(`Health Endpoint: ${healthResult ? 'PASSED ✅' : 'FAILED ❌'}`);
    //console.log(`Transcription Endpoint: ${transcriptionResult ? 'PASSED ✅' : 'FAILED ❌'}`);
    //console.log(`Sign Translation Endpoint: ${translationResult ? 'PASSED ✅' : 'PARTIAL/FAILED ⚠️'}`);
    console.log('============================');
}

runTests();