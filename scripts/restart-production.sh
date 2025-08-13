#!/bin/bash

set -e

echo "Restarting all production services..."

# Stop all services
echo "Stopping services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down

# Start all services
echo "Starting services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

echo "Done! Production environment restarted successfully."
echo "Services:"
docker ps