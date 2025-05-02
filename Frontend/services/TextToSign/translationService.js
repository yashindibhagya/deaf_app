import {
    translateSinhalaToEnglish,
    translateTamilToEnglish,
    translateText,
    LANGUAGES
} from '../../app/utils/translationApi';
import { transliterateToSinhalaScript } from '../../app/utils/sinhalaTransliteration';
import { transliterateToTamilScript } from '../../app/utils/TamilTransliteration';
import constants from './constants';

/**
 * Process text based on language mode and update state accordingly
 * 
 * @param {string} text - Input text to process
 * @param {string} languageMode - Current language mode (sinhala, tamil, english)
 * @param {Function} setTranslatedText - State setter for translated text
 * @param {Function} setSinhalaScript - State setter for Sinhala script
 * @param {Function} setTamilScript - State setter for Tamil script
 * @param {Function} setIsTransliterating - State setter for transliteration status
 * @returns {Promise<string>} - Processed text for sign language
 */
const processTextByLanguage = async (
    text,
    languageMode,
    setTranslatedText,
    setSinhalaScript,
    setTamilScript,
    setIsTransliterating
) => {
    if (!text.trim()) return '';

    let textToProcess = text;

    // If not in English mode, translate to English first
    if (languageMode !== 'english') {
        setIsTransliterating(true);
        try {
            let translatedText = '';

            // First do the translation
            switch (languageMode) {
                case 'sinhala':
                    translatedText = await translateSinhalaToEnglish(text);
                    break;
                case 'tamil':
                    translatedText = await translateTamilToEnglish(text);
                    break;
                default:
                    translatedText = text;
            }

            // Process the translated text based on input pattern
            const hasSpacedLetterInput = hasSpacedLetters(text.split(/\s+/).filter(t => t.length > 0));

            if (hasSpacedLetterInput) {
                // If original input had spaced letters, combine them in the translation
                const translatedTokens = translatedText.split(/\s+/).filter(t => t.length > 0);
                const combinedTokens = combineSpacedLetters(translatedTokens);
                translatedText = combinedTokens.join(' ');
            }

            // Remove common words
            translatedText = removeCommonWords(translatedText);

            setTranslatedText(translatedText);
            setIsTransliterating(false);
            textToProcess = translatedText;
        } catch (error) {
            console.error("Translation error:", error);
            setIsTransliterating(false);
            // Use original text if translation fails
            textToProcess = text;
        }
    } else {
        // For English mode, apply the same filters (remove common words)
        textToProcess = removeCommonWords(text);
        setTranslatedText(textToProcess);
    }

    return textToProcess;
};

/**
 * Check if input has spaced letters pattern
 * 
 * @param {Array<string>} tokens - Array of input tokens
 * @returns {boolean} - True if input has spaced letters pattern
 */
const hasSpacedLetters = (tokens) => {
    if (tokens.length < 2) return false;

    const singleLetterCount = tokens.filter(token =>
        token.length === 1 && token.match(/[a-zA-Z]/)
    ).length;

    return singleLetterCount >= 2 && (singleLetterCount / tokens.length) > 0.5;
};

/**
 * Combine spaced letters into words
 * 
 * @param {Array<string>} tokens - Array of tokens to process
 * @returns {Array<string>} - Processed tokens with combined letters
 */
const combineSpacedLetters = (tokens) => {
    if (tokens.length <= 1) return tokens;

    const result = [];
    let currentWord = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.length === 1 && token.match(/[a-zA-Z]/)) {
            // This is a single letter, add to current word
            currentWord.push(token);
        } else {
            // This is a longer token (word)
            // If we had collected letters, add them as a combined word
            if (currentWord.length > 0) {
                result.push(currentWord.join(''));
                currentWord = [];
            }
            // Add the current token (word) to the result
            result.push(token);
        }
    }

    // Add any remaining letters as a word
    if (currentWord.length > 0) {
        result.push(currentWord.join(''));
    }

    return result;
};

/**
 * Remove common words from text that don't typically have sign language videos
 * 
 * @param {string} text - Input text
 * @returns {string} - Text with common words removed
 */
const removeCommonWords = (text) => {
    if (!text) return '';
    const words = text.split(/\s+/);
    const filtered = words.filter(word => {
        // Keep words that are not in the common words list
        const cleanWord = word.toLowerCase().replace(/[.,!?;:()[\]{}'"]/g, "");
        return !constants.commonWordsWithoutSigns.includes(cleanWord);
    });
    return filtered.join(' ');
};

export default {
    processTextByLanguage,
    hasSpacedLetters,
    combineSpacedLetters,
    removeCommonWords
};