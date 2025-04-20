import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

/**
 * Common header component that displays the app logo and title
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.showBackButton - Whether to show a back button
 * @param {Function} props.onBack - Custom back button handler (defaults to router.back)
 * @param {Object} props.style - Additional styles for the container
 * @returns {React.Component} Common component
 */
export default function Common({ showBackButton = false, onBack, style = {} }) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.contentContainer}>
                {showBackButton && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                    >
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.buttonContainer}>
                    <Image
                        source={require("../../assets/images/gesture.png")}
                        style={styles.logo}
                    />
                    <Text style={styles.title}>GestureConnect</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "flex-start",
        marginBottom: 10,
        width: "100%",
        marginTop: 10,
    },
    contentContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
    },
    title: {
        fontSize: 16,
        fontWeight: "900",
        color: "#155658",
        marginLeft: 5,
    },
    buttonContainer: {
        flexDirection: "row",
        marginTop: 20,
        alignItems: "center",
    },
    logo: {
        height: 30,
        width: 30,
    },
    backButton: {
        marginRight: 10,
        marginTop: 20,
        width: 30,
        height: 30,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 15,
        backgroundColor: "#E0F2F1",
    },
    backButtonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#155658",
    }
});