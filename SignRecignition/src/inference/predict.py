"""
Real-time sign language recognition using a trained model.
"""

import os
import cv2
import numpy as np
import tensorflow as tf
import mediapipe as mp
import pickle
import time
from collections import deque

# Import from our preprocessing module
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from preprocessing.extract_keypoints import extract_hand_keypoints

class SignLanguageRecognizer:
    def __init__(self, model_path, scaler_path, label_encoder_path, max_frames=30, confidence_threshold=0.7):
        """
        Initialize the sign language recognizer.
        
        Args:
            model_path: Path to the trained model
            scaler_path: Path to the feature scaler
            label_encoder_path: Path to the label encoder
            max_frames: Maximum number of frames to consider for prediction
            confidence_threshold: Confidence threshold for predictions
        """
        # Load the trained model
        self.model = tf.keras.models.load_model(model_path)
        
        # Load the scaler
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)
        
        # Load the label encoder
        with open(label_encoder_path, 'rb') as f:
            self.label_encoder = pickle.load(f)
        
        self.max_frames = max_frames
        self.confidence_threshold = confidence_threshold
        
        # Initialize the frame buffer
        self.frame_buffer = deque(maxlen=max_frames)
        
        # Initialize MediaPipe Hands
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Store the number of classes
        self.num_classes = len(self.label_encoder.classes_)
        
        # For continuous sign recognition
        self.last_prediction = None
        self.prediction_stability = 0
        self.stable_threshold = 5  # Number of consistent predictions to consider as stable
        self.cooldown_period = 0  # Frames to wait before making a new prediction
        self.cooldown_threshold = 10  # Number of frames to wait
        
        print(f"Model loaded with {self.num_classes} classes: {self.label_encoder.classes_}")
    
    def add_frame(self, frame):
        """
        Process a frame and add its keypoints to the buffer.
        
        Args:
            frame: Input RGB frame
            
        Returns:
            processed_frame: Frame with keypoints visualized
        """
        # Extract keypoints
        keypoints = extract_hand_keypoints(frame, self.hands)
        
        # Add to buffer
        self.frame_buffer.append(keypoints)
        
        # Draw keypoints on the frame
        processed_frame = self._draw_keypoints(frame, keypoints)
        
        return processed_frame
    
    def _draw_keypoints(self, frame, keypoints):
        """
        Draw hand keypoints on the frame.
        
        Args:
            frame: Input frame
            keypoints: Extracted keypoints
            
        Returns:
            processed_frame: Frame with keypoints visualized
        """
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(frame_rgb)
        
        # Draw hand landmarks
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                self.mp_drawing.draw_landmarks(
                    frame,
                    hand_landmarks,
                    self.mp_hands.HAND_CONNECTIONS,
                    self.mp_drawing_styles.get_default_hand_landmarks_style(),
                    self.mp_drawing_styles.get_default_hand_connections_style()
                )
        
        return frame
    
    def predict(self):
        """
        Make a prediction based on the current frame buffer.
        
        Returns:
            prediction: Predicted sign
            confidence: Confidence score
        """
        # Check if we have enough frames
        if len(self.frame_buffer) < self.max_frames:
            return None, 0.0
        
        # Process buffered frames
        X = np.array(list(self.frame_buffer))
        
        # Scale features
        X_reshaped = X.reshape(-1, X.shape[-1])
        X_scaled = self.scaler.transform(X_reshaped)
        X_scaled = X_scaled.reshape(1, X.shape[0], X.shape[1])
        
        # Make prediction
        prediction_scores = self.model.predict(X_scaled)[0]
        predicted_class_idx = np.argmax(prediction_scores)
        confidence = prediction_scores[predicted_class_idx]
        
        # Only make a prediction if confidence is above threshold
        if confidence >= self.confidence_threshold:
            prediction = self.label_encoder.inverse_transform([predicted_class_idx])[0]
            
            # Check for stability of predictions
            if prediction == self.last_prediction:
                self.prediction_stability += 1
            else:
                self.prediction_stability = 0
                self.last_prediction = prediction
            
            # Only return a stable prediction
            if self.prediction_stability >= self.stable_threshold:
                # Reset cooldown
                self.cooldown_period = self.cooldown_threshold
                return prediction, confidence
        
        # If in cooldown, decrement
        if self.cooldown_period > 0:
            self.cooldown_period -= 1
        
        return None, 0.0
    
    def reset(self):
        """
        Reset the frame buffer and predictions.
        """
        self.frame_buffer.clear()
        self.last_prediction = None
        self.prediction_stability = 0
        self.cooldown_period = 0

def run_webcam_demo(model_path, scaler_path, label_encoder_path):
    """
    Run a webcam demo of sign language recognition.
    
    Args:
        model_path: Path to the trained model
        scaler_path: Path to the feature scaler
        label_encoder_path: Path to the label encoder
    """
    # Initialize the recognizer
    recognizer = SignLanguageRecognizer(model_path, scaler_path, label_encoder_path)
    
    # Open webcam
    cap = cv2.VideoCapture(0)
    
    # For FPS calculation
    prev_frame_time = 0
    new_frame_time = 0
    
    # For text display
    predictions = []
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame.")
            break
        
        # Calculate FPS
        new_frame_time = time.time()
        fps = 1 / (new_frame_time - prev_frame_time) if prev_frame_time else 0
        prev_frame_time = new_frame_time
        
        # Process frame
        processed_frame = recognizer.add_frame(frame)
        
        # Make prediction
        prediction, confidence = recognizer.predict()
        
        # Add valid prediction to list
        if prediction is not None and confidence > 0:
            predictions.append(prediction)
            # Keep only the last 5 predictions
            if len(predictions) > 5:
                predictions.pop(0)
        
        # Display the prediction
        cv2.putText(
            processed_frame,
            f"FPS: {fps:.1f}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )
        
        if prediction:
            cv2.putText(
                processed_frame,
                f"Sign: {prediction} ({confidence:.2f})",
                (10, 70),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                2
            )
        
        # Display the assembled sentence
        sentence = " ".join(predictions)
        cv2.putText(
            processed_frame,
            f"Sentence: {sentence}",
            (10, processed_frame.shape[0] - 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 0, 0),
            2
        )
        
        # Show the frame
        cv2.imshow("Sign Language Recognition", processed_frame)
        
        # Check for key press
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            # Reset predictions
            predictions = []
            recognizer.reset()
    
    # Release resources
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Real-time sign language recognition demo.')
    parser.add_argument('--model', type=str, required=True, help='Path to the trained model')
    parser.add_argument('--scaler', type=str, required=True, help='Path to the feature scaler')
    parser.add_argument('--encoder', type=str, required=True, help='Path to the label encoder')
    
    args = parser.parse_args()
    
    run_webcam_demo(args.model, args.scaler, args.encoder)