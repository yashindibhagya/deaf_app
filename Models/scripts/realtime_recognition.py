import os
import numpy as np
import cv2
import mediapipe as mp
from tensorflow.keras.models import load_model
import sys
import time

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.mediapipe_utils import mediapipe_detection, draw_styled_landmarks, extract_keypoints
from utils.config import ACTIONS, SEQUENCE_LENGTH

# Define paths and constants
MODELS_PATH = os.path.join('models')  # Path to saved models
THRESHOLD = 0.7  # Confidence threshold for predictions
MAX_DISPLAY_ACTIONS = 5  # Maximum number of actions to display

def load_sign_model(model_path=None):
    """
    Load the trained sign language model
    
    Args:
        model_path: Path to the model file (if None, use default)
        
    Returns:
        model: Loaded Keras model
    """
    if model_path is None:
        model_path = os.path.join(MODELS_PATH, 'sign_language_model.keras')
    
    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}")
        sys.exit(1)
    
    model = load_model(model_path)
    print(f"Loaded model from {model_path}")
    
    return model

def viz_probabilities(image, res, actions):
    """
    Visualize prediction probabilities on the image
    
    Args:
        image: Input image
        res: Model prediction results (probabilities array)
        actions: List of action names
        
    Returns:
        image: Image with probability visualization
    """
    output_image = image.copy()
    
    # Get top predictions
    top_indices = np.argsort(res)[-MAX_DISPLAY_ACTIONS:][::-1]
    
    # Draw prediction bar chart
    for i, idx in enumerate(top_indices):
        prob = res[idx]
        action = actions[idx]
        
        # Calculate bar width based on probability
        bar_width = int(prob * 200)  # Scale to a reasonable width
        
        # Set color based on confidence
        if prob >= THRESHOLD:
            color = (0, 255, 0)  # Green for high confidence
        elif prob >= 0.4:
            color = (0, 255, 255)  # Yellow for medium confidence
        else:
            color = (0, 0, 255)  # Red for low confidence
        
        # Draw probability bar
        cv2.rectangle(output_image, (500, 30 + i * 30), (500 + bar_width, 50 + i * 30), color, -1)
        
        # Draw action label
        cv2.putText(output_image, f"{action}: {prob:.2f}", (510, 45 + i * 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    
    # Draw prediction box
    if np.max(res) >= THRESHOLD:
        predicted_action = actions[np.argmax(res)]
        
        # Draw large prediction display
        cv2.rectangle(output_image, (0, 0), (300, 60), (245, 117, 16), -1)
        cv2.putText(output_image, f"Predicted: {predicted_action}", (10, 40),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)
    
    return output_image

def realtime_recognition():
    """
    Perform real-time sign language recognition using webcam
    """
    # Load the trained model
    model = load_sign_model()
    
    # Initialize MediaPipe
    mp_holistic = mp.solutions.holistic
    
    # Set up webcam
    cap = cv2.VideoCapture(0)
    
    # Set webcam properties for better performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    # Variables for real-time detection
    sequence = []
    predictions = []
    sentence = []
    last_prediction_time = time.time()
    prediction_interval = 0.1  # Minimum time between predictions (seconds)
    
    print("Starting real-time sign language recognition...")
    print("Press 'q' to quit")
    
    with mp_holistic.Holistic(
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5) as holistic:
        
        while cap.isOpened():
            # Read frame from webcam
            ret, frame = cap.read()
            if not ret:
                print("Error: Failed to capture image from webcam")
                break
            
            # Make detections
            image, results = mediapipe_detection(frame, holistic)
            
            # Draw landmarks
            image = draw_styled_landmarks(image, results)
            
            # Extract keypoints
            keypoints = extract_keypoints(results)
            
            # Append to sequence
            sequence.append(keypoints)
            
            # Ensure sequence is of correct length
            sequence = sequence[-SEQUENCE_LENGTH:]
            
            # Make predictions when we have enough frames and enough time has passed
            current_time = time.time()
            if len(sequence) == SEQUENCE_LENGTH and (current_time - last_prediction_time) >= prediction_interval:
                # Prepare input for model
                res = model.predict(np.expand_dims(sequence, axis=0), verbose=0)[0]
                predictions.append(res)
                
                # Visualize probabilities
                image = viz_probabilities(image, res, ACTIONS)
                
                # Update sentence with prediction
                if np.max(res) > THRESHOLD:
                    current_action = ACTIONS[np.argmax(res)]
                    
                    # Only add to sentence if it's different from the last prediction
                    if len(sentence) == 0 or current_action != sentence[-1]:
                        sentence.append(current_action)
                        
                    # Limit sentence length
                    if len(sentence) > 5:
                        sentence = sentence[-5:]
                
                last_prediction_time = current_time
            
            # Show current sentence
            cv2.rectangle(image, (0, 60), (640, 100), (0, 0, 0), -1)
            cv2.putText(image, ' '.join(sentence), (10, 90), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)
            
            # Show instructions
            cv2.putText(image, "Press 'q' to quit", (500, 450), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1, cv2.LINE_AA)
            
            # Show frame
            cv2.imshow('Sign Language Recognition', image)
            
            # Break loop if 'q' is pressed
            if cv2.waitKey(10) & 0xFF == ord('q'):
                break
    
    # Release webcam and close windows
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    realtime_recognition()