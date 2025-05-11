"""
GestureConnect Configuration

This file centralizes all configuration parameters for the GestureConnect system.
Edit this file to change parameters across the entire application.
"""

import os

# Path Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'processed')  # Where raw data is stored
PROCESSED_DATA_PATH = os.path.join(DATA_PATH, 'processed')  # Where processed data is stored
MODELS_PATH = os.path.join(BASE_DIR, 'models')  # Where models are stored
LOGS_PATH = os.path.join(BASE_DIR, 'logs')  # Where logs are stored

# Actions/Labels - Updated to match your 5-class model
ACTIONS = ["A","B","C","D","E","F", "G", "H"]  # Sign language alphabets that were used in training
#ACTIONS = ["F", "G", "H"]  # Sign language alphabets that were used in training

# Data Collection Parameters
NUM_SEQUENCES = 30  # Number of videos collected per action
SEQUENCE_LENGTH = 30  # Number of frames per video

# Model Parameters
EPOCHS = 100  # Default number of training epochs
BATCH_SIZE = 16  # Smaller batch size for better learning
LEARNING_RATE = 0.001  # Learning rate for optimizer
PREDICTION_THRESHOLD = 0.5  # Confidence threshold for predictions

# Regularization Parameters
DROPOUT_RATE = 0.5  # Increased dropout rate to reduce overfitting

# MediaPipe Parameters
MP_DETECTION_CONFIDENCE = 0.5  # Minimum detection confidence for MediaPipe
MP_TRACKING_CONFIDENCE = 0.5  # Minimum tracking confidence for MediaPipe

# API Server Parameters
API_HOST = "0.0.0.0"  # Default host for the API server
API_PORT = 8000  # Default port for the API server

# Keypoint dimensions
# The expected shape of keypoints after extraction
# This includes pose (33*4), face (468*3), left hand (21*3), right hand (21*3)
KEYPOINT_DIMENSIONS = 1662  # Based on your model's input dimensions

# Create necessary directories
os.makedirs(DATA_PATH, exist_ok=True)
os.makedirs(PROCESSED_DATA_PATH, exist_ok=True)
os.makedirs(MODELS_PATH, exist_ok=True)
os.makedirs(LOGS_PATH, exist_ok=True)