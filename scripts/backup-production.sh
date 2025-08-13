#!/bin/bash

# Backup script for production environment

BACKUP_DIR="/opt/tempmail/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="tempmail_backup_$DATE"

echo "Starting backup of production data..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup of MongoDB data
echo "Backing up MongoDB data..."
docker-compose -f docker-compose.prod.yml --env-file .env.production exec mongodb mongodump --archive --gzip > "$BACKUP_DIR/mongodb_$BACKUP_NAME.gz"

# Create backup of Redis data
echo "Backing up Redis data..."
docker-compose -f docker-compose.prod.yml --env-file .env.production exec redis redis-cli BGSAVE
# Note: Redis snapshot is automatically saved to /data/dump.rdb in the container

# Create backup of environment file
echo "Backing up environment configuration..."
cp .env.production "$BACKUP_DIR/env_$BACKUP_NAME"

# Create backup of logs
echo "Backing up logs..."
tar -czf "$BACKUP_DIR/logs_$BACKUP_NAME.tar.gz" logs/

# Create backup of SSL certificates
echo "Backing up SSL certificates..."
tar -czf "$BACKUP_DIR/ssl_$BACKUP_NAME.tar.gz" config/nginx/ssl/

echo "Backup completed successfully!"
echo "Backup files are located in: $BACKUP_DIR"
ls -la $BACKUP_DIR