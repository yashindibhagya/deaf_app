import React, { createContext, useState, useContext, useEffect } from "react";
import { auth, db } from "../config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Create a context to manage user details
export const UserDetailContext = createContext();

/**
 * UserDetailProvider component that wraps the application to provide user authentication status
 * and user profile information throughout the component tree
 */
export const UserDetailProvider = ({ children }) => {
    const [userDetail, setUserDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Listen for authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setIsLoading(true);
            if (user) {
                // User is signed in
                try {
                    // Fetch additional user details from Firestore
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        setUserDetail(userDoc.data());
                    } else {
                        // User exists in Auth but not in Firestore
                        setUserDetail({
                            uid: user.uid,
                            email: user.email,
                            name: user.displayName || "User",
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user details:", error);
                }
            } else {
                // User is signed out
                setUserDetail(null);
            }
            setIsLoading(false);
        });

        // Clean up the listener on unmount
        return () => unsubscribe();
    }, []);

    // Fetch or update user detail from Firestore
    const getUserDetail = async (uid) => {
        try {
            const userRef = doc(db, "users", uid);
            const result = await getDoc(userRef);

            if (result.exists()) {
                const userData = result.data();
                setUserDetail(userData);
                return userData;
            }
            return null;
        } catch (error) {
            console.error("Error fetching user details:", error);
            return null;
        }
    };

    return (
        <UserDetailContext.Provider
            value={{
                userDetail,
                setUserDetail,
                getUserDetail,
                isLoading
            }}
        >
            {children}
        </UserDetailContext.Provider>
    );
};

// Custom hook for using the user detail context
export const useUserDetail = () => {
    const context = useContext(UserDetailContext);
    if (context === undefined) {
        throw new Error("useUserDetail must be used within a UserDetailProvider");
    }
    return context;
};