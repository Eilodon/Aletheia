#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORE_DIR="$ROOT_DIR/core"
ARTIFACTS_DIR="$ROOT_DIR/artifacts/android/jniLibs"
KOTLIN_BINDINGS="$ROOT_DIR/generated/uniffi/kotlin"
ANDROID_NDK_ROOT="${ANDROID_NDK_HOME:-${ANDROID_NDK_ROOT:-${ANDROID_HOME:-}/ndk}}"

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required" >&2
  exit 1
fi

if [ ! -d "$KOTLIN_BINDINGS" ]; then
  echo "UniFFI Kotlin bindings not found at $KOTLIN_BINDINGS" >&2
  echo "Run 'bash scripts/build-uniffi-bindings.sh' first" >&2
  exit 1
fi

if ! command -v cargo-ndk >/dev/null 2>&1 && ! cargo ndk --version >/dev/null 2>&1; then
  echo "cargo-ndk is required" >&2
  exit 1
fi

if [[ -z "${ANDROID_NDK_ROOT}" || ! -d "${ANDROID_NDK_ROOT}" ]]; then
  echo "Android NDK not found. Set ANDROID_NDK_HOME or install it under \$ANDROID_HOME/ndk." >&2
  exit 1
fi

LATEST_NDK_DIR="$ANDROID_NDK_ROOT"
if [[ -d "$ANDROID_NDK_ROOT" ]]; then
  if compgen -G "$ANDROID_NDK_ROOT/*" >/dev/null 2>&1; then
    CANDIDATE="$(find "$ANDROID_NDK_ROOT" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)"
    if [[ -n "${CANDIDATE}" ]]; then
      LATEST_NDK_DIR="$CANDIDATE"
    fi
  fi
fi

export ANDROID_NDK_HOME="$LATEST_NDK_DIR"

mkdir -p "$ARTIFACTS_DIR"
rm -rf "$ARTIFACTS_DIR/arm64-v8a"

cd "$CORE_DIR"
cargo ndk -t arm64-v8a -o ../artifacts/android/jniLibs build --release

echo "Android artifacts and UniFFI bindings are ready in:"
echo "  JNI libs -> $ARTIFACTS_DIR"
echo "  Bindings -> $ROOT_DIR/generated/uniffi"
