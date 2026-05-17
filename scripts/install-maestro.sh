#!/bin/bash
# Install Maestro for mobile E2E testing

set -e

if command -v maestro &> /dev/null; then
    echo "Maestro already installed: $(maestro --version)"
    exit 0
fi

echo "Installing Maestro..."
curl -fsSL "https://get.maestro.mobile.dev" | bash

echo "Maestro installed. Please restart your terminal or run:"
echo "  export PATH=\"$HOME/.maestro/bin:$PATH\""
