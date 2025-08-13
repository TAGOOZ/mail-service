#!/bin/bash

# Setup production directories script

set -e

echo "Setting up production directories..."

# Create base directory
sudo mkdir -p /opt/tempmail

# Create data directories
sudo mkdir -p /opt/tempmail/data/mongodb
sudo mkdir -p /opt/tempmail/data/redis
sudo mkdir -p /opt/tempmail/data/mailserver

# Create logs directories
sudo mkdir -p /opt/tempmail/logs/nginx
sudo mkdir -p /opt/tempmail/logs/postfix

# Create config directories
sudo mkdir -p /opt/tempmail/config/nginx
sudo mkdir -p /opt/tempmail/config/postfix

# Set permissions
sudo chown -R $(id -u):$(id -g) /opt/tempmail

echo "Production directories created successfully!"