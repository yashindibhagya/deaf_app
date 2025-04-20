import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import AuthService from '../services/AuthService';

// Create the context
export const UserContext = createContext();

/**
 * Provider component for user details and authentication state
 */
export const UserProvider = ({ children }) => {
    const [userDetail, setUserDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // Watch for authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userData = await AuthService.getUserDetails(user.uid);
                    setUserDetail(userData);
                } catch (error) {
                    console.error("Error fetching user details:", error);
                    setAuthError(error.message);
                }
            } else {
                setUserDetail(null);
            }
            setIsLoading(false);
        });

        // Cleanup subscription
        return () => unsubscribe();
    }, []);

    /**
     * Sign in a user with email and password
     * @param {string} email - User's email
     * @param {string} password - User's password
     */
    const signIn = async (email, password) => {
        setIsLoading(true);
        try {
            const user = await AuthService.signIn(email, password);
            const userData = await AuthService.getUserDetails(user.uid);
            setUserDetail(userData);
            setAuthError(null);
            return user;
        } catch (error) {
            setAuthError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Create a new user account
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @param {string} name - User's full name
     */
    const signUp = async (email, password, name) => {
        setIsLoading(true);
        try {
            const user = await AuthService.signUp(email, password, name);
            const userData = {
                name: name.trim(),
                email: email.trim(),
                member: false,
                uid: user.uid,
            };
            setUserDetail(userData);
            setAuthError(null);
            return user;
        } catch (error) {
            setAuthError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Sign out the current user
     */
    const signOut = async () => {
        try {
            await AuthService.logout();
            setUserDetail(null);
        } catch (error) {
            setAuthError(error.message);
            throw error;
        }
    };

    /**
     * Update user profile information
     * @param {Object} userData - Updated user data
     */
    const updateProfile = async (userData) => {
        if (!userDetail?.uid) return;

        try {
            await AuthService.saveUserData(userDetail.uid, {
                ...userDetail,
                ...userData
            });
            setUserDetail(prevData => ({
                ...prevData,
                ...userData
            }));
        } catch (error) {
            setAuthError(error.message);
            throw error;
        }
    };

    // The value to be provided to consumers
    const contextValue = {
        userDetail,
        setUserDetail,
        isLoading,
        authError,
        signIn,
        signUp,
        signOut,
        updateProfile,
        isAuthenticated: !!userDetail,
    };

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};

export default UserContext;