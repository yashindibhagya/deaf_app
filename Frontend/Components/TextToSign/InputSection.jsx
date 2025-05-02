import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet
} from 'react-native';
import { MaterialIcons } from "@expo/vector-icons";
import Button from '../../Components/Shared/Button';

const InputSection = ({
    inputText,
    setInputText,
    sinhalaScript,
    tamilScript,
    translatedText,
    languageMode,
    toggleLanguageMode,
    isTranslating,
    isTransliterating,
    handleTranslate
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.title}>Text to Sign Language</Text>
                <TouchableOpacity
                    style={styles.languageToggle}
                    onPress={toggleLanguageMode}
                >
                    <Text style={styles.languageToggleText}>
                        {languageMode === 'sinhala'
                            ? 'Sinhala → English'
                            : languageMode === 'tamil'
                                ? 'Tamil → English'
                                : 'English'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
                <View style={styles.textInputWrap}>
                    <TextInput
                        style={styles.textInput}
                        placeholder={
                            languageMode === 'sinhala'
                                ? "Type Sinhala words using English letters..."
                                : languageMode === 'tamil'
                                    ? "Type Tamil words using English letters..."
                                    : "Enter English text to translate..."
                        }
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        autoCorrect={false}
                        returnKeyType="done"
                        blurOnSubmit={true}
                        enablesReturnKeyAutomatically={true}
                        keyboardType="default"
                        autoCapitalize="none"
                        disableFullscreenUI={true}
                    />
                </View>
            </View>

            {/* Display Sinhala script as user types */}
            {languageMode === 'sinhala' && sinhalaScript && (
                <View style={styles.sinhalaScriptContainer}>
                    <Text style={styles.sinhalaScriptLabel}>Sinhala:</Text>
                    <Text style={styles.sinhalaScriptText}>{sinhalaScript}</Text>
                </View>
            )}

            {/* Display Tamil script as user types */}
            {languageMode === 'tamil' && tamilScript && (
                <View style={styles.tamilScriptContainer}>
                    <Text style={styles.tamilScriptLabel}>Tamil:</Text>
                    <Text style={styles.tamilScriptText}>{tamilScript}</Text>
                </View>
            )}

            {(languageMode === 'sinhala' || languageMode === 'tamil') && translatedText && (
                <View style={styles.translatedTextContainer}>
                    <Text style={styles.translatedTextLabel}>English Translation:</Text>
                    <Text style={styles.translatedTextContent}>{translatedText}</Text>
                </View>
            )}

            <Button
                text={isTranslating || isTransliterating ? 'Translating...' : 'Translate'}
                type="fill"
                onPress={handleTranslate}
                disabled={isTranslating || !inputText.trim()}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#333',
    },
    languageToggle: {
        backgroundColor: '#F7B316',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    languageToggleText: {
        color: '#fff',
        fontWeight: '500',
    },
    inputContainer: {
        marginTop: 20,
    },
    textInputWrap: {
        borderRadius: 8,
    },
    textInput: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#DDD',
    },
    sinhalaScriptContainer: {
        backgroundColor: '#155658',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#155658',
    },
    sinhalaScriptLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    sinhalaScriptText: {
        fontSize: 16,
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    tamilScriptContainer: {
        backgroundColor: '#155658',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#155658',
    },
    tamilScriptLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    tamilScriptText: {
        fontSize: 16,
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    translatedTextContainer: {
        backgroundColor: '#155658',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
    },
    translatedTextLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    translatedTextContent: {
        color: '#fff',
        fontSize: 16,
    },
});

export default InputSection;