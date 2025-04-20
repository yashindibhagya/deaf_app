/**
 * Authentication Service
 * Handles user authentication, registration, and profile management
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User's full name
 * @returns {Promise<Object>} User object
 */
export const registerUser = async (email, password, name) => {
  try {
    // Create the user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // Update the user's profile with the name
    await updateProfile(user, { displayName: name.trim() });

    // Create a user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: name.trim(),
      email: email.trim(),
      member: false,
      uid: user.uid,
      createdAt: new Date().toISOString()
    });

    return user;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

/**
 * Sign in an existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {Object} user - Firebase user object
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (user, profileData) => {
  try {
    // Update display name in auth profile if included
    if (profileData.name) {
      await updateProfile(user, { displayName: profileData.name.trim() });
    }

    // Update user document in Firestore
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, {
      ...profileData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Update profile error:", error);
    throw error;
  }
};

/**
 * Update user password
 * @param {Object} user - Firebase user object
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export const changePassword = async (user, newPassword) => {
  try {
    await updatePassword(user, newPassword);
  } catch (error) {
    console.error("Change password error:", error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
};

/**
 * Get user details from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} User details or null if not found
 */
export const getUserDetails = async (uid) => {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Get user details error:", error);
    throw error;
  }
};

/**
 * Listen for authentication state changes
 * @param {Function} callback - Callback function that receives the user object
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export default {
  registerUser,
  loginUser,
  logoutUser,
  updateUserProfile,
  changePassword,
  resetPassword,
  getUserDetails,
  onAuthStateChange
};