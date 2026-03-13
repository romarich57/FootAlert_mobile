#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

LOG_DIR="${READ_STORE_BACKFILL_LOG_DIR:-${PROJECT_DIR}/logs/read-store-backfill}"
RUN_DIR="${READ_STORE_BACKFILL_RUN_DIR:-${PROJECT_DIR}/.run/read-store-backfill}"
PID_FILE="${RUN_DIR}/read-store-backfill.pid"
LATEST_LOG_LINK="${RUN_DIR}/latest.log"
LATEST_META_FILE="${RUN_DIR}/latest.meta"
TAIL_LINES="${READ_STORE_BACKFILL_TAIL_LINES:-120}"

ACTION="${1:-start}"

mkdir -p "${LOG_DIR}" "${RUN_DIR}"

fail() {
  echo "$*" >&2
  exit 1
}

is_running() {
  local pid="$1"
  kill -0 "${pid}" >/dev/null 2>&1
}

read_pid() {
  if [[ ! -f "${PID_FILE}" ]]; then
    return 1
  fi

  local pid
  pid="$(tr -d '[:space:]' < "${PID_FILE}")"
  if [[ -z "${pid}" ]]; then
    return 1
  fi

  printf '%s\n' "${pid}"
}

cleanup_stale_pid() {
  if [[ -f "${PID_FILE}" ]]; then
    rm -f "${PID_FILE}"
  fi
}

print_status() {
  local pid
  if ! pid="$(read_pid)"; then
    echo "read-store backfill: stopped"
    if [[ -L "${LATEST_LOG_LINK}" || -f "${LATEST_LOG_LINK}" ]]; then
      echo "latest log: ${LATEST_LOG_LINK}"
    fi
    return 0
  fi

  if is_running "${pid}"; then
    echo "read-store backfill: running"
    echo "pid: ${pid}"
    if [[ -L "${LATEST_LOG_LINK}" || -f "${LATEST_LOG_LINK}" ]]; then
      echo "log: ${LATEST_LOG_LINK}"
    fi
    if [[ -f "${LATEST_META_FILE}" ]]; then
      echo "meta: ${LATEST_META_FILE}"
    fi
    return 0
  fi

  echo "read-store backfill: stale pid file found"
  echo "stale pid: ${pid}"
  cleanup_stale_pid
  return 1
}

start_backfill() {
  local existing_pid
  if existing_pid="$(read_pid 2>/dev/null)" && is_running "${existing_pid}"; then
    fail "read-store backfill already running with pid ${existing_pid}"
  fi
  cleanup_stale_pid

  command -v npm >/dev/null 2>&1 || fail "npm is required"
  command -v nohup >/dev/null 2>&1 || fail "nohup is required"

  local timestamp
  timestamp="$(date '+%Y%m%d-%H%M%S')"
  local log_file="${LOG_DIR}/backfill-${timestamp}.log"

  {
    echo "# read-store backfill launch"
    echo "# started_at=$(date -Is)"
    echo "# project_dir=${PROJECT_DIR}"
    echo "# log_file=${log_file}"
    echo "# env:"
    env | LC_ALL=C sort | grep '^READ_STORE_BACKFILL_' || true
    echo
  } > "${log_file}"

  (
    cd "${PROJECT_DIR}"
    nohup npm run db:backfill:read-store >> "${log_file}" 2>&1 < /dev/null &
    echo $! > "${PID_FILE}"
  )

  local pid
  pid="$(read_pid)"

  cat > "${LATEST_META_FILE}" <<EOF
started_at=$(date -Is)
pid=${pid}
log_file=${log_file}
project_dir=${PROJECT_DIR}
EOF

  ln -sfn "${log_file}" "${LATEST_LOG_LINK}"

  sleep 1

  if ! is_running "${pid}"; then
    echo "read-store backfill failed to stay alive" >&2
    echo "check log: ${log_file}" >&2
    cleanup_stale_pid
    exit 1
  fi

  echo "read-store backfill started"
  echo "pid: ${pid}"
  echo "log: ${log_file}"
  echo "tail: bash scripts/db/run-backfill-read-store-detached.sh tail"
}

stop_backfill() {
  local pid
  if ! pid="$(read_pid)"; then
    echo "read-store backfill is not running"
    return 0
  fi

  if ! is_running "${pid}"; then
    cleanup_stale_pid
    echo "read-store backfill was not running"
    return 0
  fi

  kill "${pid}"

  local waited=0
  while is_running "${pid}" && [[ "${waited}" -lt 30 ]]; do
    sleep 1
    waited=$((waited + 1))
  done

  if is_running "${pid}"; then
    fail "unable to stop read-store backfill pid ${pid}"
  fi

  cleanup_stale_pid
  echo "read-store backfill stopped"
}

tail_backfill() {
  if [[ -L "${LATEST_LOG_LINK}" || -f "${LATEST_LOG_LINK}" ]]; then
    tail -n "${TAIL_LINES}" -f "${LATEST_LOG_LINK}"
    return 0
  fi

  fail "no backfill log found"
}

case "${ACTION}" in
  start)
    start_backfill
    ;;
  status)
    print_status
    ;;
  stop)
    stop_backfill
    ;;
  tail)
    tail_backfill
    ;;
  *)
    fail "usage: $0 {start|status|tail|stop}"
    ;;
esac
