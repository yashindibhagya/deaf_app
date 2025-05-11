import os
import numpy as np
import tensorflow as tf
import cv2
import mediapipe as mp
import sys

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.mediapipe_utils import mediapipe_detection, draw_styled_landmarks, extract_keypoints
from utils.config import MODELS_PATH, ACTIONS, SEQUENCE_LENGTH

def test_simple_model():
    """
    Test the simple model with a single static sign.
    This will help verify if the model can recognize even one sign correctly.
    """
    # Load the model
    model_path = os.path.join(MODELS_PATH, 'simple_model.keras')
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}")
        print("Run train_simple_model.py first")
        return
    
    # Load normalization parameters
    norm_params_path = os.path.join(MODELS_PATH, 'normalization_params.npy')
    if os.path.exists(norm_params_path):
        norm_params = np.load(norm_params_path, allow_pickle=True).item()
        mean = norm_params['mean']
        std = norm_params['std']
        print(f"Loaded normalization parameters: mean={mean}, std={std}")
    else:
        print("Warning: Normalization parameters not found, using defaults")
        mean = 0
        std = 1
    
    # Load the model
    model = tf.keras.models.load_model(model_path)
    print(f"Loaded model from {model_path}")
    model.summary()
    
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    
    # MediaPipe Holistic model
    mp_holistic = mp.solutions.holistic
    
    # Variables for sequence collection
    sequence = []
    predictions = []
    threshold = 0.5
    
    # Create window with track bar for threshold
    cv2.namedWindow('Simple Model Test')
    cv2.createTrackbar('Threshold', 'Simple Model Test', int(threshold * 100), 100, lambda x: None)
    
    print("Starting test... Press 'q' to quit, 'c' to clear sequence, 's' to save a good example")
    
    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        while cap.isOpened():
            # Read a frame
            ret, frame = cap.read()
            if not ret:
                print("Error reading from webcam")
                break
            
            # Get current threshold from trackbar
            threshold = cv2.getTrackbarPos('Threshold', 'Simple Model Test') / 100.0
            
            # Make detection
            image, results = mediapipe_detection(frame, holistic)
            
            # Draw landmarks
            image = draw_styled_landmarks(image, results)
            
            # Check if hands are detected
            hand_detected = results.left_hand_landmarks is not None or results.right_hand_landmarks is not None
            
            # Extract keypoints
            keypoints = extract_keypoints(results)
            
            # Append to sequence
            sequence.append(keypoints)
            
            # Keep only the last SEQUENCE_LENGTH frames
            sequence = sequence[-SEQUENCE_LENGTH:]
            
            # Draw sequence progress bar
            cv2.rectangle(image, (0, 0), (int(640 * len(sequence) / SEQUENCE_LENGTH), 20), (0, 255, 0), -1)
            
            # Display hand detection status
            if not hand_detected:
                cv2.putText(image, "No hands detected", (15, 80), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            
            # Make prediction when we have enough frames
            if len(sequence) == SEQUENCE_LENGTH:
                # Convert to array and normalize
                X = np.array(sequence)
                X_norm = (X - mean) / (std + 1e-8)  # Add small epsilon to avoid division by zero
                
                # Reshape for model
                X_norm = np.expand_dims(X_norm, axis=0)
                
                # Make prediction
                prediction = model.predict(X_norm)[0]
                predicted_class_idx = np.argmax(prediction)
                confidence = prediction[predicted_class_idx]
                
                # Add to predictions list
                predictions.append((predicted_class_idx, confidence))
                
                # Keep only the last 10 predictions
                predictions = predictions[-10:]
                
                # Display prediction
                if confidence >= threshold:
                    predicted_action = ACTIONS[predicted_class_idx] if predicted_class_idx < len(ACTIONS) else f"Unknown_{predicted_class_idx}"
                    cv2.putText(image, f"Predicted: {predicted_action}", (15, 50), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                else:
                    cv2.putText(image, "Confidence too low", (15, 50), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 165, 255), 2)
                
                # Show confidence
                cv2.putText(image, f"Confidence: {confidence:.2f}", (15, 120), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                
                # Display all class probabilities
                y_pos = 160
                for i, prob in enumerate(prediction):
                    if i < len(ACTIONS):
                        # Calculate bar width based on probability
                        bar_width = int(prob * 200)
                        
                        # Draw probability bar
                        class_color = (0, 255, 0) if i == predicted_class_idx else (0, 165, 255)
                        cv2.rectangle(image, (120, y_pos-15), (120 + bar_width, y_pos), class_color, -1)
                        
                        # Draw class label
                        cv2.putText(image, f"{ACTIONS[i]}: {prob:.2f}", (15, y_pos), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                        
                        y_pos += 30
            
            # Display instructions
            cv2.putText(image, "q: quit  c: clear  s: save example", (15, 460), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Show the image
            cv2.imshow('Simple Model Test', image)
            
            # Handle key presses
            key = cv2.waitKey(10) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('c'):
                # Clear sequence
                sequence = []
                predictions = []
                print("Sequence cleared")
            elif key == ord('s') and len(sequence) == SEQUENCE_LENGTH:
                # Save current sequence as a good example
                good_examples_dir = os.path.join(MODELS_PATH, 'good_examples')
                os.makedirs(good_examples_dir, exist_ok=True)
                
                if len(predictions) > 0:
                    predicted_idx, _ = predictions[-1]
                    if predicted_idx < len(ACTIONS):
                        predicted_class = ACTIONS[predicted_idx]
                        
                        # Create directory for this class if it doesn't exist
                        class_dir = os.path.join(good_examples_dir, predicted_class)
                        os.makedirs(class_dir, exist_ok=True)
                        
                        # Find next available example number
                        example_num = 0
                        while os.path.exists(os.path.join(class_dir, f"example_{example_num}.npy")):
                            example_num += 1
                        
                        # Save the sequence
                        np.save(os.path.join(class_dir, f"example_{example_num}.npy"), np.array(sequence))
                        print(f"Saved good example for class {predicted_class} (example_{example_num}.npy)")
    
    # Release resources
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    test_simple_model()