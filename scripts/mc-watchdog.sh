#!/usr/bin/env bash
set -euo pipefail

# Optional watchdog: ensure Mission Control is listening; restart if not.

usage() {
  cat <<'EOF'
Usage:
  scripts/mc-watchdog.sh dev  [--host 127.0.0.1] [--port 3333] [--root-dir <path>] [--interval 5] [--log <path>]
  scripts/mc-watchdog.sh prod [--host 127.0.0.1] [--port 3333] [--root-dir <path>] [--interval 10] [--log <path>]
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
INTERVAL="5"
LOG_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --root-dir) ROOT_DIR="$2"; shift 2 ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    --log) LOG_PATH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
PIDFILE="/tmp/mc-app-${PORT}.pid"

is_listening() {
  lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1
}

start_bg() {
  local cmd=("${REPO_DIR}/scripts/mc.sh" "${MODE}" --host "${HOST}" --port "${PORT}")
  if [[ -n "${ROOT_DIR}" ]]; then
    cmd+=(--root-dir "${ROOT_DIR}")
  fi

  if [[ -z "${LOG_PATH}" ]]; then
    LOG_PATH="/tmp/mc-app-${PORT}.log"
  fi

  echo "[mc-watchdog] starting: ${cmd[*]}"
  (nohup "${cmd[@]}" >"${LOG_PATH}" 2>&1 & echo $! >"${PIDFILE}")
  echo "[mc-watchdog] pid=$(cat "${PIDFILE}") log=${LOG_PATH}"
}

echo "[mc-watchdog] mode=${MODE} host=${HOST} port=${PORT} interval=${INTERVAL}s pidfile=${PIDFILE}"

while true; do
  if is_listening; then
    sleep "${INTERVAL}"
    continue
  fi

  if [[ -f "${PIDFILE}" ]]; then
    OLD_PID=$(cat "${PIDFILE}" || true)
    if [[ -n "${OLD_PID}" ]] && kill -0 "${OLD_PID}" >/dev/null 2>&1; then
      echo "[mc-watchdog] process ${OLD_PID} exists but port not listening; killing"
      kill "${OLD_PID}" >/dev/null 2>&1 || true
      sleep 1
    fi
    rm -f "${PIDFILE}" || true
  fi

  start_bg
  sleep "${INTERVAL}"
done
