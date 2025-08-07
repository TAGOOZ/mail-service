#!/bin/bash

echo "🚀 Starting Production Environment"
echo "================================="

# Validate environment configuration
echo "🔧 Validating environment configuration..."
if ! ./scripts/validate-env-config.sh; then
    echo "❌ Environment validation failed"
    exit 1
fi

echo ""
echo "📦 Starting Docker containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check service status
echo "🔍 Checking service status..."

services=("mongodb:27017" "redis:6379" "backend:3001" "mailserver:25" "nginx:80")
for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if nc -z localhost $port 2>/dev/null; then
        echo "   ✅ $name is running on port $port"
    else
        echo "   ❌ $name is not responding on port $port"
    fi
done

echo ""
echo "🌐 Production URLs:"
echo "   • Website: http://localhost (or your domain)"
echo "   • Backend API: http://localhost:3001 (internal)"
echo ""
echo "📧 Mail Configuration:"
echo "   • SMTP Server: Port 25 (Postfix)"
echo "   • Mail Processing: Backend:2525 (internal)"
echo "   • Mail Domain: ${MAIL_DOMAIN:-nnu.edu.kg}"
echo ""
echo "🔄 Mail Flow:"
echo "   External Email → Port 25 (Postfix) → Backend:2525 → Database"
echo ""
echo "🔍 Health Checks:"
echo "   • Backend: http://localhost:3001/health"
echo "   • Mail Service: http://localhost:3001/health/mail"
echo ""
echo "📋 To view logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f [service-name]"
echo ""
echo "🛑 To stop:"
echo "   docker-compose -f docker-compose.prod.yml down"
echo ""
echo "🔧 Environment Check:"
echo "   ./scripts/check-environment.sh"