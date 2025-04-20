import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { UserDetailProvider } from "../context/UserDetailContext";
import { VideoProvider } from "../context/VideoContext";
import { StatusBar } from "expo-status-bar";
import { auth } from "../config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

/**
 * Root layout component that provides context providers
 * and sets up the stack navigator
 */
export default function RootLayout() {
    // We'll remove any automatic redirects here - let screens handle their own auth checks

    return (
        <UserDetailProvider>
            <VideoProvider>
                <StatusBar style="dark" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: '#fff' },
                        animation: 'slide_from_right',
                    }}
                />
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