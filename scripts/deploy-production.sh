#!/bin/bash

# Production deployment script
# This script deploys the TempMail application to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="/opt/tempmail/backups"
DATA_DIR="/opt/tempmail/data"

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file $ENV_FILE not found"
        print_status "Please copy .env.production and configure it with your production values"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    sudo mkdir -p "$DATA_DIR/mongodb"
    sudo mkdir -p "$DATA_DIR/redis"
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p "/opt/tempmail/logs/nginx"
    
    # Set proper permissions
    sudo chown -R 1001:1001 "$DATA_DIR/mongodb"
    sudo chown -R 999:999 "$DATA_DIR/redis"
    sudo chown -R $(whoami):$(whoami) "/opt/tempmail/logs"
    
    print_success "Directories created"
}

# Function to backup existing data
backup_data() {
    if [ -d "$DATA_DIR/mongodb" ] && [ "$(ls -A $DATA_DIR/mongodb)" ]; then
        print_status "Creating backup of existing data..."
        
        local backup_timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_path="$BACKUP_DIR/backup_$backup_timestamp"
        
        mkdir -p "$backup_path"
        
        # Backup MongoDB data
        if docker ps --filter "name=tempmail-mongodb-prod" --filter "status=running" --format "{{.Names}}" | grep -q "tempmail-mongodb-prod"; then
            docker exec tempmail-mongodb-prod mongodump --out /tmp/backup
            docker cp tempmail-mongodb-prod:/tmp/backup "$backup_path/mongodb"
        else
            cp -r "$DATA_DIR/mongodb" "$backup_path/"
        fi
        
        # Backup Redis data
        if docker ps --filter "name=tempmail-redis-prod" --filter "status=running" --format "{{.Names}}" | grep -q "tempmail-redis-prod"; then
            docker exec tempmail-redis-prod redis-cli BGSAVE
            sleep 5
            docker cp tempmail-redis-prod:/data/dump.rdb "$backup_path/"
        fi
        
        print_success "Backup created at $backup_path"
    else
        print_status "No existing data to backup"
    fi
}

# Function to pull latest images
pull_images() {
    print_status "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
    print_success "Images pulled"
}

# Function to build custom images
build_images() {
    print_status "Building custom images..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    print_success "Images built"
}

# Function to stop existing services
stop_services() {
    print_status "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans
    print_success "Services stopped"
}

# Function to start services
start_services() {
    print_status "Starting services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    print_success "Services started"
}

# Function to wait for services to be healthy
wait_for_health() {
    print_status "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if ./scripts/health-check.sh >/dev/null 2>&1; then
            print_success "All services are healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        print_status "Attempt $attempt/$max_attempts - waiting for services..."
        sleep 10
    done
    
    print_error "Services failed to become healthy within timeout"
    return 1
}

# Function to setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring..."
    
    # Add cron job for monitoring
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/tempmail/scripts/monitor.sh") | crontab -
    
    # Add cron job for health checks
    (crontab -l 2>/dev/null; echo "*/10 * * * * /opt/tempmail/scripts/health-check.sh >> /opt/tempmail/logs/health.log 2>&1") | crontab -
    
    print_success "Monitoring setup complete"
}

# Function to cleanup old images
cleanup() {
    print_status "Cleaning up old images..."
    docker image prune -f
    docker system prune -f --volumes
    print_success "Cleanup complete"
}

# Function to show deployment summary
show_summary() {
    echo
    echo "=================================="
    echo "   DEPLOYMENT SUMMARY"
    echo "=================================="
    echo "Application URL: https://mail.nnu.edu.kg"
    echo "Health Check: https://mail.nnu.edu.kg/health"
    echo "API Health: https://mail.nnu.edu.kg/api/health"
    echo
    echo "Logs location: /opt/tempmail/logs"
    echo "Data location: /opt/tempmail/data"
    echo "Backup location: /opt/tempmail/backups"
    echo
    echo "To view logs:"
    echo "  docker-compose -f $COMPOSE_FILE logs -f [service_name]"
    echo
    echo "To check status:"
    echo "  docker-compose -f $COMPOSE_FILE ps"
    echo
    echo "To run health check:"
    echo "  ./scripts/health-check.sh"
    echo "=================================="
}

# Main deployment function
main() {
    echo "=================================="
    echo "   TEMPMAIL PRODUCTION DEPLOYMENT"
    echo "=================================="
    echo "Starting deployment at $(date)"
    echo
    
    check_prerequisites
    create_directories
    backup_data
    pull_images
    build_images
    stop_services
    start_services
    
    if wait_for_health; then
        setup_monitoring
        cleanup
        print_success "Deployment completed successfully!"
        show_summary
    else
        print_error "Deployment failed - services are not healthy"
        print_status "Check logs with: docker-compose -f $COMPOSE_FILE logs"
        exit 1
    fi
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "health")
        ./scripts/health-check.sh
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "status")
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    "stop")
        docker-compose -f "$COMPOSE_FILE" down
        ;;
    "restart")
        docker-compose -f "$COMPOSE_FILE" restart "${2:-}"
        ;;
    *)
        echo "Usage: $0 {deploy|health|logs|status|stop|restart}"
        echo "  deploy  - Full deployment (default)"
        echo "  health  - Run health check"
        echo "  logs    - View logs (optionally specify service)"
        echo "  status  - Show service status"
        echo "  stop    - Stop all services"
        echo "  restart - Restart services (optionally specify service)"
        exit 1
        ;;
esac