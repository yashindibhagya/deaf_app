// backend/controllers/authController.js
const { auth, db } = require('../config/firebaseConfig');

// User signup controller
exports.signup = async (req, res, next) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        // Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        // Save additional user data in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            name: name.trim(),
            email: email.trim(),
            member: false,
            uid: userRecord.uid,
            createdAt: new Date().toISOString()
        });

        res.status(201).json({
            message: 'User created successfully',
            userId: userRecord.uid
        });
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({ error: 'Email already in use' });
        }
        next(error);
    }
};

// User login status check
exports.getUserInfo = async (req, res, next) => {
    try {
        const { uid } = req.user;

        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();

        res.status(200).json({
            user: {
                uid,
                name: userData.name,
                email: userData.email,
                member: userData.member
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;