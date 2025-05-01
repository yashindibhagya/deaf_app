// Frontend/services/ModelService.jsx
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { API_BASE_URL } from '../config/constants';

class ModelService {
    constructor() {
        this.model = null;
        this.metadata = null;
        this.isLoading = false;
    }

    /**
     * Load model metadata from the backend
     * @returns {Promise<Object>} Model metadata
     */
    async loadModelMetadata() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/model/metadata`);

            if (!response.ok) {
                throw new Error(`Failed to load model metadata: ${response.status}`);
            }

            const data = await response.json();
            this.metadata = data.modelInfo;
            return this.metadata;
        } catch (error) {
            console.error('Error loading model metadata:', error);
            throw error;
        }
    }

    /**
     * Initialize and load the TensorFlow.js model
     * @returns {Promise<tf.LayersModel>} Loaded model
     */
    async loadModel() {
        if (this.model) {
            return this.model;
        }

        if (this.isLoading) {
            // Wait for the current loading process to complete
            return new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    if (this.model) {
                        clearInterval(checkInterval);
                        resolve(this.model);
                    } else if (!this.isLoading) {
                        clearInterval(checkInterval);
                        reject(new Error('Model loading failed'));
                    }
                }, 100);
            });
        }

        this.isLoading = true;

        try {
            // Ensure TensorFlow.js is ready
            await tf.ready();

            // Option 1: Load from bundled resources (most reliable for mobile)
            try {
                // Import model JSON and weights from assets
                const modelJSON = require('../assets/model/model.json');
                // Find all weight files from the assets folder
                const modelWeights = [
                    require('../assets/model/group1-shard1of1.bin')
                    // Add more shards if your model is split into multiple files
                ];

                this.model = await tf.loadLayersModel(bundleResourceIO(modelJSON, modelWeights));
                console.log('Model loaded from assets successfully');
            } catch (assetError) {
                console.warn('Could not load model from assets:', assetError);

                // Option 2: Load from network (backend)
                try {
                    const modelUrl = `${API_BASE_URL}/model/model.json`;
                    this.model = await tf.loadLayersModel(modelUrl);
                    console.log('Model loaded from server successfully');
                } catch (networkError) {
                    console.error('Failed to load model from server:', networkError);
                    throw networkError;
                }
            }

            // Warm up the model with a test prediction
            const dummyInput = tf.zeros([1, 30, 1629]);
            const warmupResult = this.model.predict(dummyInput);
            warmupResult.dispose();
            dummyInput.dispose();

            this.isLoading = false;
            return this.model;
        } catch (error) {
            this.isLoading = false;
            console.error('Error loading model:', error);
            throw error;
        }
    }

    /**
     * Predict sign from keypoints sequence
     * @param {Array} keypointsSequence - Array of keypoint arrays
     * @returns {Promise<Object>} Prediction result
     */
    async predict(keypointsSequence) {
        if (!this.model) {
            await this.loadModel();
        }

        if (!this.metadata) {
            await this.loadModelMetadata();
        }

        try {
            // Convert input to tensor
            const inputTensor = tf.tensor(keypointsSequence);

            // Reshape input to match model's expected shape [1, sequence_length, num_features]
            const reshapedInput = inputTensor.reshape([
                1,
                keypointsSequence.length,
                keypointsSequence[0].length
            ]);

            // Run prediction
            const outputTensor = this.model.predict(reshapedInput);
            const predictions = await outputTensor.array();

            // Get the class with highest confidence
            const flatPredictions = predictions[0];
            const maxIndex = flatPredictions.indexOf(Math.max(...flatPredictions));
            const maxConfidence = flatPredictions[maxIndex];

            // Map index to label
            let predictedLabel = String.fromCharCode(65 + maxIndex); // Default to A, B, C...
            if (this.metadata && this.metadata.labelMap) {
                // Find the key in the label map that corresponds to maxIndex
                predictedLabel = Object.keys(this.metadata.labelMap).find(
                    key => this.metadata.labelMap[key] === maxIndex
                ) || predictedLabel;
            }

            // Clean up tensors to prevent memory leaks
            inputTensor.dispose();
            reshapedInput.dispose();
            outputTensor.dispose();

            return {
                label: predictedLabel,
                confidence: maxConfidence,
                predictions: flatPredictions
            };
        } catch (error) {
            console.error('Prediction error:', error);
            throw error;
        }
    }

    /**
     * Clear model from memory
     */
    disposeModel() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
    }
}

// Create and export singleton instance
export default new ModelService();