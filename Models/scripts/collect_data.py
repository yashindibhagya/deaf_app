import os
import cv2
import numpy as np
import mediapipe as mp
import sys
import time

# Add the parent directory to the path so we can import from utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.mediapipe_utils import mediapipe_detection, draw_styled_landmarks, extract_keypoints
from utils.config import (
    DATA_PATH, ACTIONS, NUM_SEQUENCES, SEQUENCE_LENGTH,
    MP_DETECTION_CONFIDENCE, MP_TRACKING_CONFIDENCE
)

def setup_directories():
    """Create directories for data collection"""
    for action in ACTIONS:
        action_dir = os.path.join(DATA_PATH, action)
        if not os.path.exists(action_dir):
            os.makedirs(action_dir)
            
        for sequence in range(NUM_SEQUENCES):
            sequence_dir = os.path.join(action_dir, str(sequence))
            if not os.path.exists(sequence_dir):
                os.makedirs(sequence_dir)

def collect_data():
    """Collect sign language data using webcam"""
    setup_directories()
    
    # Set up webcam
    cap = cv2.VideoCapture(0)
    
    # Initialize MediaPipe holistic model
    with mp.solutions.holistic.Holistic(
        min_detection_confidence=MP_DETECTION_CONFIDENCE,
        min_tracking_confidence=MP_TRACKING_CONFIDENCE) as holistic:
        
        # Loop through each action
        for action in ACTIONS:
            # Loop through each video sequence
            for sequence in range(NUM_SEQUENCES):
                # Show instruction
                print(f"Collecting data for action '{action}', sequence {sequence+1}/{NUM_SEQUENCES}")
                
                # Countdown before starting
                for countdown in range(5, 0, -1):
                    ret, frame = cap.read()
                    if not ret:
                        break
                        
                    # Draw countdown
                    cv2.putText(frame, f"Starting in {countdown}...", (120, 200), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 4, cv2.LINE_AA)
                    cv2.putText(frame, f"Prepare to sign '{action}'", (15, 12), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
                    
                    # Show frame
                    cv2.imshow('OpenCV Feed', frame)
                    cv2.waitKey(1000)  # Wait 1 second
                
                # Collect sequence of frames
                for frame_num in range(SEQUENCE_LENGTH):
                    ret, frame = cap.read()
                    if not ret:
                        break
                        
                    # Make detection
                    image, results = mediapipe_detection(frame, holistic)
                    
                    # Draw landmarks
                    image = draw_styled_landmarks(image, results)
                    
                    # Display info
                    cv2.putText(image, f"Recording '{action}' ({frame_num+1}/{SEQUENCE_LENGTH})", (15, 12), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
                    
                    # Show frame
                    cv2.imshow('OpenCV Feed', image)
                    
                    # Extract keypoints
                    keypoints = extract_keypoints(results)
                    
                    # Save keypoints to file
                    npy_path = os.path.join(DATA_PATH, action, str(sequence), str(frame_num))
                    np.save(npy_path, keypoints)
                    
                    # Short delay to match reasonable FPS
                    cv2.waitKey(30)
                
                # Short break between sequences
                time.sleep(2)
    
    # Release webcam
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    collect_data()
    print("Data collection complete!")