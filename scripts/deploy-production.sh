#!/bin/bash

# Production Deployment Script for TempMail
# This script handles the complete production deployment process

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/.env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
check_user() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if user is in docker group
    if ! groups | grep -q docker; then
        error "Current user is not in the docker group"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file not found: $ENV_FILE"
        error "Please copy .env.production to .env.production and configure it"
        exit 1
    fi
    
    log "✅ Prerequisites check passed"
}

# Setup directories
setup_directories() {
    log "Setting up production directories..."
    
    if [[ -f "$SCRIPT_DIR/setup-production-dirs.sh" ]]; then
        bash "$SCRIPT_DIR/setup-production-dirs.sh"
    else
        warn "Directory setup script not found, creating basic structure..."
        mkdir -p /opt/tempmail/{data,logs,config}/{mongodb,redis,mailserver,nginx,postfix}
    fi
}

# Build and start services
deploy() {
    log "Starting production deployment..."
    
    cd "$PROJECT_DIR"
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
    
    # Build custom images
    log "Building custom images..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    # Wait for services to be healthy
    log "Waiting for services to become healthy..."
    sleep 30
    
    # Check service health
    check_health
}

# Check service health
check_health() {
    log "Checking service health..."
    
    local services=("mongodb" "redis" "backend" "frontend" "mailserver" "nginx")
    local failed_services=()
    
    for service in "${services[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps "$service" | grep -q "healthy\|Up"; then
            log "✅ $service is healthy"
        else
            error "❌ $service is not healthy"
            failed_services+=("$service")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        error "Some services failed to start properly: ${failed_services[*]}"
        error "Check logs with: $0 logs"
        exit 1
    fi
    
    log "🎉 All services are healthy!"
}

# Show service status
status() {
    log "Service Status:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo ""
    log "Service Health:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
}

# Show logs
logs() {
    local service="$1"
    local tail_lines="${2:-100}"
    
    if [[ -n "$service" ]]; then
        log "Showing logs for $service (last $tail_lines lines):"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail="$tail_lines" "$service"
    else
        log "Showing logs for all services (last $tail_lines lines):"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail="$tail_lines"
    fi
}

# Stop services
stop() {
    log "Stopping services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    log "✅ Services stopped"
}

# Restart services
restart() {
    log "Restarting services..."
    stop
    sleep 5
    deploy
}

# Update deployment
update() {
    log "Updating deployment..."
    
    # Pull latest code (if in git repo)
    if [[ -d "$PROJECT_DIR/.git" ]]; then
        log "Pulling latest code..."
        cd "$PROJECT_DIR"
        git pull origin main || git pull origin master
    fi
    
    # Restart deployment
    restart
}

# Backup data
backup() {
    log "Creating backup..."
    
    local backup_dir="/opt/tempmail/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/backup_$timestamp.tar.gz"
    
    mkdir -p "$backup_dir"
    
    # Stop services temporarily
    warn "Stopping services for backup..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop
    
    # Create backup
    log "Creating backup archive..."
    tar -czf "$backup_file" -C /opt/tempmail data/ config/ .env.production
    
    # Restart services
    log "Restarting services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" start
    
    log "✅ Backup created: $backup_file"
}

# Show help
help() {
    echo "TempMail Production Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy          Deploy the application"
    echo "  status          Show service status"
    echo "  logs [service]  Show logs (optionally for specific service)"
    echo "  stop            Stop all services"
    echo "  restart         Restart all services"
    echo "  update          Update and restart deployment"
    echo "  backup          Create a backup of data and config"
    echo "  health          Check service health"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy                    # Deploy the application"
    echo "  $0 logs backend              # Show backend logs"
    echo "  $0 logs backend 50           # Show last 50 lines of backend logs"
    echo "  $0 status                    # Show service status"
}

# Main script logic
main() {
    case "${1:-help}" in
        "deploy")
            check_user
            check_prerequisites
            setup_directories
            deploy
            ;;
        "status")
            status
            ;;
        "logs")
            logs "$2" "$3"
            ;;
        "stop")
            stop
            ;;
        "restart")
            check_user
            restart
            ;;
        "update")
            check_user
            check_prerequisites
            update
            ;;
        "backup")
            backup
            ;;
        "health")
            check_health
            ;;
        "help"|*)
            help
            ;;
    esac
}

# Run main function with all arguments
main "$@"