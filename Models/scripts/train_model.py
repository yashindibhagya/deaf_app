import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
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

# Default values if not in config
LEARNING_RATE = 0.001  # Default learning rate
DROPOUT_RATE = 0.5     # Default dropout rate

def train_model(epochs=EPOCHS, batch_size=BATCH_SIZE, learning_rate=LEARNING_RATE):
    """
    Train LSTM model on prepared sign language data with improved parameters
    
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
        # Fallback if there's an issue with computing class weights
        print("Warning: Couldn't compute class weights, using uniform weights")
        class_weight_dict = None
    
    # Set up callbacks for training
    log_dir = os.path.join(LOGS_PATH, datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))
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
    
    # Add learning rate reduction callback
    reduce_lr = ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.2,
        patience=5,
        min_lr=1e-6,
        verbose=1
    )
    
    early_stopping = EarlyStopping(
        monitor='val_loss',
        patience=15,
        restore_best_weights=True,
        verbose=1
    )
    
    # Build LSTM model with improved architecture and regularization
    model = Sequential()
    
    # Input layer
    model.add(LSTM(64, 
                  return_sequences=True, 
                  activation='relu', 
                  input_shape=(SEQUENCE_LENGTH, X_train.shape[2]),
                  kernel_regularizer=l2(0.001)))  # Added L2 regularization
    model.add(Dropout(DROPOUT_RATE))
    
    # Middle LSTM layer
    model.add(LSTM(128, 
                  return_sequences=True, 
                  activation='relu',
                  kernel_regularizer=l2(0.001)))
    model.add(Dropout(DROPOUT_RATE))
    
    # Final LSTM layer
    model.add(LSTM(64, 
                  return_sequences=False, 
                  activation='relu',
                  kernel_regularizer=l2(0.001)))
    model.add(Dropout(DROPOUT_RATE))
    
    # Dense layers for classification
    model.add(Dense(64, 
                   activation='relu', 
                   kernel_regularizer=l2(0.001)))
    model.add(Dropout(DROPOUT_RATE))
    
    # Output layer with softmax activation
    model.add(Dense(len(ACTIONS), activation='softmax'))
    
    # Compile model with custom learning rate
    optimizer = Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Print model summary
    model.summary()
    
    # Train model
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
    
    # For TensorFlow Lite deployment with LSTM support
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
    plt.yscale('log')  # Log scale for better visualization of large loss values
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
    train_model()
    print("Model training complete!")