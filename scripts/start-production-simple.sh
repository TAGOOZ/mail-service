#!/bin/bash

set -e

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "Error: .env.production file not found!"
    echo "Please create the .env.production file first."
    exit 1
fi

echo "Starting MongoDB and Redis..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d mongodb redis

echo "Starting backend..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d backend

echo "Starting frontend..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d frontend

echo "Starting nginx..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d nginx

echo "Done! Production environment started successfully."
echo "Services:"
docker ps

# Check if backend is ready
echo "Waiting for backend to be ready..."
max_attempts=15
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s -f http://localhost:3001/api/health > /dev/null; then
        echo "Backend is ready! You can access the application at https://mail.nnu.edu.kg"
        exit 0
    fi
    echo "Waiting for backend to be ready..."
    sleep 2
    attempt=$((attempt + 1))
done

echo "Warning: Backend may not be fully ready yet. Check logs with 'docker logs tempmail-backend'"
