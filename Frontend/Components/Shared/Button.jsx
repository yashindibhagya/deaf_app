import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import React from 'react';

/**
 * Reusable Button component
 * 
 * @param {Object} props - Component props
 * @param {string} props.text - Button text
 * @param {string} props.type - Button type ('fill' or 'outline')
 * @param {Function} props.onPress - Button press handler
 * @param {boolean} props.loading - Loading state
 * @param {Object} props.style - Additional style for the button
 * @param {Object} props.textStyle - Additional style for the button text
 * @param {boolean} props.disabled - Whether button is disabled
 * @returns {React.Component} Button component
 */
export default function Button({
    text,
    type = 'fill',
    onPress,
    loading = false,
    style = {},
    textStyle = {},
    disabled = false
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={loading || disabled}
            style={[
                styles.button,
                type === 'fill' ? styles.fillButton : styles.outlineButton,
                disabled && styles.disabledButton,
                style
            ]}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator size="small" color={type === 'fill' ? '#FFFFFF' : '#F7B316'} />
            ) : (
                <Text
                    style={[
                        styles.buttonText,
                        type === 'fill' ? styles.fillButtonText : styles.outlineButtonText,
                        disabled && styles.disabledButtonText,
                        textStyle
                    ]}
                >
                    {typeof text === 'string' ? text : JSON.stringify(text)}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        padding: 12,
        width: '70%',
        height: 45,
        borderRadius: 30,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 10,
    },
    fillButton: {
        backgroundColor: '#F7B316',
        borderWidth: 0,
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#F7B316',
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        fontWeight: '600',
        textAlign: 'center',
        fontSize: 16,
    },
    fillButtonText: {
        color: '#fff',
    },
    outlineButtonText: {
        color: '#F7B316',
    },
    disabledButtonText: {
        color: '#999',
    },
});