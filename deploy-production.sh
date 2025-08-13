#!/bin/bash

# Production Deployment Script for TempMail Service
# This script helps deploy the mail service to a production server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${DOMAIN:-yourdomain.com}"
APP_SUBDOMAIN="${APP_SUBDOMAIN:-tempmail}"
MAIL_SUBDOMAIN="${MAIL_SUBDOMAIN:-mail}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"

echo -e "${BLUE}🚀 TempMail Production Deployment Script${NC}"
echo -e "${BLUE}=======================================${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons"
        print_info "Please run as a regular user with sudo privileges"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if domain is set
    if [[ "$DOMAIN" == "yourdomain.com" ]]; then
        print_error "Please set your domain: export DOMAIN=your-actual-domain.com"
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if nginx is installed
    if ! command -v nginx &> /dev/null; then
        print_warning "Nginx is not installed. We'll use containerized nginx."
    fi
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_warning "Certbot is not installed. You'll need to install it for SSL."
    fi
    
    print_status "Prerequisites check completed"
}

# Setup firewall
setup_firewall() {
    print_info "Setting up firewall..."
    
    # Enable UFW if not already enabled
    if ! sudo ufw status | grep -q "Status: active"; then
        sudo ufw --force enable
    fi
    
    # Configure firewall rules
    sudo ufw allow 22/tcp      # SSH
    sudo ufw allow 25/tcp      # SMTP
    sudo ufw allow 80/tcp      # HTTP
    sudo ufw allow 443/tcp     # HTTPS
    sudo ufw allow 587/tcp     # SMTP Submission
    
    print_status "Firewall configured"
}

# Create production environment file
create_env_file() {
    print_info "Creating production environment file..."
    
    if [[ ! -f .env.production ]]; then
        cp .env.production.template .env.production
        
        # Replace placeholder values
        sed -i "s/yourdomain.com/${DOMAIN}/g" .env.production
        sed -i "s/admin@yourdomain.com/${EMAIL}/g" .env.production
        
        print_warning "Please edit .env.production and set strong passwords and secrets!"
        print_info "Important: Change MONGODB_ROOT_PASSWORD, REDIS_PASSWORD, JWT_SECRET, and SESSION_SECRET"
    else
        print_status "Production environment file already exists"
    fi
}

# Update nginx configuration
update_nginx_config() {
    print_info "Updating nginx configuration..."
    
    # Update domain in nginx config
    sed -i "s/yourdomain.com/${DOMAIN}/g" config/nginx/nginx.prod.conf
    sed -i "s/tempmail.yourdomain.com/${APP_SUBDOMAIN}.${DOMAIN}/g" config/nginx/nginx.prod.conf
    sed -i "s/mail.yourdomain.com/${MAIL_SUBDOMAIN}.${DOMAIN}/g" config/nginx/nginx.prod.conf
    
    print_status "Nginx configuration updated"
}

# Setup SSL certificates
setup_ssl() {
    print_info "Setting up SSL certificates..."
    
    if command -v certbot &> /dev/null; then
        print_info "Obtaining SSL certificates with Let's Encrypt..."
        
        # Stop nginx if running to avoid port conflicts
        sudo systemctl stop nginx 2>/dev/null || true
        
        # Get certificates
        sudo certbot certonly \
            --standalone \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "${APP_SUBDOMAIN}.${DOMAIN}" \
            -d "${MAIL_SUBDOMAIN}.${DOMAIN}"
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
        
        print_status "SSL certificates obtained and auto-renewal configured"
    else
        print_warning "Certbot not found. Please install certbot and run:"
        print_info "sudo certbot --nginx -d ${APP_SUBDOMAIN}.${DOMAIN} -d ${MAIL_SUBDOMAIN}.${DOMAIN}"
    fi
}

# Build and deploy application
deploy_application() {
    print_info "Building and deploying application..."
    
    # Stop existing containers
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # Build images
    docker-compose -f docker-compose.prod.yml build
    
    # Start services
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to start
    print_info "Waiting for services to start..."
    sleep 30
    
    # Check if services are running
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        print_status "Application deployed successfully"
    else
        print_error "Some services failed to start. Check logs:"
        docker-compose -f docker-compose.prod.yml logs
        exit 1
    fi
}

# Test deployment
test_deployment() {
    print_info "Testing deployment..."
    
    # Test health endpoint
    if curl -f -s "http://localhost:8080/api/health" > /dev/null; then
        print_status "Backend health check passed"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Test mailbox generation
    if curl -f -s -X POST "http://localhost:8080/api/mailbox/generate" | grep -q "success"; then
        print_status "Mailbox generation test passed"
    else
        print_error "Mailbox generation test failed"
        return 1
    fi
    
    print_status "All tests passed!"
}

# Display post-deployment information
show_post_deployment_info() {
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Post-deployment checklist:${NC}"
    echo ""
    echo "1. 🌐 Configure DNS records:"
    echo "   A    ${APP_SUBDOMAIN}.${DOMAIN}  → $(curl -s ifconfig.me)"
    echo "   A    ${MAIL_SUBDOMAIN}.${DOMAIN} → $(curl -s ifconfig.me)"
    echo "   MX   ${DOMAIN}                   → ${MAIL_SUBDOMAIN}.${DOMAIN} (priority: 10)"
    echo ""
    echo "2. 🔐 Update .env.production with strong passwords"
    echo ""
    echo "3. 🔒 Verify SSL certificates are working:"
    echo "   https://${APP_SUBDOMAIN}.${DOMAIN}"
    echo ""
    echo "4. 📧 Test email delivery:"
    echo "   Send email to: [any-address]@${DOMAIN}"
    echo ""
    echo "5. 📊 Monitor logs:"
    echo "   docker-compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo -e "${YELLOW}⚠️  Important: Complete the DNS setup before testing email delivery${NC}"
    echo ""
}

# Main deployment function
main() {
    print_info "Starting production deployment for domain: ${DOMAIN}"
    
    check_root
    check_prerequisites
    setup_firewall
    create_env_file
    update_nginx_config
    
    # Ask about SSL setup
    read -p "Do you want to setup SSL certificates now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_ssl
    else
        print_warning "Skipping SSL setup. Configure SSL manually later."
    fi
    
    deploy_application
    test_deployment
    show_post_deployment_info
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
