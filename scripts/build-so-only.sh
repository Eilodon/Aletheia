#!/usr/bin/env bash
# build-so-only.sh — v7
# Builds ONLY the Rust .so (arm64-v8a). Does NOT regenerate UniFFI bindings.
# uniffi-bindings job handles binding generation separately.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ARTIFACTS_DIR="$ROOT_DIR/artifacts/android"

echo "🦀 Building Rust Android .so (arm64-v8a only)…"

mkdir -p "$ARTIFACTS_DIR/jniLibs/arm64-v8a"

cd "$ROOT_DIR/core"

cargo ndk \
  -t arm64-v8a \
  -o "$ARTIFACTS_DIR/jniLibs" \
  build --release

echo "✅ .so built: $(find "$ARTIFACTS_DIR" -name "*.so" | head -1)"
