import constants from './constants';

/**
 * Process tokens from input text and build sign videos
 * 
 * @param {string} inputText - Original user input
 * @param {Function} getSignVideoByWord - Function to get sign video by word
 * @returns {Promise<Object>} - Object containing signs and playlist
 */
const processTokens = async (inputText, getSignVideoByWord) => {
    // Split the text into words, ignoring punctuation
    const tokens = inputText
        .replace(constants.punctuationToIgnore, '') // Remove punctuation
        .trim()
        .split(/\s+/)
        .filter(token => token.length > 0);

    const signs = [];
    const missingWords = [];
    const skipped = [];
    const playlist = [];

    // Process each token (word or letter)
    for (let i = 0; i < tokens.length; i++) {
        const originalToken = tokens[i];
        const cleanToken = originalToken.toLowerCase().replace(constants.punctuationToIgnore, "");

        if (!cleanToken) continue; // Skip empty strings

        // Check if this is a common word that typically doesn't have a sign
        const isCommonWord = constants.commonWordsWithoutSigns.includes(cleanToken);

        // Check if this is a single letter
        const isSingleChar = isSingleLetter(cleanToken);

        // Check if this token should be treated as a name
        const shouldSpellLetterByLetter = isProperName(originalToken);

        // Skip common words completely
        if (isCommonWord) {
            signs.push({
                word: originalToken,
                notFound: true,
                index: i,
                isCommonWord: true
            });
            skipped.push(originalToken);
            continue; // Skip to next token - don't add to playlist
        }

        // Try to get the sign for this token
        const sign = getSignVideoByWord(cleanToken);

        if (isSingleChar) {
            // This is a single letter - process as a letter
            const letterSign = getSignVideoByWord(cleanToken);

            if (letterSign && letterSign.videoUrl) {
                signs.push({
                    word: originalToken,
                    videoUrl: letterSign.videoUrl,
                    notFound: false,
                    index: i,
                    isLetter: true,
                    letterPosition: 0,
                    nameLength: 1
                });
                playlist.push(letterSign.videoUrl);
            } else {
                signs.push({
                    word: originalToken,
                    notFound: true,
                    index: i,
                    isLetter: true
                });
                missingWords.push(originalToken);
            }
        } else if (sign && sign.videoUrl) {
            // Word has a sign video
            signs.push({
                word: originalToken,
                videoUrl: sign.videoUrl,
                notFound: false,
                index: i
            });
            playlist.push(sign.videoUrl);
        } else if (shouldSpellLetterByLetter) {
            // This is a proper name - process letter by letter
            let allLettersFound = true;
            const nameLetterVideos = [];

            // Add a special "name start" indicator if available
            const nameStartSign = getSignVideoByWord("name_start");
            if (nameStartSign && nameStartSign.videoUrl) {
                signs.push({
                    word: "🔤", // Using emoji to indicate finger spelling will begin
                    videoUrl: nameStartSign.videoUrl,
                    notFound: false,
                    index: i,
                    isNameIndicator: true
                });
                playlist.push(nameStartSign.videoUrl);
            }

            // Process each letter individually and collect the videos
            for (let j = 0; j < originalToken.length; j++) {
                const letter = originalToken[j];

                // Skip non-alphabetic characters
                if (!letter.match(/[A-Za-z]/)) continue;

                const letterSign = getSignVideoByWord(letter.toLowerCase());

                if (letterSign && letterSign.videoUrl) {
                    const letterSignObj = {
                        word: letter,
                        videoUrl: letterSign.videoUrl,
                        notFound: false,
                        index: i,
                        isNameLetter: true,
                        letterPosition: j,
                        nameLength: originalToken.length
                    };
                    signs.push(letterSignObj);
                    nameLetterVideos.push(letterSign.videoUrl);
                } else {
                    signs.push({
                        word: letter,
                        notFound: true,
                        index: i,
                        isNameLetter: true,
                        letterPosition: j,
                        nameLength: originalToken.length
                    });
                    allLettersFound = false;
                    missingWords.push(letter);
                }
            }

            // Add all letter videos to the playlist in sequence
            playlist.push(...nameLetterVideos);

            // Add a special "name end" indicator if available
            const nameEndSign = getSignVideoByWord("name_end");
            if (nameEndSign && nameEndSign.videoUrl) {
                signs.push({
                    word: "🔤", // Using emoji to indicate finger spelling is complete
                    videoUrl: nameEndSign.videoUrl,
                    notFound: false,
                    index: i,
                    isNameIndicator: true
                });
                playlist.push(nameEndSign.videoUrl);
            }

            // If any letters were missing, add the whole name to missing words
            if (!allLettersFound) {
                missingWords.push(originalToken);
            }
        } else {
            // Regular word with no sign
            signs.push({
                word: originalToken,
                notFound: true,
                index: i
            });
            missingWords.push(originalToken);
        }
    }

    return {
        signs,
        missingWords: missingWords.filter(word => !skipped.includes(word)),
        skippedWords: skipped,
        playlist
    };
};

/**
 * Check if a token is a single letter
 * 
 * @param {string} token - Token to check
 * @returns {boolean} - True if token is a single letter
 */
const isSingleLetter = (token) => {
    return token.length === 1 && token.match(/[A-Za-z]/);
};

/**
 * Check if a word is likely a proper name
 * 
 * @param {string} word - Word to check
 * @returns {boolean} - True if word is likely a proper name
 */
const isProperName = (word) => {
    // Check if word starts with a capital letter and isn't a common word that might be capitalized
    const commonCapitalizedWords = ['i', 'my', 'me', 'mine', 'you', 'your', 'yours', 'we', 'us', 'our', 'ours'];

    // More robust check for proper names - either starts with capital or has capital in the middle
    const startsWithCapital = word.length > 0 && word[0] === word[0].toUpperCase();
    const hasInternalCapital = word.slice(1).split('').some(char => char === char.toUpperCase() && char.match(/[A-Z]/));

    return (startsWithCapital || hasInternalCapital) &&
        !commonCapitalizedWords.includes(word.toLowerCase());
};

export default {
    processTokens,
    isSingleLetter,
    isProperName
};