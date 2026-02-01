#!/bin/bash
set -e

echo "=== Starting Render Build ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"

echo "=== Installing dependencies ==="
npm ci

echo "=== Checking TypeScript installation ==="
npx tsc --version

echo "=== Running TypeScript build ==="
npm run build

echo "=== Verifying build output ==="
if [ -f "dist/server.js" ]; then
    echo "✓ dist/server.js exists"
    ls -la dist/
else
    echo "✗ ERROR: dist/server.js not found!"
    echo "Contents of current directory:"
    ls -la
    exit 1
fi

echo "=== Build completed successfully ==="
