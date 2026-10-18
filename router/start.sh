#!/usr/bin/env bash
# FREECC router start (LiteLLM proxy). Evidence E14.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$HERE/.env" ]]; then set -a; source "$HERE/.env"; set +a; else echo "[freecc] WARN: router/.env missing — copy .env.example and fill keys"; fi
export LITELLM_MASTER_KEY="${LITELLM_MASTER_KEY:-sk-freecc-change-me}"
: "${OLLAMA_BASE:=http://localhost:11434}"; export OLLAMA_BASE
# LiteLLM's startup banner is UTF-8 box art; a non-UTF-8 console (notably
# Windows cp1250/cp437, even under Git Bash) aborts startup with
# UnicodeEncodeError. Forcing UTF-8 is a no-op on Linux/macOS.
export PYTHONIOENCODING="${PYTHONIOENCODING:-utf-8}"
export PYTHONUTF8="${PYTHONUTF8:-1}"
echo "[freecc] starting LiteLLM proxy on :${PORT:-4000} (config: $HERE/litellm.config.yaml)"
exec litellm --config "$HERE/litellm.config.yaml" --port "${PORT:-4000}"
