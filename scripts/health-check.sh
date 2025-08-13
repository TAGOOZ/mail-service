#!/bin/bash

# Health check script for production environment

echo "Checking production environment health..."

# Check if docker is running
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH"
    exit 1
fi

# Check if docker-compose is running
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed or not in PATH"
    exit 1
fi

# Check if required env file exists
if [ ! -f .env.production ]; then
    echo "ERROR: .env.production file not found"
    exit 1
fi

# Check if required directories exist
if [ ! -d /opt/tempmail/data/mongodb ] || [ ! -d /opt/tempmail/data/redis ] || [ ! -d /opt/tempmail/data/mailserver ]; then
    echo "WARNING: Required data directories not found. Please run the start script to create them."
fi

# Check running containers
echo "Checking running containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

# Check nginx health
echo "Checking nginx health..."
if curl -f http://localhost/health &> /dev/null; then
    echo "nginx: OK"
else
    echo "nginx: FAILED"
fi

# Check frontend health
echo "Checking frontend health..."
if curl -f http://localhost:3000/health &> /dev/null; then
    echo "frontend: OK"
else
    echo "frontend: FAILED"
fi

# Check backend health
echo "Checking backend health..."
if curl -f http://localhost:3001/health &> /dev/null; then
    echo "backend: OK"
else
    echo "backend: FAILED"
fi

echo "Health check completed."