#!/usr/bin/env bash
# FREECC — launch Claude Code against the free router (evidence E14, E15).
# Prereq: router/start.sh already running on :4000.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"

# load router secrets so ANTHROPIC_AUTH_TOKEN can default to the master key
if [[ -f "$ROOT/router/.env" ]]; then set -a; source "$ROOT/router/.env"; set +a; fi
source "$HERE/claude-code.env"

if ! command -v claude >/dev/null 2>&1; then
  echo "claude CLI not found. Install: npm install -g @anthropic-ai/claude-code" >&2
  echo "(Claude Code itself is free/open; you pay nothing when it talks to OUR router.)" >&2
  exit 1
fi

echo "[freecc] Claude Code -> router at $ANTHROPIC_BASE_URL (groups: opus/sonnet/haiku)"
exec claude "$@"
