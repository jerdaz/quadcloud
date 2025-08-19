#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

REPO_URL="https://github.com/jerdaz/quadcloud"
BRANCH="main"
STATE_FILE=".update_state"

TODAY=$(date +%Y-%m-%d)

LAST_DATE=""
LAST_COMMIT=""
if [ -f "$STATE_FILE" ]; then
  LAST_DATE=$(sed -n '1p' "$STATE_FILE")
  LAST_COMMIT=$(sed -n '2p' "$STATE_FILE")
fi

if [ "$LAST_DATE" != "$TODAY" ]; then
  echo "Checking for updates..."
  REMOTE_COMMIT=$(curl -s "https://api.github.com/repos/jerdaz/quadcloud/commits/$BRANCH" | grep '"sha"' | head -n1 | cut -d '"' -f4)

  echo "Installing latest Electron..."
  npm install electron@latest --save > /dev/null

  if [ "$REMOTE_COMMIT" != "$LAST_COMMIT" ]; then
    echo "Updating source..."
    TMP_DIR=$(mktemp -d)
    curl -Ls "$REPO_URL/archive/refs/heads/$BRANCH.tar.gz" -o "$TMP_DIR/update.tar.gz"
    tar -xzf "$TMP_DIR/update.tar.gz" --strip-components=1 --exclude='*/node_modules/*' -C "$TMP_DIR"
    cp -a "$TMP_DIR/." .
    rm -rf "$TMP_DIR"

    echo "Installing dependencies..."
    npm install > /dev/null

    LAST_COMMIT=$REMOTE_COMMIT
  else
    echo "Source is up to date."
  fi

  printf "%s\n%s\n" "$TODAY" "$LAST_COMMIT" > "$STATE_FILE"
else
  echo "Using cached build; no updates today."
fi

echo "Starting app..."
npm start

