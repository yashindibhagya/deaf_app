// backend/middleware/authMiddleware.js
const { auth } = require('../config/firebaseConfig');

/**
 * Middleware to verify Firebase Auth token
 */
const verifyToken = async (req, res, next) => {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Missing or invalid authorization header');
        return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // Extract token
    const token = authHeader.split('Bearer ')[1];

    try {
        // Verify token with Firebase
        const decodedToken = await auth.verifyIdToken(token);

        // Add user data to request object
        req.user = decodedToken;
        console.log(`Authenticated request from user: ${decodedToken.uid}`);

        next();
    } catch (error) {
        console.error('Error verifying token:', error.message);

        // Provide appropriate error response based on error type
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ error: 'Unauthorized - Token expired' });
        } else if (error.code === 'auth/id-token-revoked') {
            return res.status(401).json({ error: 'Unauthorized - Token revoked' });
        } else {
            return res.status(403).json({ error: 'Unauthorized - Invalid token' });
        }
    }
};

/**
 * Middleware to check if user has admin role
 * (Use after verifyToken middleware)
 */
const isAdmin = async (req, res, next) => {
    try {
        // User must be authenticated first
        if (!req.user || !req.user.uid) {
            return res.status(401).json({ error: 'Unauthorized - Authentication required' });
        }

        // Check for admin custom claim
        if (req.user.admin === true) {
            next();
        } else {
            console.log(`Admin access denied for user: ${req.user.uid}`);
            return res.status(403).json({ error: 'Forbidden - Admin access required' });
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    verifyToken,
    isAdmin
};