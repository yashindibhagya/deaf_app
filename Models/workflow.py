# workflow.py
import os
import subprocess
import sys
import time

def run_command(command, description):
    """Run a command and print its output in real-time"""
    print(f"\n{'='*80}")
    print(f"STEP: {description}")
    print(f"{'='*80}\n")
    
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        shell=True
    )
    
    # Print output in real-time
    for line in process.stdout:
        print(line, end='')
    
    # Wait for the command to finish
    process.wait()
    
    if process.returncode != 0:
        print(f"\nERROR: {description} failed with return code {process.returncode}")
        sys.exit(1)
    else:
        print(f"\nSUCCESS: {description} completed")

def main():
    """Run the complete workflow"""
    start_time = time.time()
    
    # Step 1: Clean and augment data
    run_command(
        "python scripts/clean_and_augment_data.py",
        "Cleaning and augmenting data"
    )
    
    # Step 2: Train improved model
    run_command(
        "python scripts/train_model.py",
        "Training improved model"
    )
    
    # Step 3: Evaluate model
    run_command(
        "python scripts/evaluate_model.py --model models/sign_language_model.keras",
        "Evaluating model"
    )
    
    # Print total time
    total_time = time.time() - start_time
    hours, remainder = divmod(total_time, 3600)
    minutes, seconds = divmod(remainder, 60)
    print(f"\nTotal workflow time: {int(hours)}h {int(minutes)}m {int(seconds)}s")
    
    print("\nWorkflow complete!")
    print("To test the model in real-time, run: python scripts/realtime_recognition.py")

if __name__ == "__main__":
    main()