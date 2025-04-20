// backend/routes/signRoutes.js
const express = require('express');
const router = express.Router();
const signController = require('../controllers/signController');
const { verifyToken } = require('../middleware/authMiddleware');

// Sign routes - some require auth, others don't
router.get('/', signController.getAllSigns);
router.get('/:signId', signController.getSignById);
router.get('/category/:category', signController.getSignsByCategory);
router.post('/translate', signController.translateTextToSign);

module.exports = router;