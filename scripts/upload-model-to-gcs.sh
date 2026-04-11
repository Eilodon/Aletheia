#!/bin/bash
# Upload Gemma 3n E2B model to Google Cloud Storage
# 
# Prerequisites:
# 1. Google Cloud SDK installed: https://cloud.google.com/sdk/docs/install
# 2. Authenticated: gcloud auth login
# 3. Project set: gcloud config set project YOUR_PROJECT_ID
# 4. Model file downloaded from Google AI Edge or converted from HuggingFace
#
# Usage:
#   ./upload-model-to-gcs.sh /path/to/gemma-3n-e2b.task

set -e

# Configuration
GCS_BUCKET="gs://aletheia-models"
MODEL_NAME="gemma-3n-e2b"
MODEL_DIR="${GCS_BUCKET}/${MODEL_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check arguments
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <path-to-model-file> [version]"
    echo ""
    echo "Example:"
    echo "  $0 ./gemma-3n-e2b.task 1.0.0"
    exit 1
fi

MODEL_FILE="$1"
VERSION="${2:-1.0.0}"

# Validate model file exists
if [ ! -f "$MODEL_FILE" ]; then
    log_error "Model file not found: $MODEL_FILE"
    exit 1
fi

MODEL_SIZE=$(stat -c%s "$MODEL_FILE" 2>/dev/null || stat -f%z "$MODEL_FILE")
MODEL_SIZE_GB=$(echo "scale=2; $MODEL_SIZE / 1024 / 1024 / 1024" | bc)

log_info "Model file: $MODEL_FILE"
log_info "Model size: ${MODEL_SIZE_GB} GB"
log_info "Version: $VERSION"

# Check gcloud is installed
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
fi

# Check gsutil is available
if ! command -v gsutil &> /dev/null; then
    log_error "gsutil not found. Please install Google Cloud SDK."
    exit 1
fi

log_info "Checking GCS bucket access..."

# Create bucket if it doesn't exist (will fail if no permission)
if ! gsutil ls "$GCS_BUCKET" &> /dev/null; then
    log_warn "Bucket doesn't exist or no access. Attempting to create..."
    gsutil mb -l us-central1 "$GCS_BUCKET" || {
        log_error "Failed to create bucket. Check permissions."
        exit 1
    }
fi

log_info "Creating model directory structure..."

# Create version.json
VERSION_FILE=$(mktemp)
cat > "$VERSION_FILE" << EOF
{
  "version": "$VERSION",
  "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "checksum": "",
  "sizeBytes": $MODEL_SIZE,
  "minAppVersion": "1.0.0",
  "changelog": "Initial release of Gemma 3n E2B for Aletheia"
}
EOF

# Calculate checksum
log_info "Calculating SHA256 checksum (this may take a while for large files)..."
CHECKSUM=$(sha256sum "$MODEL_FILE" | cut -d' ' -f1)
echo "$CHECKSUM  $(basename $MODEL_FILE)" > "${VERSION_FILE}.sha256"

# Update version.json with checksum
sed -i "s/\"checksum\": \"\"/\"checksum\": \"$CHECKSUM\"/" "$VERSION_FILE" 2>/dev/null || \
    sed -i '' "s/\"checksum\": \"\"/\"checksum\": \"$CHECKSUM\"/" "$VERSION_FILE"

log_info "Uploading model file to GCS..."
log_warn "This may take a while for large files (${MODEL_SIZE_GB} GB)..."

# Upload model file with parallel composite uploads for large files
if [ "$MODEL_SIZE" -gt 1073741824 ]; then
    # Use parallel composite uploads for files > 1GB
    gsutil -o GSUtil:parallel_composite_upload_threshold=150M \
           -o GSUtil:parallel_composite_upload_component_size=50M \
           cp "$MODEL_FILE" "${MODEL_DIR}/$(basename $MODEL_FILE)"
else
    gsutil cp "$MODEL_FILE" "${MODEL_DIR}/$(basename $MODEL_FILE)"
fi

log_info "Uploading version.json..."
gsutil cp "$VERSION_FILE" "${MODEL_DIR}/version.json"

log_info "Uploading checksum..."
gsutil cp "${VERSION_FILE}.sha256" "${MODEL_DIR}/checksum.sha256"

# Set public read access (optional - remove if using signed URLs)
log_info "Setting public read access..."
gsutil iam ch allUsers:objectViewer "$GCS_BUCKET" 2>/dev/null || {
    log_warn "Could not set public access. Using signed URLs instead."
}

# Set cache control for better performance
log_info "Setting cache control..."
gsutil setmeta -h "Cache-Control:public, max-age=31536000" "${MODEL_DIR}/*" 2>/dev/null || true

# Cleanup temp files
rm -f "$VERSION_FILE" "${VERSION_FILE}.sha256"

log_info "Upload complete!"
echo ""
echo "Model URLs:"
echo "  Model:     ${MODEL_DIR}/$(basename $MODEL_FILE)"
echo "  Version:   ${MODEL_DIR}/version.json"
echo "  Checksum:  ${MODEL_DIR}/checksum.sha256"
echo ""
echo "Public URLs (if public access enabled):"
echo "  Model:     https://storage.googleapis.com/aletheia-models/${MODEL_NAME}/$(basename $MODEL_FILE)"
echo "  Version:   https://storage.googleapis.com/aletheia-models/${MODEL_NAME}/version.json"
echo ""
echo "Checksum: $CHECKSUM"
