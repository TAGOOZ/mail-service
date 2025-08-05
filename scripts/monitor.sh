#!/bin/bash

# Production monitoring script
# This script monitors system metrics and sends alerts if needed

set -e

# Configuration
LOG_FILE="/opt/tempmail/logs/monitor.log"
ALERT_EMAIL="admin@nnu.edu.kg"
SLACK_WEBHOOK_URL=""  # Set this if using Slack notifications

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=85
RESPONSE_TIME_THRESHOLD=2000  # milliseconds

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local message=$1
    local severity=$2
    
    log "ALERT [$severity]: $message"
    
    # Send email alert (requires mailutils)
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "TempMail Alert [$severity]" "$ALERT_EMAIL"
    fi
    
    # Send Slack alert
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 TempMail Alert [$severity]: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# Function to check CPU usage
check_cpu() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    cpu_usage=${cpu_usage%.*}  # Remove decimal part
    
    if [ "$cpu_usage" -gt "$CPU_THRESHOLD" ]; then
        send_alert "High CPU usage: ${cpu_usage}%" "WARNING"
        return 1
    fi
    
    log "CPU usage: ${cpu_usage}%"
    return 0
}

# Function to check memory usage
check_memory() {
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]; then
        send_alert "High memory usage: ${memory_usage}%" "WARNING"
        return 1
    fi
    
    log "Memory usage: ${memory_usage}%"
    return 0
}

# Function to check disk usage
check_disk() {
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
        send_alert "High disk usage: ${disk_usage}%" "CRITICAL"
        return 1
    fi
    
    log "Disk usage: ${disk_usage}%"
    return 0
}

# Function to check service response time
check_response_time() {
    local url="http://localhost:80/api/health"
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$url" | awk '{print $1*1000}')
    response_time=${response_time%.*}  # Remove decimal part
    
    if [ "$response_time" -gt "$RESPONSE_TIME_THRESHOLD" ]; then
        send_alert "Slow response time: ${response_time}ms" "WARNING"
        return 1
    fi
    
    log "Response time: ${response_time}ms"
    return 0
}

# Function to check Docker containers
check_containers() {
    local containers=("tempmail-nginx-prod" "tempmail-frontend-prod" "tempmail-backend-prod" "tempmail-mongodb-prod" "tempmail-redis-prod")
    local failed_containers=()
    
    for container in "${containers[@]}"; do
        if ! docker ps --filter "name=$container" --filter "status=running" --format "{{.Names}}" | grep -q "$container"; then
            failed_containers+=("$container")
        fi
    done
    
    if [ ${#failed_containers[@]} -gt 0 ]; then
        send_alert "Containers not running: ${failed_containers[*]}" "CRITICAL"
        return 1
    fi
    
    log "All containers are running"
    return 0
}

# Function to check database connections
check_database() {
    # Check MongoDB
    if ! docker exec tempmail-mongodb-prod mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        send_alert "MongoDB connection failed" "CRITICAL"
        return 1
    fi
    
    # Check Redis
    if ! docker exec tempmail-redis-prod redis-cli ping >/dev/null 2>&1; then
        send_alert "Redis connection failed" "CRITICAL"
        return 1
    fi
    
    log "Database connections are healthy"
    return 0
}

# Function to check log errors
check_logs() {
    local error_count=$(docker logs tempmail-backend-prod --since="5m" 2>&1 | grep -i error | wc -l)
    
    if [ "$error_count" -gt 10 ]; then
        send_alert "High error rate in logs: $error_count errors in last 5 minutes" "WARNING"
        return 1
    fi
    
    log "Error count in last 5 minutes: $error_count"
    return 0
}

# Function to cleanup old logs
cleanup_logs() {
    # Keep only last 30 days of logs
    find /opt/tempmail/logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    # Rotate monitor log if it's too large (>100MB)
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 104857600 ]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        touch "$LOG_FILE"
        log "Monitor log rotated"
    fi
}

# Main monitoring function
main() {
    log "Starting monitoring check"
    
    local checks_passed=0
    local total_checks=7
    
    check_cpu && ((checks_passed++))
    check_memory && ((checks_passed++))
    check_disk && ((checks_passed++))
    check_response_time && ((checks_passed++))
    check_containers && ((checks_passed++))
    check_database && ((checks_passed++))
    check_logs && ((checks_passed++))
    
    log "Monitoring check complete: $checks_passed/$total_checks checks passed"
    
    # Cleanup old logs
    cleanup_logs
    
    if [ "$checks_passed" -lt "$total_checks" ]; then
        exit 1
    fi
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function
main