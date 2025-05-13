#!/usr/bin/env python3
"""
GestureConnect - Main Entry Script
This script provides a command-line interface for the GestureConnect system.
"""

import os
import sys
import argparse
import time

def ensure_directory_structure():
    """Create necessary directories if they don't exist"""
    dirs = [
        "data",
        "data/processed",
        "models",
        "logs"
    ]
    
    for directory in dirs:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"Created directory: {directory}")

def main():
    # Ensure directory structure
    ensure_directory_structure()
    
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="GestureConnect - Sign Language Recognition System",
        formatter_class=argparse.RawTextHelpFormatter)
    
    # Add subparsers for different commands
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Collect data command
    collect_parser = subparsers.add_parser("collect", help="Collect sign language training data")
    
    # Prepare data command
    prepare_parser = subparsers.add_parser("prepare", help="Prepare collected data for training")
    
    # Train model command
    train_parser = subparsers.add_parser("train", help="Train sign language recognition model")
    train_parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs")
    train_parser.add_argument("--batch-size", type=int, default=32, help="Batch size for training")
    
    # Evaluate model command
    evaluate_parser = subparsers.add_parser("evaluate", help="Evaluate trained model")
    evaluate_parser.add_argument("--model", type=str, help="Path to model file")
    
    # Run real-time recognition command
    realtime_parser = subparsers.add_parser("realtime", help="Run real-time sign language recognition")
    
    # API server command
    api_parser = subparsers.add_parser("api", help="Start API server for mobile app")
    api_parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")
    api_parser.add_argument("--port", type=int, default=8000, help="Port to run the server on")
    
    # Parse arguments
    args = parser.parse_args()
    
    # If no command is specified, show help
    if args.command is None:
        parser.print_help()
        return
    
    # Execute the specified command
    if args.command == "collect":
        from scripts.collect_data import collect_data
        collect_data()
    
    elif args.command == "prepare":
        from scripts.prepare_data import prepare_data
        prepare_data()
    
    elif args.command == "train":
        from scripts.train_model import train_model
        train_model(epochs=args.epochs, batch_size=args.batch_size)
    
    elif args.command == "evaluate":
        from scripts.evaluate_model import evaluate_model
        evaluate_model(model_path=args.model)
    
    elif args.command == "realtime":
        from scripts.realtime_recognition import realtime_recognition
        realtime_recognition()
    
    elif args.command == "api":
        # Importing uvicorn causes some TensorFlow initialization issues, so we use os.system
        cmd = f"python app_integration/model_bridge.py --host {args.host} --port {args.port}"
        os.system(cmd)

if __name__ == "__main__":
    main()