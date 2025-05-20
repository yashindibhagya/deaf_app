import React from 'react';
import { View, StyleSheet } from 'react-native';
import BasicSignLanguageCamera from './BasicSignLanguageCamera';

/**
 * A wrapper component for BasicSignLanguageCamera that ensures proper prop handling
 * and error prevention
 */
const SignLanguageCameraWrapper = (props) => {
    // Default empty functions
    const defaultProps = {
        onTranslationComplete: () => { },
        onTranslationUpdate: () => { },
        isRecording: false,
        onStartRecording: () => { },
        onStopRecording: () => { }
    };

    // Merge provided props with defaults
    const safeProps = {
        ...defaultProps,
        ...props
    };

    return (
        <View style={styles.container}>
            <BasicSignLanguageCamera
                onTranslationComplete={safeProps.onTranslationComplete}
                onTranslationUpdate={safeProps.onTranslationUpdate}
                isRecording={safeProps.isRecording}
                onStartRecording={safeProps.onStartRecording}
                onStopRecording={safeProps.onStopRecording}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    }
});

export default SignLanguageCameraWrapper; 