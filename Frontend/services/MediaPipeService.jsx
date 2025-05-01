// Frontend/services/MediaPipeService.jsx
import * as tf from '@tensorflow/tfjs';

/**
 * Service for handling MediaPipe operations in React Native
 * Note: Full MediaPipe support in React Native is limited, so this service
 * provides simplified keypoint extraction capabilities.
 */
class MediaPipeService {
    constructor() {
        this.isInitialized = false;
        this.poseModel = null;
        this.handModel = null;
    }

    /**
     * Initialize TensorFlow pose detection models
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Ensure TensorFlow.js is ready
            await tf.ready();

            // Import pose detection (using direct import for clarity)
            const poseDetection = require('@tensorflow-models/pose-detection');
            const handPoseDetection = require('@tensorflow-models/hand-pose-detection');

            // Load the MoveNet model for pose detection
            this.poseModel = await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                {
                    modelType: 'lightning',  // or 'thunder' for higher accuracy
                    enableSmoothing: true
                }
            );

            // Load the MediaPipe hands model
            this.handModel = await handPoseDetection.createDetector(
                handPoseDetection.SupportedModels.MediaPipeHands,
                {
                    runtime: 'tfjs',
                    modelType: 'lite',
                    maxHands: 2
                }
            );

            this.isInitialized = true;
            console.log('MediaPipe service initialized successfully');

        } catch (error) {
            console.error('Error initializing MediaPipe service:', error);
            throw error;
        }
    }

    /**
     * Extract keypoints from an image tensor
     * @param {tf.Tensor3D} imageTensor - RGB image tensor [height, width, 3]
     * @returns {Promise<Object>} Extracted keypoints
     */
    async extractKeypoints(imageTensor) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Run pose detection
            const poses = await this.poseModel.estimatePoses(imageTensor);

            // Run hand detection
            const hands = await this.handModel.estimateHands(imageTensor);

            // Extract and format pose keypoints
            const poseKeypoints = this.formatPoseKeypoints(poses[0]?.keypoints || []);

            // Extract and format hand keypoints
            const [leftHandKeypoints, rightHandKeypoints] = this.formatHandKeypoints(hands);

            // Simulate face keypoints (not fully supported in TF.js)
            const faceKeypoints = this.createEmptyFaceKeypoints();

            // Combine all keypoints
            const combinedKeypoints = [
                ...poseKeypoints,
                ...faceKeypoints,
                ...leftHandKeypoints,
                ...rightHandKeypoints
            ].flat();

            return { combinedKeypoints };

        } catch (error) {
            console.error('Error extracting keypoints:', error);
            throw error;
        }
    }

    /**
     * Format pose keypoints to match the model's expected format
     * @param {Array} poseKeypoints - Keypoints from the pose model
     * @returns {Array} Formatted pose keypoints
     */
    formatPoseKeypoints(poseKeypoints) {
        // Format to match MediaPipe's 33 pose landmarks with x,y,z,visibility 
        const keypoints = new Array(33 * 4).fill(0);

        poseKeypoints.forEach((keypoint, index) => {
            if (index < 33) {
                const baseIdx = index * 4;
                keypoints[baseIdx] = keypoint.x;  // x coordinate (normalized to [0,1])
                keypoints[baseIdx + 1] = keypoint.y;  // y coordinate (normalized to [0,1])
                keypoints[baseIdx + 2] = 0;  // z coordinate (not available, set to 0)
                keypoints[baseIdx + 3] = keypoint.score || 0;  // visibility score
            }
        });

        return keypoints;
    }

    /**
     * Format hand keypoints to match the model's expected format
     * @param {Array} hands - Detected hands from the hand model
     * @returns {Array} Formatted left and right hand keypoints
     */
    formatHandKeypoints(hands) {
        // Create empty keypoints arrays (21 landmarks with x,y,z for each hand)
        const leftHandKeypoints = new Array(21 * 3).fill(0);
        const rightHandKeypoints = new Array(21 * 3).fill(0);

        // Process detected hands
        hands.forEach(hand => {
            const isLeftHand = hand.handedness === 'Left';
            const targetArray = isLeftHand ? leftHandKeypoints : rightHandKeypoints;

            hand.keypoints.forEach((keypoint, index) => {
                if (index < 21) {
                    const baseIdx = index * 3;
                    targetArray[baseIdx] = keypoint.x;  // x coordinate
                    targetArray[baseIdx + 1] = keypoint.y;  // y coordinate
                    targetArray[baseIdx + 2] = keypoint.z || 0;  // z coordinate (if available)
                }
            });
        });

        return [leftHandKeypoints, rightHandKeypoints];
    }

    /**
     * Create empty face keypoints (since MediaPipe face mesh is not fully supported in TF.js)
     * @returns {Array} Empty face keypoints array
     */
    createEmptyFaceKeypoints() {
        // 468 face landmarks with x,y,z
        return new Array(468 * 3).fill(0);
    }

    /**
     * Normalize keypoints to be invariant to camera distance and position
     * @param {Array} keypoints - Raw keypoints array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Array} Normalized keypoints
     */
    normalizeKeypoints(keypoints, width, height) {
        // Create a copy to avoid modifying the original
        const normalized = [...keypoints];

        // Process pose keypoints (x,y,z,visibility)
        for (let i = 0; i < 33; i++) {
            const baseIdx = i * 4;
            normalized[baseIdx] = (normalized[baseIdx] - 0.5) * 2;  // x: [0,1] -> [-1,1]
            normalized[baseIdx + 1] = (normalized[baseIdx + 1] - 0.5) * 2;  // y: [0,1] -> [-1,1]
        }

        // Process face and hand keypoints (x,y,z)
        const startIdx = 33 * 4;
        for (let i = startIdx; i < normalized.length; i += 3) {
            normalized[i] = (normalized[i] - 0.5) * 2;  // x: [0,1] -> [-1,1]
            normalized[i + 1] = (normalized[i + 1] - 0.5) * 2;  // y: [0,1] -> [-1,1]
        }

        return normalized;
    }

    /**
     * Dispose of the models to free memory
     */
    dispose() {
        if (this.poseModel) {
            this.poseModel.dispose();
            this.poseModel = null;
        }

        if (this.handModel) {
            this.handModel.dispose();
            this.handModel = null;
        }

        this.isInitialized = false;
    }
}

// Create and export singleton instance
export default new MediaPipeService();