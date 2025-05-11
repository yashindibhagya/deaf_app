import cv2
import numpy as np
import mediapipe as mp

# Initialize MediaPipe models
mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils

def mediapipe_detection(image, model):
    """
    Processes an image with MediaPipe holistic model
    
    Args:
        image: Input image (BGR format from OpenCV)
        model: MediaPipe holistic model instance
        
    Returns:
        image: Processed image (BGR)
        results: MediaPipe detection results
    """
    # Convert to RGB for MediaPipe
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image.flags.writeable = False  # Performance optimization
    
    # Make detection
    results = model.process(image)
    
    # Convert back to BGR
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    return image, results

def draw_styled_landmarks(image, results):
    """
    Draws landmarks on the image with different styles for face, pose, and hands
    
    Args:
        image: Input image
        results: MediaPipe detection results
        
    Returns:
        image: Image with landmarks drawn
    """
    # Face landmarks (blue)
    if results.face_landmarks:
        mp_drawing.draw_landmarks(
            image,
            results.face_landmarks,
            mp_holistic.FACEMESH_CONTOURS,
            mp_drawing.DrawingSpec(color=(255, 117, 66), thickness=1, circle_radius=1),
            mp_drawing.DrawingSpec(color=(255, 66, 230), thickness=1, circle_radius=1)
        )
    
    # Pose landmarks (green)
    if results.pose_landmarks:
        mp_drawing.draw_landmarks(
            image,
            results.pose_landmarks,
            mp_holistic.POSE_CONNECTIONS,
            mp_drawing.DrawingSpec(color=(80, 22, 10), thickness=2, circle_radius=4),
            mp_drawing.DrawingSpec(color=(80, 44, 121), thickness=2, circle_radius=2)
        )
    
    # Left hand landmarks (purple)
    if results.left_hand_landmarks:
        mp_drawing.draw_landmarks(
            image,
            results.left_hand_landmarks,
            mp_holistic.HAND_CONNECTIONS,
            mp_drawing.DrawingSpec(color=(121, 22, 76), thickness=2, circle_radius=4),
            mp_drawing.DrawingSpec(color=(121, 44, 250), thickness=2, circle_radius=2)
        )
    
    # Right hand landmarks (orange)
    if results.right_hand_landmarks:
        mp_drawing.draw_landmarks(
            image,
            results.right_hand_landmarks,
            mp_holistic.HAND_CONNECTIONS,
            mp_drawing.DrawingSpec(color=(245, 117, 66), thickness=2, circle_radius=4),
            mp_drawing.DrawingSpec(color=(245, 66, 230), thickness=2, circle_radius=2)
        )
        
    return image

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