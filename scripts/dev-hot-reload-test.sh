#!/bin/bash

echo "🔥 Testing Hot Reload in Development Environment"
echo "=============================================="

# Check if development environment is running
if ! docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "❌ Development environment is not running"
    echo "Please start it first with: ./scripts/dev-start.sh"
    exit 1
fi

echo "📝 Testing Backend Hot Reload..."

# Create a test file change in backend
TEST_FILE="backend/src/test-hot-reload.ts"
echo "// Test hot reload - $(date)" > $TEST_FILE

echo "   ✅ Created test file: $TEST_FILE"

# Watch backend logs for restart
echo "   🔍 Watching backend logs for restart (10 seconds)..."
sleep 10 
docker-compose -f docker-compose.dev.yml logs -f backend-dev | grep -i "restart\|recompil\|reload" || true

echo ""
echo "📝 Testing Frontend Hot Reload..."

# Create a test file change in frontend
TEST_COMPONENT="frontend/src/components/TestHotReload.tsx"
mkdir -p "frontend/src/components"
cat > $TEST_COMPONENT << EOF
// Test hot reload component - $(date)
import React from 'react';

export const TestHotReload: React.FC = () => {
  return (
    <div>
      <h1>Hot Reload Test - $(date)</h1>
      <p>If you see this, hot reload is working!</p>
    </div>
  );
};
EOF

echo "   ✅ Created test component: $TEST_COMPONENT"

# Watch frontend logs for rebuild
echo "   🔍 Watching frontend logs for rebuild (10 seconds)..."
sleep 10
docker-compose -f docker-compose.dev.yml logs -f frontend-dev | grep -i "hmr\|reload\|rebuild\|update" || true

echo ""
echo "🧹 Cleaning up test files..."
rm -f $TEST_FILE
rm -f $TEST_COMPONENT

echo ""
echo "✅ Hot reload test completed!"
echo ""
echo "💡 To manually test hot reload:"
echo "   1. Edit files in backend/src/ or frontend/src/"
echo "   2. Watch the container logs:"
echo "      docker-compose -f docker-compose.dev.yml logs -f backend-dev"
echo "      docker-compose -f docker-compose.dev.yml logs -f frontend-dev"
echo "   3. Check if changes are reflected automatically"
echo ""
echo "🔧 If hot reload is not working:"
echo "   1. Check file permissions: ls -la backend/src frontend/src"
echo "   2. Verify volume mounts: docker-compose -f docker-compose.dev.yml config"
echo "   3. Restart development environment: ./scripts/dev-start.sh"