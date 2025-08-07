#!/bin/bash

echo "📧 Validating Production Mailserver Configuration"
echo "=============================================="

# Check if required configuration files exist
echo "📁 Checking Postfix configuration files..."

config_files=(
    "config/postfix/main.cf"
    "config/postfix/transport_regexp"
    "config/postfix/virtual_regexp"
    "Dockerfile.postfix"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file missing"
        exit 1
    fi
done

echo ""
echo "🐳 Checking Docker Compose configuration..."

# Check if mailserver is properly configured in docker-compose.prod.yml
if grep -q "mailserver:" docker-compose.prod.yml; then
    echo "   ✅ Mailserver service is defined"
else
    echo "   ❌ Mailserver service is missing"
    exit 1
fi

# Check if mailserver volume is configured
if grep -q "mailserver_prod_data:" docker-compose.prod.yml; then
    echo "   ✅ Mailserver volume is configured"
else
    echo "   ❌ Mailserver volume is missing"
    exit 1
fi

# Check if required environment variables are referenced
required_env_vars=("MAIL_DOMAIN" "POSTFIX_MYHOSTNAME" "POSTFIX_MYDOMAIN" "POSTFIX_MYORIGIN")
for var in "${required_env_vars[@]}"; do
    if grep -q "\${$var}" docker-compose.prod.yml; then
        echo "   ✅ Environment variable $var is referenced"
    else
        echo "   ⚠️  Environment variable $var is not referenced"
    fi
done

echo ""
echo "📋 Checking Postfix configuration content..."

# Check if main.cf has correct transport configuration
if grep -q "transport_maps.*regexp" config/postfix/main.cf; then
    echo "   ✅ Transport maps are configured"
else
    echo "   ❌ Transport maps are missing in main.cf"
fi

# Check if transport_regexp forwards to backend
if grep -q "backend.*2525" config/postfix/transport_regexp; then
    echo "   ✅ Transport forwards to backend:2525"
else
    echo "   ❌ Transport forwarding is not configured correctly"
fi

echo ""
echo "🔧 Checking directory structure..."

# Check if required directories exist or can be created
directories=(
    "/opt/tempmail/data/mailserver"
    "logs/postfix"
)

for dir in "${directories[@]}"; do
    if [ -d "$dir" ] || mkdir -p "$dir" 2>/dev/null; then
        echo "   ✅ Directory $dir is available"
    else
        echo "   ⚠️  Directory $dir cannot be created (may need sudo)"
    fi
done

echo ""
echo "📊 Configuration Summary:"
echo "   • Postfix receives mail on port 25"
echo "   • Mail is forwarded to backend:2525"
echo "   • Configuration files are in config/postfix/"
echo "   • Logs will be stored in logs/postfix/"
echo "   • Data will be persisted in /opt/tempmail/data/mailserver"

echo ""
echo "✅ Production mailserver configuration validation completed!"
echo ""
echo "💡 Next steps:"
echo "   1. Set environment variables in .env file:"
echo "      MAIL_DOMAIN=your-domain.com"
echo "      POSTFIX_MYHOSTNAME=mail.your-domain.com"
echo "      POSTFIX_MYDOMAIN=your-domain.com"
echo "      POSTFIX_MYORIGIN=your-domain.com"
echo ""
echo "   2. Configure DNS MX record:"
echo "      your-domain.com. IN MX 10 mail.your-domain.com."
echo ""
echo "   3. Start production environment:"
echo "      ./scripts/prod-start.sh"