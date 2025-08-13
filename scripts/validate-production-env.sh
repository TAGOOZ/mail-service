#!/bin/bash

# Production environment validation script

echo "Validating production environment..."

# Check if required files exist
echo "Checking required files..."

if [ ! -f .env.production ]; then
    echo "ERROR: .env.production file not found"
    exit 1
else
    echo "✅ .env.production file found"
fi

# Check if required directories exist
echo "Checking required directories..."

if [ ! -d /opt/tempmail/data/mongodb ]; then
    echo "WARNING: /opt/tempmail/data/mongodb directory not found"
else
    echo "✅ /opt/tempmail/data/mongodb directory found"
fi

if [ ! -d /opt/tempmail/data/redis ]; then
    echo "WARNING: /opt/tempmail/data/redis directory not found"
else
    echo "✅ /opt/tempmail/data/redis directory found"
fi

if [ ! -d /opt/tempmail/data/mailserver ]; then
    echo "WARNING: /opt/tempmail/data/mailserver directory not found"
else
    echo "✅ /opt/tempmail/data/mailserver directory found"
fi

# Check Docker and Docker Compose
echo "Checking Docker installation..."

if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    exit 1
else
    echo "✅ Docker is installed"
fi

if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed"
    exit 1
else
    echo "✅ Docker Compose is installed"
fi

# Check if user is in docker group
if groups | grep -q docker; then
    echo "✅ User is in docker group"
else
    echo "WARNING: User is not in docker group"
fi

# Validate environment variables
echo "Validating environment variables..."

# Source the .env.production file to check variables
set -a
source .env.production
set +a

if [ -z "$MONGODB_ROOT_USERNAME" ]; then
    echo "ERROR: MONGODB_ROOT_USERNAME is not set"
    exit 1
else
    echo "✅ MONGODB_ROOT_USERNAME is set"
fi

if [ -z "$MONGODB_ROOT_PASSWORD" ]; then
    echo "ERROR: MONGODB_ROOT_PASSWORD is not set"
    exit 1
else
    echo "✅ MONGODB_ROOT_PASSWORD is set"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET is not set"
    exit 1
else
    echo "✅ JWT_SECRET is set"
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "ERROR: SESSION_SECRET is not set"
    exit 1
else
    echo "✅ SESSION_SECRET is set"
fi

echo "✅ Environment validation completed successfully!"