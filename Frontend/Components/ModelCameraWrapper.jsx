import React from 'react';
import { View, StyleSheet } from 'react-native';
import ModelCamera from './ModelCamera';

/**
 * A wrapper component for ModelCamera that ensures proper prop handling
 * and error prevention
 */
const ModelCameraWrapper = (props) => {
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
            <ModelCamera
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

export default ModelCameraWrapper; 