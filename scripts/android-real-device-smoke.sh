#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID="space.manus.aletheia.app.t20260318170859"
ACTIVITY="$APP_ID/.MainActivity"
if [[ "${1:-}" == "--" ]]; then
  shift
fi

DEVICE_ID="${1:-}"

if [[ -z "$DEVICE_ID" ]]; then
  echo "Usage: $0 <adb-serial>"
  exit 1
fi

export PATH="$PATH:$HOME/.maestro/bin"
export MAESTRO_CLI_NO_ANALYTICS=1

adb -s "$DEVICE_ID" shell input keyevent KEYCODE_WAKEUP || true
adb -s "$DEVICE_ID" shell wm dismiss-keyguard || true
adb -s "$DEVICE_ID" shell pm clear "$APP_ID"
adb -s "$DEVICE_ID" shell am start -W -n "$ACTIVITY"
sleep 4
adb -s "$DEVICE_ID" shell wm dismiss-keyguard || true
maestro test --udid "$DEVICE_ID" "$ROOT_DIR/.maestro/smoke-test-active-app.yaml"
