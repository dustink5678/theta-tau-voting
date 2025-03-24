#!/bin/bash

# This script helps create a GitHub repository and deploy the application

# Ensure script exits on any error
set -e

# Configuration - change these as needed
REPO_NAME="theta-tau-voting"
REPO_DESCRIPTION="A real-time voting application for Theta Tau fraternity"
IS_PRIVATE=false

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}==== Setting up GitHub Repository ====${NC}"

# Check for GitHub username
echo -e "${YELLOW}Please enter your GitHub username:${NC}"
read GITHUB_USERNAME

# Create repository on GitHub using curl
echo -e "${YELLOW}Creating repository ${GITHUB_USERNAME}/${REPO_NAME}...${NC}"

# Create the repository
curl -u "${GITHUB_USERNAME}" https://api.github.com/user/repos -d "{\"name\":\"${REPO_NAME}\",\"description\":\"${REPO_DESCRIPTION}\",\"private\":${IS_PRIVATE}}"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create repository. Please check your credentials and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}Repository created successfully!${NC}"

# Set up Git remote
echo -e "${YELLOW}Setting up Git remote...${NC}"
git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push -u origin main

echo -e "${GREEN}Successfully pushed to GitHub!${NC}"
echo -e "${YELLOW}Your repository is available at: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}${NC}"
echo -e "${YELLOW}GitHub Pages will be available after the workflow completes at: https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/${NC}"

echo -e "${YELLOW}==== Deployment Complete ====${NC}" 