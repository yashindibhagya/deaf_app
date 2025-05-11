import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Flatten, TimeDistributed
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
import matplotlib.pyplot as plt
import sys
from sklearn.utils.class_weight import compute_class_weight

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import PROCESSED_DATA_PATH, MODELS_PATH, ACTIONS

def train_simple_model():
    """
    Train a simpler model to establish a baseline performance.
    This model has fewer parameters and less complexity to avoid overfitting.
    """
    # Load data
    try:
        X_train = np.load(os.path.join(PROCESSED_DATA_PATH, 'X_train.npy'))
        X_test = np.load(os.path.join(PROCESSED_DATA_PATH, 'X_test.npy'))
        y_train = np.load(os.path.join(PROCESSED_DATA_PATH, 'y_train.npy'))
        y_test = np.load(os.path.join(PROCESSED_DATA_PATH, 'y_test.npy'))
    except FileNotFoundError:
        print("Error: Data files not found. Run prepare_data.py first.")
        return
    
    print(f"Training data shape: {X_train.shape}")
    print(f"Test data shape: {X_test.shape}")
    
    # Data preprocessing: Scale the data
    # Calculate mean and std for normalization
    mean = np.mean(X_train)
    std = np.std(X_train)
    print(f"Data mean: {mean}, std: {std}")
    
    # Apply normalization
    X_train_norm = (X_train - mean) / (std + 1e-8)  # Add small epsilon to avoid division by zero
    X_test_norm = (X_test - mean) / (std + 1e-8)
    
    # Create a very simple model with minimal parameters
    print("\nBuilding a simple baseline model...")
    model = Sequential([
        # Simple LSTM block
        LSTM(32, input_shape=(X_train.shape[1], X_train.shape[2]), 
             return_sequences=False, activation='tanh'),
        Dropout(0.3),
        
        # Output layer
        Dense(len(ACTIONS), activation='softmax')
    ])
    
    # Use Adam optimizer with a very low learning rate
    opt = Adam(learning_rate=0.0005)
    
    # Compile the model
    model.compile(optimizer=opt, loss='categorical_crossentropy', metrics=['accuracy'])
    
    # Print summary
    model.summary()
    
    # Calculate class weights if there's an imbalance
    y_integers = np.argmax(y_train, axis=1)
    class_weights = compute_class_weight('balanced', classes=np.unique(y_integers), y=y_integers)
    class_weight_dict = dict(enumerate(class_weights))
    print(f"Class weights: {class_weight_dict}")
    
    # Define callbacks
    callbacks = [
        EarlyStopping(patience=20, restore_best_weights=True, monitor='val_accuracy'),
        ReduceLROnPlateau(factor=0.5, patience=5, min_lr=1e-6, monitor='val_loss')
    ]
    
    # Train the model
    history = model.fit(
        X_train_norm, y_train,
        validation_data=(X_test_norm, y_test),
        epochs=100,
        batch_size=8,  # Small batch size for more stable training
        callbacks=callbacks,
        class_weight=class_weight_dict
    )
    
    # Evaluate the model
    print("\nEvaluating model on test data:")
    test_loss, test_accuracy = model.evaluate(X_test_norm, y_test)
    print(f"Test Loss: {test_loss:.4f}")
    print(f"Test Accuracy: {test_accuracy:.4f}")
    
    # Save the model
    model_path = os.path.join(MODELS_PATH, 'simple_model.keras')
    model.save(model_path)
    print(f"Model saved to: {model_path}")
    
    # Save normalization parameters for later use
    norm_params = {'mean': mean, 'std': std}
    np.save(os.path.join(MODELS_PATH, 'normalization_params.npy'), norm_params)
    print(f"Normalization parameters saved to: {os.path.join(MODELS_PATH, 'normalization_params.npy')}")
    
    # Plot training history
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'], label='Train Accuracy')
    plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
    plt.title('Model Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'], label='Train Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('Model Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    
    plt.tight_layout()
    plt.savefig(os.path.join(MODELS_PATH, 'simple_model_history.png'))
    
    # Make predictions on test data
    y_pred = model.predict(X_test_norm)
    y_pred_classes = np.argmax(y_pred, axis=1)
    y_true_classes = np.argmax(y_test, axis=1)
    
    # Count correct predictions per class
    for i in range(len(ACTIONS)):
        class_mask = (y_true_classes == i)
        if np.sum(class_mask) > 0:
            class_acc = np.mean(y_pred_classes[class_mask] == i)
            print(f"Class {ACTIONS[i]} accuracy: {class_acc:.2f} ({np.sum(y_pred_classes[class_mask] == i)}/{np.sum(class_mask)})")
    
    return model, (mean, std)

if __name__ == "__main__":
    train_simple_model()