#!/usr/bin/env bash
set -euo pipefail

BINARY="a2a-wallet"

if ! command -v "$BINARY" &>/dev/null; then
  echo "$BINARY is not installed or not in PATH."
  exit 0
fi

INSTALL_PATH=$(command -v "$BINARY")
echo "Removing $INSTALL_PATH..."

if [ -w "$INSTALL_PATH" ]; then
  rm "$INSTALL_PATH"
else
  sudo rm "$INSTALL_PATH"
fi

echo "$BINARY has been uninstalled."
