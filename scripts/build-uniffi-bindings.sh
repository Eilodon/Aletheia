#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORE_DIR="$ROOT_DIR/core"
UDL_PATH="$CORE_DIR/src/aletheia.udl"
SWIFT_OUT="$ROOT_DIR/generated/uniffi/swift"
KOTLIN_OUT="$ROOT_DIR/generated/uniffi/kotlin"

# UniFFI bindgen CLI version MUST match the uniffi crate version in core/Cargo.toml.
# If they mismatch, generated bindings will produce runtime ABI errors.
REQUIRED_UNIFFI_VERSION="0.25"

if ! command -v uniffi-bindgen >/dev/null 2>&1; then
  echo "uniffi-bindgen is required but not installed." >&2
  echo "Install the correct version with:" >&2
  echo "  cargo install uniffi-bindgen --version ${REQUIRED_UNIFFI_VERSION}" >&2
  exit 1
fi

INSTALLED_VERSION="$(uniffi-bindgen --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)"
if [[ "$INSTALLED_VERSION" != "$REQUIRED_UNIFFI_VERSION" ]]; then
  echo "ERROR: uniffi-bindgen version mismatch." >&2
  echo "  Required: ${REQUIRED_UNIFFI_VERSION}" >&2
  echo "  Installed: ${INSTALLED_VERSION}" >&2
  echo "Fix with: cargo install uniffi-bindgen --version ${REQUIRED_UNIFFI_VERSION} --force" >&2
  exit 1
fi

echo "uniffi-bindgen ${INSTALLED_VERSION} — OK"

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
