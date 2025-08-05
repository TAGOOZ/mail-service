#!/bin/bash

# Production configuration validation script
# This script validates that all required configuration is properly set

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env.production"

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

# Function to check if environment file exists
check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file $ENV_FILE not found"
        print_status "Please copy .env.production and configure it with your production values"
        return 1
    fi
    print_success "Environment file found"
    return 0
}

# Function to load environment variables
load_env() {
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    fi
}

# Function to validate required environment variables
validate_env_vars() {
    local errors=0
    local required_vars=(
        "MONGODB_ROOT_USERNAME"
        "MONGODB_ROOT_PASSWORD"
        "MONGODB_DATABASE"
        "JWT_SECRET"
        "MAIL_DOMAIN"
        "CORS_ORIGIN"
        "REACT_APP_API_URL"
        "REACT_APP_WS_URL"
        "REACT_APP_MAIL_DOMAIN"
    )
    
    print_status "Validating required environment variables..."
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            errors=$((errors + 1))
        else
            print_success "$var is set"
        fi
    done
    
    return $errors
}

# Function to validate password strength
validate_passwords() {
    local errors=0
    
    print_status "Validating password strength..."
    
    # Check MongoDB password
    if [ ${#MONGODB_ROOT_PASSWORD} -lt 16 ]; then
        print_error "MONGODB_ROOT_PASSWORD should be at least 16 characters long"
        errors=$((errors + 1))
    else
        print_success "MongoDB password length is adequate"
    fi
    
    # Check JWT secret
    if [ ${#JWT_SECRET} -lt 64 ]; then
        print_error "JWT_SECRET should be at least 64 characters long"
        errors=$((errors + 1))
    else
        print_success "JWT secret length is adequate"
    fi
    
    # Check for default values
    if [[ "$MONGODB_ROOT_PASSWORD" == *"CHANGE_THIS"* ]]; then
        print_error "MONGODB_ROOT_PASSWORD contains default placeholder text"
        errors=$((errors + 1))
    fi
    
    if [[ "$JWT_SECRET" == *"CHANGE_THIS"* ]]; then
        print_error "JWT_SECRET contains default placeholder text"
        errors=$((errors + 1))
    fi
    
    return $errors
}

# Function to validate domain configuration
validate_domains() {
    local errors=0
    
    print_status "Validating domain configuration..."
    
    # Check if domains are properly configured
    if [ "$MAIL_DOMAIN" != "nnu.edu.kg" ]; then
        print_warning "MAIL_DOMAIN is not set to nnu.edu.kg"
    else
        print_success "Mail domain is correctly configured"
    fi
    
    # Check CORS origin
    if [[ "$CORS_ORIGIN" != "https://"* ]]; then
        print_error "CORS_ORIGIN should use HTTPS in production"
        errors=$((errors + 1))
    else
        print_success "CORS origin uses HTTPS"
    fi
    
    # Check API URL
    if [[ "$REACT_APP_API_URL" != "https://"* ]]; then
        print_error "REACT_APP_API_URL should use HTTPS in production"
        errors=$((errors + 1))
    else
        print_success "API URL uses HTTPS"
    fi
    
    # Check WebSocket URL
    if [[ "$REACT_APP_WS_URL" != "https://"* ]]; then
        print_error "REACT_APP_WS_URL should use HTTPS in production"
        errors=$((errors + 1))
    else
        print_success "WebSocket URL uses HTTPS"
    fi
    
    return $errors
}

# Function to validate SSL certificates
validate_ssl() {
    local errors=0
    local ssl_dir="config/nginx/ssl"
    
    print_status "Validating SSL certificates..."
    
    if [ ! -d "$ssl_dir" ]; then
        print_error "SSL directory $ssl_dir not found"
        errors=$((errors + 1))
    else
        if [ ! -f "$ssl_dir/fullchain.pem" ]; then
            print_error "SSL certificate file fullchain.pem not found"
            errors=$((errors + 1))
        else
            # Check certificate expiry
            local expiry_date=$(openssl x509 -enddate -noout -in "$ssl_dir/fullchain.pem" | cut -d= -f2)
            local expiry_timestamp=$(date -d "$expiry_date" +%s)
            local current_timestamp=$(date +%s)
            local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if [ $days_until_expiry -lt 30 ]; then
                print_warning "SSL certificate expires in $days_until_expiry days"
            else
                print_success "SSL certificate is valid for $days_until_expiry days"
            fi
        fi
        
        if [ ! -f "$ssl_dir/privkey.pem" ]; then
            print_error "SSL private key file privkey.pem not found"
            errors=$((errors + 1))
        else
            print_success "SSL private key found"
        fi
    fi
    
    return $errors
}

# Function to validate Docker configuration
validate_docker() {
    local errors=0
    
    print_status "Validating Docker configuration..."
    
    # Check if Docker is installed
    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is not installed"
        errors=$((errors + 1))
    else
        print_success "Docker is installed"
        
        # Check if Docker is running
        if ! docker info >/dev/null 2>&1; then
            print_error "Docker is not running"
            errors=$((errors + 1))
        else
            print_success "Docker is running"
        fi
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_error "Docker Compose is not installed"
        errors=$((errors + 1))
    else
        print_success "Docker Compose is installed"
    fi
    
    # Check if production compose file exists
    if [ ! -f "docker-compose.prod.yml" ]; then
        print_error "Production Docker Compose file not found"
        errors=$((errors + 1))
    else
        print_success "Production Docker Compose file found"
    fi
    
    return $errors
}

# Function to validate system resources
validate_system() {
    local warnings=0
    
    print_status "Validating system resources..."
    
    # Check available memory
    local memory_gb=$(free -g | awk 'NR==2{print $2}')
    if [ "$memory_gb" -lt 4 ]; then
        print_warning "System has less than 4GB RAM ($memory_gb GB available)"
        warnings=$((warnings + 1))
    else
        print_success "System has adequate memory ($memory_gb GB)"
    fi
    
    # Check available disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        print_warning "Disk usage is high: ${disk_usage}%"
        warnings=$((warnings + 1))
    else
        print_success "Disk usage is acceptable: ${disk_usage}%"
    fi
    
    # Check CPU cores
    local cpu_cores=$(nproc)
    if [ "$cpu_cores" -lt 2 ]; then
        print_warning "System has less than 2 CPU cores ($cpu_cores available)"
        warnings=$((warnings + 1))
    else
        print_success "System has adequate CPU cores ($cpu_cores)"
    fi
    
    return $warnings
}

# Function to validate network connectivity
validate_network() {
    local errors=0
    
    print_status "Validating network connectivity..."
    
    # Check if ports are available
    local ports=(80 443 25 587)
    for port in "${ports[@]}"; do
        if netstat -tuln | grep -q ":$port "; then
            print_warning "Port $port is already in use"
        else
            print_success "Port $port is available"
        fi
    done
    
    # Check DNS resolution
    if nslookup "$MAIL_DOMAIN" >/dev/null 2>&1; then
        print_success "DNS resolution for $MAIL_DOMAIN works"
    else
        print_error "DNS resolution for $MAIL_DOMAIN failed"
        errors=$((errors + 1))
    fi
    
    return $errors
}

# Function to generate security recommendations
security_recommendations() {
    print_status "Security recommendations:"
    echo
    echo "1. Ensure all default passwords have been changed"
    echo "2. Configure firewall to allow only necessary ports"
    echo "3. Set up fail2ban for SSH protection"
    echo "4. Enable automatic security updates"
    echo "5. Configure log monitoring and alerting"
    echo "6. Set up regular backups"
    echo "7. Use strong SSL/TLS configuration"
    echo "8. Regularly update Docker images"
    echo "9. Monitor for security vulnerabilities"
    echo "10. Implement proper access controls"
    echo
}

# Main validation function
main() {
    echo "=================================="
    echo "   PRODUCTION CONFIG VALIDATION"
    echo "=================================="
    echo "Starting validation at $(date)"
    echo
    
    local total_errors=0
    local total_warnings=0
    
    # Check environment file
    if ! check_env_file; then
        exit 1
    fi
    
    # Load environment variables
    load_env
    
    # Run validations
    validate_env_vars || total_errors=$((total_errors + $?))
    validate_passwords || total_errors=$((total_errors + $?))
    validate_domains || total_errors=$((total_errors + $?))
    validate_ssl || total_errors=$((total_errors + $?))
    validate_docker || total_errors=$((total_errors + $?))
    validate_system || total_warnings=$((total_warnings + $?))
    validate_network || total_errors=$((total_errors + $?))
    
    echo
    echo "=================================="
    echo "   VALIDATION SUMMARY"
    echo "=================================="
    
    if [ $total_errors -eq 0 ]; then
        print_success "Configuration validation passed!"
        if [ $total_warnings -gt 0 ]; then
            print_warning "Found $total_warnings warning(s) - review recommended"
        fi
        echo
        security_recommendations
        echo "Your system is ready for production deployment."
    else
        print_error "Configuration validation failed with $total_errors error(s)"
        if [ $total_warnings -gt 0 ]; then
            print_warning "Also found $total_warnings warning(s)"
        fi
        echo
        echo "Please fix the errors above before deploying to production."
        exit 1
    fi
    
    echo "=================================="
}

# Run main function
main