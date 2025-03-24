#!/bin/bash

# This script provides commands to manually push to GitHub
# No API calls required - just git commands

# Ensure script exits on any error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}==== Manual GitHub Deployment ====${NC}"

echo -e "${YELLOW}Step 1: Create a new repository on GitHub through the web interface${NC}"
echo -e "${YELLOW}       Go to https://github.com/new${NC}"
echo -e "${YELLOW}       Repository name: theta-tau-voting${NC}"
echo -e "${YELLOW}       Description: A real-time voting application for Theta Tau fraternity${NC}"
echo -e "${YELLOW}       Make it public or private as you prefer${NC}"
echo -e "${YELLOW}       Do NOT initialize with README, .gitignore, or license${NC}"

echo ""
echo -e "${YELLOW}Step 2: After creating the repository, enter your GitHub username:${NC}"
read GITHUB_USERNAME

echo ""
echo -e "${YELLOW}Setting up Git remote...${NC}"
git remote add origin "https://github.com/${GITHUB_USERNAME}/theta-tau-voting.git"

echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push -u origin main

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to push to GitHub. Please check your credentials and try again.${NC}"
  echo -e "${YELLOW}Alternative command: git push -u origin main --force${NC}"
  exit 1
fi

echo -e "${GREEN}Successfully pushed to GitHub!${NC}"
echo -e "${YELLOW}Your repository is available at: https://github.com/${GITHUB_USERNAME}/theta-tau-voting${NC}"
echo -e "${YELLOW}GitHub Pages will be available after the workflow completes at: https://${GITHUB_USERNAME}.github.io/theta-tau-voting/${NC}"

echo -e "${YELLOW}==== Deployment Complete ====${NC}" 