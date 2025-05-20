import React from 'react';
import { View, StyleSheet } from 'react-native';
import WebSocketCamera from './WebSocketCamera';

/**
 * A wrapper component for WebSocketCamera that ensures proper prop handling
 * and error prevention
 */
const WebSocketCameraWrapper = (props) => {
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
            <WebSocketCamera
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

export default WebSocketCameraWrapper; 