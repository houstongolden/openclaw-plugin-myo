#!/usr/bin/env bash
set -euo pipefail

# End-to-end smoke test for the Myo OpenClaw plugin.
#
# Usage:
#   MYO_API_KEY=... ./scripts/self-test.sh --prod
#   MYO_API_KEY=... ./scripts/self-test.sh --dev --base-url https://dev.myo.ai
#
# Notes:
# - Uses an isolated OpenClaw profile so it won't clobber your normal config.
# - Assumes the OpenClaw gateway is already running (or can be auto-started).

ROOT_DIR="${ROOT_DIR:-$HOME/.myo-selftest}"
BASE_URL=""
TARGET="prod"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod)
      TARGET="prod"; shift ;;
    --dev)
      TARGET="dev"; shift ;;
    --base-url)
      BASE_URL="$2"; shift 2 ;;
    --root-dir)
      ROOT_DIR="$2"; shift 2 ;;
    -h|--help)
      sed -n '1,120p' "$0"; exit 0 ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "${MYO_API_KEY:-}" ]]; then
  echo "Missing MYO_API_KEY env var" >&2
  exit 2
fi

if [[ -z "$BASE_URL" ]]; then
  if [[ "$TARGET" == "dev" ]]; then
    BASE_URL="https://dev.myo.ai"
  else
    BASE_URL="https://myo.ai"
  fi
fi

PROFILE="myo-plugin-selftest-${TARGET}"
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[self-test] profile=$PROFILE"
echo "[self-test] baseUrl=$BASE_URL"
echo "[self-test] rootDir=$ROOT_DIR"

echo "[self-test] installing plugin (link)"
openclaw --profile "$PROFILE" plugins install --link "$PLUGIN_DIR" >/dev/null

# Make sure gateway is up for this profile.
openclaw --profile "$PROFILE" gateway start >/dev/null 2>&1 || true

echo "[self-test] connect"
openclaw --profile "$PROFILE" myo connect --api-key "$MYO_API_KEY" --api-base-url "$BASE_URL" --root-dir "$ROOT_DIR" >/dev/null

echo "[self-test] sync"
openclaw --profile "$PROFILE" myo sync >/dev/null

echo "[self-test] verify files"
for f in USER.md GOALS.md MEMORY.md JOBS.md HEARTBEATS.md; do
  test -s "$ROOT_DIR/$f" || { echo "Missing or empty: $ROOT_DIR/$f" >&2; exit 1; }
done

test -d "$ROOT_DIR/projects" || { echo "Missing: $ROOT_DIR/projects" >&2; exit 1; }
test -d "$ROOT_DIR/jobs" || { echo "Missing: $ROOT_DIR/jobs" >&2; exit 1; }

# Best-effort cron sync verification (doesn't fail if no jobs exist on Myo).
if command -v jq >/dev/null 2>&1; then
  echo "[self-test] cron list (names starting with myo:)"
  openclaw --profile "$PROFILE" cron list --all --json | jq -r '.jobs[] | select(.name|startswith("myo:")) | .name' || true
fi

echo "[self-test] OK"
