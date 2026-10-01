#!/bin/bash
# Double-click this file in Finder to install and start Legal Request System.
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js (npm) is not installed. Install it from https://nodejs.org (version 22 or newer), then double-click this file again."
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Installing packages (first time only)..."
npm install --no-audit --no-fund
echo ""
echo "Finding the right Supabase database address..."
npm run detect-db || { echo ""; read -n 1 -s -r -p "Fix the problem above, then press any key to close..."; exit 1; }
echo ""
echo "Starting the app. Keep this window open. Press Ctrl+C to stop."
(sleep 6 && open "http://localhost:5173") &
npm run dev
echo ""
read -n 1 -s -r -p "The app stopped. Read the message above, then press any key to close..."
