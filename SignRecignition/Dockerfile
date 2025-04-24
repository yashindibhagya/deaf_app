FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port
EXPOSE 8000

# Set environment variables
ENV MODEL_PATH=/app/models/sign_language_model.h5
ENV SCALER_PATH=/app/models/scaler.pkl
ENV LABEL_ENCODER_PATH=/app/models/label_encoder.pkl

# Run the API server
CMD ["python", "-m", "api.app", "--host", "0.0.0.0", "--port", "8000"]