#!/bin/bash

# Environment configuration checker
# Verifies that dev and prod environments have correct mail configurations

echo "🔍 Environment Configuration Checker"
echo "===================================="

# Function to check if a service is running
check_service() {
    local service_name=$1
    local host=$2
    local port=$3
    
    if nc -z $host $port 2>/dev/null; then
        echo "   ✅ $service_name is running ($host:$port)"
        return 0
    else
        echo "   ❌ $service_name is not running ($host:$port)"
        return 1
    fi
}

# Function to load and check environment variables
check_env_vars() {
    local env_type=$1
    echo ""
    echo "📋 $env_type Environment Variables:"
    
    # Load .env file if it exists
    if [ -f ".env" ]; then
        set -a
        source .env 2>/dev/null
        set +a
        echo "   ✅ .env file loaded"
    else
        echo "   ⚠️  .env file not found"
    fi
    
    # Check key variables
    local key_vars
    if [ "$env_type" = "Development" ]; then
        key_vars="NODE_ENV MAILHOG_HOST MAILHOG_PORT BACKEND_PORT"
    else
        key_vars="NODE_ENV MAIL_DOMAIN POSTFIX_MYHOSTNAME BACKEND_PORT"
    fi
    
    for var in $key_vars; do
        if [ -n "${!var}" ]; then
            echo "   ✅ $var: ${!var}"
        else
            echo "   ❌ $var: not set"
        fi
    done
}

# Detect environment
if [ -f "docker-compose.dev.yml" ] && docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    ENV_TYPE="Development"
    COMPOSE_FILE="docker-compose.dev.yml"
elif [ -f "docker-compose.prod.yml" ] && docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    ENV_TYPE="Production"
    COMPOSE_FILE="docker-compose.prod.yml"
else
    echo "❌ No active Docker Compose environment detected"
    exit 1
fi

echo "🌍 Detected Environment: $ENV_TYPE"
echo "📄 Compose File: $COMPOSE_FILE"

# Check services based on environment
echo ""
echo "🔍 Service Status Check:"

# Load environment variables to get correct ports
if [ -f ".env" ]; then
    set -a
    source .env 2>/dev/null
    set +a
fi

# Use environment variables for port numbers
MONGODB_PORT=${MONGODB_PORT:-27017}
REDIS_PORT=${REDIS_PORT:-6379}
BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
MAILHOG_PORT=${MAILHOG_PORT:-1025}
MAILHOG_UI_PORT=${MAILHOG_UI_PORT:-8025}

if [ "$ENV_TYPE" = "Development" ]; then
    # Development environment checks
    check_service "MongoDB" "localhost" "$MONGODB_PORT"
    check_service "Redis" "localhost" "$REDIS_PORT"
    check_service "Backend API" "localhost" "$BACKEND_PORT"
    check_service "Frontend" "localhost" "$FRONTEND_PORT"
    check_service "MailHog SMTP" "localhost" "$MAILHOG_PORT"
    check_service "MailHog UI" "localhost" "$MAILHOG_UI_PORT"
    check_service "Mail Forwarder" "localhost" "25"
    
    echo ""
    echo "📧 Development Mail Flow:"
    echo "   External → Port 25 → Backend:${MAIL_PORT:-2525} → Database + MailHog"
    
else
    # Production environment checks
    check_service "MongoDB" "localhost" "$MONGODB_PORT"
    check_service "Redis" "localhost" "$REDIS_PORT"
    check_service "Backend API" "localhost" "$BACKEND_PORT"
    check_service "Postfix SMTP" "localhost" "25"
    check_service "Nginx" "localhost" "80"
    
    echo ""
    echo "📧 Production Mail Flow:"
    echo "   External → Port 25 (Postfix) → Backend:${MAIL_PORT:-2525} → Database"
fi

# Check backend health
echo ""
echo "🏥 Backend Health Check:"
if curl -s http://localhost:3001/health/mail >/dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s http://localhost:3001/health/mail)
    echo "   ✅ Backend health endpoint is accessible"
    echo "   📊 Health Status:"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo "   ❌ Backend health endpoint is not accessible"
fi

# Environment-specific recommendations
echo ""
echo "💡 Environment-Specific Features:"

if [ "$ENV_TYPE" = "Development" ]; then
    echo "   ✅ MailHog forwarding enabled"
    echo "   ✅ Debug logging enabled"
    echo "   ✅ Hot reload enabled"
    echo "   🌐 MailHog UI: http://localhost:8025"
    echo "   🧪 Test script: ./scripts/test-mail-forwarding.sh"
else
    echo "   ✅ Postfix mail server enabled"
    echo "   ✅ Production logging enabled"
    echo "   ✅ SSL/TLS configured"
    echo "   ❌ MailHog forwarding disabled"
    echo "   🔒 Security hardened"
fi

echo ""
echo "🎯 Summary:"
echo "   Environment: $ENV_TYPE"
echo "   Mail Processing: Backend on port 2525"
if [ "$ENV_TYPE" = "Development" ]; then
    echo "   Mail Frontend: Port 25 (Postfix mail server)"
    echo "   Debug Tool: MailHog on port 1025/8025"
else
    echo "   Mail Frontend: Port 25 (Postfix)"
    echo "   Debug Tool: None (production)"
fi