#!/bin/bash

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not found in the PATH."
    echo "Please ensure Node.js is installed and accessible."
    echo "You can check by running: node -v"
    exit 1
fi

echo "Node.js found: $(node -v)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the application
echo "Starting application..."
npm run dev
