const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');

// Model routes
router.get('/metadata', modelController.getModelMetadata);
router.get('/metrics', modelController.getModelMetrics);

module.exports = router;