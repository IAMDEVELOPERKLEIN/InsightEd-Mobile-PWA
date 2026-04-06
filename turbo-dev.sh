#!/bin/bash
# turbo-dev.sh - Faster development startup with port cleanup
# This script ensures that ports 3000 (API) and 5173 (Vite) are clear before starting.

echo "🚀 Starting InsightEd Turbo Dev..."

# 1. Kill existing processes on ports 3000 (API) and 5173 (Vite)
# Using the project's existing kill-ports.sh script for consistency
if [ -f "./scripts/kill-ports.sh" ]; then
    echo "🧹 Cleaning up ports..."
    bash ./scripts/kill-ports.sh
else
    echo "⚠️  scripts/kill-ports.sh not found, skipping port cleanup."
fi

# 2. Run the full development stack
echo "✨ Launching concurrent servers..."
npm run dev:full
