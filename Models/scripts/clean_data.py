import os
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
import sys

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import PROCESSED_DATA_PATH, DATA_PATH, ACTIONS

def clean_data():
    """
    Clean the training data by:
    1. Removing corrupted samples (all zeros, NaN, inf)
    2. Balancing class distribution
    3. Creating a new train-test split
    """
    print("Loading data for cleaning...")
    
    # Check if raw data exists
    try:
        # First, try to load sequence data from raw data path
        sequences = []
        labels = []
        
        # Attempt to load from raw processed directory structure
        print("Attempting to load data from directory structure...")
        for action_idx, action in enumerate(ACTIONS):
            action_dir = os.path.join(DATA_PATH, action)
            if not os.path.exists(action_dir):
                print(f"Warning: Directory for action '{action}' not found")
                continue
                
            sequences_count = 0
            for sequence in sorted(os.listdir(action_dir)):
                sequence_dir = os.path.join(action_dir, sequence)
                if not os.path.isdir(sequence_dir):
                    continue
                
                frames = sorted(os.listdir(sequence_dir))
                if not frames:
                    print(f"Warning: No frames in sequence {sequence} for action {action}")
                    continue
                
                # Check if this sequence has enough frames
                window = []
                for frame_file in frames:
                    if not frame_file.endswith('.npy'):
                        continue
                    
                    frame_path = os.path.join(sequence_dir, frame_file)
                    try:
                        # Load the keypoints
                        keypoints = np.load(frame_path)
                        window.append(keypoints)
                    except Exception as e:
                        print(f"Error loading {frame_path}: {e}")
                
                if window:
                    if len(window) >= 30:  # Require at least 30 frames
                        # Take only the first 30 frames
                        window = window[:30]
                        sequences.append(window)
                        labels.append(action_idx)
                        sequences_count += 1
                    else:
                        print(f"Warning: Sequence {sequence} for action {action} has only {len(window)} frames")
            
            print(f"Loaded {sequences_count} sequences for action {action}")
        
        if sequences:
            print(f"Successfully loaded {len(sequences)} sequences from directory structure")
        else:
            # If directory loading failed, try loading the processed files
            print("No sequences loaded from directories, trying to load from processed files...")
            raise FileNotFoundError
            
    except Exception as e:
        print(f"Directory loading failed: {e}")
        
        # Try to load processed files
        try:
            print("Loading from processed files...")
            X = np.load(os.path.join(PROCESSED_DATA_PATH, 'X.npy'))
            y = np.load(os.path.join(PROCESSED_DATA_PATH, 'y.npy'))
            
            # Convert to lists for easier manipulation
            sequences = [X[i] for i in range(X.shape[0])]
            labels = [np.argmax(y[i]) for i in range(y.shape[0])]
            
            print(f"Loaded {len(sequences)} sequences from processed files")
        except FileNotFoundError:
            print("Error: Could not find either raw data or processed files")
            return
    
    print(f"Total sequences loaded: {len(sequences)}")
    
    # Check for corrupted data
    valid_sequences = []
    valid_labels = []
    
    for i, (seq, label) in enumerate(zip(sequences, labels)):
        # Convert to numpy array if it's not already
        seq_array = np.array(seq)
        
        # Check for NaN, Inf, or all zeros
        if np.isnan(seq_array).any() or np.isinf(seq_array).any():
            print(f"Removing sequence {i} (label {ACTIONS[label]}) - contains NaN or Inf values")
            continue
        
        # Check for frames that are all zeros (often indicates missing hand detection)
        zero_frames = 0
        for frame in seq_array:
            if np.all(frame == 0):
                zero_frames += 1
        
        # If more than 20% of frames are all zeros, consider the sequence corrupted
        if zero_frames > len(seq_array) * 0.2:
            print(f"Removing sequence {i} (label {ACTIONS[label]}) - {zero_frames}/{len(seq_array)} frames are all zeros")
            continue
        
        valid_sequences.append(seq_array)
        valid_labels.append(label)
    
    print(f"After removing corrupted sequences: {len(valid_sequences)} sequences remain")
    
    # Count per class
    class_counts = {}
    for label in valid_labels:
        class_counts[label] = class_counts.get(label, 0) + 1
    
    print("\nClass distribution after cleaning:")
    for label, count in sorted(class_counts.items()):
        if label < len(ACTIONS):
            print(f"  Class {label} ({ACTIONS[label]}): {count} sequences")
        else:
            print(f"  Class {label} (Unknown): {count} sequences")
    
    # Balance classes by either:
    # 1. Oversampling (duplicate sequences from minority classes)
    # 2. Undersampling (remove sequences from majority classes)
    
    # For this example, we'll use a simple approach:
    # Undersample to match the minority class (at most double the min class size)
    min_count = min(class_counts.values())
    target_count = min(min_count * 2, max(class_counts.values()))
    
    print(f"\nBalancing classes to approximately {target_count} sequences per class")
    
    balanced_sequences = []
    balanced_labels = []
    
    for label in sorted(class_counts.keys()):
        # Get all sequences for this class
        class_sequences = [seq for seq, lbl in zip(valid_sequences, valid_labels) if lbl == label]
        
        if len(class_sequences) <= target_count:
            # For classes with fewer than target count, add all sequences
            balanced_sequences.extend(class_sequences)
            balanced_labels.extend([label] * len(class_sequences))
        else:
            # For classes with more than target count, randomly sample target_count sequences
            indices = np.random.choice(len(class_sequences), target_count, replace=False)
            for idx in indices:
                balanced_sequences.append(class_sequences[idx])
                balanced_labels.append(label)
    
    # Shuffle the balanced dataset
    combined = list(zip(balanced_sequences, balanced_labels))
    np.random.shuffle(combined)
    balanced_sequences, balanced_labels = zip(*combined)
    
    # Convert to numpy arrays
    X = np.array(balanced_sequences)
    y = np.array(balanced_labels)
    
    print(f"Final balanced dataset: {X.shape}")
    
    # One-hot encode the labels
    y_one_hot = np.zeros((y.size, max(y) + 1))
    y_one_hot[np.arange(y.size), y] = 1
    
    # Create a train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_one_hot, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training set: {X_train.shape}, Test set: {X_test.shape}")
    
    # Save the cleaned and balanced dataset
    cleaned_dir = os.path.join(PROCESSED_DATA_PATH, 'cleaned')
    os.makedirs(cleaned_dir, exist_ok=True)
    
    np.save(os.path.join(cleaned_dir, 'X_train.npy'), X_train)
    np.save(os.path.join(cleaned_dir, 'X_test.npy'), X_test)
    np.save(os.path.join(cleaned_dir, 'y_train.npy'), y_train)
    np.save(os.path.join(cleaned_dir, 'y_test.npy'), y_test)
    
    # Also save the full dataset
    np.save(os.path.join(cleaned_dir, 'X.npy'), X)
    np.save(os.path.join(cleaned_dir, 'y.npy'), y_one_hot)
    
    print(f"Cleaned and balanced dataset saved to {cleaned_dir}")
    
    # Visualize the new class distribution
    new_class_counts = {}
    for label in y:
        new_class_counts[label] = new_class_counts.get(label, 0) + 1
    
    plt.figure(figsize=(10, 6))
    bars = plt.bar(range(len(new_class_counts)), [new_class_counts.get(i, 0) for i in range(len(ACTIONS))])
    plt.xticks(range(len(ACTIONS)), ACTIONS)
    plt.xlabel('Action')
    plt.ylabel('Number of Sequences')
    plt.title('Class Distribution After Cleaning and Balancing')
    
    # Add count labels
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                f'{int(height)}',
                ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig(os.path.join(cleaned_dir, 'class_distribution.png'))
    
    print("\nData cleaning and balancing complete!")
    print(f"Use these paths for training:")
    print(f"X_train: {os.path.join(cleaned_dir, 'X_train.npy')}")
    print(f"y_train: {os.path.join(cleaned_dir, 'y_train.npy')}")
    print(f"X_test: {os.path.join(cleaned_dir, 'X_test.npy')}")
    print(f"y_test: {os.path.join(cleaned_dir, 'y_test.npy')}")

if __name__ == "__main__":
    clean_data()