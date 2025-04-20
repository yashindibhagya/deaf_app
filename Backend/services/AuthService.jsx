import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

/**
 * Service for handling authentication-related operations
 */
class AuthService {
    /**
     * Sign in a user with email and password
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @returns {Promise<Object>} - Firebase user object
     */
    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );
            return userCredential.user;
        } catch (error) {
            console.error("Sign-in error:", error.message);
            throw error;
        }
    }

    /**
     * Create a new user account
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @param {string} name - User's full name
     * @returns {Promise<Object>} - Firebase user object
     */
    async signUp(email, password, name) {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );
            const user = userCredential.user;

            // Create user document in Firestore
            await this.saveUserData(user.uid, {
                name: name.trim(),
                email: email.trim(),
                member: false,
                uid: user.uid,
            });

            return user;
        } catch (error) {
            console.error("Sign-up error:", error.message);
            throw error;
        }
    }

    /**
     * Save user data to Firestore
     * @param {string} userId - User's ID
     * @param {Object} userData - User data to save
     */
    async saveUserData(userId, userData) {
        try {
            await setDoc(doc(db, "users", userId), userData);
        } catch (error) {
            console.error("Error saving user data:", error.message);
            throw error;
        }
    }

    /**
     * Get user details from Firestore
     * @param {string} userId - User's ID
     * @returns {Promise<Object>} - User data from Firestore
     */
    async getUserDetails(userId) {
        try {
            const userRef = doc(db, "users", userId);
            const result = await getDoc(userRef);

            if (result.exists()) {
                return result.data();
            } else {
                console.log("No user data found in Firestore.");
                return null;
            }
        } catch (error) {
            console.error("Error fetching user details:", error.message);
            throw error;
        }
    }

    /**
     * Sign out the current user
     */
    async logout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error.message);
            throw error;
        }
    }

    /**
     * Send password reset email
     * @param {string} email - User's email
     */
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error("Password reset error:", error.message);
            throw error;
        }
    }

    /**
     * Get current user
     * @returns {Object|null} - Current user or null if not logged in
     */
    getCurrentUser() {
        return auth.currentUser;
    }
}

export default new AuthService();