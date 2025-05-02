import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const RecentTranslations = ({
    recentTranslations,
    deleteConversation,
    setInputText,
    setLanguageMode,
    setSinhalaScript,
    setTamilScript,
    setTranslatedText,
    handleTranslate
}) => {
    // Translate a recent item
    const translateRecent = (text, sinhalaScript, tamilScript, translated, language) => {
        setInputText(text);
        setLanguageMode(language || 'sinhala');

        if (language === 'sinhala') {
            setSinhalaScript(sinhalaScript || '');
            setTamilScript('');
        } else if (language === 'tamil') {
            setTamilScript(tamilScript || '');
            setSinhalaScript('');
        } else {
            setSinhalaScript('');
            setTamilScript('');
        }

        // If we already have the translation, use it directly
        if (translated && language !== 'english') {
            setTranslatedText(translated);
            setTimeout(() => {
                handleTranslate();
            }, 100);
        } else {
            // Otherwise, just translate normally
            setTimeout(() => {
                handleTranslate();
            }, 100);
        }
    };

    // No recent translations
    if (recentTranslations.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.recentTitle}>Recent Translations</Text>
                <Text style={styles.emptyText}>No recent translations found</Text>
            </View>
        );
    }

    return (
        <View>
            <View style={styles.recentContainer}>
                <Text style={styles.recentTitle}>Recent Translations</Text>
            </View>

            <View style={styles.recentList}>
                {recentTranslations.map((item, index) => (
                    <View key={index} style={styles.recentItemRow}>
                        <TouchableOpacity
                            style={[
                                styles.recentItem,
                                {
                                    borderLeftColor:
                                        item.language === 'sinhala' ? '#4C9EFF' :
                                            item.language === 'tamil' ? '#9C27B0' :
                                                '#FF9800'  // English
                                }
                            ]}
                            onPress={() => translateRecent(
                                item.text,
                                item.sinhalaScript,
                                item.tamilScript,
                                item.translated,
                                item.language
                            )}
                        >
                            <View style={styles.recentItemContent}>
                                {item.language === 'sinhala' && item.sinhalaScript ? (
                                    <>
                                        <Text style={styles.recentItemScript}>{item.sinhalaScript}</Text>
                                        <Text style={styles.recentItemText} numberOfLines={1}>({item.text})</Text>
                                    </>
                                ) : item.language === 'tamil' && item.tamilScript ? (
                                    <>
                                        <Text style={styles.recentItemScript}>{item.tamilScript}</Text>
                                        <Text style={styles.recentItemText} numberOfLines={1}>({item.text})</Text>
                                    </>
                                ) : (
                                    <Text style={styles.recentItemText} numberOfLines={1}>{item.text}</Text>
                                )}
                                {(item.language === 'sinhala' || item.language === 'tamil') && item.translated && (
                                    <Text style={styles.recentItemTranslated} numberOfLines={1}>
                                        → {item.translated}
                                    </Text>
                                )}
                            </View>
                            <View style={[
                                styles.languageIndicator,
                                {
                                    backgroundColor:
                                        item.language === 'sinhala' ? '#4C9EFF' :
                                            item.language === 'tamil' ? '#9C27B0' :
                                                '#FF9800'  // English
                                }
                            ]}>
                                <Text style={styles.languageIndicatorText}>
                                    {item.language === 'sinhala' ? 'SI' :
                                        item.language === 'tamil' ? 'TA' :
                                            'EN'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Delete button */}
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteConversation(index)}
                        >
                            <MaterialIcons name="delete-outline" size={22} color="#FF3B30" />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    emptyContainer: {
        marginTop: 20,
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 10,
    },
    recentContainer: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    recentList: {
        maxHeight: 150,
        marginBottom: 8,
    },
    recentItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    recentItem: {
        flex: 1,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 6,
        borderLeftWidth: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recentItemContent: {
        flex: 1,
        paddingRight: 8,
    },
    recentItemScript: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    recentItemText: {
        fontSize: 14,
        color: '#666',
    },
    recentItemTranslated: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    languageIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    languageIndicatorText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    deleteButton: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default RecentTranslations;