#!/bin/bash

# Environment Setup Script for NNU Mail Service
# This script helps you set up the development environment

set -e

echo "🚀 Setting up NNU Mail Service development environment..."

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Copy .env.example to .env
echo "📝 Copying .env.example to .env..."
cp .env.example .env

echo "✅ Environment file created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file to customize your configuration"
echo "2. Start the services with: npm run dev"
echo "3. Or use Docker: docker-compose up -d"
echo ""
echo "🔧 Important configurations to review:"
echo "- Database credentials (MONGODB_URI)"
echo "- JWT secrets (JWT_SECRET, SESSION_SECRET)"
echo "- Mail domain (MAIL_DOMAIN)"
echo "- API URLs (VITE_API_BASE_URL, REACT_APP_API_URL)"
echo ""
echo "📚 For more information, see README.md"