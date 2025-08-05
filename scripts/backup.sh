#!/bin/bash

# Backup script for TempMail production data
# This script creates backups of MongoDB and Redis data

set -e

# Configuration
BACKUP_DIR="/opt/tempmail/backups"
RETENTION_DAYS=30
MONGODB_CONTAINER="tempmail-mongodb-prod"
REDIS_CONTAINER="tempmail-redis-prod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to create backup directory
create_backup_dir() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/backup_$timestamp"
    
    mkdir -p "$backup_path"
    echo "$backup_path"
}

# Function to backup MongoDB
backup_mongodb() {
    local backup_path=$1
    
    print_status "Backing up MongoDB..."
    
    if ! docker ps --filter "name=$MONGODB_CONTAINER" --filter "status=running" --format "{{.Names}}" | grep -q "$MONGODB_CONTAINER"; then
        print_error "MongoDB container is not running"
        return 1
    fi
    
    # Create MongoDB backup
    docker exec "$MONGODB_CONTAINER" mongodump --out /tmp/backup --quiet
    
    # Copy backup from container
    docker cp "$MONGODB_CONTAINER:/tmp/backup" "$backup_path/mongodb"
    
    # Cleanup temporary backup in container
    docker exec "$MONGODB_CONTAINER" rm -rf /tmp/backup
    
    # Compress backup
    tar -czf "$backup_path/mongodb.tar.gz" -C "$backup_path" mongodb
    rm -rf "$backup_path/mongodb"
    
    local backup_size=$(du -h "$backup_path/mongodb.tar.gz" | cut -f1)
    print_success "MongoDB backup completed ($backup_size)"
}

# Function to backup Redis
backup_redis() {
    local backup_path=$1
    
    print_status "Backing up Redis..."
    
    if ! docker ps --filter "name=$REDIS_CONTAINER" --filter "status=running" --format "{{.Names}}" | grep -q "$REDIS_CONTAINER"; then
        print_error "Redis container is not running"
        return 1
    fi
    
    # Force Redis to save current state
    docker exec "$REDIS_CONTAINER" redis-cli BGSAVE
    
    # Wait for background save to complete
    while [ "$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)" = "$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)" ]; do
        sleep 1
    done
    
    # Copy Redis dump file
    docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$backup_path/redis.rdb"
    
    # Compress backup
    gzip "$backup_path/redis.rdb"
    
    local backup_size=$(du -h "$backup_path/redis.rdb.gz" | cut -f1)
    print_success "Redis backup completed ($backup_size)"
}

# Function to backup application logs
backup_logs() {
    local backup_path=$1
    
    print_status "Backing up application logs..."
    
    if [ -d "/opt/tempmail/logs" ]; then
        tar -czf "$backup_path/logs.tar.gz" -C "/opt/tempmail" logs
        local backup_size=$(du -h "$backup_path/logs.tar.gz" | cut -f1)
        print_success "Logs backup completed ($backup_size)"
    else
        print_warning "No logs directory found"
    fi
}

# Function to create backup metadata
create_metadata() {
    local backup_path=$1
    local metadata_file="$backup_path/backup_info.txt"
    
    cat > "$metadata_file" << EOF
TempMail Backup Information
==========================
Backup Date: $(date)
Backup Path: $backup_path
Hostname: $(hostname)
Docker Version: $(docker --version)

Services Status:
$(docker-compose -f docker-compose.prod.yml ps)

Disk Usage:
$(df -h)

Memory Usage:
$(free -h)
EOF
    
    print_success "Backup metadata created"
}

# Function to cleanup old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    find "$BACKUP_DIR" -name "backup_*" -type d -mtime +$RETENTION_DAYS -print0 | while IFS= read -r -d '' backup; do
        print_status "Deleting old backup: $(basename "$backup")"
        rm -rf "$backup"
        deleted_count=$((deleted_count + 1))
    done
    
    if [ $deleted_count -eq 0 ]; then
        print_status "No old backups to clean up"
    else
        print_success "Cleaned up $deleted_count old backup(s)"
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_path=$1
    
    print_status "Verifying backup integrity..."
    
    local errors=0
    
    # Check MongoDB backup
    if [ -f "$backup_path/mongodb.tar.gz" ]; then
        if tar -tzf "$backup_path/mongodb.tar.gz" >/dev/null 2>&1; then
            print_success "MongoDB backup integrity verified"
        else
            print_error "MongoDB backup is corrupted"
            errors=$((errors + 1))
        fi
    fi
    
    # Check Redis backup
    if [ -f "$backup_path/redis.rdb.gz" ]; then
        if gzip -t "$backup_path/redis.rdb.gz" >/dev/null 2>&1; then
            print_success "Redis backup integrity verified"
        else
            print_error "Redis backup is corrupted"
            errors=$((errors + 1))
        fi
    fi
    
    # Check logs backup
    if [ -f "$backup_path/logs.tar.gz" ]; then
        if tar -tzf "$backup_path/logs.tar.gz" >/dev/null 2>&1; then
            print_success "Logs backup integrity verified"
        else
            print_error "Logs backup is corrupted"
            errors=$((errors + 1))
        fi
    fi
    
    return $errors
}

# Function to send backup notification
send_notification() {
    local backup_path=$1
    local status=$2
    
    local backup_name=$(basename "$backup_path")
    local total_size=$(du -sh "$backup_path" | cut -f1)
    
    if [ "$status" = "success" ]; then
        local message="✅ TempMail backup completed successfully
Backup: $backup_name
Size: $total_size
Location: $backup_path"
    else
        local message="❌ TempMail backup failed
Backup: $backup_name
Please check the logs for details."
    fi
    
    # Log the notification
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> /opt/tempmail/logs/backup.log
    
    # Send email notification if mail is available
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "TempMail Backup Notification" admin@nnu.edu.kg
    fi
}

# Main backup function
main() {
    echo "=================================="
    echo "   TEMPMAIL BACKUP PROCESS"
    echo "=================================="
    echo "Starting backup at $(date)"
    echo
    
    # Create backup directory
    local backup_path=$(create_backup_dir)
    print_status "Created backup directory: $backup_path"
    
    # Perform backups
    local backup_errors=0
    
    backup_mongodb "$backup_path" || backup_errors=$((backup_errors + 1))
    backup_redis "$backup_path" || backup_errors=$((backup_errors + 1))
    backup_logs "$backup_path" || backup_errors=$((backup_errors + 1))
    
    # Create metadata
    create_metadata "$backup_path"
    
    # Verify backup integrity
    if verify_backup "$backup_path"; then
        print_success "Backup integrity verification passed"
    else
        print_error "Backup integrity verification failed"
        backup_errors=$((backup_errors + 1))
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Calculate total backup size
    local total_size=$(du -sh "$backup_path" | cut -f1)
    
    if [ $backup_errors -eq 0 ]; then
        print_success "Backup completed successfully!"
        print_status "Backup location: $backup_path"
        print_status "Total size: $total_size"
        send_notification "$backup_path" "success"
    else
        print_error "Backup completed with $backup_errors error(s)"
        send_notification "$backup_path" "failed"
        exit 1
    fi
    
    echo
    echo "=================================="
}

# Handle script arguments
case "${1:-backup}" in
    "backup")
        # Ensure backup directory exists
        mkdir -p "$BACKUP_DIR"
        main
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo "Usage: $0 restore <backup_path>"
            echo "Available backups:"
            ls -la "$BACKUP_DIR" | grep "backup_"
            exit 1
        fi
        print_status "Restore functionality not implemented yet"
        print_status "Please restore manually from: $2"
        ;;
    "list")
        echo "Available backups:"
        ls -la "$BACKUP_DIR" | grep "backup_" | while read -r line; do
            backup_name=$(echo "$line" | awk '{print $9}')
            backup_size=$(du -sh "$BACKUP_DIR/$backup_name" 2>/dev/null | cut -f1 || echo "Unknown")
            echo "  $backup_name ($backup_size)"
        done
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 {backup|restore|list|cleanup}"
        echo "  backup   - Create a new backup (default)"
        echo "  restore  - Restore from backup (specify backup path)"
        echo "  list     - List available backups"
        echo "  cleanup  - Remove old backups"
        exit 1
        ;;
esac