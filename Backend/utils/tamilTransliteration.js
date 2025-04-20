// backend/utils/tamilTransliteration.js
/**
 * Transliterates English letters to Tamil Unicode characters
 * @param {string} text - Text written in English letters representing Tamil words
 * @returns {string} - The text converted to Tamil Unicode script
 */
const transliterateToTamilScript = (text) => {
    if (!text || !text.trim()) return '';

    // Tamil vowels mapping
    const tamilVowels = {
        "a": "அ",
        "aa": "ஆ",
        "i": "இ",
        "ee": "ஈ",
        "u": "உ",
        "oo": "ஊ",
        "e": "எ",
        "ae": "ஏ",
        "ai": "ஐ",
        "o": "ஒ",
        "oa": "ஓ",
        "au": "ஔ"
    };

    // Tamil consonants mapping
    const tamilConsonants = {
        "k": "க்",
        "g": "க்",
        "ng": "ங்",
        "c": "ச்",
        "s": "ச்",
        "j": "ஜ்",
        "ny": "ஞ்",
        "t": "ட்",
        "d": "ட்",
        "n": "ந்",
        "th": "த்",
        "dh": "த்",
        "nh": "ன்",
        "p": "ப்",
        "b": "ப்",
        "m": "ம்",
        "y": "ய்",
        "r": "ர்",
        "l": "ல்",
        "v": "வ்",
        "z": "ழ்",
        "L": "ள்",
        "R": "ற்",
        "N": "ண்",
        "sh": "ஷ்",
        "S": "ஸ்",
        "h": "ஹ்"
    };

    // Tamil vowel signs (used with consonants)
    const tamilVowelSigns = {
        "a": "",
        "aa": "ா",
        "i": "ி",
        "ee": "ீ",
        "u": "ு",
        "oo": "ூ",
        "e": "ெ",
        "ae": "ே",
        "ai": "ை",
        "o": "ொ",
        "oa": "ோ",
        "au": "ௌ"
    };

    let result = '';
    let i = 0;

    while (i < text.length) {
        // Check for spaces
        if (text[i] === ' ') {
            result += ' ';
            i++;
            continue;
        }

        let matched = false;

        // Check for vowels (longer ones first)
        for (const vowel of ["ee", "aa", "ae", "ai", "oa", "au", "oo", "a", "i", "u", "e", "o"]) {
            if (text.substring(i, i + vowel.length).toLowerCase() === vowel) {
                result += tamilVowels[vowel];
                i += vowel.length;
                matched = true;
                break;
            }
        }

        if (matched) continue;

        // Check for consonants followed by vowels
        for (const consonant of [
            "ng", "ny", "th", "dh", "nh", "sh",
            "k", "g", "c", "s", "j", "t", "d", "n", "p",
            "b", "m", "y", "r", "l", "v", "z", "L", "R", "N", "S", "h"
        ]) {
            if (text.substring(i, i + consonant.length).toLowerCase() === consonant) {
                const baseConsonant = tamilConsonants[consonant];

                // Check if followed by a vowel
                let vowelFound = false;
                for (const vowel of ["ee", "aa", "ae", "ai", "oa", "au", "oo", "a", "i", "u", "e", "o"]) {
                    if (text.substring(i + consonant.length, i + consonant.length + vowel.length).toLowerCase() === vowel) {
                        // For 'a' vowel, just add the consonant without vowel mark
                        if (vowel === "a") {
                            result += baseConsonant.substring(0, baseConsonant.length - 1); // Remove the virama (்)
                        } else {
                            // For other vowels, add consonant without virama + vowel mark
                            result += baseConsonant.substring(0, baseConsonant.length - 1) + tamilVowelSigns[vowel];
                        }
                        i += consonant.length + vowel.length;
                        vowelFound = true;
                        break;
                    }
                }

                // If no vowel, add the consonant with virama
                if (!vowelFound) {
                    result += baseConsonant;
                    i += consonant.length;
                }

                matched = true;
                break;
            }
        }

        // If no match, just add the character as is
        if (!matched) {
            result += text[i];
            i++;
        }
    }

    return result;
};

module.exports = { transliterateToTamilScript };