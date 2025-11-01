#!/bin/bash

# Sanity Test Suite Runner
# This script runs sanity tests either locally or in Docker

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"

echo "🧪 Library Management System - Sanity Test Suite"
echo "=================================================="
echo "API URL: $API_BASE_URL/api"
echo ""

# Check if running in Docker
if [ -f /.dockerenv ] || [ -n "${DOCKER_CONTAINER}" ]; then
    echo "Running tests inside Docker container..."
    cd /app
    node scripts/sanity-test.js
else
    # Check if backend is running
    echo "Checking if backend is accessible..."
    if curl -s -f "${API_BASE_URL}/api/books" > /dev/null 2>&1; then
        echo "✓ Backend is accessible"
        echo ""
        node scripts/sanity-test.js
    else
        echo "❌ Backend is not accessible at ${API_BASE_URL}"
        echo ""
        echo "Options:"
        echo "  1. Start the backend: docker compose up -d backend"
        echo "  2. Run tests in Docker: docker compose exec backend node scripts/sanity-test.js"
        echo "  3. Set API_BASE_URL environment variable"
        exit 1
    fi
fi

