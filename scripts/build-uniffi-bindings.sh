#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORE_DIR="$ROOT_DIR/core"
UDL_PATH="$CORE_DIR/src/aletheia.udl"
SWIFT_OUT="$ROOT_DIR/generated/uniffi/swift"
KOTLIN_OUT="$ROOT_DIR/generated/uniffi/kotlin"

if ! command -v uniffi-bindgen >/dev/null 2>&1; then
  echo "uniffi-bindgen is required but not installed." >&2
  exit 1
fi

if [ ! -f "$UDL_PATH" ]; then
  echo "UDL file not found at $UDL_PATH" >&2
  exit 1
fi

mkdir -p "$SWIFT_OUT" "$KOTLIN_OUT"

(
  cd "$CORE_DIR"
  uniffi-bindgen generate src/aletheia.udl --language swift --out-dir "$SWIFT_OUT"
  uniffi-bindgen generate src/aletheia.udl --language kotlin --out-dir "$KOTLIN_OUT"
)

echo "Generated UniFFI bindings:"
echo "  Swift  -> $SWIFT_OUT"
echo "  Kotlin -> $KOTLIN_OUT"
