import React from 'react';
import {
    View,
    Text,
    StyleSheet
} from 'react-native';
import Button from '../../Components/Shared/Button';

const TranslationControls = ({
    saveConversation,
    isSaved
}) => {
    return (
        <View style={styles.container}>
            {isSaved ? (
                <Text style={styles.savedMessage}>Conversation saved!</Text>
            ) : (
                <Button
                    text="Save Conversation"
                    type="outline"
                    onPress={saveConversation}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
    },
    savedMessage: {
        color: '#155658',
        textAlign: 'center',
        fontWeight: '500',
        marginVertical: 8,
        fontSize: 14
    }
});

export default TranslationControls;