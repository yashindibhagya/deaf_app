
import os
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
import sys
import random

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import (
    PROCESSED_DATA_PATH, DATA_PATH, ACTIONS, TEST_SIZE,
    USE_AUGMENTATION, AUGMENTATION_FACTOR, RANDOM_ROTATION_MAX,
    RANDOM_SHIFT_MAX, RANDOM_SCALE_RANGE, SEQUENCE_LENGTH
)

def load_raw_data():
    """
    Load data from the raw dataset structure
    """
    print("Loading data from raw dataset structure...")
    sequences = []
    labels = []
    
    for action_idx, action in enumerate(ACTIONS):
        action_dir = os.path.join(DATA_PATH, action)
        if not os.path.exists(action_dir):
            print(f"Warning: Directory for action '{action}' not found at {action_dir}")
            continue
        
        # Check and create a list of valid sequence directories
        valid_sequences = []
        for seq_name in os.listdir(action_dir):
            seq_path = os.path.join(action_dir, seq_name)
            if os.path.isdir(seq_path) and any(f.endswith('.npy') for f in os.listdir(seq_path)):
                valid_sequences.append(seq_name)
        
        print(f"Found {len(valid_sequences)} potential sequences for action {action}")
        
        # Process each valid sequence
        for sequence in sorted(valid_sequences):
            seq_dir = os.path.join(action_dir, sequence)
            
            # Check if the sequence directory has enough frames
            frame_files = [f for f in os.listdir(seq_dir) if f.endswith('.npy')]
            if len(frame_files) < SEQUENCE_LENGTH:
                print(f"Warning: Sequence {sequence} for {action} only has {len(frame_files)} frames, skipping")
                continue
            
            # Try to load each frame
            window = []
            has_error = False
            
            for frame_num in range(SEQUENCE_LENGTH):
                frame_path = os.path.join(seq_dir, f"{frame_num}.npy")
                if not os.path.exists(frame_path):
                    print(f"Warning: Missing frame {frame_num} in {seq_dir}")
                    has_error = True
                    break
                
                try:
                    keypoints = np.load(frame_path)
                    
                    # Check for corrupt data (all zeros, NaN, or Inf)
                    if np.isnan(keypoints).any() or np.isinf(keypoints).any():
                        print(f"Warning: NaN or Inf values in {frame_path}")
                        has_error = True
                        break
                    
                    # Check if the frame is all zeros
                    if np.all(keypoints == 0):
                        print(f"Warning: All zeros in {frame_path}")
                        # Instead of breaking, we'll flag this but still include it
                        # so we can try to fix it with augmentation later
                    
                    window.append(keypoints)
                except Exception as e:
                    print(f"Error loading {frame_path}: {e}")
                    has_error = True
                    break
            
            # Skip this sequence if we had an error
            if has_error:
                continue
            
            # Skip if we couldn't get enough frames
            if len(window) != SEQUENCE_LENGTH:
                print(f"Warning: Only loaded {len(window)}/{SEQUENCE_LENGTH} frames for {action} sequence {sequence}")
                continue
            
            # Add the sequence to our dataset
            sequences.append(window)
            labels.append(action_idx)
            
        print(f"Successfully loaded {labels.count(action_idx)} sequences for action {action}")
    
    return np.array(sequences), np.array(labels)

def count_zero_frames(sequence):
    """Count frames that are all zeros in a sequence"""
    zero_count = 0
    for frame in sequence:
        if np.all(frame == 0):
            zero_count += 1
    return zero_count

def fix_zero_frames(sequence):
    """
    Fix frames that are all zeros by interpolating from neighboring frames
    """
    fixed_sequence = sequence.copy()
    seq_length = len(sequence)
    
    for i in range(seq_length):
        if np.all(sequence[i] == 0):
            # Find nearest non-zero frames
            left_idx = i - 1
            while left_idx >= 0 and np.all(sequence[left_idx] == 0):
                left_idx -= 1
                
            right_idx = i + 1
            while right_idx < seq_length and np.all(sequence[right_idx] == 0):
                right_idx += 1
            
            # Interpolate if we found non-zero frames on both sides
            if left_idx >= 0 and right_idx < seq_length:
                weight_right = (i - left_idx) / (right_idx - left_idx)
                weight_left = 1 - weight_right
                fixed_sequence[i] = (weight_left * sequence[left_idx]) + (weight_right * sequence[right_idx])
            # Otherwise use the nearest non-zero frame
            elif left_idx >= 0:
                fixed_sequence[i] = sequence[left_idx]
            elif right_idx < seq_length:
                fixed_sequence[i] = sequence[right_idx]
            # If all else fails, add small random noise to avoid all zeros
            else:
                fixed_sequence[i] = np.random.normal(0, 0.01, size=sequence[i].shape)
    
    return fixed_sequence

def augment_sequence(sequence, label):
    """
    Apply data augmentation to a sequence
    """
    augmented_sequences = []
    augmented_labels = []
    
    # Add the original sequence
    augmented_sequences.append(sequence)
    augmented_labels.append(label)
    
    # Only augment if enabled in config
    if not USE_AUGMENTATION:
        return augmented_sequences, augmented_labels
    
    # Count how many more augmented samples we need
    n_augmentations = AUGMENTATION_FACTOR - 1
    
    for _ in range(n_augmentations):
        aug_sequence = sequence.copy()
        
        # Apply random rotation to each frame
        if RANDOM_ROTATION_MAX > 0:
            angle = np.random.uniform(-RANDOM_ROTATION_MAX, RANDOM_ROTATION_MAX)
            
            # Apply rotation to hand keypoints only
            for i in range(len(aug_sequence)):
                # Determine hand keypoint indices based on the structure
                # For MediaPipe, right hand is last 21*3 values, left hand before that
                rh_start = len(aug_sequence[i]) - 21*3
                lh_start = rh_start - 21*3
                
                # Apply rotation-like noise to both hands
                for hand_start in [lh_start, rh_start]:
                    hand_indices = slice(hand_start, hand_start + 21*3)
                    # Use absolute value to ensure scale is positive
                    noise = np.random.normal(0, abs(angle/50), aug_sequence[i][hand_indices].shape)
                    aug_sequence[i][hand_indices] += noise
        
        # Apply random scaling
        if RANDOM_SCALE_RANGE != (1.0, 1.0):
            scale = np.random.uniform(RANDOM_SCALE_RANGE[0], RANDOM_SCALE_RANGE[1])
            # Scale keypoints around their centroid
            for i in range(len(aug_sequence)):
                # Get non-zero elements
                non_zero_mask = aug_sequence[i] != 0
                if np.any(non_zero_mask):
                    # Only scale non-zero elements to preserve structure
                    centroid = np.mean(aug_sequence[i][non_zero_mask])
                    aug_sequence[i][non_zero_mask] = centroid + scale * (aug_sequence[i][non_zero_mask] - centroid)
        
        # Apply random shift
        if RANDOM_SHIFT_MAX > 0:
            shift_x = np.random.uniform(-RANDOM_SHIFT_MAX, RANDOM_SHIFT_MAX)
            shift_y = np.random.uniform(-RANDOM_SHIFT_MAX, RANDOM_SHIFT_MAX)
            
            # Apply shift to x and y coordinates only
            for i in range(len(aug_sequence)):
                # MediaPipe structure puts x,y,z coordinates one after another
                # So every 3rd element starting from 0 is x, and every 3rd starting from 1 is y
                x_indices = slice(0, None, 3)  # Every 3rd starting from 0 (x coords)
                y_indices = slice(1, None, 3)  # Every 3rd starting from 1 (y coords)
                
                # Add shift proportional to the data range
                data_range = max(0.01, np.max(aug_sequence[i]) - np.min(aug_sequence[i]))
                aug_sequence[i][x_indices] += shift_x * data_range
                aug_sequence[i][y_indices] += shift_y * data_range
        
        # Add to augmented datasets
        augmented_sequences.append(aug_sequence)
        augmented_labels.append(label)
    
    return augmented_sequences, augmented_labels

def clean_and_augment_data():
    """
    Main function to clean and augment the dataset
    """
    print("Starting data cleaning and augmentation...")
    
    # Load data
    sequences, labels = load_raw_data()
    
    if len(sequences) == 0:
        print("Error: No valid sequences found. Check your data directories.")
        return
    
    print(f"Loaded {len(sequences)} sequences across {len(set(labels))} classes")
    
    # Analyze class distribution before cleaning
    class_counts = {}
    for label in labels:
        class_counts[label] = class_counts.get(label, 0) + 1
    
    print("\nClass distribution before cleaning:")
    for label_idx, count in sorted(class_counts.items()):
        if label_idx < len(ACTIONS):
            print(f"  Class {label_idx} ({ACTIONS[label_idx]}): {count} sequences")
        else:
            print(f"  Class {label_idx} (Unknown): {count} sequences")
    
    # Check for zero frames
    zero_frames_per_class = {}
    for i, (sequence, label) in enumerate(zip(sequences, labels)):
        zero_count = count_zero_frames(sequence)
        if zero_count > 0:
            print(f"Sequence {i} (class {ACTIONS[label]}) has {zero_count}/{len(sequence)} zero frames")
            zero_frames_per_class[label] = zero_frames_per_class.get(label, 0) + zero_count
    
    print("\nZero frames per class:")
    for label_idx, count in sorted(zero_frames_per_class.items()):
        if label_idx < len(ACTIONS):
            print(f"  Class {label_idx} ({ACTIONS[label_idx]}): {count} zero frames")
        else:
            print(f"  Class {label_idx} (Unknown): {count} zero frames")
    
    # Clean sequences with zero frames
    print("\nCleaning sequences with zero frames...")
    cleaned_sequences = []
    cleaned_labels = []
    
    for sequence, label in zip(sequences, labels):
        zero_count = count_zero_frames(sequence)
        
        if zero_count > len(sequence) * 0.5:
            # Skip sequences that are mostly zeros
            print(f"Skipping sequence with {zero_count}/{len(sequence)} zero frames (class {ACTIONS[label]})")
            continue
        elif zero_count > 0:
            # Fix sequences with some zero frames
            fixed_sequence = fix_zero_frames(sequence)
            cleaned_sequences.append(fixed_sequence)
            cleaned_labels.append(label)
        else:
            # Keep good sequences as is
            cleaned_sequences.append(sequence)
            cleaned_labels.append(label)
    
    print(f"After cleaning: {len(cleaned_sequences)} sequences")
    
    # Check class distribution after cleaning
    clean_class_counts = {}
    for label in cleaned_labels:
        clean_class_counts[label] = clean_class_counts.get(label, 0) + 1
    
    print("\nClass distribution after cleaning:")
    for label_idx, count in sorted(clean_class_counts.items()):
        if label_idx < len(ACTIONS):
            print(f"  Class {label_idx} ({ACTIONS[label_idx]}): {count} sequences")
    
    # Augment the data
    if USE_AUGMENTATION:
        print("\nAugmenting data...")
        augmented_sequences = []
        augmented_labels = []
        
        for sequence, label in zip(cleaned_sequences, cleaned_labels):
            aug_sequences, aug_labels = augment_sequence(sequence, label)
            augmented_sequences.extend(aug_sequences)
            augmented_labels.extend(aug_labels)
        
        print(f"After augmentation: {len(augmented_sequences)} sequences")
        
        # Check class distribution after augmentation
        aug_class_counts = {}
        for label in augmented_labels:
            aug_class_counts[label] = aug_class_counts.get(label, 0) + 1
        
        print("\nClass distribution after augmentation:")
        for label_idx, count in sorted(aug_class_counts.items()):
            if label_idx < len(ACTIONS):
                print(f"  Class {label_idx} ({ACTIONS[label_idx]}): {count} sequences")
    else:
        augmented_sequences = cleaned_sequences
        augmented_labels = cleaned_labels
    
    # Convert to numpy arrays
    X = np.array(augmented_sequences)
    y_integers = np.array(augmented_labels)
    
    # One-hot encode the labels
    y = to_categorical(y_integers).astype(int)
    
    # Split into train and test sets with stratification
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=42, 
        stratify=y_integers  # Ensure balanced class distribution in test set
    )
    
    print(f"\nFinal dataset split:")
    print(f"  Training set: {X_train.shape}")
    print(f"  Test set: {X_test.shape}")
    
    # Create output directory
    os.makedirs(PROCESSED_DATA_PATH, exist_ok=True)
    
    # Save the processed data
    np.save(os.path.join(PROCESSED_DATA_PATH, 'X_train.npy'), X_train)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'X_test.npy'), X_test)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'y_train.npy'), y_train)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'y_test.npy'), y_test)
    
    # Also save the full dataset
    np.save(os.path.join(PROCESSED_DATA_PATH, 'X.npy'), X)
    np.save(os.path.join(PROCESSED_DATA_PATH, 'y.npy'), y)
    
    print(f"\nProcessed data saved to {PROCESSED_DATA_PATH}")
    
    # Plot class distribution after processing
    plt.figure(figsize=(12, 6))
    
    # Training set distribution
    plt.subplot(1, 2, 1)
    train_labels = np.argmax(y_train, axis=1)
    train_class_counts = np.bincount(train_labels, minlength=len(ACTIONS))
    plt.bar(range(len(ACTIONS)), train_class_counts)
    plt.title('Training Set Class Distribution')
    plt.xlabel('Class')
    plt.ylabel('Count')
    plt.xticks(range(len(ACTIONS)), ACTIONS)
    
    # Test set distribution
    plt.subplot(1, 2, 2)
    test_labels = np.argmax(y_test, axis=1)
    test_class_counts = np.bincount(test_labels, minlength=len(ACTIONS))
    plt.bar(range(len(ACTIONS)), test_class_counts)
    plt.title('Test Set Class Distribution')
    plt.xlabel('Class')
    plt.ylabel('Count')
    plt.xticks(range(len(ACTIONS)), ACTIONS)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PROCESSED_DATA_PATH, 'class_distribution.png'))
    
    print(f"Class distribution plot saved to {os.path.join(PROCESSED_DATA_PATH, 'class_distribution.png')}")
    return X_train, X_test, y_train, y_test

if __name__ == "__main__":
    clean_and_augment_data()
    print("Data cleaning and augmentation complete!")