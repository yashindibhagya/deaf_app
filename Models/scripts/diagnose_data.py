import os
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import sys

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import PROCESSED_DATA_PATH, ACTIONS

def diagnose_data():
    """
    Diagnose issues with the training data:
    - Check for class imbalance
    - Check for outliers or corrupted data
    - Analyze distribution of keypoints
    """
    print("Diagnosing training data issues...")
    
    # Check if data files exist
    data_files = ['X_train.npy', 'X_test.npy', 'y_train.npy', 'y_test.npy']
    for file in data_files:
        file_path = os.path.join(PROCESSED_DATA_PATH, file)
        if not os.path.exists(file_path):
            print(f"Error: {file} not found at {file_path}")
            return
    
    # Load data
    X_train = np.load(os.path.join(PROCESSED_DATA_PATH, 'X_train.npy'))
    X_test = np.load(os.path.join(PROCESSED_DATA_PATH, 'X_test.npy'))
    y_train = np.load(os.path.join(PROCESSED_DATA_PATH, 'y_train.npy'))
    y_test = np.load(os.path.join(PROCESSED_DATA_PATH, 'y_test.npy'))
    
    print(f"Training data shape: {X_train.shape}")
    print(f"Test data shape: {X_test.shape}")
    print(f"Training labels shape: {y_train.shape}")
    print(f"Test labels shape: {y_test.shape}")
    
    # Check for NaN or infinite values
    print("\nChecking for NaN or infinite values:")
    print(f"NaN in X_train: {np.isnan(X_train).any()}")
    print(f"Inf in X_train: {np.isinf(X_train).any()}")
    print(f"NaN in X_test: {np.isnan(X_test).any()}")
    print(f"Inf in X_test: {np.isinf(X_test).any()}")
    
    # Check for extremely large values
    print("\nChecking for outliers:")
    print(f"Max value in X_train: {np.max(X_train)}")
    print(f"Min value in X_train: {np.min(X_train)}")
    print(f"Mean value in X_train: {np.mean(X_train)}")
    print(f"Standard deviation in X_train: {np.std(X_train)}")
    
    # Check for class imbalance
    y_train_classes = np.argmax(y_train, axis=1)
    y_test_classes = np.argmax(y_test, axis=1)
    
    train_class_counts = np.bincount(y_train_classes)
    test_class_counts = np.bincount(y_test_classes)
    
    print("\nClass distribution in training data:")
    for i, count in enumerate(train_class_counts):
        class_name = ACTIONS[i] if i < len(ACTIONS) else f"Unknown_{i}"
        print(f"  Class {i} ({class_name}): {count} samples")
    
    print("\nClass distribution in test data:")
    for i, count in enumerate(test_class_counts):
        class_name = ACTIONS[i] if i < len(ACTIONS) else f"Unknown_{i}"
        print(f"  Class {i} ({class_name}): {count} samples")
    
    # Calculate min/max/mean values for each class
    print("\nAnalyzing per-class statistics...")
    for i in range(min(len(ACTIONS), max(len(train_class_counts), len(test_class_counts)))):
        class_name = ACTIONS[i] if i < len(ACTIONS) else f"Unknown_{i}"
        
        # Training data for this class
        class_train_mask = (y_train_classes == i)
        if np.any(class_train_mask):
            class_train_data = X_train[class_train_mask]
            print(f"\nClass {class_name} training statistics:")
            print(f"  Samples: {np.sum(class_train_mask)}")
            print(f"  Mean: {np.mean(class_train_data)}")
            print(f"  Std Dev: {np.std(class_train_data)}")
            print(f"  Min: {np.min(class_train_data)}")
            print(f"  Max: {np.max(class_train_data)}")
            
            # Check for zero-filled frames
            zero_frames = 0
            for sample in class_train_data:
                for frame in sample:
                    if np.all(frame == 0):
                        zero_frames += 1
            
            if zero_frames > 0:
                print(f"  WARNING: {zero_frames} frames with all zeros detected!")
        else:
            print(f"\nNo training samples for class {class_name}")
    
    # Visualize class distribution
    plt.figure(figsize=(12, 6))
    
    plt.subplot(1, 2, 1)
    bars = plt.bar(range(len(train_class_counts)), train_class_counts)
    plt.title('Training Data Class Distribution')
    plt.xlabel('Class')
    plt.ylabel('Number of Samples')
    plt.xticks(range(len(train_class_counts)), 
              [ACTIONS[i] if i < len(ACTIONS) else f"Unknown_{i}" for i in range(len(train_class_counts))])
    
    # Add count labels on top of bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                f'{int(height)}',
                ha='center', va='bottom')
    
    plt.subplot(1, 2, 2)
    bars = plt.bar(range(len(test_class_counts)), test_class_counts)
    plt.title('Test Data Class Distribution')
    plt.xlabel('Class')
    plt.ylabel('Number of Samples')
    plt.xticks(range(len(test_class_counts)), 
              [ACTIONS[i] if i < len(ACTIONS) else f"Unknown_{i}" for i in range(len(test_class_counts))])
    
    # Add count labels on top of bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                f'{int(height)}',
                ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig(os.path.join(PROCESSED_DATA_PATH, 'class_distribution.png'))
    
    # Visualize keypoint distribution for each class
    plt.figure(figsize=(15, 10))
    
    # Calculate mean keypoint values for each class
    for i in range(min(len(ACTIONS), 5)):  # Limit to first 5 classes to avoid clutter
        class_name = ACTIONS[i] if i < len(ACTIONS) else f"Unknown_{i}"
        
        # Get samples for this class
        class_train_mask = (y_train_classes == i)
        if np.sum(class_train_mask) > 0:
            class_train_data = X_train[class_train_mask]
            
            # Calculate mean across all samples and frames for this class
            mean_sample = np.mean(class_train_data, axis=(0, 1))
            
            # Plot the distribution of keypoint values
            plt.subplot(min(len(ACTIONS), 5), 1, i+1)
            
            # Plot only a subset of keypoints to make it readable
            keypoints_subset = mean_sample[:300:5]  # Every 5th keypoint from first 300
            plt.plot(keypoints_subset, label=f'Mean value')
            plt.fill_between(range(len(keypoints_subset)), 
                           keypoints_subset - np.std(class_train_data[:, :, :300:5], axis=(0, 1)),
                           keypoints_subset + np.std(class_train_data[:, :, :300:5], axis=(0, 1)),
                           alpha=0.2)
            plt.title(f'Class {class_name} Keypoint Distribution (Subset)')
            plt.xlabel('Keypoint Index (every 5th of first 300)')
            plt.ylabel('Value')
            plt.grid(True, linestyle='--', alpha=0.7)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PROCESSED_DATA_PATH, 'keypoint_distribution.png'))
    
    print("\nDiagnosis complete. Saved visualizations to:", PROCESSED_DATA_PATH)
    print("Consider the following potential issues:")
    print("1. Extreme class imbalance")
    print("2. Missing or corrupted data")
    print("3. Inconsistent hand positioning between classes")
    print("4. Train/test split issues")

if __name__ == "__main__":
    diagnose_data()