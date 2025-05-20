import os
import sys
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import cv2
import mediapipe as mp
from typing import List, Dict, Any
import uvicorn

# Fix the import paths
# Add the project root to Python path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

# Now try to import from utils
try:
    from utils.config import (
        MODELS_PATH, ACTIONS, SEQUENCE_LENGTH, PREDICTION_THRESHOLD,
        MP_DETECTION_CONFIDENCE, MP_TRACKING_CONFIDENCE, API_HOST, API_PORT
    )
    from utils.mediapipe_utils import extract_keypoints
    
    print(f"Successfully imported configuration from {PROJECT_ROOT}/utils/config.py")
except ModuleNotFoundError:
    print(f"Could not find utils.config. Creating default configuration...")
    
    # Default configuration if the module is not found
    MODELS_PATH = os.path.join(PROJECT_ROOT, 'models')
    ACTIONS = ["A", "B", "C", "D", "E"]  # Default actions
    SEQUENCE_LENGTH = 30
    PREDICTION_THRESHOLD = 0.5
    MP_DETECTION_CONFIDENCE = 0.5
    MP_TRACKING_CONFIDENCE = 0.5
    API_HOST = "0.0.0.0"
    API_PORT = 8000
    
    # Define extract_keypoints function if module not found
    def extract_keypoints(results):
        """
        Extracts keypoints from MediaPipe detection results
        
        Args:
            results: MediaPipe detection results
            
        Returns:
            np.array: Flattened array of keypoints
        """
        # Extract pose landmarks
        pose = np.array([[res.x, res.y, res.z, res.visibility] for res in results.pose_landmarks.landmark]).flatten() if results.pose_landmarks else np.zeros(33*4)
        
        # Extract face landmarks
        face = np.array([[res.x, res.y, res.z] for res in results.face_landmarks.landmark]).flatten() if results.face_landmarks else np.zeros(468*3)
        
        # Extract hand landmarks
        lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
        rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
        
        # Concatenate all keypoints
        return np.concatenate([pose, face, lh, rh])

# Ensure necessary directories exist
os.makedirs(MODELS_PATH, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(title="GestureConnect API", 
              description="API for sign language recognition",
              version="1.0.0")

# Enable CORS for React Native app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the models directory as a static files directory
app.mount("/model", StaticFiles(directory=MODELS_PATH), name="model")

# Initialize MediaPipe
mp_holistic = mp.solutions.holistic.Holistic(
    min_detection_confidence=MP_DETECTION_CONFIDENCE,
    min_tracking_confidence=MP_TRACKING_CONFIDENCE
)

# Global variables
model = None
sequence_buffer = []
normalization_params = None

# Load model and normalization parameters
def load_model():
    global model, normalization_params
    
    # Load model
    model_path = os.path.join(MODELS_PATH, 'sign_language_model.keras')
    simple_model_path = os.path.join(MODELS_PATH, 'simple_model.keras')
    
    # Print paths for debugging
    print(f"Looking for models at:")
    print(f"  - {model_path}")
    print(f"  - {simple_model_path}")
    
    if os.path.exists(model_path):
        model = tf.keras.models.load_model(model_path)
        print(f"Loaded model from {model_path}")
    elif os.path.exists(simple_model_path):
        model = tf.keras.models.load_model(simple_model_path)
        print(f"Loaded simple model from {simple_model_path}")
    else:
        print(f"Warning: No models found. The server will not be able to make predictions.")
        print(f"Please make sure your model is saved to {model_path} or {simple_model_path}")
    
    # Load normalization parameters if available
    norm_params_path = os.path.join(MODELS_PATH, 'normalization_params.npy')
    if os.path.exists(norm_params_path):
        normalization_params = np.load(norm_params_path, allow_pickle=True).item()
        print(f"Loaded normalization parameters: {normalization_params}")
    else:
        # Default normalization params if file not found
        normalization_params = {'mean': 0, 'std': 1}
        print("Using default normalization parameters")

# Process a frame and extract keypoints
def process_frame(frame_data):
    global sequence_buffer
    
    # Decode image
    nparr = np.frombuffer(frame_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Convert to RGB for MediaPipe
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image_rgb.flags.writeable = False
    
    # Process with MediaPipe
    results = mp_holistic.process(image_rgb)
    
    # Extract keypoints
    keypoints = extract_keypoints(results)
    
    # Add to sequence buffer
    sequence_buffer.append(keypoints)
    
    # Keep only the necessary number of frames
    if len(sequence_buffer) > SEQUENCE_LENGTH:
        sequence_buffer = sequence_buffer[-SEQUENCE_LENGTH:]
    
    return len(sequence_buffer)

# Make prediction from current sequence buffer
def make_prediction():
    global sequence_buffer, model, normalization_params
    
    # Check if we have enough frames
    if len(sequence_buffer) < SEQUENCE_LENGTH:
        return {
            "action": "insufficient_data",
            "confidence": 0.0,
            "all_probabilities": {}
        }
    
    # Ensure model is loaded
    if model is None:
        try:
            load_model()
        except Exception as e:
            print(f"Error loading model: {e}")
            return {
                "action": "model_error",
                "confidence": 0.0,
                "all_probabilities": {},
                "error": str(e)
            }
        
        # Still no model after trying to load
        if model is None:
            return {
                "action": "no_model",
                "confidence": 0.0,
                "all_probabilities": {},
                "error": "No model available for predictions"
            }
    
    # Prepare input data
    X = np.array(sequence_buffer[-SEQUENCE_LENGTH:])
    
    # Apply normalization if parameters are available
    if normalization_params:
        X = (X - normalization_params['mean']) / (normalization_params['std'] + 1e-8)
    
    # Reshape for model input
    X = np.expand_dims(X, axis=0)
    
    # Make prediction
    try:
        prediction = model.predict(X)[0]
        
        # Get the predicted class
        predicted_idx = np.argmax(prediction)
        confidence = float(prediction[predicted_idx])
        
        # Determine the predicted action
        if confidence >= PREDICTION_THRESHOLD and predicted_idx < len(ACTIONS):
            predicted_action = ACTIONS[predicted_idx]
        else:
            predicted_action = "unknown"
        
        # Create probabilities dictionary
        all_probs = {action: float(prob) for action, prob in zip(ACTIONS, prediction)}
        
        return {
            "action": predicted_action,
            "confidence": confidence,
            "all_probabilities": all_probs
        }
    except Exception as e:
        print(f"Error making prediction: {e}")
        return {
            "action": "prediction_error",
            "confidence": 0.0,
            "all_probabilities": {},
            "error": str(e)
        }

# Reset the sequence buffer
def reset_sequence():
    global sequence_buffer
    sequence_buffer = []

# API Routes
@app.get("/")
async def root():
    return {"message": "GestureConnect API is running", "actions": ACTIONS}

@app.post("/predict/frame")
async def predict_frame(file: UploadFile = File(...)):
    try:
        # Read file content
        contents = await file.read()
        
        # Process frame
        frame_index = process_frame(contents)
        
        return {
            "status": "success",
            "frame_index": frame_index
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict")
async def predict():
    try:
        # Make prediction
        result = make_prediction()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reset")
async def reset():
    try:
        reset_sequence()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status")
async def status():
    return {
        "buffer_length": len(sequence_buffer),
        "model_loaded": model is not None,
        "actions": ACTIONS,
        "threshold": PREDICTION_THRESHOLD
    }

@app.get("/model/info")
async def model_info():
    """Get information about the available model"""
    model_path = os.path.join(MODELS_PATH, 'sign_language_model.keras')
    simple_model_path = os.path.join(MODELS_PATH, 'simple_model.keras')
    
    # Check if models exist
    model_exists = os.path.exists(model_path)
    simple_model_exists = os.path.exists(simple_model_path)
    
    # Get model file info
    model_info = {
        "model_available": model_exists or simple_model_exists,
        "model_path": model_path if model_exists else (simple_model_path if simple_model_exists else None),
        "model_size_mb": None,
        "actions": ACTIONS,
        "sequence_length": SEQUENCE_LENGTH,
        "threshold": PREDICTION_THRESHOLD
    }
    
    # Get model size if available
    if model_exists:
        model_info["model_size_mb"] = os.path.getsize(model_path) / (1024 * 1024)
    elif simple_model_exists:
        model_info["model_size_mb"] = os.path.getsize(simple_model_path) / (1024 * 1024)
    
    return model_info

@app.get("/model/convert")
async def convert_model():
    """Convert Keras model to TensorFlow.js format"""
    try:
        # Check if tensorflowjs is available
        try:
            import tensorflowjs as tfjs
        except ImportError:
            return JSONResponse(
                status_code=500,
                content={"error": "tensorflowjs not installed. Please install with 'pip install tensorflowjs'"}
            )
        
        # Load the model
        model_path = os.path.join(MODELS_PATH, 'sign_language_model.keras')
        simple_model_path = os.path.join(MODELS_PATH, 'simple_model.keras')
        
        if os.path.exists(model_path):
            model = tf.keras.models.load_model(model_path)
            source_path = model_path
        elif os.path.exists(simple_model_path):
            model = tf.keras.models.load_model(simple_model_path)
            source_path = simple_model_path
        else:
            return JSONResponse(
                status_code=404,
                content={"error": "No model found to convert"}
            )
        
        # Create output directory
        output_dir = os.path.join(MODELS_PATH, 'tfjs_model')
        os.makedirs(output_dir, exist_ok=True)
        
        # Convert the model
        tfjs.converters.save_keras_model(model, output_dir)
        
        return {
            "status": "success",
            "message": f"Model converted from {source_path} to TensorFlow.js format",
            "output_dir": output_dir
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error converting model: {str(e)}"}
        )

# Load model on startup
@app.on_event("startup")
async def startup_event():
    try:
        load_model()
    except Exception as e:
        print(f"Warning: Failed to load model during startup: {e}")
        print("Model will be loaded on first prediction request")

if __name__ == "__main__":
    print(f"Starting server on {API_HOST}:{API_PORT}")
    uvicorn.run(app, host=API_HOST, port=API_PORT)