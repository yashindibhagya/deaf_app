# scripts/rebuild_model.py
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
import sys

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import PROCESSED_DATA_PATH, MODELS_PATH, ACTIONS

def rebuild_model():
    """Rebuild the model with the correct architecture"""
    # Load the processed data
    try:
        X_train = np.load(os.path.join(PROCESSED_DATA_PATH, 'X_train.npy'))
        y_train = np.load(os.path.join(PROCESSED_DATA_PATH, 'y_train.npy'))
        X_test = np.load(os.path.join(PROCESSED_DATA_PATH, 'X_test.npy'))
        y_test = np.load(os.path.join(PROCESSED_DATA_PATH, 'y_test.npy'))
    except Exception as e:
        print(f"Error loading data: {e}")
        return

    print(f"X_train shape: {X_train.shape}")
    print(f"y_train shape: {y_train.shape}")
    
    # Check if labels are one-hot encoded
    if len(y_train.shape) == 1 or y_train.shape[1] == 1:
        print("Labels are not one-hot encoded. Converting...")
        from tensorflow.keras.utils import to_categorical
        num_classes = len(ACTIONS)
        y_train = to_categorical(y_train, num_classes=num_classes)
        y_test = to_categorical(y_test, num_classes=num_classes)
        print(f"Converted to one-hot encoding: y_train shape: {y_train.shape}")
    
    # Build a new model with the correct number of output classes
    num_classes = len(ACTIONS)
    print(f"Building model with {num_classes} output classes")
    
    model = Sequential([
        LSTM(64, return_sequences=True, activation='relu', 
             input_shape=(X_train.shape[1], X_train.shape[2])),
        Dropout(0.2),
        LSTM(128, return_sequences=True, activation='relu'),
        Dropout(0.2),
        LSTM(64, return_sequences=False, activation='relu'),
        Dropout(0.2),
        Dense(64, activation='relu'),
        Dropout(0.2),
        Dense(num_classes, activation='softmax')  # Correct number of output classes
    ])
    
    # Compile the model
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['categorical_accuracy']
    )
    
    # Display model summary
    model.summary()
    
    # Train the model
    print("\nTraining the model...")
    callbacks = [
        EarlyStopping(patience=10, restore_best_weights=True)
    ]
    
    model.fit(
        X_train, y_train,
        epochs=50,
        validation_data=(X_test, y_test),
        callbacks=callbacks,
        verbose=1
    )
    
    # Save the model
    os.makedirs(MODELS_PATH, exist_ok=True)
    model_path = os.path.join(MODELS_PATH, 'fixed_sign_language_model.keras')
    model.save(model_path)
    print(f"\nModel saved to {model_path}")
    print("Now you can evaluate it with:")
    print(f"python scripts/evaluate_model.py --model {model_path}")

if __name__ == "__main__":
    rebuild_model()