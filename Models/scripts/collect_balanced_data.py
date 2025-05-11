import os
import cv2
import numpy as np
import mediapipe as mp
import sys
import time
import random

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

def collect_balanced_data():
    """
    Collect sign language data using webcam with better balance and diversity
    """
    setup_directories()
    
    # Set up webcam
    cap = cv2.VideoCapture(0)
    
    # Initialize MediaPipe holistic model
    with mp.solutions.holistic.Holistic(
        min_detection_confidence=MP_DETECTION_CONFIDENCE,
        min_tracking_confidence=MP_TRACKING_CONFIDENCE) as holistic:
        
        # Shuffle actions to prevent order bias
        random_actions = ACTIONS.copy()
        random.shuffle(random_actions)
        
        # Loop through each action in random order
        for action in random_actions:
            # Loop through each video sequence
            for sequence in range(NUM_SEQUENCES):
                # Show instruction
                print(f"Collecting data for action '{action}', sequence {sequence+1}/{NUM_SEQUENCES}")
                
                # Prompt for variety
                variety_tips = [
                    "Try different hand positions",
                    "Vary your distance from camera",
                    "Move slightly to the left/right",
                    "Tilt your hand slightly",
                    "Try different lighting angles",
                    "Vary your signing speed"
                ]
                tip = random.choice(variety_tips)
                
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
                    cv2.putText(frame, tip, (15, 40), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1, cv2.LINE_AA)
                    
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
                    
                    # Check if we're detecting hand landmarks
                    hand_detected = results.left_hand_landmarks or results.right_hand_landmarks
                    if not hand_detected:
                        cv2.putText(image, "WARNING: No hand detected!", (15, 40), 
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
                
                # Prompt user if they're satisfied with the sequence
                satisfied = False
                while not satisfied:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # Display prompt
                    cv2.putText(frame, f"Was the sign {action} clear? (Y/N)", (120, 200), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2, cv2.LINE_AA)
                    cv2.putText(frame, "Press 'y' if good, 'n' to redo", (120, 240), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2, cv2.LINE_AA)
                    
                    # Show frame
                    cv2.imshow('OpenCV Feed', frame)
                    
                    # Get response
                    key = cv2.waitKey(0)
                    if key == ord('y'):
                        satisfied = True
                    elif key == ord('n'):
                        print(f"Redoing sequence {sequence+1} for action '{action}'")
                        break  # Break out of satisfaction check, will redo the sequence
                
                # If not satisfied, redo the sequence by decrementing the sequence counter
                if not satisfied:
                    sequence -= 1
                    continue
                
                # Short break between sequences
                time.sleep(1)
    
    # Release webcam
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    collect_balanced_data()
    print("Data collection complete!")