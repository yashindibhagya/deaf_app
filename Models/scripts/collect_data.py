import os
import cv2
import numpy as np
import mediapipe as mp
import sys
import time
from datetime import datetime

# Add the parent directory to the path so we can import from utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.mediapipe_utils import mediapipe_detection, draw_styled_landmarks, extract_keypoints
from utils.config import (
    DATA_PATH, ACTIONS, DYNAMIC_SIGNS, NUM_SEQUENCES, SEQUENCE_LENGTH,
    MP_DETECTION_CONFIDENCE, MP_TRACKING_CONFIDENCE, VIDEO_FPS, VIDEO_EXTENSION
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

def save_video(frames, action, sequence):
    """Save a sequence of frames as a video file"""
    if not frames:
        return
    
    # Create video writer
    video_path = os.path.join(DATA_PATH, action, str(sequence), f"video{VIDEO_EXTENSION}")
    height, width = frames[0].shape[:2]
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(video_path, fourcc, VIDEO_FPS, (width, height))
    
    # Write frames to video
    for frame in frames:
        out.write(frame)
    
    out.release()
    print(f"Saved video to {video_path}")

def collect_data():
    """Collect sign language data using webcam"""
    setup_directories()
    
    # Set up webcam
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, VIDEO_FPS)
    
    # Initialize MediaPipe holistic model
    with mp.solutions.holistic.Holistic(
        min_detection_confidence=MP_DETECTION_CONFIDENCE,
        min_tracking_confidence=MP_TRACKING_CONFIDENCE) as holistic:
        
        # Loop through each action
        for action in ACTIONS:
            is_dynamic = action in DYNAMIC_SIGNS
            print(f"\nCollecting data for action '{action}' ({'dynamic' if is_dynamic else 'static'})")
            
            # Loop through each video sequence
            for sequence in range(NUM_SEQUENCES):
                print(f"Sequence {sequence+1}/{NUM_SEQUENCES}")
                
                # Countdown before starting
                for countdown in range(5, 0, -1):
                    ret, frame = cap.read()
                    if not ret:
                        break
                        
                    # Draw countdown and instructions
                    cv2.putText(frame, f"Starting in {countdown}...", (120, 200), 
                              cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 4, cv2.LINE_AA)
                    cv2.putText(frame, f"Prepare to sign '{action}'", (15, 12), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
                    cv2.putText(frame, f"Type: {'Dynamic' if is_dynamic else 'Static'}", (15, 40),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
                    
                    # Show frame
                    cv2.imshow('OpenCV Feed', frame)
                    cv2.waitKey(1000)  # Wait 1 second
                
                # Collect sequence of frames
                frames = []  # Store frames for video if dynamic
                keypoints_sequence = []  # Store keypoints for both types
                
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
                    cv2.putText(image, f"Type: {'Dynamic' if is_dynamic else 'Static'}", (15, 40),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
                    
                    # Show frame
                    cv2.imshow('OpenCV Feed', image)
                    
                    # Extract and store keypoints
                    keypoints = extract_keypoints(results)
                    keypoints_sequence.append(keypoints)
                    
                    # Store frame if dynamic
                    if is_dynamic:
                        frames.append(frame)
                    
                    # Save keypoints for both types
                    npy_path = os.path.join(DATA_PATH, action, str(sequence), f"{frame_num}.npy")
                    np.save(npy_path, keypoints)
                    
                    # Short delay to match reasonable FPS
                    cv2.waitKey(30)
                
                # Save video if dynamic
                if is_dynamic and frames:
                    save_video(frames, action, sequence)
                
                # Save sequence metadata
                metadata = {
                    'action': action,
                    'sequence': sequence,
                    'is_dynamic': is_dynamic,
                    'timestamp': datetime.now().isoformat(),
                    'fps': VIDEO_FPS,
                    'frame_count': len(keypoints_sequence)
                }
                metadata_path = os.path.join(DATA_PATH, action, str(sequence), 'metadata.npy')
                np.save(metadata_path, metadata)
                
                # Short break between sequences
                time.sleep(2)
    
    # Release webcam
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    collect_data()
    print("Data collection complete!")