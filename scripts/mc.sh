#!/usr/bin/env bash
set -euo pipefail

# Mission Control standalone launcher.
# Runs the Next.js app in mc-app with the vault root wired via env.

usage() {
  cat <<'EOF'
Usage:
  scripts/mc.sh dev  [--host 127.0.0.1] [--port 3333] [--root-dir <path>]
  scripts/mc.sh prod [--host 127.0.0.1] [--port 3333] [--root-dir <path>] [--no-build]

Environment overrides:
  MYO_MC_ROOT_DIR / MYO_VAULT_ROOT_DIR  Vault root directory
  OPENCLAW_BIN                         openclaw binary (default: openclaw)

Notes:
  - If --root-dir is not set, this script will attempt to read it from:
      openclaw myo status  (parses: [myo] rootDir=...)
    falling back to: ~/clawd/mission-control
EOF
}

MODE=${1:-}
if [[ -z "${MODE}" || "${MODE}" == "-h" || "${MODE}" == "--help" ]]; then
  usage
  exit 0
fi
shift || true

HOST="127.0.0.1"
PORT="3333"
ROOT_DIR=""
NO_BUILD="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --root-dir) ROOT_DIR="$2"; shift 2 ;;
    --no-build) NO_BUILD="true"; shift 1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
MC_APP_DIR="${REPO_DIR}/mc-app"

expand_path() {
  python3 - <<PY
import os,sys
print(os.path.expanduser(sys.argv[1]))
PY
}

infer_root_dir() {
  if [[ -n "${MYO_MC_ROOT_DIR:-}" ]]; then echo "${MYO_MC_ROOT_DIR}"; return 0; fi
  if [[ -n "${MYO_VAULT_ROOT_DIR:-}" ]]; then echo "${MYO_VAULT_ROOT_DIR}"; return 0; fi

  local bin="${OPENCLAW_BIN:-openclaw}"
  if command -v "$bin" >/dev/null 2>&1; then
    local line
    line=$($bin myo status 2>/dev/null | sed -n 's/^\[myo\] rootDir=//p' | tail -n 1 || true)
    if [[ -n "$line" ]]; then
      echo "$line"
      return 0
    fi
  fi

  echo "~/clawd/mission-control"
}

if [[ -z "${ROOT_DIR}" ]]; then
  ROOT_DIR=$(infer_root_dir)
fi
ROOT_DIR=$(expand_path "${ROOT_DIR}")

if [[ ! -d "${MC_APP_DIR}" ]]; then
  echo "mc-app not found at: ${MC_APP_DIR}" >&2
  exit 1
fi

echo "[mc] mode=${MODE} host=${HOST} port=${PORT} rootDir=${ROOT_DIR}"

export MYO_MC_ROOT_DIR="${ROOT_DIR}"

case "${MODE}" in
  dev)
    exec pnpm -C "${MC_APP_DIR}" dev --hostname "${HOST}" --port "${PORT}"
    ;;
  prod)
    if [[ "${NO_BUILD}" != "true" ]]; then
      pnpm -C "${MC_APP_DIR}" build
    fi
    exec pnpm -C "${MC_APP_DIR}" start --hostname "${HOST}" --port "${PORT}"
    ;;
  *)
    echo "Unknown mode: ${MODE}" >&2
    usage
    exit 2
    ;;
esac
