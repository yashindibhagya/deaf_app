"""
Keypoint extraction for sign language recognition.
This script extracts hand keypoints from video frames using MediaPipe.
"""

import os
import cv2
import numpy as np
import mediapipe as mp
from tqdm import tqdm

# Initialize MediaPipe Hand solutions
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

def extract_hand_keypoints(frame, hands_model):
    """
    Extract hand keypoints from a single frame.
    
    Args:
        frame: RGB input frame
        hands_model: MediaPipe hands model instance
        
    Returns:
        keypoints: numpy array of shape (42,) containing x,y coordinates of 21 keypoints for both hands
                  If a hand is not detected, the keypoints are set to 0
    """
    # Convert the frame to RGB
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process the frame with MediaPipe
    results = hands_model.process(frame_rgb)
    
    # Initialize keypoints array (21 keypoints x 2 coordinates x 2 hands = 84 values)
    keypoints = np.zeros(84)
    
    # If hands are detected
    if results.multi_hand_landmarks:
        for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
            if hand_idx >= 2:  # Only process up to 2 hands
                break
                
            # Determine if it's left or right hand
            handedness = results.multi_handedness[hand_idx].classification[0].label
            hand_offset = 0 if handedness == "Left" else 42  # Offset for second hand
            
            # Extract keypoints
            for i, landmark in enumerate(hand_landmarks.landmark):
                keypoints[hand_offset + i*2] = landmark.x  # x coordinate
                keypoints[hand_offset + i*2 + 1] = landmark.y  # y coordinate
    
    return keypoints

def process_video(video_path, output_path, max_frames=60):
    """
    Process a video file to extract hand keypoints.
    
    Args:
        video_path: Path to the input video
        output_path: Path to save the keypoints
        max_frames: Maximum number of frames to process
        
    Returns:
        keypoints: numpy array of shape (frames, 84) containing keypoints for each frame
    """
    # Open video file
    cap = cv2.VideoCapture(video_path)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    # Limit the number of frames to process
    frames_to_process = min(frame_count, max_frames)
    
    # Initialize array to store keypoints
    all_keypoints = []
    
    # Initialize MediaPipe Hands
    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5) as hands:
        
        # Process the video frame by frame
        for frame_idx in tqdm(range(frames_to_process), desc=f"Processing {os.path.basename(video_path)}"):
            ret, frame = cap.read()
            if not ret:
                break
                
            # Extract keypoints
            keypoints = extract_hand_keypoints(frame, hands)
            all_keypoints.append(keypoints)
    
    cap.release()
    
    # Convert to numpy array
    all_keypoints = np.array(all_keypoints)
    
    # Save keypoints
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    np.save(output_path, all_keypoints)
    
    return all_keypoints

def visualize_keypoints(frame, keypoints, threshold=0.01):
    """
    Visualize the extracted keypoints on a frame.
    
    Args:
        frame: The image frame
        keypoints: Keypoints array of shape (84,)
        threshold: Threshold to determine if keypoint is present
        
    Returns:
        frame: The frame with keypoints visualized
    """
    frame_copy = frame.copy()
    
    # Process left hand
    left_hand_keypoints = keypoints[:42].reshape(-1, 2)
    if np.sum(left_hand_keypoints) > threshold:
        # Create a fake hand_landmarks object that MediaPipe can draw
        left_fake_landmarks = mp_hands.HandLandmark
        left_hand_landmarks = {}
        
        for i in range(21):
            left_hand_landmarks[i] = left_hand_keypoints[i]
            
        # Draw the landmarks
        for i, (x, y) in enumerate(left_hand_keypoints):
            if x > 0 and y > 0:
                cv2.circle(frame_copy, (int(x * frame.shape[1]), int(y * frame.shape[0])), 
                        5, (0, 255, 0), -1)
    
    # Process right hand
    right_hand_keypoints = keypoints[42:].reshape(-1, 2)
    if np.sum(right_hand_keypoints) > threshold:
        # Draw the landmarks
        for i, (x, y) in enumerate(right_hand_keypoints):
            if x > 0 and y > 0:
                cv2.circle(frame_copy, (int(x * frame.shape[1]), int(y * frame.shape[0])), 
                        5, (0, 0, 255), -1)
    
    return frame_copy

def preprocess_dataset(input_dir, output_dir, max_frames=60):
    """
    Preprocess all videos in the dataset.
    
    Args:
        input_dir: Directory containing video files
        output_dir: Directory to save processed keypoints
        max_frames: Maximum number of frames to process per video
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Get all video files
    video_files = [f for f in os.listdir(input_dir) if f.endswith(('.mp4', '.avi', '.mov'))]
    
    for video_file in video_files:
        video_path = os.path.join(input_dir, video_file)
        output_path = os.path.join(output_dir, os.path.splitext(video_file)[0] + '.npy')
        
        # Process the video
        process_video(video_path, output_path, max_frames)
        
if __name__ == "__main__":
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description='Extract hand keypoints from sign language videos.')
    parser.add_argument('--input_dir', type=str, required=True, help='Directory containing video files')
    parser.add_argument('--output_dir', type=str, required=True, help='Directory to save processed keypoints')
    parser.add_argument('--max_frames', type=int, default=60, help='Maximum number of frames to process per video')
    
    args = parser.parse_args()
    
    preprocess_dataset(args.input_dir, args.output_dir, args.max_frames)