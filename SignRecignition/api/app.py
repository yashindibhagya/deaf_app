"""
FastAPI service for sign language recognition.
This API processes video input and returns the recognized signs.
"""

import os
import tempfile
import uuid
import cv2
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import pickle
import sys
import base64
from pydantic import BaseModel
from typing import List, Optional

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.preprocessing.extract_keypoints import process_video
from src.inference.predict import SignLanguageRecognizer

# Initialize FastAPI
app = FastAPI(
    title="Sign Language Recognition API",
    description="API for recognizing sign language from video",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (modify this in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
MODEL_PATH = os.getenv("MODEL_PATH", "models/sign_language_model.h5")
SCALER_PATH = os.getenv("SCALER_PATH", "models/scaler.pkl")
LABEL_ENCODER_PATH = os.getenv("LABEL_ENCODER_PATH", "models/label_encoder.pkl")

# Initialize the recognizer
recognizer = None

# Data models
class FrameData(BaseModel):
    frame: str  # Base64 encoded image
    timestamp: Optional[float] = None

class RecognitionResponse(BaseModel):
    text: str
    confidence: float
    details: List[dict]

@app.on_event("startup")
async def startup_event():
    """Initialize the recognizer when the API starts."""
    global recognizer
    
    # Check if model files exist
    for path in [MODEL_PATH, SCALER_PATH, LABEL_ENCODER_PATH]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
    
    # Initialize the recognizer
    recognizer = SignLanguageRecognizer(
        model_path=MODEL_PATH,
        scaler_path=SCALER_PATH,
        label_encoder_path=LABEL_ENCODER_PATH
    )
    
    # Warm-up the model
    dummy_input = np.zeros((1, 30, 84))  # (batch, frames, features)
    recognizer.model.predict(dummy_input)
    
    print("Recognizer initialized successfully.")

@app.get("/")
async def root():
    """Root endpoint that returns a welcome message."""
    return {"message": "Welcome to the Sign Language Recognition API"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    if recognizer is None:
        raise HTTPException(status_code=503, detail="Recognizer not initialized")
    return {"status": "healthy"}

@app.get("/classes")
async def get_classes():
    """Get the list of sign classes that the model can recognize."""
    if recognizer is None:
        raise HTTPException(status_code=503, detail="Recognizer not initialized")
    
    return {"classes": recognizer.label_encoder.classes_.tolist()}

@app.post("/recognize/video", response_model=RecognitionResponse)
async def recognize_video(video: UploadFile = File(...)):
    """
    Process a video file and return the recognized sign language text.
    
    Args:
        video: Uploaded video file
    
    Returns:
        JSON with recognized text and confidence
    """
    if recognizer is None:
        raise HTTPException(status_code=503, detail="Recognizer not initialized")
    
    # Save the uploaded file temporarily
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    temp_file.write(await video.read())
    temp_file.close()
    
    try:
        # Process the video
        processed_path = f"{temp_file.name}_processed.npy"
        keypoints = process_video(temp_file.name, processed_path)
        
        # Ensure we have enough frames
        if keypoints.shape[0] < 5:
            raise HTTPException(status_code=400, detail="Video too short, needs at least 5 frames")
        
        # Scale features
        X_reshaped = keypoints.reshape(-1, keypoints.shape[-1])
        X_scaled = recognizer.scaler.transform(X_reshaped)
        X_scaled = X_scaled.reshape(1, keypoints.shape[0], keypoints.shape[1])
        
        # Make prediction
        prediction_scores = recognizer.model.predict(X_scaled)[0]
        top_indices = np.argsort(prediction_scores)[-3:][::-1]  # Top 3 predictions
        
        # Get the top predictions
        details = []
        for idx in top_indices:
            sign = recognizer.label_encoder.inverse_transform([idx])[0]
            confidence = float(prediction_scores[idx])
            details.append({"sign": sign, "confidence": confidence})
        
        # Get the top prediction
        predicted_class_idx = np.argmax(prediction_scores)
        sign = recognizer.label_encoder.inverse_transform([predicted_class_idx])[0]
        confidence = float(prediction_scores[predicted_class_idx])
        
        return {
            "text": sign,
            "confidence": confidence,
            "details": details
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")
    
    finally:
        # Clean up
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)
        if os.path.exists(processed_path):
            os.remove(processed_path)

@app.post("/recognize/frames", response_model=RecognitionResponse)
async def recognize_frames(frames: List[FrameData]):
    """
    Process a sequence of frames and return the recognized sign language text.
    
    Args:
        frames: List of base64 encoded frames
    
    Returns:
        JSON with recognized text and confidence
    """
    if recognizer is None:
        raise HTTPException(status_code=503, detail="Recognizer not initialized")
    
    if len(frames) < 5:
        raise HTTPException(status_code=400, detail="Not enough frames, need at least 5")
    
    try:
        # Process each frame
        keypoints_list = []
        for frame_data in frames:
            # Decode base64 image
            img_bytes = base64.b64decode(frame_data.frame)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                raise HTTPException(status_code=400, detail="Invalid image data")
            
            # Extract keypoints
            keypoints = recognizer.hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            # Convert to feature vector (this should match your model's expected input)
            keypoint_vector = np.zeros(84)  # Adjust size based on your model
            if keypoints.multi_hand_landmarks:
                for hand_idx, hand_landmarks in enumerate(keypoints.multi_hand_landmarks):
                    if hand_idx >= 2:  # Only process up to 2 hands
                        break
                        
                    # Determine hand side (left or right)
                    handedness = keypoints.multi_handedness[hand_idx].classification[0].label
                    hand_offset = 0 if handedness == "Left" else 42  # Offset for right hand
                    
                    # Extract keypoints
                    for i, landmark in enumerate(hand_landmarks.landmark):
                        keypoint_vector[hand_offset + i*2] = landmark.x
                        keypoint_vector[hand_offset + i*2 + 1] = landmark.y
            
            keypoints_list.append(keypoint_vector)
        
        # Convert to numpy array
        keypoints_array = np.array(keypoints_list)
        
        # Scale features
        X_reshaped = keypoints_array.reshape(-1, keypoints_array.shape[-1])
        X_scaled = recognizer.scaler.transform(X_reshaped)
        X_scaled = X_scaled.reshape(1, keypoints_array.shape[0], keypoints_array.shape[1])
        
        # Make prediction
        prediction_scores = recognizer.model.predict(X_scaled)[0]
        top_indices = np.argsort(prediction_scores)[-3:][::-1]  # Top 3 predictions
        
        # Get the top predictions
        details = []
        for idx in top_indices:
            sign = recognizer.label_encoder.inverse_transform([idx])[0]
            confidence = float(prediction_scores[idx])
            details.append({"sign": sign, "confidence": confidence})
        
        # Get the top prediction
        predicted_class_idx = np.argmax(prediction_scores)
        sign = recognizer.label_encoder.inverse_transform([predicted_class_idx])[0]
        confidence = float(prediction_scores[predicted_class_idx])
        
        return {
            "text": sign,
            "confidence": confidence,
            "details": details
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing frames: {str(e)}")

@app.post("/recognize/continuous", response_model=RecognitionResponse)
async def recognize_continuous(frame: FrameData):
    """
    Process a single frame as part of continuous recognition.
    This endpoint maintains a buffer of frames and makes predictions when enough frames are collected.
    
    Args:
        frame: Base64 encoded frame
    
    Returns:
        JSON with recognized text and confidence (if a prediction was made)
    """
    if recognizer is None:
        raise HTTPException(status_code=503, detail="Recognizer not initialized")
    
    try:
        # Decode base64 image
        img_bytes = base64.b64decode(frame.frame)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Process the frame
        recognizer.add_frame(img)
        
        # Make prediction
        prediction, confidence = recognizer.predict()
        
        if prediction is not None:
            # Return the prediction
            return {
                "text": prediction,
                "confidence": float(confidence),
                "details": [{"sign": prediction, "confidence": float(confidence)}]
            }
        else:
            # No prediction yet
            return {
                "text": "",
                "confidence": 0.0,
                "details": []
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing frame: {str(e)}")

@app.post("/reset")
async def reset_recognition():
    """Reset the continuous recognition buffer."""
    if recognizer is None:
        raise HTTPException(status_code=503, detail="Recognizer not initialized")
    
    recognizer.reset()
    return {"status": "ok"}

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Start the sign language recognition API server.')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to listen on')
    parser.add_argument('--port', type=int, default=8000, help='Port to listen on')
    parser.add_argument('--model', type=str, default='models/sign_language_model.h5', help='Path to the model file')
    parser.add_argument('--scaler', type=str, default='models/scaler.pkl', help='Path to the scaler file')
    parser.add_argument('--encoder', type=str, default='models/label_encoder.pkl', help='Path to the label encoder file')
    
    args = parser.parse_args()
    
    # Set environment variables
    os.environ['MODEL_PATH'] = args.model
    os.environ['SCALER_PATH'] = args.scaler
    os.environ['LABEL_ENCODER_PATH'] = args.encoder
    
    # Start the server
    uvicorn.run("app:app", host=args.host, port=args.port, reload=False)