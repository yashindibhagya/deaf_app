import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const WordChips = ({
    translatedSigns,
    currentPlaylist,
    currentVideoIndex,
    isPlaying
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.resultsTitle}>Translation Results:</Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.wordChipsContainer}
            >
                {translatedSigns
                    .filter(sign => !sign.isCommonWord) // Filter out common words in display
                    .map((sign, index) => {
                        // For name letters, group them differently
                        if (sign.isNameLetter) {
                            // For the first letter of a name, add a special container
                            if (sign.letterPosition === 0) {
                                return (
                                    <View key={`word-${index}`} style={styles.nameLettersContainer}>
                                        {/* Get all consecutive letters for this name */}
                                        {translatedSigns
                                            .slice(index, index + sign.nameLength)
                                            .filter(s => s.isNameLetter)
                                            .map((letterSign, letterIndex) => (
                                                <View
                                                    key={`letter-${letterIndex}`}
                                                    style={[
                                                        styles.letterChip,
                                                        letterSign.notFound ? styles.wordChipNotFound : {},
                                                        currentPlaylist[currentVideoIndex] === letterSign.videoUrl && isPlaying
                                                            ? styles.wordChipActive
                                                            : {}
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.letterChipText,
                                                            letterSign.notFound ? styles.wordChipTextNotFound : {},
                                                            currentPlaylist[currentVideoIndex] === letterSign.videoUrl && isPlaying
                                                                ? styles.wordChipTextActive
                                                                : {}
                                                        ]}
                                                    >
                                                        {letterSign.word}
                                                    </Text>
                                                    {letterSign.notFound && (
                                                        <MaterialIcons
                                                            name="videocam-off"
                                                            size={8}
                                                            color="#D32F2F"
                                                            style={styles.missingVideoIcon}
                                                        />
                                                    )}
                                                </View>
                                            ))}
                                    </View>
                                );
                            } else if (sign.letterPosition > 0) {
                                // Skip letters after the first one as they're handled in the first letter's render
                                return null;
                            }
                        }

                        // If this is a single letter (not part of a name)
                        if (sign.isLetter) {
                            return (
                                <View
                                    key={`word-${index}`}
                                    style={[
                                        styles.letterChip,
                                        sign.notFound ? styles.wordChipNotFound : {},
                                        currentPlaylist[currentVideoIndex] === sign.videoUrl && isPlaying
                                            ? styles.wordChipActive
                                            : {}
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.letterChipText,
                                            sign.notFound ? styles.wordChipTextNotFound : {},
                                            currentPlaylist[currentVideoIndex] === sign.videoUrl && isPlaying
                                                ? styles.wordChipTextActive
                                                : {}
                                        ]}
                                    >
                                        {sign.word}
                                    </Text>
                                    {sign.notFound && (
                                        <MaterialIcons
                                            name="videocam-off"
                                            size={8}
                                            color="#D32F2F"
                                            style={styles.missingVideoIcon}
                                        />
                                    )}
                                </View>
                            );
                        }

                        // For name indicator emojis, use a special style
                        if (sign.isNameIndicator) {
                            return (
                                <View
                                    key={`word-${index}`}
                                    style={[
                                        styles.nameIndicatorChip,
                                        currentPlaylist[currentVideoIndex] === sign.videoUrl && isPlaying
                                            ? styles.wordChipActive
                                            : {}
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.nameIndicatorText,
                                            currentPlaylist[currentVideoIndex] === sign.videoUrl && isPlaying
                                                ? styles.wordChipTextActive
                                                : {}
                                        ]}
                                    >
                                        {sign.word}
                                    </Text>
                                </View>
                            );
                        }

                        // Regular words (non-name)
                        return (
                            <View
                                key={`word-${index}`}
                                style={[
                                    styles.wordChip,
                                    sign.notFound ? styles.wordChipNotFound : {},
                                    currentPlaylist[currentVideoIndex] === sign.videoUrl && isPlaying
                                        ? styles.wordChipActive
                                        : {}
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.wordChipText,
                                        sign.notFound ? styles.wordChipTextNotFound : {},
                                        currentPlaylist[currentVideoIndex] === sign.videoUrl && isPlaying
                                            ? styles.wordChipTextActive
                                            : {}
                                    ]}
                                >
                                    {sign.word}
                                </Text>
                                {sign.notFound && !sign.isCommonWord && (
                                    <MaterialIcons
                                        name="videocam-off"
                                        size={12}
                                        color="#D32F2F"
                                        style={styles.missingVideoIcon}
                                    />
                                )}
                            </View>
                        );
                    })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
        marginBottom: 10,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    wordChipsContainer: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    wordChip: {
        backgroundColor: '#155658',
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#155658',
    },
    wordChipNotFound: {
        backgroundColor: '#FFEBEE',
        borderColor: '#FFCDD2',
    },
    wordChipActive: {
        backgroundColor: '#2196F3',
        borderColor: '#1976D2',
    },
    wordChipText: {
        fontSize: 14,
        color: '#fff',
    },
    wordChipTextNotFound: {
        color: '#D32F2F',
    },
    wordChipTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    nameLettersContainer: {
        flexDirection: 'row',
        backgroundColor: '#E3F2FD',
        borderRadius: 16,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#90CAF9',
    },
    letterChip: {
        backgroundColor: '#155658',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 6,
        margin: 2,
        borderWidth: 1,
        borderColor: '#155658',
    },
    letterChipText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold',
    },
    nameIndicatorChip: {
        backgroundColor: '#FFD54F',
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#FFCA28',
    },
    nameIndicatorText: {
        fontSize: 14,
        color: '#5D4037',
        fontWeight: 'bold',
    },
    missingVideoIcon: {
        marginLeft: 4,
    }
});

export default WordChips;