import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet
} from 'react-native';

const UndoToast = ({ undoDelete }) => {
    return (
        <View style={styles.undoToast}>
            <Text style={styles.undoToastText}>Conversation deleted</Text>
            <TouchableOpacity onPress={undoDelete}>
                <Text style={styles.undoButton}>UNDO</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    undoToast: {
        position: 'absolute',
        bottom: 70,
        left: 20,
        right: 20,
        backgroundColor: '#333333',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    undoToastText: {
        color: 'white',
        fontSize: 14,
    },
    undoButton: {
        color: '#4C9EFF',
        fontWeight: 'bold',
        fontSize: 14,
    }
});

export default UndoToast;