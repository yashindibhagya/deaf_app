import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { UserDetailProvider, useUserDetail } from "../context/UserDetailContext";
import { VideoProvider } from "../context/VideoContext";
import { StatusBar } from "expo-status-bar";
import { auth } from "../config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { ActivityIndicator, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AuthProvider component that handles authentication state and redirects
 */
function AuthProvider({ children }) {
    const { userDetail, isLoading } = useUserDetail();
    const router = useRouter();
    const segments = useSegments();
    const [initialized, setInitialized] = useState(false);
    const [isCheckingNewUser, setIsCheckingNewUser] = useState(true);
    const [isNewUser, setIsNewUser] = useState(false);

    // Check if this is a new user that needs onboarding
    useEffect(() => {
        const checkNewUserStatus = async () => {
            try {
                const status = await AsyncStorage.getItem("isNewUser");
                setIsNewUser(status === "true");
            } catch (error) {
                console.error("Error checking new user status:", error);
                setIsNewUser(false);
            } finally {
                setIsCheckingNewUser(false);
            }
        };

        checkNewUserStatus();
    }, []);

    useEffect(() => {
        if (isLoading || isCheckingNewUser) return; // Wait for auth state to be determined

        // Get the current segments, which represent the current route path
        const inAuthGroup = segments[0] === 'auth';
        const inTabsGroup = segments[0] === '(tabs)';
        const isWelcomeScreen = segments.length === 1 && segments[0] === '';
        const inOnboardingGroup = segments[0] === 'onboarding';

        // Avoid redirecting during initial render
        if (!initialized) {
            setInitialized(true);
            return;
        }

        // Don't override navigation during onboarding or direct signup->onboarding flow
        if (inOnboardingGroup) {
            return;
        }

        if (userDetail) {
            // User is signed in
            if (inAuthGroup || isWelcomeScreen) {
                if (isNewUser && !inOnboardingGroup) {
                    // New users go through onboarding (but only if they're not already in onboarding)
                    router.replace('/onboarding/screen1');
                } else {
                    // Returning users go straight to home
                    router.replace('/(tabs)/home');
                }
            }
        } else {
            // User is not signed in
            if (inTabsGroup || inOnboardingGroup) {
                // Redirect to welcome screen if trying to access protected areas
                router.replace('/');
            }
        }
    }, [userDetail, isLoading, segments, initialized, isNewUser, isCheckingNewUser]);

    // Show loading indicator while determining states
    if (isLoading || isCheckingNewUser) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: "#D0F3DA" }}>
                <ActivityIndicator size="large" color="#155658" />
                <Text style={{ marginTop: 10, color: "#155658" }}>Loading...</Text>
            </View>
        );
    }

    // Once all states are determined, render the app
    return <>{children}</>;
}

/**
 * Root layout component that provides context providers
 * and sets up the stack navigator
 */
export default function RootLayout() {
    return (
        <UserDetailProvider>
            <VideoProvider>
                <AuthProvider>
                    <StatusBar style="dark" />
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: '#fff' },
                            animation: 'slide_from_right',
                        }}
                    />
                </AuthProvider>
            </VideoProvider>
        </UserDetailProvider>
    );
}

// This is a custom layout trick to ensure we have a default catch-all route
// if no other route matches in Expo Router
export function ErrorBoundary(props) {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    title: "GestureConnect",
                }}
            />
        </Stack>
    );
}