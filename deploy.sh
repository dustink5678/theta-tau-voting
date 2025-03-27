#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print step messages
print_step() {
  echo -e "${YELLOW}==>${NC} $1"
}

# Add all files to git if needed
print_step "Adding all files to git"
git add .

# Get commit message
echo -e "${YELLOW}Enter commit message:${NC}"
read commit_message

# Commit with the entered message
if [ -n "$commit_message" ]; then
  print_step "Committing with message: '$commit_message'"
  git commit -m "$commit_message"
else
  print_step "No commit message provided, using default message"
  git commit -m "Update application"
fi

# Push to remote repository
print_step "Pushing to remote repository"
git push

# Run build
print_step "Building the application"
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  print_step "Build successful"
else
  echo -e "${YELLOW}Build failed. Cannot proceed with deployment.${NC}"
  exit 1
fi

# Run Firebase deployment
print_step "Deploying the application to Firebase"
firebase deploy

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Firebase deployment successful!${NC}"
else
  echo -e "${YELLOW}Firebase deployment failed.${NC}"
  exit 1
fi

echo -e "${GREEN}All tasks completed successfully!${NC}"