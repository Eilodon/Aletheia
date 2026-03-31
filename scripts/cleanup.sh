#!/bin/bash
# =============================================================================
# Cleanup Script - Remove build artifacts, cache, and temporary files
# 
# Usage: 
#   ./scripts/cleanup.sh          # Interactive - ask before each action
#   ./scripts/cleanup.sh --force  # Force clean everything
#   ./scripts/cleanup.sh --dry    # Show what would be deleted
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
DRY_RUN=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --dry     Show what would be deleted without actually deleting"
      echo "  --force   Skip confirmation prompts"
      echo "  --help    Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Function to print colored output
print_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

print_danger() {
  echo -e "${RED}[DANGER]${NC} $1"
}

# Function to safely remove directory
remove_dir() {
  local dir="$1"
  local size=$(du -sh "$dir" 2>/dev/null | cut -f1 || echo "?")
  
  if [ "$DRY_RUN" = true ]; then
    print_warning "Would remove: $dir ($size)"
    return 0
  fi
  
  if [ -d "$dir" ]; then
    if [ "$FORCE" = false ]; then
      echo -n "Remove $dir ($size)? [y/N] "
      read -r response
      if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_warning "Skipped: $dir"
        return 0
      fi
    fi
    rm -rf "$dir"
    print_success "Removed: $dir"
  else
    print_status "Not found (skipping): $dir"
  fi
}

# Function to safely remove file
remove_file() {
  local file="$1"
  local size=$(du -sh "$file" 2>/dev/null | cut -f1 || echo "?")
  
  if [ "$DRY_RUN" = true ]; then
    print_warning "Would remove: $file ($size)"
    return 0
  fi
  
  if [ -f "$file" ]; then
    if [ "$FORCE" = false ]; then
      echo -n "Remove $file ($size)? [y/N] "
      read -r response
      if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_warning "Skipped: $file"
        return 0
      fi
    fi
    rm -f "$file"
    print_success "Removed: $file"
  else
    print_status "Not found (skipping): $file"
  fi
}

echo ""
echo "=============================================="
echo "         Aletheia Cleanup Script"
echo "=============================================="
echo ""

if [ "$DRY_RUN" = true ]; then
  print_warning "DRY RUN MODE - No files will be deleted"
  echo ""
fi

# -----------------------------------------------------------------------------
# Node.js / JavaScript
# -----------------------------------------------------------------------------
echo ""
echo "--- Node.js / JavaScript ---"

remove_dir "node_modules/.cache"
remove_dir ".expo"
remove_dir ".cache"
remove_dir ".parcel-cache"

# -----------------------------------------------------------------------------
# Rust / Core
# -----------------------------------------------------------------------------
echo ""
echo "--- Rust / Core ---"

remove_dir "core/target"
remove_dir "core/cpp_bindings"
remove_dir "artifacts/android"
remove_dir "modules/aletheia-core-module/.native-staging"

# -----------------------------------------------------------------------------
# TypeScript / Build / Legacy generated data
# -----------------------------------------------------------------------------
echo ""
echo "--- TypeScript / Build / Legacy generated data ---"

remove_dir "dist"
remove_dir "build"
remove_dir "web-build"
remove_dir "coverage"
remove_dir "lib/data/content"

# Remove tsbuildinfo files outside dependency/vendor trees
find . \
  -path "./node_modules" -prune -o \
  -path "./.git" -prune -o \
  -name "*.tsbuildinfo" -type f -print 2>/dev/null | while read -r file; do
  remove_file "$file"
done

# Remove eslint cache
remove_file ".eslintcache"

# -----------------------------------------------------------------------------
# Temporary files
# -----------------------------------------------------------------------------
echo ""
echo "--- Temporary Files ---"

remove_dir "tmp"
remove_dir "temp"

# Remove .tmp and .temp files outside dependency/vendor trees
find . \
  -path "./node_modules" -prune -o \
  -path "./.git" -prune -o \
  \( -name "*.tmp" -o -name "*.temp" \) -type f -print 2>/dev/null | while read -r file; do
  remove_file "$file"
done

# -----------------------------------------------------------------------------
# OS-specific
# -----------------------------------------------------------------------------
echo ""
echo "--- OS-specific ---"

# Remove .DS_Store recursively outside dependency/vendor trees
find . \
  -path "./node_modules" -prune -o \
  -path "./.git" -prune -o \
  -name ".DS_Store" -type f -print 2>/dev/null | while read -r file; do
  remove_file "$file"
done

# Remove Thumbs.db
find . \
  -path "./node_modules" -prune -o \
  -path "./.git" -prune -o \
  -name "Thumbs.db" -type f -print 2>/dev/null | while read -r file; do
  remove_file "$file"
done

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "              Cleanup Complete"
echo "=============================================="

if [ "$DRY_RUN" = true ]; then
  print_warning "This was a dry run. Run without --dry to actually delete files."
fi
