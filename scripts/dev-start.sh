#!/bin/bash

echo "🚀 Starting Development Environment"
echo "=================================="

# Validate environment configuration
echo "🔧 Validating environment configuration..."
if ! ./scripts/validate-env-config.sh; then
    echo "❌ Environment validation failed"
    exit 1
fi

echo ""
echo "📦 Starting Docker containers..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "🔍 Checking service status..."

services=("mongodb-dev:27017" "redis-dev:6379" "backend-dev:3001" "frontend-dev:3000" "mailhog:8025")
for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if nc -z localhost $port 2>/dev/null; then
        echo "   ✅ $name is running on port $port"
    else
        echo "   ❌ $name is not responding on port $port"
    fi
done

echo ""
echo "🌐 Development URLs:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend API: http://localhost:3001"
echo "   • MailHog UI: http://localhost:8025"
echo ""
echo "📧 Mail Configuration:"
echo "   • External SMTP: localhost:25 → backend:2525 → Database + MailHog"
echo "   • MailHog UI: localhost:8025 (shows forwarded emails)"
echo "   • Mail Domain: 127.0.0.1"
echo ""
echo "🔄 Mail Flow:"
echo "   Incoming: Port 25 → Backend → Database + MailHog forwarding"
echo "   Outgoing: Backend → MailHog:1025 → MailHog UI"
echo ""
echo "🧪 Testing & Development:"
echo "   • Test mail forwarding: ./scripts/test-mail-forwarding.sh"
echo "   • Test hot reload: ./scripts/dev-hot-reload-test.sh"
echo ""
echo "🔥 Hot Reload Status:"
echo "   • Backend: Nodemon watching backend/src/ and shared/src/"
echo "   • Frontend: Vite HMR watching frontend/src/ and shared/src/"
echo "   • Changes should auto-reload within 1-2 seconds"
echo ""
echo "📋 To view logs:"
echo "   docker-compose -f docker-compose.dev.yml logs -f [service-name]"
echo ""
echo "🛑 To stop:"
echo "   docker-compose -f docker-compose.dev.yml down"