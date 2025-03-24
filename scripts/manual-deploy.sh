#!/bin/bash

# This script manually deploys the application to GitHub Pages

echo "Starting manual deployment process..."

# Build the application using the GitHub-specific build
echo "Building the application..."
npm run build:github

# Deploy using gh-pages package
echo "Deploying to GitHub Pages..."
npm run deploy

echo "Deployment complete! Your site should be live at https://[your-username].github.io/theta-tau-voting/" 