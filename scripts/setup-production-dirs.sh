#!/bin/bash

# Production Directory Setup Script
# This script creates the necessary directories for production deployment

set -e

echo "Setting up production directories..."

# Base data directory
DATA_DIR="/opt/tempmail/data"
LOGS_DIR="/opt/tempmail/logs"
CONFIG_DIR="/opt/tempmail/config"

# Create data directories
sudo mkdir -p "$DATA_DIR/mongodb"
sudo mkdir -p "$DATA_DIR/redis"
sudo mkdir -p "$DATA_DIR/mailserver"

# Create log directories
sudo mkdir -p "$LOGS_DIR/nginx"
sudo mkdir -p "$LOGS_DIR/postfix"
sudo mkdir -p "$LOGS_DIR/backend"

# Create config directories
sudo mkdir -p "$CONFIG_DIR/nginx"
sudo mkdir -p "$CONFIG_DIR/postfix"
sudo mkdir -p "$CONFIG_DIR/mongodb"
sudo mkdir -p "$CONFIG_DIR/redis"

# Set proper ownership
sudo chown -R tempmail:tempmail "$DATA_DIR"
sudo chown -R tempmail:tempmail "$LOGS_DIR"
sudo chown -R tempmail:tempmail "$CONFIG_DIR"

# Set proper permissions
sudo chmod -R 755 "$DATA_DIR"
sudo chmod -R 755 "$LOGS_DIR"
sudo chmod -R 755 "$CONFIG_DIR"

# Special permissions for mailserver
sudo chmod 750 "$DATA_DIR/mailserver"

echo "✅ Production directories created successfully!"
echo "📁 Data directory: $DATA_DIR"
echo "📁 Logs directory: $LOGS_DIR"
echo "📁 Config directory: $CONFIG_DIR"

# Verify directories
echo ""
echo "Directory structure:"
tree -L 3 /opt/tempmail/ 2>/dev/null || ls -la /opt/tempmail/