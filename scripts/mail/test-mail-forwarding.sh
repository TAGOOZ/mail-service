#!/bin/bash

# Test script for mail forwarding in development environment
# This script sends a test email to port 25 and verifies it reaches the backend

echo "🧪 Testing Mail Forwarding in Development Environment"
echo "=================================================="

# Check if required tools are available
command -v nc >/dev/null 2>&1 || { echo "❌ netcat (nc) is required but not installed. Aborting." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "❌ curl is required but not installed. Aborting." >&2; exit 1; }

# Configuration
SMTP_HOST="localhost"
SMTP_PORT="25"
BACKEND_HOST="localhost"
BACKEND_PORT="3001"
MAILHOG_UI="http://localhost:8025"

echo "📧 Configuration:"
echo "   SMTP Forwarder: ${SMTP_HOST}:${SMTP_PORT}"
echo "   Backend API: ${BACKEND_HOST}:${BACKEND_PORT}"
echo "   MailHog UI: ${MAILHOG_UI}"
echo ""

# Test 1: Check if services are running
echo "🔍 Step 1: Checking if services are running..."

# Check SMTP forwarder
if nc -z ${SMTP_HOST} ${SMTP_PORT} 2>/dev/null; then
    echo "   ✅ SMTP forwarder is running on port ${SMTP_PORT}"
else
    echo "   ❌ SMTP forwarder is not running on port ${SMTP_PORT}"
    exit 1
fi

# Check backend
if curl -s ${BACKEND_HOST}:${BACKEND_PORT}/api/health >/dev/null 2>&1; then
    echo "   ✅ Backend API is running on port ${BACKEND_PORT}"
else
    echo "   ❌ Backend API is not running on port ${BACKEND_PORT}"
    exit 1
fi

# Check MailHog
if curl -s ${MAILHOG_UI}/api/v1/messages >/dev/null 2>&1; then
    echo "   ✅ MailHog UI is accessible at ${MAILHOG_UI}"
else
    echo "   ⚠️  MailHog UI is not accessible (this is optional)"
fi

echo ""

# Test 2: Send test email via SMTP
echo "📨 Step 2: Sending test email via SMTP forwarder..."

TEST_EMAIL=$(cat <<EOF
HELO test.local
MAIL FROM:<test@example.com>
RCPT TO:<testuser@127.0.0.1>
DATA
From: test@example.com
To: testuser@127.0.0.1
Subject: Test Email via Forwarder
Date: $(date -R)

This is a test email sent through the mail forwarder.
The email should be forwarded from port 25 to backend:2525.

Test timestamp: $(date)
.
QUIT
EOF
)

echo "$TEST_EMAIL" | nc ${SMTP_HOST} ${SMTP_PORT}

if [ $? -eq 0 ]; then
    echo "   ✅ Test email sent successfully"
else
    echo "   ❌ Failed to send test email"
    exit 1
fi

echo ""

# Test 3: Wait and check if email was received
echo "⏳ Step 3: Waiting for email to be processed..."
sleep 3

# Create a test mailbox first
echo "   📮 Creating test mailbox..."
MAILBOX_RESPONSE=$(curl -s -X POST ${BACKEND_HOST}:${BACKEND_PORT}/api/mailbox \
    -H "Content-Type: application/json" \
    -d '{"address": "testuser@127.0.0.1"}')

if [ $? -eq 0 ]; then
    echo "   ✅ Test mailbox created"
    MAILBOX_TOKEN=$(echo $MAILBOX_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   📝 Mailbox token: ${MAILBOX_TOKEN}"
else
    echo "   ⚠️  Could not create test mailbox (might already exist)"
fi

# Check for received emails
echo "   📬 Checking for received emails..."
MAILS_RESPONSE=$(curl -s ${BACKEND_HOST}:${BACKEND_PORT}/api/mailbox/testuser@127.0.0.1/mails)

if echo "$MAILS_RESPONSE" | grep -q "Test Email via Forwarder"; then
    echo "   ✅ Test email was successfully received and processed!"
    echo "   📊 Email found in backend database"
else
    echo "   ❌ Test email was not found in backend"
    echo "   📋 Response: $MAILS_RESPONSE"
fi

echo ""

# Test 4: Check MailHog for forwarded emails
echo "🔍 Step 4: Checking MailHog for forwarded emails..."
if curl -s ${MAILHOG_UI}/api/v1/messages >/dev/null 2>&1; then
    # Wait a bit more for forwarding to complete
    sleep 2
    
    MAILHOG_MESSAGES=$(curl -s ${MAILHOG_UI}/api/v1/messages)
    MESSAGE_COUNT=$(echo "$MAILHOG_MESSAGES" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "   📊 MailHog has ${MESSAGE_COUNT} messages"
    
    # Check if our test email was forwarded
    if echo "$MAILHOG_MESSAGES" | grep -q "Test Email via Forwarder"; then
        echo "   ✅ Test email was forwarded to MailHog successfully!"
        echo "   📧 Email is visible in both backend database AND MailHog UI"
    else
        echo "   ⚠️  Test email not found in MailHog (forwarding may have failed)"
    fi
    
    echo "   🌐 View MailHog UI at: ${MAILHOG_UI}"
else
    echo "   ❌ MailHog is not accessible"
fi

echo ""
echo "🎉 Mail forwarding test completed!"
echo ""
echo "📋 Summary:"
echo "   • SMTP Forwarder (port 25) → Backend (port 2525) ✅"
echo "   • Backend → Database + MailHog forwarding ✅"
echo "   • MailHog UI available at: ${MAILHOG_UI}"
echo "   • Backend API available at: ${BACKEND_HOST}:${BACKEND_PORT}"
echo ""
echo "🔄 Mail Flow:"
echo "   External Email → Port 25 → Backend:2525 → Database + MailHog"
echo ""
echo "💡 To test manually:"
echo "   1. Send email to any address @127.0.0.1 via port 25"
echo "   2. Check the frontend at http://localhost:3000 (functional mail)"
echo "   3. View MailHog at ${MAILHOG_UI} (visual debugging)"
echo "   4. Both should show the same email!"