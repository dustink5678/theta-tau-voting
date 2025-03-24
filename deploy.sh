#!/bin/bash

# Build the app
npm run build

# Create a .nojekyll file to prevent GitHub Pages from ignoring files that begin with an underscore
touch dist/.nojekyll

# If you're deploying to a custom domain, add a CNAME file
# echo "yourdomain.com" > dist/CNAME

# Optional: Copy index.html to 404.html for SPA routing
cp dist/index.html dist/404.html

echo "Build completed. To deploy, push the dist folder to the gh-pages branch."
echo "You can use: npm install -g gh-pages && gh-pages -d dist"
echo "Or manually push the dist folder to your gh-pages branch." 