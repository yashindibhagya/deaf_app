import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';

const WelcomeCard = () => {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.textContainer}>
                <Text style={styles.heading}>What would you like to learn today?</Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.push("/(tabs)/learning")}
                >
                    <Text style={styles.buttonText}>Get started</Text>
                </TouchableOpacity>
            </View>

            <Image
                source={require('../../assets/images/home_learning.png')}
                style={styles.image}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#D0F3DA',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    textContainer: {
        flex: 1,
        paddingRight: 10,
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#155658',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 50,
        alignSelf: 'flex-start',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#155658',
    },
    image: {
        width: 150,
        height: 150,
    }
});

export default WelcomeCard;