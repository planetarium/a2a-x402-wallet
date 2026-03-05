#!/usr/bin/env bash
set -euo pipefail

REPO="planetarium/a2a-x402-wallet"
BINARY="a2a-wallet"

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  darwin)
    case "$ARCH" in
      arm64)          TARGET="darwin-arm64" ;;
      x86_64)         TARGET="darwin-x64" ;;
      *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
    esac
    ;;
  linux)
    case "$ARCH" in
      aarch64|arm64)  TARGET="linux-arm64" ;;
      x86_64)         TARGET="linux-x64" ;;
      *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
    esac
    ;;
  *)
    echo "Unsupported OS: $OS" >&2
    echo "For Windows, download the .exe from: https://github.com/$REPO/releases/latest" >&2
    exit 1
    ;;
esac

# Get latest release version from GitHub API
VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep '"tag_name"' \
  | sed 's/.*"v\([^"]*\)".*/\1/')

if [ -z "$VERSION" ]; then
  echo "Failed to fetch latest version from GitHub." >&2
  exit 1
fi

ARTIFACT="${BINARY}-${TARGET}"
URL="https://github.com/$REPO/releases/download/v${VERSION}/${ARTIFACT}"

echo "Installing a2a-wallet v${VERSION} for ${TARGET}..."

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
curl -fsSL "$URL" -o "$TMP"
chmod +x "$TMP"

# Install to /usr/local/bin if writable, otherwise ~/.local/bin
if [ -w "/usr/local/bin" ]; then
  INSTALL_DIR="/usr/local/bin"
elif sudo -n true 2>/dev/null; then
  INSTALL_DIR="/usr/local/bin"
  sudo mv "$TMP" "$INSTALL_DIR/$BINARY"
  trap - EXIT
  echo "Installed to $INSTALL_DIR/$BINARY"
  a2a-wallet --version
  exit 0
else
  INSTALL_DIR="$HOME/.local/bin"
  mkdir -p "$INSTALL_DIR"
fi

mv "$TMP" "$INSTALL_DIR/$BINARY"
trap - EXIT

echo "Installed to $INSTALL_DIR/$BINARY"

# Warn if not in PATH
if ! echo ":$PATH:" | grep -q ":$INSTALL_DIR:"; then
  echo ""
  echo "Note: $INSTALL_DIR is not in your PATH."
  echo "Add this to your shell profile (~/.zshrc or ~/.bashrc):"
  echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
fi

"$INSTALL_DIR/$BINARY" --version
