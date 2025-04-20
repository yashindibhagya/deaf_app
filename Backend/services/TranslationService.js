// backend/services/translationService.js
// This service handles translation between languages

// Language codes
const LANGUAGES = {
    ENGLISH: 'en',
    SINHALA: 'si',
    TAMIL: 'ta'
};

/**
 * Translates Sinhala text to English
 * Uses offline dictionary for reliable translation during development
 */
const translateSinhalaToEnglish = async (text) => {
    if (!text || !text.trim()) return '';

    try {
        // Simulate network delay for realistic UX
        await new Promise(resolve => setTimeout(resolve, 300));

        // Use offline dictionary (skip API calls for now)
        return offlineDictionaryTranslation(text.trim());
    } catch (error) {
        console.error("Translation error:", error);
        throw new Error("Failed to translate text");
    }
};

/**
 * Offline dictionary translation
 */
const offlineDictionaryTranslation = (text) => {
    // A dictionary of common Sinhala words (written in English) to English translation
    const sinhalaToEnglishDict = {
        // Greetings & Common Phrases
        "ayubowan": "hello",
        "istuti": "thank you",
        "kohomada": "how are you",
        "oba": "you",
        "mama": "i",
        "oyaa": "you",
        "subha udesanak": "good morning",
        "subha rathreeyak": "good night",

        // Actions
        "kanna": "eat",
        "bonna": "drink",
        "balanna": "look",
        "enna": "come",
        "yanna": "go",
        "indaganna": "sit",
        "natanna": "dance",

        // Family
        "amma": "mother",
        "ammaa": "mother",
        "thaththa": "father",
        "aiya": "brother",
        "akka": "sister",
        "malli": "younger brother",
        "nangi": "younger sister",
        "seeya": "grandfather",
        "aachchi": "grandmother",

        // Numbers
        "eka": "one",
        "deka": "two",
        "thuna": "three",
        "hatara": "four",
        "paha": "five",

        // Colors
        "rathu": "red",
        "nil": "blue",
        "kaha": "yellow",
        "sudu": "white",
        "kalu": "black",

        // Question Words
        "mokakda": "what",
        "kawda": "who",
        "koheda": "where",
        "aei": "why",
        "kohomada": "how"
    };

    // Simple word-by-word translation
    const words = text.toLowerCase().split(/\s+/);
    const translatedWords = words.map(word => {
        // Remove any punctuation
        const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

        // Look up in dictionary, return original if not found
        return sinhalaToEnglishDict[cleanWord] || cleanWord;
    });

    return translatedWords.join(' ');
};

/**
 * Translates Tamil text to English
 * Uses offline dictionary for reliable translation
 */
const translateTamilToEnglish = async (text) => {
    if (!text || !text.trim()) return '';

    try {
        // Simulate network delay for realistic UX
        await new Promise(resolve => setTimeout(resolve, 300));

        // Use simplified translation logic for now
        return text; // Replace with actual translation logic
    } catch (error) {
        console.error("Translation error:", error);
        throw new Error("Failed to translate text");
    }
};

/**
 * General translation function that determines source language and translates to target
 */
const translateToEnglish = async (text, sourceLanguage) => {
    switch (sourceLanguage.toLowerCase()) {
        case 'sinhala':
            return translateSinhalaToEnglish(text);
        case 'tamil':
            return translateTamilToEnglish(text);
        default:
            return text; // Already in English
    }
};

module.exports = {
    translateSinhalaToEnglish,
    translateTamilToEnglish,
    translateToEnglish,
    LANGUAGES
};