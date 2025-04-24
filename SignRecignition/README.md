# Sign Language Recognition System

This repository contains code for training and deploying a sign language recognition model that can translate sign language gestures into text, to be integrated with the GestureConnect application.

## Overview

The system consists of several key components:

1. **Data Processing**: Scripts to collect, organize, and preprocess video data of sign language gestures
2. **Model Training**: Code to train an LSTM-based deep learning model on extracted hand keypoints
3. **Inference Engine**: Real-time prediction functionality for translating signs to text
4. **API Service**: FastAPI server that exposes the model for use by the mobile app

## Prerequisites

- Python 3.8 or higher
- TensorFlow 2.x
- OpenCV
- MediaPipe
- FastAPI
- Docker (optional, for containerization)

## Installation

1. Clone this repository to your local machine.

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

## Data Preparation

To prepare your dataset:

1. Collect sign language videos and place them in a source directory.

2. Run the dataset preparation script:
   ```bash
   python src/preprocessing/prepare_dataset.py --source_dir /path/to/videos --base_dir data
   ```

3. Label your videos by editing the generated `data/labels.csv` file.

4. Split the dataset into training, validation, and test sets:
   ```bash
   python src/preprocessing/prepare_dataset.py --base_dir data --split
   ```

5. Process the videos to extract frames:
   ```bash
   python src/preprocessing/prepare_dataset.py --base_dir data --process
   ```

## Extracting Keypoints

Once your videos are processed, extract hand keypoints:

```bash
python src/preprocessing/extract_keypoints.py --input_dir data/train --output_dir data/processed/train
python src/preprocessing/extract_keypoints.py --input_dir data/val --output_dir data/processed/val
python src/preprocessing/extract_keypoints.py --input_dir data/test --output_dir data/processed/test
```

## Training the Model

To train the sign language recognition model:

```bash
python src/training/train_model.py --data_dir data/processed/train --label_file data/train/labels.csv --model_dir models
```

This will train an LSTM model and save it to the `models` directory.

## Testing the Model

You can test the model on the webcam feed:

```bash
python src/inference/predict.py --model models/sign_language_model.h5 --scaler models/scaler.pkl --encoder models/label_encoder.pkl
```

## Running the API Server

Start the FastAPI server:

```bash
cd api
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Or using the main script:

```bash
python -m api.app --host 0.0.0.0 --port 8000
```

## Docker Deployment

Build and run the Docker container:

```bash
docker build -t sign-language-recognition .
docker run -p 8000:8000 sign-language-recognition
```

## API Endpoints

- `GET /`: Welcome message
- `GET /health`: Health check endpoint
- `GET /classes`: Get the list of sign classes the model can recognize
- `POST /recognize/video`: Recognize signs from an uploaded video
- `POST /recognize/frames`: Recognize signs from a sequence of base64-encoded frames
- `POST /recognize/continuous`: Process a single frame in continuous recognition mode
- `POST /reset`: Reset the continuous recognition buffer

## Integration with GestureConnect App

Update the API URL in `Frontend/app/(tabs)/signToText.jsx` to point to your API server:

```javascript
const API_URL = "http://your-api-server:8000"; 
```

## Dataset Recommendations

For best results, we recommend:

1. Recording videos with good lighting and a neutral background
2. Including at least 20 examples of each sign
3. Capturing signs from different angles and by different signers
4. Using consistent framing to keep hands visible throughout the signing

## Future Improvements

- Add support for continuous sign language translation
- Implement attention mechanisms to improve accuracy
- Add transfer learning capabilities with pre-trained models
- Support for finger spelling recognition

## License

This project is licensed under the MIT License - see the LICENSE file for details.