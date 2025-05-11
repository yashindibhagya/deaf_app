import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score
import matplotlib.pyplot as plt
import seaborn as sns
import sys

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import PROCESSED_DATA_PATH, MODELS_PATH, ACTIONS

def evaluate_model(model_path=None):
    """
    Evaluate the trained model's performance on the test set
    
    Args:
        model_path: Path to the saved model (if None, use default path)
        
    Returns:
        dict: Evaluation metrics
    """
    # Load the model
    if model_path is None:
        model_path = os.path.join(MODELS_PATH, 'sign_language_model.keras')
    
    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}")
        sys.exit(1)
    
    model = load_model(model_path)
    print(f"Loaded model from {model_path}")
    
    # Load the test data
    try:
        X_test = np.load(os.path.join(PROCESSED_DATA_PATH, 'X_test.npy'))
        y_test = np.load(os.path.join(PROCESSED_DATA_PATH, 'y_test.npy'))
    except FileNotFoundError:
        print("Error: Test data files not found. Run prepare_data.py first.")
        sys.exit(1)
    
    # Make predictions
    y_pred_prob = model.predict(X_test)
    y_pred = np.argmax(y_pred_prob, axis=1)
    y_true = np.argmax(y_test, axis=1)
    
    # Calculate metrics
    accuracy = accuracy_score(y_true, y_pred)
    conf_matrix = confusion_matrix(y_true, y_pred)
    class_report = classification_report(y_true, y_pred, target_names=ACTIONS, output_dict=True)
    
    # Print results
    print(f"Model Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=ACTIONS))
    
    # Plot confusion matrix
    plt.figure(figsize=(10, 8))
    sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues',
                xticklabels=ACTIONS, yticklabels=ACTIONS)
    plt.xlabel('Predicted')
    plt.ylabel('True')
    plt.title('Confusion Matrix')
    plt.tight_layout()
    
    # Save plot
    confusion_matrix_path = os.path.join(MODELS_PATH, 'confusion_matrix.png')
    plt.savefig(confusion_matrix_path)
    print(f"Confusion matrix saved to {confusion_matrix_path}")
    plt.show()
    
    # Calculate per-class metrics
    class_accuracies = {}
    for i, action in enumerate(ACTIONS):
        class_mask = (y_true == i)
        if np.sum(class_mask) > 0:  # Avoid division by zero
            class_acc = np.sum((y_pred == i) & class_mask) / np.sum(class_mask)
            class_accuracies[action] = class_acc
    
    # Plot per-class accuracies
    plt.figure(figsize=(12, 6))
    plt.bar(class_accuracies.keys(), class_accuracies.values())
    plt.xlabel('Action Class')
    plt.ylabel('Accuracy')
    plt.title('Per-Class Accuracy')
    plt.ylim(0, 1.1)  # Set y-axis limit from 0 to 1.1
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    
    for action, acc in class_accuracies.items():
        plt.text(action, acc + 0.02, f'{acc:.2f}', ha='center')
    
    # Save plot
    class_accuracy_path = os.path.join(MODELS_PATH, 'class_accuracies.png')
    plt.savefig(class_accuracy_path)
    print(f"Class accuracies plot saved to {class_accuracy_path}")
    plt.show()
    
    # Return metrics
    return {
        'accuracy': accuracy,
        'confusion_matrix': conf_matrix,
        'classification_report': class_report,
        'class_accuracies': class_accuracies
    }

if __name__ == "__main__":
    evaluate_model()
    print("Model evaluation complete!")