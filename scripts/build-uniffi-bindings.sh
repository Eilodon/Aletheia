#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORE_DIR="$ROOT_DIR/core"
UDL_PATH="$CORE_DIR/src/aletheia.udl"
SWIFT_OUT="$ROOT_DIR/generated/uniffi/swift"
KOTLIN_OUT="$ROOT_DIR/generated/uniffi/kotlin"
TMP_ROOT="$(mktemp -d)"
TMP_SWIFT_OUT="$TMP_ROOT/swift"
TMP_KOTLIN_OUT="$TMP_ROOT/kotlin"
UNIFFI_BINDGEN="$(bash "$ROOT_DIR/scripts/ensure-uniffi-bindgen.sh")"
INSTALLED_VERSION="$("$UNIFFI_BINDGEN" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)"

echo "Using pinned uniffi-bindgen ${INSTALLED_VERSION} at $UNIFFI_BINDGEN"

if [ ! -f "$UDL_PATH" ]; then
  echo "UDL file not found at $UDL_PATH" >&2
  exit 1
fi

rm -rf "$SWIFT_OUT" "$KOTLIN_OUT"
mkdir -p "$SWIFT_OUT" "$KOTLIN_OUT" "$TMP_SWIFT_OUT" "$TMP_KOTLIN_OUT"

(
  cd "$CORE_DIR"
  "$UNIFFI_BINDGEN" generate src/aletheia.udl --language swift --out-dir "$TMP_SWIFT_OUT"
  "$UNIFFI_BINDGEN" generate src/aletheia.udl --language kotlin --out-dir "$TMP_KOTLIN_OUT"
)

cp -R "$TMP_SWIFT_OUT"/. "$SWIFT_OUT"/
cp -R "$TMP_KOTLIN_OUT"/. "$KOTLIN_OUT"/
rm -rf "$TMP_ROOT"

echo "Generated UniFFI bindings:"
echo "  Swift  -> $SWIFT_OUT"
echo "  Kotlin -> $KOTLIN_OUT"
