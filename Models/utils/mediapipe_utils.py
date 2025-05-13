# utils/mediapipe_utils.py
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
    # Create a copy of the image to avoid modifying the original
    img = image.copy()
    
    # Define drawing specs for better visibility
    face_spec = mp_drawing.DrawingSpec(color=(80, 110, 10), thickness=1, circle_radius=1)
    face_conn_spec = mp_drawing.DrawingSpec(color=(80, 256, 121), thickness=1, circle_radius=1)
    
    pose_spec = mp_drawing.DrawingSpec(color=(80, 22, 10), thickness=2, circle_radius=4)
    pose_conn_spec = mp_drawing.DrawingSpec(color=(80, 44, 121), thickness=2, circle_radius=2)
    
    lhand_spec = mp_drawing.DrawingSpec(color=(121, 22, 76), thickness=2, circle_radius=4)
    lhand_conn_spec = mp_drawing.DrawingSpec(color=(121, 44, 250), thickness=2, circle_radius=2)
    
    rhand_spec = mp_drawing.DrawingSpec(color=(245, 117, 66), thickness=2, circle_radius=4)
    rhand_conn_spec = mp_drawing.DrawingSpec(color=(245, 66, 230), thickness=2, circle_radius=2)
    
    # Draw face landmarks
    if results.face_landmarks:
        mp_drawing.draw_landmarks(
            img, results.face_landmarks, mp_holistic.FACEMESH_CONTOURS,
            face_spec, face_conn_spec
        )
    
    # Draw pose landmarks
    if results.pose_landmarks:
        mp_drawing.draw_landmarks(
            img, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS,
            pose_spec, pose_conn_spec
        )
    
    # Draw left hand landmarks
    if results.left_hand_landmarks:
        mp_drawing.draw_landmarks(
            img, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS,
            lhand_spec, lhand_conn_spec
        )
    
    # Draw right hand landmarks
    if results.right_hand_landmarks:
        mp_drawing.draw_landmarks(
            img, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS,
            rhand_spec, rhand_conn_spec
        )
    
    # Add indicators for hand detection status
    if not results.left_hand_landmarks and not results.right_hand_landmarks:
        # No hands detected - show warning
        cv2.putText(img, "No hands detected", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2, cv2.LINE_AA)
    
    return img

def extract_keypoints(results):
    """
    Extracts keypoints from MediaPipe detection results with improved handling
    
    Args:
        results: MediaPipe detection results
        
    Returns:
        np.array: Flattened array of keypoints
    """
    # Extract pose landmarks
    if results.pose_landmarks:
        pose = np.array([[res.x, res.y, res.z, res.visibility] for res in results.pose_landmarks.landmark]).flatten()
    else:
        pose = np.zeros(33*4)
    
    # Extract face landmarks
    if results.face_landmarks:
        face = np.array([[res.x, res.y, res.z] for res in results.face_landmarks.landmark]).flatten()
    else:
        face = np.zeros(468*3)
    
    # Extract left hand landmarks
    if results.left_hand_landmarks:
        lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten()
    else:
        lh = np.zeros(21*3)
    
    # Extract right hand landmarks
    if results.right_hand_landmarks:
        rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten()
    else:
        rh = np.zeros(21*3)
    
    # Combine all keypoints
    return np.concatenate([pose, face, lh, rh])