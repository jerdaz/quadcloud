#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

REPO_URL="https://github.com/your-username/quadcloud"
BRANCH="main"

echo "Updating source..."
TMP_DIR=$(mktemp -d)
curl -L "$REPO_URL/archive/refs/heads/$BRANCH.tar.gz" -o "$TMP_DIR/update.tar.gz"
tar -xzf "$TMP_DIR/update.tar.gz" --strip-components=1 --exclude='*/node_modules/*' -C "$TMP_DIR"
cp -a "$TMP_DIR/." .
rm -rf "$TMP_DIR"

echo "Installing latest Electron..."
npm install electron@latest --save > /dev/null

echo "Installing dependencies..."
npm install > /dev/null

echo "Starting app..."
npm start
