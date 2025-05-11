import os
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
import sys

# Add the parent directory to the path so we can import from utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import (
    DATA_PATH, PROCESSED_DATA_PATH, ACTIONS, 
    NUM_SEQUENCES, SEQUENCE_LENGTH, KEYPOINT_DIMENSIONS
)

def prepare_data():
    """
    Load collected data from disk, preprocess it, and split into train/test sets
    
    Returns:
        tuple: X_train, X_test, y_train, y_test
    """
    # Lists to store sequences and labels
    sequences = []
    labels = []
    
    # Load data from disk
    for action_idx, action in enumerate(ACTIONS):
        for sequence in range(NUM_SEQUENCES):
            window = []
            
            for frame_num in range(SEQUENCE_LENGTH):
                # Load keypoints from file
                npy_path = os.path.join(DATA_PATH, action, str(sequence), str(frame_num) + '.npy')
                
                # Check if file exists
                if os.path.exists(npy_path):
                    keypoints = np.load(npy_path)
                else:
                    print(f"Warning: Missing file {npy_path}")
                    # Create dummy keypoints if file is missing
                    keypoints = np.zeros(KEYPOINT_DIMENSIONS)
                
                window.append(keypoints)
            
            # Append sequence and label
            sequences.append(window)
            labels.append(action_idx)
    
    # Convert to numpy arrays
    X = np.array(sequences)
    y = to_categorical(labels).astype(int)
    
    # Print dataset information
    print(f"Dataset shape: X={X.shape}, y={y.shape}")
    print(f"Number of action classes: {len(ACTIONS)}")
    
    # Split into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.05, random_state=42)
    print(f"Train set: {X_train.shape}, Test set: {X_test.shape}")
    
    # Save processed data
    os.makedirs(PROCESSED_DATA_PATH, exist_ok=True)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'X_train.npy'), X_train)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'X_test.npy'), X_test)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'y_train.npy'), y_train)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'y_test.npy'), y_test)
    
    # Also save the full dataset
    np.save(os.path.join(PROCESSED_DATA_PATH, 'X.npy'), X)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'y.npy'), y)
    
    return X_train, X_test, y_train, y_test

if __name__ == "__main__":
    prepare_data()
    print("Data preparation complete! Files saved to:", PROCESSED_DATA_PATH)