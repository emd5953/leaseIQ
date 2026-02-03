#!/bin/bash
set -e

echo "Starting cron job build..."

# Use cached dependencies if available
if [ -d "node_modules" ]; then
  echo "Using cached node_modules"
  npm install --prefer-offline --no-audit
else
  echo "Installing dependencies..."
  npm ci --prefer-offline --no-audit
fi

# Build TypeScript
echo "Building TypeScript..."
npm run build

echo "Build complete!"
