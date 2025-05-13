import os
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
import sys
import random

# Add the parent directory to the path so we can import from utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import (
    DATA_PATH, PROCESSED_DATA_PATH, ACTIONS, 
    NUM_SEQUENCES, SEQUENCE_LENGTH, KEYPOINT_DIMENSIONS
)

def augment_sequence(sequence, noise_factor=0.05):
    """
    Apply data augmentation to a sequence of keypoints
    Args:
        sequence: Input sequence of keypoints (frames x features)
        noise_factor: Amount of noise to add
    Returns:
        Augmented sequence (same shape as input)
    """
    # Add random noise
    noise = np.random.normal(0, noise_factor, sequence.shape)
    augmented = sequence + noise

    # Random time warping (speed up/slow down)
    if random.random() > 0.5:
        stretch_factor = random.uniform(0.9, 1.1)
        new_length = int(len(sequence) * stretch_factor)
        if new_length < 2:
            new_length = 2
        indices = np.linspace(0, len(sequence) - 1, new_length)
        # Interpolate each feature dimension independently
        warped = np.zeros((new_length, sequence.shape[1]))
        for feat in range(sequence.shape[1]):
            warped[:, feat] = np.interp(indices, np.arange(len(sequence)), augmented[:, feat])
        # If warped sequence is longer, crop; if shorter, pad
        if new_length > len(sequence):
            augmented = warped[:len(sequence), :]
        elif new_length < len(sequence):
            pad = np.zeros((len(sequence) - new_length, sequence.shape[1]))
            augmented = np.vstack([warped, pad])
        else:
            augmented = warped
    return augmented

def prepare_data():
    """
    Load collected data from disk, preprocess it, and split into train/test sets
    with data augmentation for training set
    
    Returns:
        tuple: X_train, X_test, y_train, y_test
    """
    # Lists to store sequences and labels
    sequences = []
    labels = []
    augmented_sequences = []
    augmented_labels = []
    
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
            
            # Create augmented versions for training
            for _ in range(2):  # Create 2 augmented versions of each sequence
                augmented_window = augment_sequence(np.array(window))
                augmented_sequences.append(augmented_window)
                augmented_labels.append(action_idx)
    
    # Convert to numpy arrays
    X = np.array(sequences)
    y = to_categorical(labels).astype(int)
    
    # Add augmented data to training set
    X_aug = np.array(augmented_sequences)
    y_aug = to_categorical(augmented_labels).astype(int)
    
    # Combine original and augmented data
    X_combined = np.concatenate([X, X_aug])
    y_combined = np.concatenate([y, y_aug])
    
    # Print dataset information
    print(f"Original dataset shape: X={X.shape}, y={y.shape}")
    print(f"Augmented dataset shape: X={X_aug.shape}, y={y_aug.shape}")
    print(f"Combined dataset shape: X={X_combined.shape}, y={y_combined.shape}")
    print(f"Number of action classes: {len(ACTIONS)}")
    
    # Split into train and test sets with increased test size
    X_train, X_test, y_train, y_test = train_test_split(
        X_combined, y_combined, 
        test_size=0.2,  # Increased from 0.05 to 0.2
        random_state=42,
        stratify=y_combined  # Ensure balanced class distribution
    )
    print(f"Train set: {X_train.shape}, Test set: {X_test.shape}")
    
    # Save processed data
    os.makedirs(PROCESSED_DATA_PATH, exist_ok=True)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'X_train.npy'), X_train)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'X_test.npy'), X_test)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'y_train.npy'), y_train)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'y_test.npy'), y_test)
    
    # Also save the full dataset
    np.save(os.path.join(PROCESSED_DATA_PATH, 'X.npy'), X_combined)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'y.npy'), y_combined)
    
    return X_train, X_test, y_train, y_test

if __name__ == "__main__":
    prepare_data()
    print("Data preparation complete! Files saved to:", PROCESSED_DATA_PATH)