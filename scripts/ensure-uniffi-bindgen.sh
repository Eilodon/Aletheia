#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORE_CARGO_TOML="$ROOT_DIR/core/Cargo.toml"
CORE_CARGO_LOCK="$ROOT_DIR/core/Cargo.lock"

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required to build the pinned UniFFI CLI." >&2
  exit 1
fi

REQUIRED_UNIFFI_VERSION="$(
  sed -n 's/^uniffi = "\(.*\)"/\1/p' "$CORE_CARGO_TOML" | head -n 1
)"

if [[ -z "$REQUIRED_UNIFFI_VERSION" ]]; then
  echo "Could not determine UniFFI version from $CORE_CARGO_TOML" >&2
  exit 1
fi

LOCKED_UNIFFI_VERSION=""
if [[ -f "$CORE_CARGO_LOCK" ]]; then
  LOCKED_UNIFFI_VERSION="$(
    awk '
      $0 == "name = \"uniffi\"" {
        getline
        if ($1 == "version") {
          gsub(/"/, "", $3)
          print $3
          exit
        }
      }
    ' "$CORE_CARGO_LOCK"
  )"
fi

PINNED_UNIFFI_VERSION="${LOCKED_UNIFFI_VERSION:-$REQUIRED_UNIFFI_VERSION}"
TOOLS_ROOT="$ROOT_DIR/.tools/uniffi-bindgen/$REQUIRED_UNIFFI_VERSION"
WRAPPER_DIR="$TOOLS_ROOT/wrapper"
SRC_DIR="$WRAPPER_DIR/src"
UNIFFI_BINDGEN_BIN="$WRAPPER_DIR/target/release/uniffi-bindgen"

INSTALLED_VERSION=""
if [[ -x "$UNIFFI_BINDGEN_BIN" ]]; then
  INSTALLED_VERSION="$("$UNIFFI_BINDGEN_BIN" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n 1 || true)"
fi

if [[ "$INSTALLED_VERSION" != "$PINNED_UNIFFI_VERSION" ]]; then
  echo "Building pinned uniffi-bindgen ${PINNED_UNIFFI_VERSION} in $WRAPPER_DIR" >&2
  rm -rf "$WRAPPER_DIR"
  mkdir -p "$SRC_DIR"

  cat > "$WRAPPER_DIR/Cargo.toml" <<EOF
[package]
name = "aletheia-uniffi-bindgen"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "uniffi-bindgen"
path = "src/main.rs"

[dependencies]
uniffi = { version = "=${PINNED_UNIFFI_VERSION}", features = ["cli"] }
EOF

  cat > "$SRC_DIR/main.rs" <<'EOF'
fn main() {
    uniffi::uniffi_bindgen_main();
}
EOF

  cargo build --manifest-path "$WRAPPER_DIR/Cargo.toml" --release
fi

printf '%s\n' "$UNIFFI_BINDGEN_BIN"
