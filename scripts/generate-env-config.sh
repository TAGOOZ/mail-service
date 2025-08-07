#!/bin/bash

echo "⚙️  Environment Configuration Generator"
echo "======================================"

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

echo "📝 Generating environment configuration..."

# Ask for environment type
echo ""
echo "1. Development"
echo "2. Production"
read -p "Select environment type (1-2): " env_choice

case $env_choice in
    1)
        ENV_TYPE="development"
        ;;
    2)
        ENV_TYPE="production"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo "Selected: $ENV_TYPE environment"

# Generate random secrets
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

JWT_SECRET=$(generate_secret)
SESSION_SECRET=$(generate_secret)

# Ask for basic configuration
echo ""
echo "📧 Mail Configuration:"
if [ "$ENV_TYPE" = "development" ]; then
    MAIL_DOMAIN="127.0.0.1"
    echo "Using default mail domain: $MAIL_DOMAIN"

    SMTP_HOST="127.0.0.1"
    echo "Using default SMTP host: $SMTP_HOST"
else
    read -p "Enter your mail domain (e.g., nnu.edu.kg): " MAIL_DOMAIN
    if [ -z "$MAIL_DOMAIN" ]; then
        echo "❌ Mail domain is required"
        exit 1
    fi

    read -p "Enter your SMTP host (e.g., mailserver): " SMTP_HOST
    if [ -z "$SMTP_HOST" ]; then
        echo "❌ SMTP host is required"
        exit 1
    fi
fi

# Database configuration
echo ""
echo "🗄️  Database Configuration:"
read -p "MongoDB root username [admin]: " MONGODB_USER
MONGODB_USER=${MONGODB_USER:-admin}

if [ "$ENV_TYPE" = "development" ]; then
    MONGODB_PASSWORD="password"
    echo "Using default password for development"
else
    read -s -p "MongoDB root password: " MONGODB_PASSWORD
    echo
    if [ -z "$MONGODB_PASSWORD" ]; then
        echo "❌ MongoDB password is required"
        exit 1
    fi
fi

read -p "Database name [tempmail_${ENV_TYPE}]: " DB_NAME
DB_NAME=${DB_NAME:-tempmail_${ENV_TYPE}}

# CORS configuration
if [ "$ENV_TYPE" = "production" ]; then
    echo ""
    echo "🌐 CORS Configuration:"
    read -p "Frontend URL (e.g., https://mail.nnu.edu.kg): " CORS_ORIGIN
    if [ -z "$CORS_ORIGIN" ]; then
        CORS_ORIGIN="http://localhost:3000"
        echo "Using default CORS origin: $CORS_ORIGIN"
    fi
else
    CORS_ORIGIN="http://localhost:3000"
fi

# Create .env file
echo ""
echo "📄 Creating .env file..."

cat > .env << EOF
# =============================================================================
# ENVIRONMENT CONFIGURATION
# Generated on $(date)
# =============================================================================

# Environment Type
NODE_ENV=$ENV_TYPE

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================

# Backend Server
BACKEND_PORT=3001
BACKEND_HOST=0.0.0.0

# Frontend Server (development only)
FRONTEND_PORT=3000
FRONTEND_HOST=0.0.0.0

# =============================================================================
# FRONTEND CONFIGURATION
# =============================================================================

# API Configuration (使用相对路径，通过 Vite proxy)
VITE_API_BASE_URL=/api

# WebSocket Configuration (浏览器连接，使用宿主机地址)
VITE_WS_URL=http://localhost:3001

# App Configuration
VITE_APP_TITLE=临时邮箱 - 127.0.0.1
VITE_DOMAIN=127.0.0.1

# React App Configuration (for compatibility)
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=http://localhost:3001
REACT_APP_MAIL_DOMAIN=127.0.0.1

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

# MongoDB
MONGODB_ROOT_USERNAME=$MONGODB_USER
MONGODB_ROOT_PASSWORD=$MONGODB_PASSWORD
MONGODB_DATABASE=$DB_NAME
MONGODB_HOST=mongo-dev
MONGODB_PORT=27017

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# =============================================================================
# MAIL SYSTEM CONFIGURATION
# =============================================================================

# Mail Domain
MAIL_DOMAIN=$MAIL_DOMAIN

# Internal Mail Processing
MAIL_PORT=2525

# External Mail Provider, For Sending Mail
SMTP_HOST=$SMTP_HOST
SMTP_PORT=1025

EOF

# Add environment-specific configuration
if [ "$ENV_TYPE" = "development" ]; then
    cat >> .env << EOF
# Development: MailHog Configuration
MAILHOG_HOST=mailhog
MAILHOG_PORT=1025
MAILHOG_UI_PORT=8025

EOF
else
    cat >> .env << EOF
# Production: Postfix Configuration
POSTFIX_MYHOSTNAME=mail.$MAIL_DOMAIN
POSTFIX_MYDOMAIN=$MAIL_DOMAIN
POSTFIX_MYORIGIN=$MAIL_DOMAIN
POSTFIX_SMTP_PORT=25
POSTFIX_SUBMISSION_PORT=587

EOF
fi

# Add common configuration
cat >> .env << EOF
# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Session
SESSION_SECRET=$SESSION_SECRET

# Password Hashing
BCRYPT_ROUNDS=12

# =============================================================================
# CORS CONFIGURATION
# =============================================================================

CORS_ORIGIN=$CORS_ORIGIN
CORS_ADDITIONAL_ORIGINS=http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS,PATCH
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With,Accept,Origin,X-CSRF-Token
CORS_EXPOSED_HEADERS=X-CSRF-Token

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

LOG_LEVEL=INFO

# =============================================================================
# RATE LIMITING CONFIGURATION
# =============================================================================

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# =============================================================================
# DOCKER CONFIGURATION
# =============================================================================

# Container Names
MONGODB_CONTAINER_NAME=tempmail-mongodb
REDIS_CONTAINER_NAME=tempmail-redis
BACKEND_CONTAINER_NAME=tempmail-backend
FRONTEND_CONTAINER_NAME=tempmail-frontend
MAILSERVER_CONTAINER_NAME=tempmail-mailserver
NGINX_CONTAINER_NAME=tempmail-nginx

# Docker Images
MONGODB_IMAGE=mongo:7.0
REDIS_IMAGE=redis:7.2-alpine
NGINX_IMAGE=nginx:1.25-alpine

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=10s
HEALTH_CHECK_RETRIES=3
HEALTH_CHECK_START_PERIOD=30s

# Resource Limits (Production)
MONGODB_MEMORY_LIMIT=512M
MONGODB_CPU_LIMIT=1.0
REDIS_MEMORY_LIMIT=256M
REDIS_CPU_LIMIT=0.5
BACKEND_MEMORY_LIMIT=512M
BACKEND_CPU_LIMIT=0.5
FRONTEND_MEMORY_LIMIT=128M
FRONTEND_CPU_LIMIT=0.25
MAILSERVER_MEMORY_LIMIT=256M
MAILSERVER_CPU_LIMIT=0.5
NGINX_MEMORY_LIMIT=128M
NGINX_CPU_LIMIT=0.25
EOF

echo "✅ .env file created successfully!"
echo ""
echo "📋 Configuration Summary:"
echo "   Environment: $ENV_TYPE"
echo "   Mail Domain: $MAIL_DOMAIN"
echo "   Database: $DB_NAME"
echo "   CORS Origin: $CORS_ORIGIN"
echo ""
echo "🔒 Security:"
echo "   JWT Secret: Generated (32 chars)"
echo "   Session Secret: Generated (32 chars)"
echo ""
echo "💡 Next Steps:"
if [ "$ENV_TYPE" = "development" ]; then
    echo "   1. Start development environment: ./scripts/dev-start.sh"
    echo "   2. Access frontend: http://localhost:3000"
    echo "   3. Access MailHog: http://localhost:8025"
else
    echo "   1. Review and adjust configuration in .env file"
    echo "   2. Set up DNS MX record: $MAIL_DOMAIN IN MX 10 mail.$MAIL_DOMAIN"
    echo "   3. Start production environment: ./scripts/prod-start.sh"
fi
echo ""
echo "🔧 To validate configuration: ./scripts/validate-env-config.sh"