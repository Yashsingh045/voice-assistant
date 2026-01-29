# Use a base Python image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    portaudio19-dev \
    python3-all-dev \
    curl \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for Prisma CLI
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN prisma generate

# Copy the rest of the application
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD prisma migrate deploy && uvicorn app.main:app --host 0.0.0.0 --port 8000
