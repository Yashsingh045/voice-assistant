FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PyAudio and general needs
RUN apt-get update && apt-get install -y \
    build-essential \
    portaudio19-dev \
    python3-all-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "app/main.py"]
