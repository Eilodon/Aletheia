#!/bin/bash
# Bundle model into Android assets
# This copies a quantized model to the app's assets folder for offline-first experience
#
# Usage:
#   ./scripts/bundle-model-to-assets.sh /path/to/gemma-3n-e2b-q4.task
#
# Note: This will increase APK size by the model size (~250MB for INT4)
# For Google Play, consider using Dynamic Feature Modules instead

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check arguments
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <path-to-model-file>"
    echo ""
    echo "Example:"
    echo "  $0 ./gemma-3n-e2b-q4_k_m.task"
    exit 1
fi

MODEL_FILE="$1"

if [ ! -f "$MODEL_FILE" ]; then
    log_error "Model file not found: $MODEL_FILE"
    exit 1
fi

MODEL_SIZE=$(stat -c%s "$MODEL_FILE" 2>/dev/null || stat -f%z "$MODEL_FILE")
MODEL_SIZE_MB=$(echo "scale=0; $MODEL_SIZE / 1024 / 1024" | bc)

log_info "Model file: $MODEL_FILE"
log_info "Model size: ${MODEL_SIZE_MB} MB"

# Create assets directory
ASSETS_DIR="modules/aletheia-core-module/android/src/main/assets/models"
mkdir -p "$ASSETS_DIR"

# Copy model to assets
log_info "Copying model to assets..."
cp "$MODEL_FILE" "$ASSETS_DIR/gemma-3n-e2b.task"

# Create version file
echo "1.0.0-bundled" > "$ASSETS_DIR/version.txt"

# Calculate checksum
log_info "Calculating checksum..."
CHECKSUM=$(sha256sum "$MODEL_FILE" | cut -d' ' -f1)
echo "$CHECKSUM  gemma-3n-e2b.task" > "$ASSETS_DIR/checksum.sha256"

log_info "Model bundled successfully!"
echo ""
echo "Assets location: $ASSETS_DIR"
echo "  - gemma-3n-e2b.task (${MODEL_SIZE_MB} MB)"
echo "  - version.txt"
echo "  - checksum.sha256"
echo ""
log_warn "Note: APK size will increase by ~${MODEL_SIZE_MB} MB"
log_warn "For Google Play, consider using Play Asset Delivery or Dynamic Feature Modules"
