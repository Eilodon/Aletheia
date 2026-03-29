#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORE_DIR="$ROOT_DIR/core"
SWIFT_BINDINGS_DIR="$ROOT_DIR/generated/uniffi/swift"
ARTIFACTS_DIR="$ROOT_DIR/artifacts/ios"
HEADERS_DIR="$ARTIFACTS_DIR/headers"
DEVICE_TARGET="aarch64-apple-ios"
SIM_TARGET="aarch64-apple-ios-sim"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "iOS artifacts must be built on macOS." >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required to create the xcframework." >&2
  exit 1
fi

if [[ ! -f "$SWIFT_BINDINGS_DIR/aletheiaFFI.h" || ! -f "$SWIFT_BINDINGS_DIR/aletheiaFFI.modulemap" ]]; then
  echo "Run scripts/build-uniffi-bindings.sh first to generate Swift bindings." >&2
  exit 1
fi

rustup target add "$DEVICE_TARGET" "$SIM_TARGET"

mkdir -p "$HEADERS_DIR"
rm -rf "$ARTIFACTS_DIR/AletheiaCore.xcframework"

cp "$SWIFT_BINDINGS_DIR/aletheiaFFI.h" "$HEADERS_DIR/"
cp "$SWIFT_BINDINGS_DIR/aletheiaFFI.modulemap" "$HEADERS_DIR/module.modulemap"
cp "$SWIFT_BINDINGS_DIR/aletheia.swift" "$ARTIFACTS_DIR/aletheia.swift"

cd "$CORE_DIR"
cargo build --release --target "$DEVICE_TARGET"
cargo build --release --target "$SIM_TARGET"

xcodebuild -create-xcframework \
  -library "$CORE_DIR/target/$DEVICE_TARGET/release/libaletheia_core.a" \
  -headers "$HEADERS_DIR" \
  -library "$CORE_DIR/target/$SIM_TARGET/release/libaletheia_core.a" \
  -headers "$HEADERS_DIR" \
  -output "$ARTIFACTS_DIR/AletheiaCore.xcframework"

echo "iOS artifacts ready in $ARTIFACTS_DIR"
