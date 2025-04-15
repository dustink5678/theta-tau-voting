#!/bin/bash

# Build the app
npm run build

# Copy auth.html to dist folder
cp src/auth.html dist/

echo "Build completed. Auth redirect page copied to dist folder." 