#!/bin/bash

# Exit on error
set -e

echo "Ensuring Corepack is enabled and pnpm is available..."
corepack enable
corepack prepare pnpm@latest --activate

echo "🚀 Installing all dependencies for the workshop..."
# This single command installs for both 'app' and 'final-app'
pnpm install

echo "Setting up environment variables for the 'app' directory..."
# --- This logic for setting up .env.local remains the same ---
cd app
if [ -f ".env.example" ]; then
    grep -vE '^GOOGLE_CLIENT_ID=|^GOOGLE_CLIENT_SECRET=' .env.example > .env.local
    echo "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" >> .env.local
    echo "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}" >> .env.local
fi
cd .. # Return to root

# Repeat for final-app for good measure
cd final-app
if [ -f ".env.example" ]; then
    grep -vE '^GOOGLE_CLIENT_ID=|^GOOGLE_CLIENT_SECRET=' .env.example > .env.local
    echo "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" >> .env.local
    echo "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}" >> .env.local
fi
cd .. # Return to root


echo "✅ Workshop environment is ready!"
echo "Run 'pnpm run dev:app' to start the application."
