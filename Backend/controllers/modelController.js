const fs = require('fs');
const path = require('path');

/**
 * Controller for serving model metadata and information
 */

// Get model metadata
exports.getModelMetadata = async (req, res, next) => {
    try {
        const modelMetadataPath = path.join(__dirname, '../../ML/models/model_metadata.json');

        if (!fs.existsSync(modelMetadataPath)) {
            return res.status(404).json({
                error: 'Model metadata not found',
                message: 'Please ensure the model has been trained and metadata file exists'
            });
        }

        const metadata = JSON.parse(fs.readFileSync(modelMetadataPath, 'utf8'));

        // Return only the necessary information for the frontend
        res.status(200).json({
            modelInfo: {
                timestamp: metadata.timestamp,
                sequenceLength: metadata.sequence_length,
                testAccuracy: metadata.test_accuracy,
                labelMap: metadata.label_map
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get model performance metrics
exports.getModelMetrics = async (req, res, next) => {
    try {
        // For future implementation - could return detailed metrics
        // from model training history, confusion matrix, etc.
        res.status(200).json({
            message: 'Model metrics API endpoint - to be implemented'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;