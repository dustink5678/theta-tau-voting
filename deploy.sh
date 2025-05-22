#!/bin/bash

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to handle errors
handle_error() {
  echo -e "${RED}$1${NC}"
  exit 1
}

# Git commit and push
echo "==> Adding all files to git"
git add . || handle_error "Git add failed"

echo "Enter commit message:"
read commit_message

echo "==> Committing with message: '$commit_message'"
git commit -m "$commit_message" || handle_error "Git commit failed"

echo "==> Pushing to remote repository"
git push || handle_error "Git push failed"

echo "==> Git push successful"

# Build the application
echo "==> Building the application"
./build.sh || handle_error "Build failed. Cannot proceed with deployment."

echo "==> Build successful"

# Deploy to Firebase
echo "==> Deploying the application to Firebase"
firebase deploy || handle_error "Firebase deployment failed."

echo -e "${GREEN}Firebase deployment successful!${NC}"
echo -e "${GREEN}All tasks completed successfully!${NC}"