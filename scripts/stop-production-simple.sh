#!/bin/bash
set -e

echo "Stopping all production services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down

echo "All services stopped."
