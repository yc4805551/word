#!/bin/bash
# Reads local credentials and starts the private WPS/Gemini API.
TOKEN=$(python3 -c 'import json; print(json.load(open("'"$HOME"'/project/word/.claude/settings.local.json"))["env"]["X_KWIKI_AUTH"])')
export X_KWIKI_AUTH="$TOKEN"
if [ -f "$HOME/.gemini-smart-canvas/env" ]; then
  set -a
  source "$HOME/.gemini-smart-canvas/env"
  set +a
fi
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin"
mkdir -p "$HOME/.gemini-smart-canvas"
exec node "$HOME/project/word/server/kwiki-api.mjs"