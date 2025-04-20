import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useUserDetail } from "../../context/UserDetailContext";

/**
 * Header component for the home screen
 * Displays a personalized greeting to the user
 * 
 * @returns {React.Component} Header component
 */
export default function Header() {
    const { userDetail } = useUserDetail();

    // Get appropriate greeting based on time of day
    const getGreeting = () => {
        const currentHour = new Date().getHours();

        if (currentHour < 12) {
            return "Good Morning";
        } else if (currentHour < 18) {
            return "Good Afternoon";
        } else {
            return "Good Evening";
        }
    };

    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.heading}>
                    {userDetail?.name || "Name"}
                </Text>

                <Text style={styles.started}>Let's Get Started!</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
        marginBottom: 20,
    },
    greeting: {
        fontSize: 16,
        color: "#666",
        marginBottom: 4,
    },
    heading: {
        fontWeight: "900",
        fontSize: 28,
        color: "#000",
        marginBottom: 8,
    },
    started: {
        fontSize: 16,
        color: "#000",
        fontWeight: "600",
    },
});