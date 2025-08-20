#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

STATE_FILE=".update_state"

TODAY=$(date +%Y-%m-%d)
LAST_DATE=""
if [ -f "$STATE_FILE" ]; then
  LAST_DATE=$(cat "$STATE_FILE")
fi

if [ "$LAST_DATE" != "$TODAY" ]; then
  echo "Checking for Electron updates..."
  npm install electron@latest --save > /dev/null
  printf "%s\n" "$TODAY" > "$STATE_FILE"
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install > /dev/null
fi

echo "Starting app..."
npm start

