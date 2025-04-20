// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// User routes - all require authentication
router.get('/progress', verifyToken, userController.getUserProgress);
router.post('/progress/:signId', verifyToken, userController.updateSignProgress);
router.post('/conversations', verifyToken, userController.saveConversation);
router.get('/conversations', verifyToken, userController.getConversations);
router.delete('/conversations/:conversationId', verifyToken, userController.deleteConversation);

module.exports = router;