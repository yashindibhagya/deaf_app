import * as FileSystem from 'expo-file-system';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

// Model URLs - update these to point to your actual model files
const MODEL_URL = 'https://storage.googleapis.com/sign-language-model/model.json';
const WEIGHTS_URL_PREFIX = 'https://storage.googleapis.com/sign-language-model/';

// Local paths for storing the model
const MODEL_PATH = FileSystem.documentDirectory + 'sign_language_model';
const MODEL_JSON_PATH = MODEL_PATH + '/model.json';

/**
 * Check if the model exists in local storage
 * @returns {Promise<boolean>} True if the model exists, false otherwise
 */
export const checkModelExists = async () => {
    try {
        const modelInfo = await FileSystem.getInfoAsync(MODEL_JSON_PATH);
        return modelInfo.exists;
    } catch (error) {
        console.error('Error checking if model exists:', error);
        return false;
    }
};

/**
 * Download and save the model to local storage
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export const downloadAndSaveModel = async () => {
    try {
        console.log('Starting model download from:', MODEL_URL);

        // Create directory if it doesn't exist
        const dirInfo = await FileSystem.getInfoAsync(MODEL_PATH);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(MODEL_PATH, { intermediates: true });
            console.log('Created model directory');
        }

        // Download model.json
        console.log('Downloading model.json...');
        const modelJsonResponse = await fetch(MODEL_URL);

        if (!modelJsonResponse.ok) {
            throw new Error(`Failed to fetch model.json: ${modelJsonResponse.status} ${modelJsonResponse.statusText}`);
        }

        const modelJson = await modelJsonResponse.json();
        console.log('Model.json downloaded successfully');

        // Update paths in the model.json to point to local files
        if (modelJson.weightsManifest && modelJson.weightsManifest.length > 0) {
            // Save original paths for downloading
            const originalPaths = [...modelJson.weightsManifest[0].paths];

            // Update paths to local references
            for (let i = 0; i < modelJson.weightsManifest[0].paths.length; i++) {
                const path = modelJson.weightsManifest[0].paths[i];
                modelJson.weightsManifest[0].paths[i] = path.split('/').pop();
            }

            // Save the updated model.json
            await FileSystem.writeAsStringAsync(
                MODEL_JSON_PATH,
                JSON.stringify(modelJson)
            );
            console.log('Saved model.json with updated paths');

            // Download each weights file
            for (const originalPath of originalPaths) {
                const fileName = originalPath.split('/').pop();
                const weightsUrl = `${WEIGHTS_URL_PREFIX}${originalPath}`;
                const localPath = `${MODEL_PATH}/${fileName}`;

                console.log(`Downloading weights: ${fileName}`);
                const weightsResponse = await fetch(weightsUrl);

                if (!weightsResponse.ok) {
                    throw new Error(`Failed to fetch weights: ${weightsResponse.status} ${weightsResponse.statusText}`);
                }

                const weightsArrayBuffer = await weightsResponse.arrayBuffer();
                await FileSystem.writeAsStringAsync(
                    localPath,
                    arrayBufferToBase64(weightsArrayBuffer),
                    { encoding: FileSystem.EncodingType.Base64 }
                );
                console.log(`Saved weights: ${fileName}`);
            }

            console.log('All model files downloaded successfully');
            return true;
        } else {
            throw new Error('Invalid model.json format: no weights manifest found');
        }
    } catch (error) {
        console.error('Error downloading model:', error);
        return false;
    }
};

/**
 * Load the model from local storage or download it if not available
 * @returns {Promise<tf.LayersModel|null>} The loaded model or null if it failed
 */
export const loadOrDownloadModel = async () => {
    try {
        // Check if TensorFlow.js is ready
        await tf.ready();
        console.log('TensorFlow.js is ready');

        // Check if model exists locally
        const modelExists = await checkModelExists();

        if (modelExists) {
            try {
                // Try to load from local storage
                console.log('Loading model from local storage');
                const model = await tf.loadLayersModel(`file://${MODEL_JSON_PATH}`);
                console.log('Model loaded from local storage successfully');
                return model;
            } catch (loadError) {
                console.error('Error loading local model:', loadError);
                console.log('Attempting to download model');

                // Try downloading the model
                const downloadSuccess = await downloadAndSaveModel();

                if (downloadSuccess) {
                    try {
                        // Try loading the downloaded model
                        const model = await tf.loadLayersModel(`file://${MODEL_JSON_PATH}`);
                        console.log('Downloaded model loaded successfully');
                        return model;
                    } catch (reloadError) {
                        console.error('Error loading downloaded model:', reloadError);
                        return null;
                    }
                } else {
                    console.error('Failed to download model');
                    return null;
                }
            }
        } else {
            // Model doesn't exist locally, download it
            console.log('Model not found locally, downloading');
            const downloadSuccess = await downloadAndSaveModel();

            if (downloadSuccess) {
                try {
                    // Try loading the downloaded model
                    const model = await tf.loadLayersModel(`file://${MODEL_JSON_PATH}`);
                    console.log('Downloaded model loaded successfully');
                    return model;
                } catch (loadError) {
                    console.error('Error loading downloaded model:', loadError);
                    return null;
                }
            } else {
                console.error('Failed to download model');
                return null;
            }
        }
    } catch (error) {
        console.error('Error in loadOrDownloadModel:', error);
        return null;
    }
};

/**
 * Convert an ArrayBuffer to a base64 string
 * @param {ArrayBuffer} buffer - The ArrayBuffer to convert
 * @returns {string} The base64 string
 */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}

/**
 * Prepare the model for use
 * This function ensures the model is loaded and ready for predictions
 * @returns {Promise<{success: boolean, model: tf.LayersModel|null, error: string|null}>} Result object
 */
export const prepareModel = async () => {
    try {
        console.log('Preparing model...');

        // Check TensorFlow.js is ready
        await tf.ready();

        // Load or download the model
        const model = await loadOrDownloadModel();

        if (model) {
            // Do a warmup prediction to ensure everything is working
            console.log('Performing warmup prediction...');

            // Create a dummy input tensor matching your model's input shape
            // Adjust the shape based on your actual model's input requirements
            const dummyInput = tf.zeros([1, 30, 1662]); // Adjust shape as needed

            try {
                // Run a prediction
                const warmupResult = await model.predict(dummyInput);

                // Dispose of tensors
                warmupResult.dispose();
                dummyInput.dispose();

                console.log('Model prepared successfully');
                return { success: true, model, error: null };
            } catch (predictionError) {
                console.error('Error during warmup prediction:', predictionError);
                return { success: false, model: null, error: 'Warmup prediction failed' };
            }
        } else {
            return { success: false, model: null, error: 'Failed to load model' };
        }
    } catch (error) {
        console.error('Error preparing model:', error);
        return { success: false, model: null, error: error.message };
    }
}; 