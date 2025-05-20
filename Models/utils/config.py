#!/usr/bin/env python3
"""
GestureConnect Configuration

This file centralizes all configuration parameters for the GestureConnect system.
Edit this file to change parameters across the entire application.
"""

import os

# Path Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, 'data')  # Where raw data is stored
PROCESSED_DATA_PATH = os.path.join(DATA_PATH, 'processed')  # Where processed data is stored
MODELS_PATH = os.path.join(BASE_DIR, 'models')  # Where models are stored
LOGS_PATH = os.path.join(BASE_DIR, 'logs')  # Where logs are stored

# Actions/Labels
#ACTIONS = ["ayanna","aayanna","aeyanna"]  # Sign language alphabets
ACTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "what", "your", "name", "how", "you", "thankyou", "old"]  # Sign language alphabets
#"U","V","W","X","Y","Z"

# Data Collection Parameters
NUM_SEQUENCES = 100  # Number of videos collected per action
SEQUENCE_LENGTH = 30  # Number of frames per video

# Data Augmentation Parameters
USE_AUGMENTATION = True  # Enable data augmentation
AUGMENTATION_FACTOR = 2  # Multiply dataset size by this factor through augmentation
RANDOM_ROTATION_MAX = 10  # Max rotation angle in degrees
RANDOM_SHIFT_MAX = 0.1  # Max shift as fraction of frame size
RANDOM_SCALE_RANGE = (0.9, 1.1)  # Range of random scaling

# Model Parameters
EPOCHS = 200  # Increased epochs for better learning
BATCH_SIZE = 16  # Smaller batch size for better learning
LEARNING_RATE = 0.0005  # Reduced learning rate for more stable training
PREDICTION_THRESHOLD = 0.7  # Increased threshold for more confident predictions

# Regularization Parameters
DROPOUT_RATE = 0.5  # Dropout rate to reduce overfitting
L2_REGULARIZATION = 0.001  # L2 regularization strength

# Train/Test Split
TEST_SIZE = 0.20  # 20% for test data

# MediaPipe Parameters
MP_DETECTION_CONFIDENCE = 0.5  # Minimum detection confidence for MediaPipe
MP_TRACKING_CONFIDENCE = 0.5  # Minimum tracking confidence for MediaPipe

# API Server Parameters
API_HOST = "0.0.0.0"  # Default host for the API server
API_PORT = 8000  # Default port for the API server

# Keypoint dimensions
# The expected shape of keypoints after extraction
KEYPOINT_DIMENSIONS = 1662  # Full dimensionality of extracted keypoints

# Create necessary directories
os.makedirs(DATA_PATH, exist_ok=True)
os.makedirs(PROCESSED_DATA_PATH, exist_ok=True)
os.makedirs(MODELS_PATH, exist_ok=True)
os.makedirs(LOGS_PATH, exist_ok=True)