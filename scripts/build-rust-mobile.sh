#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/scripts/build-uniffi-bindings.sh"
bash "$ROOT_DIR/scripts/build-rust-android.sh"

if [[ "$(uname -s)" == "Darwin" ]]; then
  bash "$ROOT_DIR/scripts/build-rust-ios.sh"
else
  echo "Skipping iOS artifacts because this host is not macOS."
fi
