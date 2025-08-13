#!/bin/bash

set -e

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "Error: .env.production file not found!"
    echo "Please create the .env.production file first."
    exit 1
fi

# Create required directories
echo "Creating required directories..."
mkdir -p /opt/tempmail/data/mongodb
mkdir -p /opt/tempmail/data/redis
mkdir -p /opt/tempmail/data/mailserver
mkdir -p logs/nginx
mkdir -p logs/postfix

echo "Starting all production services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

echo "Done! Production environment started successfully."
echo "Services:"
docker ps

echo "You can access the application at:"
echo "  - Web interface: http://localhost"
echo "  - API: http://localhost/api"
echo "  - SMTP server: localhost:25"
