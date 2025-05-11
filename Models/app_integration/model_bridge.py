import os
import numpy as np
import json
import cv2
import mediapipe as mp
import tensorflow as tf
import sys
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import List, Optional

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.mediapipe_utils import extract_keypoints
from utils.config import (
    MODELS_PATH, ACTIONS, SEQUENCE_LENGTH, PREDICTION_THRESHOLD,
    MP_DETECTION_CONFIDENCE, MP_TRACKING_CONFIDENCE,
    API_HOST, API_PORT
)

# Initialize FastAPI app
app = FastAPI(title="GestureConnect API", 
              description="API for sign language recognition",
              version="1.0.0")

# Configure CORS (important for React Native app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Initialize MediaPipe models
mp_holistic = mp.solutions.holistic

# Data models
class PredictionResult(BaseModel):
    action: str
    confidence: float
    all_probabilities: dict

class FrameData(BaseModel):
    frame_index: int
    keypoints: List[float]

# Global variables
model = None
sequence_buffer = []

def load_model():
    """Load the TensorFlow model"""
    global model
    
    if model is None:
        model_path = os.path.join(MODELS_PATH, 'sign_language_model.keras')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}")
        
        model = tf.keras.models.load_model(model_path)
        print(f"Loaded model from {model_path}")
    
    return model

def process_frame(frame_data):
    """
    Process a single frame containing keypoints
    
    Args:
        frame_data: Raw frame data or keypoints array
        
    Returns:
        keypoints: Extracted keypoints from the frame
    """
    global sequence_buffer
    
    # Extract keypoints from frame data
    if isinstance(frame_data, list):
        # Frame data is already keypoints
        keypoints = np.array(frame_data)
    else:
        # Convert raw frame data to numpy array
        nparr = np.frombuffer(frame_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Make MediaPipe detection
        with mp_holistic.Holistic(
            static_image_mode=True,
            min_detection_confidence=MP_DETECTION_CONFIDENCE) as holistic:
            
            # Convert to RGB for MediaPipe
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame_rgb.flags.writeable = False
            
            # Make detection
            results = holistic.process(frame_rgb)
            
            # Extract keypoints
            keypoints = extract_keypoints(results)
    
    # Add to sequence buffer
    sequence_buffer.append(keypoints)
    
    # Ensure sequence buffer doesn't exceed max length
    sequence_buffer = sequence_buffer[-SEQUENCE_LENGTH:]
    
    return keypoints

def make_prediction():
    """
    Make a prediction based on the current sequence buffer
    
    Returns:
        dict: Prediction result with action, confidence, and all probabilities
    """
    global sequence_buffer
    
    # Load model if not already loaded
    model = load_model()
    
    # Check if we have enough frames
    if len(sequence_buffer) < SEQUENCE_LENGTH:
        return {
            "action": "insufficient_data",
            "confidence": 0.0,
            "all_probabilities": {}
        }
    
    # Resize the buffer to exact sequence length
    while len(sequence_buffer) > SEQUENCE_LENGTH:
        sequence_buffer.pop(0)
    
    # Make prediction
    sequence_array = np.array([sequence_buffer])
    res = model.predict(sequence_array)[0]
    
    # Get predicted action and confidence
    predicted_idx = np.argmax(res)
    confidence = float(res[predicted_idx])
    predicted_action = ACTIONS[predicted_idx] if confidence >= PREDICTION_THRESHOLD else "unknown"
    
    # Create dictionary of all probabilities
    all_probs = {action: float(prob) for action, prob in zip(ACTIONS, res)}
    
    return {
        "action": predicted_action,
        "confidence": confidence,
        "all_probabilities": all_probs
    }

def reset_sequence():
    """Reset the sequence buffer"""
    global sequence_buffer
    sequence_buffer = []

@app.get("/")
async def root():
    """Root endpoint to check if the API is running"""
    return {"message": "GestureConnect API is running"}

@app.post("/predict/frame")
async def predict_from_frame(file: UploadFile = File(...)):
    """
    Process a single frame and update the sequence buffer
    
    Args:
        file: Image file to process
        
    Returns:
        dict: Status and frame index
    """
    try:
        # Read file content
        contents = await file.read()
        
        # Process frame
        keypoints = process_frame(contents)
        
        return {
            "status": "success",
            "frame_index": len(sequence_buffer)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/keypoints")
async def predict_from_keypoints(frame_data: FrameData):
    """
    Process keypoints directly without image processing
    
    Args:
        frame_data: Object containing keypoints
        
    Returns:
        dict: Status and frame index
    """
    try:
        # Process keypoints
        process_frame(frame_data.keypoints)
        
        return {
            "status": "success",
            "frame_index": len(sequence_buffer)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict")
async def get_prediction():
    """
    Get prediction based on current sequence buffer
    
    Returns:
        PredictionResult: Prediction result
    """
    try:
        # Make prediction
        result = make_prediction()
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reset")
async def reset():
    """
    Reset the sequence buffer
    
    Returns:
        dict: Status
    """
    try:
        reset_sequence()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/actions")
async def get_actions():
    """
    Get list of supported actions
    
    Returns:
        dict: List of supported actions
    """
    return {"actions": ACTIONS}

# Run the server directly if file is executed
if __name__ == "__main__":
    # Parse command line arguments for port
    import argparse
    parser = argparse.ArgumentParser(description="GestureConnect API Server")
    parser.add_argument('--port', type=int, default=API_PORT, help='Port to run the server on')
    parser.add_argument('--host', type=str, default=API_HOST, help='Host to run the server on')
    args = parser.parse_args()
    
    # Start server
    print(f"Starting GestureConnect API on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)