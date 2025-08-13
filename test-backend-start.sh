#!/bin/bash

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
until docker-compose -f docker-compose.prod.yml --env-file .env.production exec mongodb mongosh --eval "db.adminCommand('ping')" &>/dev/null; do
  echo "Waiting for MongoDB..."
  sleep 2
done

echo "MongoDB is ready!"

# Check if Redis is ready
echo "Checking Redis..."
if docker-compose -f docker-compose.prod.yml --env-file .env.production exec redis redis-cli ping &>/dev/null; then
  echo "Redis is ready!"
else
  echo "Redis is not ready"
  exit 1
fi

# Try to start the backend service
echo "Starting backend service..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d backend

# Wait a few seconds and check the status
sleep 10
echo "Checking backend status..."
docker-compose -f docker-compose.prod.yml --env-file .env.production ps

# Check logs
echo "Backend logs:"
docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=30 backend