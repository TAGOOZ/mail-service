#!/bin/bash

echo "🔍 Comprehensive Configuration Validation"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Helper functions
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; ERRORS=$((ERRORS + 1)); }

# Parse command line arguments
VALIDATE_ENV=true
VALIDATE_FILES=true
VALIDATE_DOCKER=true
VALIDATE_MAILSERVER=true
VALIDATE_SYSTEM=false
VALIDATE_RUNTIME=false
VALIDATE_BACKUP_CLEANUP=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --env-only)
            VALIDATE_FILES=false
            VALIDATE_DOCKER=false
            VALIDATE_MAILSERVER=false
            VALIDATE_BACKUP_CLEANUP=false
            shift
            ;;
        --files-only)
            VALIDATE_ENV=false
            VALIDATE_DOCKER=false
            VALIDATE_MAILSERVER=false
            VALIDATE_BACKUP_CLEANUP=false
            shift
            ;;
        --docker-only)
            VALIDATE_ENV=false
            VALIDATE_FILES=false
            VALIDATE_MAILSERVER=false
            VALIDATE_BACKUP_CLEANUP=false
            shift
            ;;
        --mailserver-only)
            VALIDATE_ENV=false
            VALIDATE_FILES=false
            VALIDATE_DOCKER=false
            VALIDATE_BACKUP_CLEANUP=false
            shift
            ;;
        --backup-only)
            VALIDATE_ENV=false
            VALIDATE_FILES=false
            VALIDATE_DOCKER=false
            VALIDATE_MAILSERVER=false
            VALIDATE_BACKUP_CLEANUP=true
            shift
            ;;
        --system)
            VALIDATE_SYSTEM=true
            shift
            ;;
        --runtime)
            VALIDATE_RUNTIME=true
            shift
            ;;
        --no-backup)
            VALIDATE_BACKUP_CLEANUP=false
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --env-only        Validate only environment variables"
            echo "  --files-only      Validate only configuration files"
            echo "  --docker-only     Validate only Docker configuration"
            echo "  --mailserver-only Validate only mailserver configuration"
            echo "  --backup-only     Validate only backup and cleanup services"
            echo "  --system          Include system resource validation"
            echo "  --runtime         Include runtime service checks"
            echo "  --no-backup       Skip backup and cleanup validation"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# 1. Environment Variables Validation
validate_environment() {
    if [ "$VALIDATE_ENV" = false ]; then return 0; fi
    
    print_info "Validating environment configuration..."
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_error ".env file not found"
        print_info "Run: ./scripts/generate-env-config.sh"
        return 1
    fi
    
    # Load environment variables
    set -a
    source .env 2>/dev/null || { print_error "Failed to load .env file"; return 1; }
    set +a
    
    # Required variables
    local required_common="NODE_ENV BACKEND_PORT MONGODB_ROOT_USERNAME MONGODB_ROOT_PASSWORD MONGODB_DATABASE MAIL_DOMAIN JWT_SECRET"
    
    # Check common variables
    for var in $required_common; do
        if [ -z "${!var}" ]; then
            print_error "Required variable $var is not set"
        else
            print_success "$var is configured"
        fi
    done
    
    # Environment-specific checks
    if [ "$NODE_ENV" = "development" ]; then
        [ -n "$MAILHOG_HOST" ] && print_success "MAILHOG_HOST configured" || print_warning "MAILHOG_HOST not set"
    elif [ "$NODE_ENV" = "production" ]; then
        for var in POSTFIX_MYHOSTNAME POSTFIX_MYDOMAIN POSTFIX_MYORIGIN CORS_ORIGIN; do
            if [ -z "${!var}" ]; then
                print_error "Production variable $var is not set"
            else
                print_success "$var is configured"
            fi
        done
        
        # Security checks
        if [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production-very-long-and-secure" ]; then
            print_error "JWT_SECRET is using default value"
        fi
        
        if [ "$MONGODB_ROOT_PASSWORD" = "password" ]; then
            print_error "MONGODB_ROOT_PASSWORD is using weak default"
        fi
        
        if [[ "$CORS_ORIGIN" != "https://"* ]]; then
            print_error "CORS_ORIGIN should use HTTPS in production"
        fi
    fi
}

# 2. Configuration Files Validation
validate_files() {
    if [ "$VALIDATE_FILES" = false ]; then return 0; fi
    
    print_info "Validating configuration files..."
    
    # Essential files
    local essential_files=(
        ".env.example"
        "docker-compose.dev.yml"
        "docker-compose.prod.yml"
        "Dockerfile.postfix"
    )
    
    for file in "${essential_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "$file exists"
        else
            print_error "$file is missing"
        fi
    done
    
    # Configuration directories
    local config_dirs=(
        "config/postfix"
        "config/nginx"
        "config/redis"
        "config/mongodb"
    )
    
    for dir in "${config_dirs[@]}"; do
        if [ -d "$dir" ]; then
            print_success "$dir directory exists"
        else
            print_error "$dir directory is missing"
        fi
    done
    
    # Postfix configuration files
    local postfix_files=(
        "config/postfix/main.cf"
        "config/postfix/transport_regexp"
        "config/postfix/virtual_regexp"
    )
    
    for file in "${postfix_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "$file exists"
        else
            print_error "$file is missing"
        fi
    done
}

# 3. Docker Configuration Validation
validate_docker() {
    if [ "$VALIDATE_DOCKER" = false ]; then return 0; fi
    
    print_info "Validating Docker configuration..."
    
    # Check Docker installation
    if command -v docker >/dev/null 2>&1; then
        print_success "Docker is installed"
        
        if docker info >/dev/null 2>&1; then
            print_success "Docker is running"
        else
            print_error "Docker is not running"
        fi
    else
        print_error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if command -v docker-compose >/dev/null 2>&1; then
        print_success "Docker Compose is installed"
    else
        print_error "Docker Compose is not installed"
    fi
    
    # Validate compose files
    for compose_file in docker-compose.dev.yml docker-compose.prod.yml; do
        if [ -f "$compose_file" ]; then
            if docker-compose -f "$compose_file" config >/dev/null 2>&1; then
                print_success "$compose_file syntax is valid"
            else
                print_error "$compose_file has syntax errors"
            fi
        fi
    done
    
    # Check Dockerfiles
    local dockerfiles=(
        "backend/Dockerfile.dev"
        "backend/Dockerfile.prod"
        "frontend/Dockerfile.dev"
        "frontend/Dockerfile.prod"
        "Dockerfile.postfix"
    )
    
    for dockerfile in "${dockerfiles[@]}"; do
        if [ -f "$dockerfile" ]; then
            print_success "$dockerfile exists"
        else
            print_error "$dockerfile is missing"
        fi
    done
}

# 4. Mailserver Configuration Validation
validate_mailserver() {
    if [ "$VALIDATE_MAILSERVER" = false ]; then return 0; fi
    
    print_info "Validating mailserver configuration..."
    
    # Check Postfix configuration content
    if [ -f "config/postfix/main.cf" ]; then
        if grep -q "transport_maps.*regexp" config/postfix/main.cf; then
            print_success "Transport maps are configured in main.cf"
        else
            print_error "Transport maps are missing in main.cf"
        fi
    fi
    
    if [ -f "config/postfix/transport_regexp" ]; then
        if grep -q "backend.*2525" config/postfix/transport_regexp; then
            print_success "Transport forwards to backend:2525"
        else
            print_error "Transport forwarding is not configured correctly"
        fi
    fi
    
    # Check Docker Compose mailserver configuration
    if [ -f "docker-compose.prod.yml" ]; then
        if grep -q "mailserver:" docker-compose.prod.yml; then
            print_success "Mailserver service is defined in docker-compose.prod.yml"
        else
            print_error "Mailserver service is missing from docker-compose.prod.yml"
        fi
        
        if grep -q "mailserver_prod_data:" docker-compose.prod.yml; then
            print_success "Mailserver volume is configured"
        else
            print_error "Mailserver volume is missing"
        fi
    fi
    
    # Check required directories
    local mail_dirs=(
        "logs/postfix"
    )
    
    for dir in "${mail_dirs[@]}"; do
        if [ -d "$dir" ] || mkdir -p "$dir" 2>/dev/null; then
            print_success "Directory $dir is available"
        else
            print_warning "Directory $dir cannot be created (may need permissions)"
        fi
    done
}

# 5. System Resources Validation (optional)
validate_system() {
    if [ "$VALIDATE_SYSTEM" = false ]; then return 0; fi
    
    print_info "Validating system resources..."
    
    # Check memory
    if command -v free >/dev/null 2>&1; then
        local memory_gb=$(free -g | awk 'NR==2{print $2}')
        if [ "$memory_gb" -ge 2 ]; then
            print_success "System has adequate memory (${memory_gb}GB)"
        else
            print_warning "System has limited memory (${memory_gb}GB)"
        fi
    fi
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -le 80 ]; then
        print_success "Disk usage is acceptable (${disk_usage}%)"
    else
        print_warning "Disk usage is high (${disk_usage}%)"
    fi
    
    # Check CPU cores
    local cpu_cores=$(nproc)
    if [ "$cpu_cores" -ge 2 ]; then
        print_success "System has adequate CPU cores ($cpu_cores)"
    else
        print_warning "System has limited CPU cores ($cpu_cores)"
    fi
    
    # Check port availability
    local ports=(25 80 443 3000 3001 8025)
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            print_warning "Port $port is already in use"
        else
            print_success "Port $port is available"
        fi
    done
}

# 6. Runtime Services Validation (optional)
validate_runtime() {
    if [ "$VALIDATE_RUNTIME" = false ]; then return 0; fi
    
    print_info "Validating runtime services..."
    
    # Load environment variables to get correct ports
    if [ -f ".env" ]; then
        set -a
        source .env 2>/dev/null
        set +a
    fi
    
    # Use environment variables for port numbers
    local mongodb_port=${MONGODB_PORT:-27017}
    local redis_port=${REDIS_PORT:-6379}
    local backend_port=${BACKEND_PORT:-3001}
    local frontend_port=${FRONTEND_PORT:-3000}
    local mailhog_port=${MAILHOG_PORT:-1025}
    local mailhog_ui_port=${MAILHOG_UI_PORT:-8025}
    
    # Function to check if a service is running
    check_service() {
        local service_name=$1
        local host=$2
        local port=$3
        
        if nc -z $host $port 2>/dev/null; then
            print_success "$service_name is running ($host:$port)"
            return 0
        else
            print_error "$service_name is not running ($host:$port)"
            return 1
        fi
    }
    
    # Detect environment
    local env_detected=false
    if [ -f "docker-compose.dev.yml" ] && docker-compose -f docker-compose.dev.yml ps 2>/dev/null | grep -q "Up"; then
        print_info "Development environment detected"
        
        # Development environment checks
        check_service "MongoDB" "localhost" "$mongodb_port"
        check_service "Redis" "localhost" "$redis_port"
        check_service "Backend API" "localhost" "$backend_port"
        check_service "Frontend" "localhost" "$frontend_port"
        check_service "MailHog SMTP" "localhost" "$mailhog_port"
        check_service "MailHog UI" "localhost" "$mailhog_ui_port"
        check_service "Mail Forwarder" "localhost" "25"
        
        env_detected=true
        
    elif [ -f "docker-compose.prod.yml" ] && docker-compose -f docker-compose.prod.yml ps 2>/dev/null | grep -q "Up"; then
        print_info "Production environment detected"
        
        # Production environment checks
        check_service "MongoDB" "localhost" "$mongodb_port"
        check_service "Redis" "localhost" "$redis_port"
        check_service "Backend API" "localhost" "$backend_port"
        check_service "Postfix SMTP" "localhost" "25"
        check_service "Nginx" "localhost" "80"
        
        env_detected=true
    fi
    
    if [ "$env_detected" = false ]; then
        print_warning "No active Docker Compose environment detected"
        print_info "Checking individual services..."
        
        # Check common services
        check_service "Backend API" "localhost" "$backend_port"
        check_service "MongoDB" "localhost" "$mongodb_port"
        check_service "Redis" "localhost" "$redis_port"
    fi
    
    # Check backend health endpoint
    if command -v curl >/dev/null 2>&1; then
        if curl -s http://localhost:$backend_port/health/mail >/dev/null 2>&1; then
            print_success "Backend health endpoint is accessible"
        else
            print_warning "Backend health endpoint is not accessible"
        fi
    else
        print_warning "curl not available, skipping health check"
    fi
}

# 7. Backup and Cleanup Services Validation
validate_backup_cleanup() {
    if [ "$VALIDATE_BACKUP_CLEANUP" = false ]; then return 0; fi
    
    print_info "Validating backup and cleanup services..."
    
    # Check if backup cleanup script exists
    if [ -f "scripts/backup-cleanup.sh" ]; then
        print_success "Backup cleanup script exists"
        
        # Check if script is executable
        if [ -x "scripts/backup-cleanup.sh" ]; then
            print_success "Backup cleanup script is executable"
        else
            print_error "Backup cleanup script is not executable"
        fi
    else
        print_error "Backup cleanup script is missing"
    fi
    
    # Check backup cleanup configuration
    if [ -f ".env.backup-cleanup" ]; then
        print_success "Backup cleanup configuration exists"
    else
        print_error "Backup cleanup configuration is missing"
    fi
    
    # Load backup configuration
    if [ -f ".env" ]; then
        set -a
        source .env 2>/dev/null
        set +a
        
        # Check backup configuration in .env
        if grep -q "BACKUP_ENABLED" .env 2>/dev/null; then
            print_success "Backup configuration found in .env"
            
            # Check backup path
            local backup_path=${BACKUP_PATH:-./backups}
            if [ -d "$backup_path" ] || mkdir -p "$backup_path" 2>/dev/null; then
                print_success "Backup directory is accessible: $backup_path"
            else
                print_error "Cannot access backup directory: $backup_path"
            fi
            
            # Check logs directory
            local logs_dir=${LOGS_DIR:-./logs}
            if [ -d "$logs_dir" ] || mkdir -p "$logs_dir" 2>/dev/null; then
                print_success "Logs directory is accessible: $logs_dir"
            else
                print_error "Cannot access logs directory: $logs_dir"
            fi
            
        else
            print_warning "Backup configuration not found in .env file"
            print_info "Run: ./scripts/install-backup-cleanup.sh"
        fi
    fi
    
    # Test backup cleanup script
    if [ -f "scripts/backup-cleanup.sh" ] && [ -x "scripts/backup-cleanup.sh" ]; then
        if ./scripts/backup-cleanup.sh status >/dev/null 2>&1; then
            print_success "Backup cleanup script test passed"
        else
            print_warning "Backup cleanup script test failed"
        fi
    fi
    
    # Check for cron jobs (if installed)
    if command -v crontab >/dev/null 2>&1; then
        if crontab -l 2>/dev/null | grep -q "backup-cleanup.sh"; then
            print_success "Backup cleanup cron jobs are installed"
        else
            print_warning "Backup cleanup cron jobs are not installed"
            print_info "Run: ./scripts/backup-cleanup.sh install"
        fi
    else
        print_warning "crontab not available, cannot check scheduled tasks"
    fi
}

# Main validation function
main() {
    echo "Starting validation at $(date)"
    echo ""
    
    # Run validations
    validate_environment
    validate_files
    validate_docker
    validate_mailserver
    validate_backup_cleanup
    validate_system
    validate_runtime
    
    echo ""
    echo "=================================="
    echo "   VALIDATION SUMMARY"
    echo "=================================="
    
    if [ $ERRORS -eq 0 ]; then
        print_success "All validations passed!"
        if [ $WARNINGS -gt 0 ]; then
            print_warning "Found $WARNINGS warning(s) - review recommended"
        fi
        echo ""
        echo "💡 Next steps:"
        echo "   • Development: ./scripts/dev-start.sh"
        echo "   • Production: ./scripts/prod-start.sh"
    else
        print_error "Validation failed with $ERRORS error(s)"
        if [ $WARNINGS -gt 0 ]; then
            print_warning "Also found $WARNINGS warning(s)"
        fi
        echo ""
        echo "Please fix the errors above before proceeding."
        exit 1
    fi
}

# Run main function
main