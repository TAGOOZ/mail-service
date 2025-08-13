#!/bin/bash
set -e

if [ "$1" == "backend" ] || [ -z "$1" ]; then
  echo "Restarting backend..."
  docker-compose -f docker-compose.prod.yml --env-file .env.production stop backend
  docker-compose -f docker-compose.prod.yml --env-file .env.production rm -f backend
  docker-compose -f docker-compose.prod.yml --env-file .env.production up -d backend
fi

if [ "$1" == "frontend" ] || [ -z "$1" ]; then
  echo "Restarting frontend..."
  docker-compose -f docker-compose.prod.yml --env-file .env.production stop frontend
  docker-compose -f docker-compose.prod.yml --env-file .env.production rm -f frontend
  docker-compose -f docker-compose.prod.yml --env-file .env.production up -d frontend
fi

if [ "$1" == "nginx" ] || [ -z "$1" ]; then
  echo "Restarting nginx..."
  docker-compose -f docker-compose.prod.yml --env-file .env.production stop nginx
  docker-compose -f docker-compose.prod.yml --env-file .env.production rm -f nginx
  docker-compose -f docker-compose.prod.yml --env-file .env.production up -d nginx
fi

echo "Services restarted:"
docker ps
