#!/bin/bash

echo "🔍 Configuration Validation"
echo "=========================="

# Check if required configuration files exist
echo "📁 Checking configuration files..."

config_files=(
    "config/postfix/main.cf"
    "config/postfix/transport"
    "config/postfix/transport_regexp"
    "config/postfix/virtual_regexp"
    "config/nginx/nginx.prod.conf"
    "config/redis/redis.conf"
    "config/mongodb/mongod.conf"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file missing"
    fi
done

echo ""
echo "🐳 Checking Docker files..."

docker_files=(
    "Dockerfile.postfix"
    "docker-compose.dev.yml"
    "docker-compose.prod.yml"
    "backend/Dockerfile.dev"
    "backend/Dockerfile.prod"
    "frontend/Dockerfile.dev"
    "frontend/Dockerfile.prod"
)

for file in "${docker_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file missing"
    fi
done

echo ""
echo "📧 Validating Postfix configuration..."

# Check if Postfix config references correct paths
if grep -q "config/postfix" Dockerfile.postfix; then
    echo "   ✅ Dockerfile.postfix uses correct config paths"
else
    echo "   ❌ Dockerfile.postfix may have incorrect paths"
fi

# Check for duplicate postfix directories
if [ -d "backend/postfix" ]; then
    echo "   ⚠️  Duplicate postfix directory found: backend/postfix"
    echo "       Consider removing it to avoid confusion"
else
    echo "   ✅ No duplicate postfix directories"
fi

echo ""
echo "🔧 Checking environment files..."

if [ -f ".env.example" ]; then
    echo "   ✅ .env.example exists"
    
    # Check for environment-specific variables
    if grep -q "MAILHOG_HOST" .env.example; then
        echo "   ✅ Development variables documented"
    fi
    
    if grep -q "POSTFIX_MYHOSTNAME" .env.example; then
        echo "   ✅ Production variables documented"
    fi
else
    echo "   ❌ .env.example missing"
fi

echo ""
echo "📋 Configuration Summary:"
echo "   • Postfix configs: config/postfix/"
echo "   • Development: Uses MailHog + socat forwarder"
echo "   • Production: Uses Postfix mail server"
echo "   • Backend: Handles mail on port 2525 in both environments"

echo ""
echo "💡 Next steps:"
echo "   • Development: ./scripts/dev-start.sh"
echo "   • Production: ./scripts/prod-start.sh"
echo "   • Environment check: ./scripts/check-environment.sh"