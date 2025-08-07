#!/bin/bash

echo "🔧 Environment Configuration Validation"
echo "======================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    echo "💡 Please copy .env.example to .env and configure it:"
    echo "   cp .env.example .env"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Load environment variables
set -a
source .env
set +a

# Define required variables for different environments
declare -A required_vars

# Common variables
required_vars[common]="NODE_ENV BACKEND_PORT MONGODB_ROOT_USERNAME MONGODB_ROOT_PASSWORD MONGODB_DATABASE MAIL_DOMAIN JWT_SECRET"

# Development specific
required_vars[development]="MAILHOG_HOST MAILHOG_PORT"

# Production specific  
required_vars[production]="POSTFIX_MYHOSTNAME POSTFIX_MYDOMAIN POSTFIX_MYORIGIN CORS_ORIGIN"

echo "🔍 Checking required environment variables..."

# Check common variables
echo "📋 Common variables:"
for var in ${required_vars[common]}; do
    if [ -n "${!var}" ]; then
        echo "   ✅ $var is set"
    else
        echo "   ❌ $var is not set or empty"
        exit 1
    fi
done

echo ""

# Check environment-specific variables
if [ "$NODE_ENV" = "development" ]; then
    echo "🛠️  Development environment variables:"
    for var in ${required_vars[development]}; do
        if [ -n "${!var}" ]; then
            echo "   ✅ $var is set"
        else
            echo "   ⚠️  $var is not set (optional for development)"
        fi
    done
elif [ "$NODE_ENV" = "production" ]; then
    echo "🏭 Production environment variables:"
    for var in ${required_vars[production]}; do
        if [ -n "${!var}" ]; then
            echo "   ✅ $var is set"
        else
            echo "   ❌ $var is not set or empty"
            exit 1
        fi
    done
fi

echo ""
echo "🔒 Security check..."

# Check for default/weak values
security_warnings=0

if [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production-very-long-and-secure" ]; then
    echo "   ⚠️  JWT_SECRET is using default value - please change it!"
    security_warnings=$((security_warnings + 1))
fi

if [ "$MONGODB_ROOT_PASSWORD" = "password" ] && [ "$NODE_ENV" = "production" ]; then
    echo "   ⚠️  MONGODB_ROOT_PASSWORD is weak - please use a strong password!"
    security_warnings=$((security_warnings + 1))
fi

if [ "$SESSION_SECRET" = "your-super-secret-session-key-change-in-production-very-long-and-secure" ]; then
    echo "   ⚠️  SESSION_SECRET is using default value - please change it!"
    security_warnings=$((security_warnings + 1))
fi

if [ $security_warnings -eq 0 ]; then
    echo "   ✅ No security warnings"
else
    echo "   ⚠️  Found $security_warnings security warnings"
fi

echo ""
echo "📊 Configuration Summary:"
echo "   Environment: $NODE_ENV"
echo "   Backend Port: $BACKEND_PORT"
echo "   Mail Domain: $MAIL_DOMAIN"
echo "   Database: $MONGODB_DATABASE"
echo "   Log Level: $LOG_LEVEL"

echo ""
echo "✅ Environment configuration validation completed!"

if [ $security_warnings -gt 0 ] && [ "$NODE_ENV" = "production" ]; then
    echo ""
    echo "⚠️  WARNING: Security issues found in production environment!"
    echo "Please fix the security warnings before deploying to production."
    exit 1
fi