#!/bin/bash
# Reads X_KWIKI_AUTH from .claude/settings.local.json and starts the Kwiki API.
TOKEN=$(python3 -c 'import json; print(json.load(open("'"$HOME"'/project/word/.claude/settings.local.json"))["env"]["X_KWIKI_AUTH"])')
export X_KWIKI_AUTH="$TOKEN"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin"
exec node "$HOME/project/word/server/kwiki-api.mjs"