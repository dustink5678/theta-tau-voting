#!/bin/bash

# This script deploys a simple static site to GitHub Pages
# as a temporary solution

echo "Deploying static site to GitHub Pages..."

# Create a temporary directory for the static site
mkdir -p dist
cp static-site/index.html dist/index.html

# Deploy using gh-pages
npx gh-pages -d dist

echo "Static site deployed!"
echo "Visit https://dustink5678.github.io/theta-tau-voting/ to see it." 