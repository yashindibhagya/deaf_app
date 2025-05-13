"""
Sign Language Recognition Training Script
This module handles model training functionality for the GestureConnect system.
"""
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization, Bidirectional, Conv1D, MaxPooling1D
from tensorflow.keras.callbacks import TensorBoard, ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.regularizers import l2
import matplotlib.pyplot as plt
import datetime
import sys
from sklearn.utils.class_weight import compute_class_weight

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import (
    PROCESSED_DATA_PATH, MODELS_PATH, LOGS_PATH, 
    ACTIONS, SEQUENCE_LENGTH, EPOCHS, BATCH_SIZE
)

# Updated hyperparameters
LEARNING_RATE = 0.0005  # Reduced learning rate for better convergence
DROPOUT_RATE = 0.4     # Reduced dropout for better feature learning
L2_REGULARIZATION = 0.0005  # Reduced L2 regularization

def build_enhanced_model(input_shape, num_classes):
    """
    Build an enhanced model architecture with CNN-LSTM hybrid approach
    
    Args:
        input_shape: Shape of input data
        num_classes: Number of output classes
        
    Returns:
        Compiled Keras model
    """
    model = Sequential()
    
    # CNN layers for spatial feature extraction
    model.add(Conv1D(64, kernel_size=3, activation='relu', input_shape=input_shape,
                    kernel_regularizer=l2(L2_REGULARIZATION)))
    model.add(BatchNormalization())
    model.add(MaxPooling1D(pool_size=2))
    
    model.add(Conv1D(128, kernel_size=3, activation='relu',
                    kernel_regularizer=l2(L2_REGULARIZATION)))
    model.add(BatchNormalization())
    model.add(MaxPooling1D(pool_size=2))
    
    # Bidirectional LSTM layers for temporal feature extraction
    model.add(Bidirectional(LSTM(128, return_sequences=True,
                               kernel_regularizer=l2(L2_REGULARIZATION))))
    model.add(BatchNormalization())
    model.add(Dropout(DROPOUT_RATE))
    
    model.add(Bidirectional(LSTM(64, return_sequences=False,
                               kernel_regularizer=l2(L2_REGULARIZATION))))
    model.add(BatchNormalization())
    model.add(Dropout(DROPOUT_RATE))
    
    # Dense layers for classification
    model.add(Dense(128, activation='relu',
                   kernel_regularizer=l2(L2_REGULARIZATION)))
    model.add(BatchNormalization())
    model.add(Dropout(DROPOUT_RATE))
    
    model.add(Dense(64, activation='relu',
                   kernel_regularizer=l2(L2_REGULARIZATION)))
    model.add(BatchNormalization())
    model.add(Dropout(DROPOUT_RATE))
    
    # Output layer
    model.add(Dense(num_classes, activation='softmax'))
    
    return model

def train_model(epochs=EPOCHS, batch_size=BATCH_SIZE, learning_rate=LEARNING_RATE):
    """
    Train enhanced model on prepared sign language data
    
    Args:
        epochs: Number of training epochs
        batch_size: Batch size for training
        learning_rate: Learning rate for optimizer
        
    Returns:
        model: Trained Keras model
    """
    # Create models directory if it doesn't exist
    if not os.path.exists(MODELS_PATH):
        os.makedirs(MODELS_PATH)
    
    # Load preprocessed data
    try:
        X_train = np.load(os.path.join(PROCESSED_DATA_PATH, 'X_train.npy'))
        X_test = np.load(os.path.join(PROCESSED_DATA_PATH, 'X_test.npy'))
        y_train = np.load(os.path.join(PROCESSED_DATA_PATH, 'y_train.npy'))
        y_test = np.load(os.path.join(PROCESSED_DATA_PATH, 'y_test.npy'))
    except FileNotFoundError:
        print("Error: Processed data files not found. Run prepare_data.py first.")
        sys.exit(1)
    
    # Print dataset info
    print(f"Training data shape: {X_train.shape}")
    print(f"Test data shape: {X_test.shape}")
    print(f"Number of action classes: {len(ACTIONS)}")
    
    # Check class distribution in training data
    y_integers = np.argmax(y_train, axis=1)
    print("Class distribution in training data:")
    unique, counts = np.unique(y_integers, return_counts=True)
    class_distribution = dict(zip(unique, counts))
    
    for class_idx, count in class_distribution.items():
        class_name = ACTIONS[class_idx] if class_idx < len(ACTIONS) else f"Unknown_{class_idx}"
        print(f"  {class_name}: {count} samples")
    
    # Calculate class weights for imbalanced data
    try:
        class_weights = compute_class_weight(
            class_weight='balanced',
            classes=np.unique(y_integers),
            y=y_integers
        )
        class_weight_dict = dict(zip(np.unique(y_integers), class_weights))
        print("Using class weights:", class_weight_dict)
    except ValueError:
        print("Warning: Couldn't compute class weights, using uniform weights")
        class_weight_dict = None
    
    # Set up callbacks for training
    log_dir = os.path.join(LOGS_PATH, datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))
    os.makedirs(log_dir, exist_ok=True)
    tensorboard_callback = TensorBoard(log_dir=log_dir, histogram_freq=1)
    
    checkpoint_path = os.path.join(MODELS_PATH, 'checkpoints', 'model_checkpoint.keras')
    os.makedirs(os.path.dirname(checkpoint_path), exist_ok=True)
    checkpoint_callback = ModelCheckpoint(
        filepath=checkpoint_path,
        monitor='val_accuracy',
        mode='max',
        save_best_only=True,
        verbose=1
    )
    
    # Enhanced learning rate reduction callback
    reduce_lr = ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.1,
        patience=8,
        min_lr=1e-7,
        verbose=1
    )
    
    # Enhanced early stopping
    early_stopping = EarlyStopping(
        monitor='val_loss',
        patience=20,
        restore_best_weights=True,
        verbose=1
    )
    
    # Build and compile enhanced model
    model = build_enhanced_model(
        input_shape=(SEQUENCE_LENGTH, X_train.shape[2]),
        num_classes=len(ACTIONS)
    )
    
    # Compile model with custom learning rate
    optimizer = Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Print model summary
    model.summary()
    
    # Train model with enhanced parameters
    history = model.fit(
        X_train, y_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_data=(X_test, y_test),
        callbacks=[tensorboard_callback, checkpoint_callback, early_stopping, reduce_lr],
        class_weight=class_weight_dict
    )
    
    # Save the model
    model_path = os.path.join(MODELS_PATH, 'sign_language_model.keras')
    model.save(model_path)
    print(f"Model saved to: {model_path}")
    
    # For TensorFlow Lite deployment
    try:
        print("Converting model to TFLite format...")
        tflite_path = os.path.join(MODELS_PATH, 'sign_language_model.tflite')
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        
        # Add necessary configuration for LSTM model conversion
        converter.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS,
            tf.lite.OpsSet.SELECT_TF_OPS
        ]
        converter.experimental_enable_resource_variables = True
        converter._experimental_lower_tensor_list_ops = False
        
        # Try the conversion
        tflite_model = converter.convert()
        
        # Save the TFLite model
        with open(tflite_path, 'wb') as f:
            f.write(tflite_model)
        print(f"TFLite model saved to: {tflite_path}")
    except Exception as e:
        print(f"Warning: TFLite conversion failed: {str(e)}")
        print("The regular Keras model was saved and can still be used for inference.")
    
    # Plot training history
    plt.figure(figsize=(15, 5))
    
    # Plot accuracy
    plt.subplot(1, 3, 1)
    plt.plot(history.history['accuracy'], label='Train Accuracy')
    plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
    plt.title('Model Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.6)
    
    # Plot loss
    plt.subplot(1, 3, 2)
    plt.plot(history.history['loss'], label='Train Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('Model Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.yscale('log')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.6)
    
    # Plot learning rate if available
    if 'lr' in history.history:
        plt.subplot(1, 3, 3)
        plt.plot(history.history['lr'], label='Learning Rate')
        plt.title('Learning Rate')
        plt.xlabel('Epoch')
        plt.ylabel('Learning Rate')
        plt.yscale('log')
        plt.grid(True, linestyle='--', alpha=0.6)
    
    plt.tight_layout()
    plt.savefig(os.path.join(MODELS_PATH, 'training_history.png'))
    plt.show()
    
    # Evaluate model on test data
    print("\nEvaluating model on test data:")
    test_loss, test_accuracy = model.evaluate(X_test, y_test)
    print(f"Test Loss: {test_loss:.4f}")
    print(f"Test Accuracy: {test_accuracy:.4f}")
    
    return model

if __name__ == "__main__":
    # Add command line argument support
    import argparse
    parser = argparse.ArgumentParser(description='Train sign language recognition model')
    parser.add_argument('--epochs', type=int, default=EPOCHS, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=BATCH_SIZE, help='Batch size for training')
    parser.add_argument('--learning-rate', type=float, default=LEARNING_RATE, help='Learning rate')
    args = parser.parse_args()
    
    train_model(epochs=args.epochs, batch_size=args.batch_size, learning_rate=args.learning_rate)