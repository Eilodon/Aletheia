#!/usr/bin/env bash
# Build internal test APK (release optimized, debug signed)
# Use this for internal testing before Play Store release

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/apk/release"
export NODE_ENV=production

echo "📱 Building internal test APK..."
echo ""

# Check if native artifacts exist
if [[ ! -f "$ROOT_DIR/artifacts/android/jniLibs/arm64-v8a/libaletheia_core.so" ]]; then
  echo "⚠️  Native library not found. Building Rust core first..."
  cd "$ROOT_DIR"
  pnpm rust:android
fi

cd "$ROOT_DIR"
pnpm uniffi:generate
pnpm native:sync

if [[ -d "$ROOT_DIR/android/app/src/main/jniLibs" ]]; then
  echo "🧹 Removing legacy app JNI libs to avoid duplicate native packaging..."
  rm -rf "$ROOT_DIR/android/app/src/main/jniLibs"
fi

# Build release APK
cd "$ANDROID_DIR"
./gradlew assembleRelease

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 APK location:"
ls -lh "$OUTPUT_DIR/app-release.apk" 2>/dev/null || echo "   $OUTPUT_DIR/app-release.apk"
echo ""
echo "📲 To install on device:"
echo "   adb install $OUTPUT_DIR/app-release.apk"
echo ""
echo "⚠️  Note: This APK is signed with debug keystore."
echo "   It can be installed on any device for testing."
echo "   For Play Store, use setup-release-signing.sh first."
