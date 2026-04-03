#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧠 Second Brain - Installation Script${NC}\n"

# Check Node.js version
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed${NC}"
  echo "Please install Node.js 20+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}❌ Node.js 20+ is required (you have v$NODE_VERSION)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) found${NC}\n"

# Check npm version
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm is not installed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) found${NC}\n"

# Install directory
INSTALL_DIR="${HOME}/.local/bin"
if [[ ! -d "$INSTALL_DIR" ]]; then
  mkdir -p "$INSTALL_DIR"
  echo -e "${YELLOW}ℹ Created directory: $INSTALL_DIR${NC}"
fi

# Clone or update repository
REPO_DIR="${HOME}/.second-brain"
if [[ -d "$REPO_DIR" ]]; then
  echo -e "${YELLOW}ℹ Updating existing installation at $REPO_DIR${NC}"
  cd "$REPO_DIR"
  git pull origin main --quiet 2>/dev/null || echo "Note: Could not pull latest updates"
else
  echo -e "${YELLOW}ℹ Cloning repository...${NC}"
  git clone https://github.com/thesaiprasadrao/second-brain.git "$REPO_DIR" --quiet
  cd "$REPO_DIR"
fi

echo -e "${GREEN}✓ Repository ready at $REPO_DIR${NC}\n"

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install --prefer-offline --no-audit 2>&1 | tail -5
echo -e "${GREEN}✓ Dependencies installed${NC}\n"

# Create symlink for global command
SCRIPT_PATH="$REPO_DIR/bin/cli.js"
SYMLINK_PATH="$INSTALL_DIR/2nd-brain"

if [[ -L "$SYMLINK_PATH" ]]; then
  rm "$SYMLINK_PATH"
fi

ln -s "$SCRIPT_PATH" "$SYMLINK_PATH"
chmod +x "$SCRIPT_PATH"

echo -e "${GREEN}✓ Global command created: 2nd-brain${NC}\n"

# Update PATH if needed
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo -e "${YELLOW}ℹ Add $INSTALL_DIR to your PATH${NC}"
  echo ""
  if [[ "$SHELL" == *"zsh"* ]]; then
    echo "  Add this to ~/.zshrc:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  elif [[ "$SHELL" == *"bash"* ]]; then
    echo "  Add this to ~/.bashrc:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  fi
  echo ""
  echo "  Then run: source ~/${SHELL##*/}rc"
  echo ""
fi

echo -e "${BLUE}Installation Complete!${NC}\n"
echo -e "Next steps:"
echo -e "  1. Add ~/.local/bin to PATH (if needed above)"
echo -e "  2. Run: ${YELLOW}2nd-brain setup${NC}"
echo -e "  3. Start the server: ${YELLOW}2nd-brain start${NC}\n"
echo -e "Need help? Run: ${YELLOW}2nd-brain help${NC}\n"
