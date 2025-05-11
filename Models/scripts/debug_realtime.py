import os
import numpy as np
import cv2
import mediapipe as mp
import tensorflow as tf
from tensorflow.keras.models import load_model
import sys
import time

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.mediapipe_utils import mediapipe_detection, draw_styled_landmarks, extract_keypoints
from utils.config import MODELS_PATH, ACTIONS, SEQUENCE_LENGTH

def debug_realtime_recognition():
    """
    Debug version of real-time recognition that prints detailed prediction info
    """
    # Load model
    model_path = os.path.join(MODELS_PATH, 'sign_language_model.keras')
    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}")
        sys.exit(1)
    
    print(f"Loading model from {model_path}")
    model = load_model(model_path)
    
    # Print model summary
    model.summary()
    
    # Print actions/classes
    print(f"Configured actions: {ACTIONS}")
    num_classes = model.layers[-1].output_shape[-1]
    print(f"Model output classes: {num_classes}")
    if num_classes != len(ACTIONS):
        print("WARNING: Number of model output classes doesn't match configured actions!")
        print(f"This suggests the model was trained with a different set of actions.")
    
    # Set up webcam
    cap = cv2.VideoCapture(0)
    
    # Initialize MediaPipe
    mp_holistic = mp.solutions.holistic
    
    # Variables for real-time detection
    sequence = []
    
    # Begin detection loop
    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        while cap.isOpened():
            # Read frame
            ret, frame = cap.read()
            if not ret:
                break
            
            # Make detections
            image, results = mediapipe_detection(frame, holistic)
            
            # Draw landmarks
            image = draw_styled_landmarks(image, results)
            
            # Extract keypoints
            keypoints = extract_keypoints(results)
            
            # Print keypoint shape for verification
            if len(sequence) == 0:
                print(f"Keypoint shape: {keypoints.shape}")
            
            # Append keypoints to sequence
            sequence.append(keypoints)
            sequence = sequence[-SEQUENCE_LENGTH:]
            
            # Display how many frames we have collected
            cv2.putText(image, f"Frames: {len(sequence)}/{SEQUENCE_LENGTH}", 
                       (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
            
            # Show prediction when we have enough frames
            if len(sequence) == SEQUENCE_LENGTH:
                # Convert to numpy array and reshape for prediction
                X = np.array(sequence).reshape(1, SEQUENCE_LENGTH, -1)
                print(f"Input shape: {X.shape}")
                
                # Get raw predictions
                prediction = model.predict(X)[0]
                
                # Print raw prediction values for all classes
                print("\nRAW PREDICTIONS:")
                for i, prob in enumerate(prediction):
                    class_name = ACTIONS[i] if i < len(ACTIONS) else f"Unknown_{i}"
                    print(f"  {class_name}: {prob:.4f}")
                
                # Get predicted class
                predicted_class_idx = np.argmax(prediction)
                confidence = prediction[predicted_class_idx]
                
                # Display prediction
                predicted_action = ACTIONS[predicted_class_idx] if predicted_class_idx < len(ACTIONS) else f"Unknown_{predicted_class_idx}"
                print(f"PREDICTION: {predicted_action} (Confidence: {confidence:.4f})")
                
                # Display on frame
                cv2.putText(image, f"Class: {predicted_action}", 
                           (15, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
                cv2.putText(image, f"Conf: {confidence:.2f}", 
                           (15, 110), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
            
            # Show the frame
            cv2.imshow('Sign Language Debug', image)
            
            # Break on 'q' press
            if cv2.waitKey(10) & 0xFF == ord('q'):
                break
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    debug_realtime_recognition()