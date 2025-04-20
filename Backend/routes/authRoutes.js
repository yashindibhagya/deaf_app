// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Auth routes
router.post('/signup', authController.signup);
router.get('/user', verifyToken, authController.getUserInfo);

module.exports = router;