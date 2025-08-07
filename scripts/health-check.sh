#!/bin/bash

# Health check script for production deployment
# This script checks the health of all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001/api/health"
FRONTEND_URL="http://localhost:3000/health"
NGINX_URL="http://localhost:80/health"
MONGODB_HOST="localhost"
MONGODB_PORT="27017"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local service=$2
    
    if curl -f -s --max-time 10 "$url" > /dev/null; then
        echo -e "${GREEN}✓${NC} $service is healthy"
        return 0
    else
        echo -e "${RED}✗${NC} $service is unhealthy"
        return 1
    fi
}

# Function to check TCP port
check_tcp() {
    local host=$1
    local port=$2
    local service=$3
    sleep 5
    if bash -c "</dev/tcp/$host/$port"; then
        echo -e "${GREEN}✓${NC} $service is reachable"
        return 0
    else
        echo -e "${RED}✗${NC} $service is unreachable"
        return 1
    fi
}

# Function to check Docker container
check_container() {
    local container_name=$1
    
    if docker ps --filter "name=$container_name" --filter "status=running" --format "{{.Names}}" | grep -q "$container_name"; then
        echo -e "${GREEN}✓${NC} Container $container_name is running"
        return 0
    else
        echo -e "${RED}✗${NC} Container $container_name is not running"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local threshold=80
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt "$threshold" ]; then
        echo -e "${GREEN}✓${NC} Disk usage: ${usage}%"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Disk usage: ${usage}% (threshold: ${threshold}%)"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    local threshold=80
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -lt "$threshold" ]; then
        echo -e "${GREEN}✓${NC} Memory usage: ${usage}%"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Memory usage: ${usage}% (threshold: ${threshold}%)"
        return 1
    fi
}

echo "=== TempMail Production Health Check ==="
echo "Timestamp: $(date)"
echo

# Check system resources
echo "--- System Resources ---"
check_disk_space
check_memory
echo

# Check Docker containers
echo "--- Docker Containers ---"
check_container "tempmail-nginx-prod"
check_container "tempmail-frontend-prod"
check_container "tempmail-backend-prod"
check_container "tempmail-mongodb-prod"
check_container "tempmail-redis-prod"
echo

# Check services
echo "--- Service Health ---"
check_tcp "$MONGODB_HOST" "$MONGODB_PORT" "MongoDB"
check_tcp "$REDIS_HOST" "$REDIS_PORT" "Redis"
check_http "$BACKEND_URL" "Backend API"
check_http "$FRONTEND_URL" "Frontend"
check_http "$NGINX_URL" "Nginx"
echo

# Check logs for errors (last 100 lines)
echo "--- Recent Error Logs ---"
error_count=$(docker logs tempmail-backend-prod --tail 100 2>&1 | grep -i error | wc -l)
if [ "$error_count" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No recent errors in backend logs"
else
    echo -e "${YELLOW}⚠${NC} Found $error_count error(s) in recent backend logs"
fi

nginx_error_count=$(docker logs tempmail-nginx-prod --tail 100 2>&1 | grep -i error | wc -l)
if [ "$nginx_error_count" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No recent errors in nginx logs"
else
    echo -e "${YELLOW}⚠${NC} Found $nginx_error_count error(s) in recent nginx logs"
fi

echo
echo "=== Health Check Complete ==="