"""
Train an LSTM model for sign language recognition using extracted keypoints.
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
import pandas as pd
import pickle
import matplotlib.pyplot as plt

def load_data(data_dir, label_file):
    """
    Load processed keypoints and labels.
    
    Args:
        data_dir: Directory containing processed keypoint .npy files
        label_file: CSV file mapping filenames to sign labels
        
    Returns:
        X: Keypoints features (samples, frames, features)
        y: Labels
    """
    # Load label mapping
    labels_df = pd.read_csv(label_file)
    file_to_label = dict(zip(labels_df['filename'], labels_df['label']))
    
    X = []
    y = []
    
    # Get all .npy files
    keypoint_files = [f for f in os.listdir(data_dir) if f.endswith('.npy')]
    
    for keypoint_file in keypoint_files:
        # Load keypoints
        keypoints = np.load(os.path.join(data_dir, keypoint_file))
        
        # Get the label for this file
        filename = os.path.splitext(keypoint_file)[0]
        if filename in file_to_label:
            label = file_to_label[filename]
            
            # Add to dataset
            X.append(keypoints)
            y.append(label)
    
    return np.array(X), np.array(y)

def preprocess_data(X, y):
    """
    Preprocess the data for training.
    
    Args:
        X: Keypoints features (samples, frames, features)
        y: Labels
        
    Returns:
        X_train, X_val, X_test: Train, validation, and test features
        y_train, y_val, y_test: Train, validation, and test labels
        label_encoder: LabelEncoder for converting labels
    """
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    # Split data
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.2, random_state=42, stratify=y_train_val
    )
    
    # Normalize features
    # Reshape to combine all samples and frames
    X_train_reshaped = X_train.reshape(-1, X_train.shape[-1])
    X_val_reshaped = X_val.reshape(-1, X_val.shape[-1])
    X_test_reshaped = X_test.reshape(-1, X_test.shape[-1])
    
    # Fit scaler on training data
    scaler = StandardScaler()
    X_train_reshaped = scaler.fit_transform(X_train_reshaped)
    X_val_reshaped = scaler.transform(X_val_reshaped)
    X_test_reshaped = scaler.transform(X_test_reshaped)
    
    # Reshape back
    X_train = X_train_reshaped.reshape(X_train.shape)
    X_val = X_val_reshaped.reshape(X_val.shape)
    X_test = X_test_reshaped.reshape(X_test.shape)
    
    # Save the scaler
    with open('models/scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
        
    # Save the label encoder
    with open('models/label_encoder.pkl', 'wb') as f:
        pickle.dump(label_encoder, f)
    
    return X_train, X_val, X_test, y_train, y_val, y_test, label_encoder

def build_lstm_model(input_shape, num_classes):
    """
    Build an LSTM model for sign language recognition.
    
    Args:
        input_shape: Shape of input features (frames, features)
        num_classes: Number of sign classes
        
    Returns:
        model: Compiled Keras model
    """
    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=input_shape),
        BatchNormalization(),
        Dropout(0.2),
        
        LSTM(64, return_sequences=True),
        BatchNormalization(),
        Dropout(0.2),
        
        LSTM(32),
        BatchNormalization(),
        Dropout(0.2),
        
        Dense(64, activation='relu'),
        BatchNormalization(),
        Dropout(0.2),
        
        Dense(num_classes, activation='softmax')
    ])
    
    # Compile the model
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def train_model(model, X_train, y_train, X_val, y_val, batch_size=32, epochs=100, model_dir='models'):
    """
    Train the LSTM model.
    
    Args:
        model: Compiled Keras model
        X_train, y_train: Training data
        X_val, y_val: Validation data
        batch_size: Batch size for training
        epochs: Maximum number of epochs
        model_dir: Directory to save the model
        
    Returns:
        history: Training history
    """
    os.makedirs(model_dir, exist_ok=True)
    
    # Define callbacks
    model_checkpoint = ModelCheckpoint(
        os.path.join(model_dir, 'sign_language_model.h5'),
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    )
    
    early_stopping = EarlyStopping(
        monitor='val_accuracy',
        patience=20,
        restore_best_weights=True,
        verbose=1
    )
    
    reduce_lr = ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.1,
        patience=10,
        min_lr=0.00001,
        verbose=1
    )
    
    # Train the model
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        batch_size=batch_size,
        epochs=epochs,
        callbacks=[model_checkpoint, early_stopping, reduce_lr],
        verbose=1
    )
    
    # Save the model architecture and weights separately
    model_json = model.to_json()
    with open(os.path.join(model_dir, 'model_architecture.json'), 'w') as json_file:
        json_file.write(model_json)
    
    # Save training curves
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'])
    plt.plot(history.history['val_accuracy'])
    plt.title('Model accuracy')
    plt.ylabel('Accuracy')
    plt.xlabel('Epoch')
    plt.legend(['Train', 'Validation'], loc='upper left')
    
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'])
    plt.plot(history.history['val_loss'])
    plt.title('Model loss')
    plt.ylabel('Loss')
    plt.xlabel('Epoch')
    plt.legend(['Train', 'Validation'], loc='upper left')
    
    plt.tight_layout()
    plt.savefig(os.path.join(model_dir, 'training_curves.png'))
    
    return history

def evaluate_model(model, X_test, y_test, label_encoder):
    """
    Evaluate the model on test data.
    
    Args:
        model: Trained Keras model
        X_test, y_test: Test data
        label_encoder: LabelEncoder for converting labels
        
    Returns:
        evaluation: Evaluation metrics
    """
    # Evaluate the model
    loss, accuracy = model.evaluate(X_test, y_test, verbose=1)
    print(f"Test loss: {loss:.4f}")
    print(f"Test accuracy: {accuracy:.4f}")
    
    # Compute confusion matrix
    y_pred = model.predict(X_test)
    y_pred_classes = np.argmax(y_pred, axis=1)
    
    from sklearn.metrics import confusion_matrix, classification_report
    
    cm = confusion_matrix(y_test, y_pred_classes)
    report = classification_report(y_test, y_pred_classes, target_names=label_encoder.classes_)
    
    print("Classification Report:")
    print(report)
    
    # Save confusion matrix
    plt.figure(figsize=(12, 10))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion Matrix')
    plt.colorbar()
    
    tick_marks = np.arange(len(label_encoder.classes_))
    plt.xticks(tick_marks, label_encoder.classes_, rotation=90)
    plt.yticks(tick_marks, label_encoder.classes_)
    
    fmt = 'd'
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, format(cm[i, j], fmt),
                    horizontalalignment="center",
                    color="white" if cm[i, j] > thresh else "black")
    
    plt.tight_layout()
    plt.ylabel('True label')
    plt.xlabel('Predicted label')
    plt.savefig('models/confusion_matrix.png')
    
    return {
        'loss': loss,
        'accuracy': accuracy,
        'report': report
    }

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Train LSTM model for sign language recognition.')
    parser.add_argument('--data_dir', type=str, required=True, help='Directory containing processed keypoints')
    parser.add_argument('--label_file', type=str, required=True, help='CSV file mapping filenames to sign labels')
    parser.add_argument('--model_dir', type=str, default='models', help='Directory to save the model')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size for training')
    parser.add_argument('--epochs', type=int, default=100, help='Maximum number of epochs')
    
    args = parser.parse_args()
    
    # Create model directory
    os.makedirs(args.model_dir, exist_ok=True)
    
    # Load and preprocess data
    print("Loading data...")
    X, y = load_data(args.data_dir, args.label_file)
    
    print("Preprocessing data...")
    X_train, X_val, X_test, y_train, y_val, y_test, label_encoder = preprocess_data(X, y)
    
    print(f"Training with {len(X_train)} samples, validating with {len(X_val)} samples, testing with {len(X_test)} samples")
    print(f"Number of classes: {len(label_encoder.classes_)}")
    
    # Build model
    print("Building model...")
    input_shape = (X_train.shape[1], X_train.shape[2])  # (frames, features)
    num_classes = len(label_encoder.classes_)
    model = build_lstm_model(input_shape, num_classes)
    model.summary()
    
    # Train model
    print("Training model...")
    history = train_model(model, X_train, y_train, X_val, y_val, 
                         batch_size=args.batch_size, epochs=args.epochs, 
                         model_dir=args.model_dir)
    
    # Evaluate model
    print("Evaluating model...")
    evaluate_model(model, X_test, y_test, label_encoder)
    
    print(f"Model saved to {args.model_dir}")