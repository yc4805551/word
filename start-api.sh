#!/bin/bash

set -euo pipefail

# 读取本机 Gemini CLI 的环境配置；不要把密钥写入项目文件。
if [ -f "$HOME/.gemini/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$HOME/.gemini/.env"
  set +a
fi

export KWIKI_API_PORT="${KWIKI_API_PORT:-8787}"
export GEMINI_CLI_MODEL="${GEMINI_CLI_MODEL:-gemini-2.0-flash}"
export GEMINI_TIMEOUT_MS="${GEMINI_TIMEOUT_MS:-15000}"
export CCSWITCH_BASE_URL="${CCSWITCH_BASE_URL:-http://127.0.0.1:15721}"
export CCSWITCH_MODEL="${CCSWITCH_MODEL:-$GEMINI_CLI_MODEL}"
export CCSWITCH_TIMEOUT_MS="${CCSWITCH_TIMEOUT_MS:-12000}"
export DMXAPI_BASE_URL="${DMXAPI_BASE_URL:-https://www.dmxapi.cn}"
export DMXAPI_MODEL="${DMXAPI_MODEL:-gpt-4o-mini}"
export DMXAPI_TIMEOUT_MS="${DMXAPI_TIMEOUT_MS:-15000}"

if [ -z "${GEMINI_API_KEY:-}" ] && [ -z "${CCSWITCH_API_KEY:-}" ]; then
  echo "Warning: GEMINI_API_KEY and CCSWITCH_API_KEY are both unset; Gemini route will fall back to DMXAPI."
fi
if [ -z "${DMXAPI_API_KEY:-}" ]; then
  echo "Warning: DMXAPI_API_KEY is unset; all LLM routes may fail."
fi

echo "Starting Kwiki API server..."
echo "  Port: $KWIKI_API_PORT"
echo "  Gemini model: $GEMINI_CLI_MODEL"
echo "  cc-switch: $CCSWITCH_BASE_URL"
echo "  Fallback: DMXAPI"

node server/kwiki-api.mjs
