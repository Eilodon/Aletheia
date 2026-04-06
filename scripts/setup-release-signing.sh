#!/usr/bin/env bash
# Setup release signing keystore for Aletheia Android app
# Run this ONCE before your first Play Store release

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEYSTORE_DIR="$ROOT_DIR/android/app"
KEYSTORE_FILE="$KEYSTORE_DIR/aletheia-release.keystore"

# Check if keystore already exists
if [[ -f "$KEYSTORE_FILE" ]]; then
  echo "⚠️  Keystore already exists at: $KEYSTORE_FILE"
  echo "   If you need to regenerate, delete it first."
  exit 0
fi

echo "🔐 Setting up release signing for Aletheia..."
echo ""
echo "Please provide the following information for your release keystore:"
echo ""

# Collect keystore info
read -p "Your name (CN): " CN
read -p "Organization (O) [optional]: " ORG
read -p "City (L) [optional]: " CITY
read -p "State (ST) [optional]: " STATE
read -p "Country code (C) [e.g., US, VN]: " COUNTRY

# Build distinguished name
DN="CN=$CN"
[[ -n "$ORG" ]] && DN="$DN, O=$ORG"
[[ -n "$CITY" ]] && DN="$DN, L=$CITY"
[[ -n "$STATE" ]] && DN="$DN, ST=$STATE"
[[ -n "$COUNTRY" ]] && DN="$DN, C=$COUNTRY"

echo ""
echo "Distinguished Name: $DN"
echo ""

# Generate keystore
keytool -genkey -v \
  -keystore "$KEYSTORE_FILE" \
  -alias aletheia \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "$DN"

echo ""
echo "✅ Keystore created at: $KEYSTORE_FILE"
echo ""
echo "⚠️  IMPORTANT: Backup this keystore file securely!"
echo "   If lost, you CANNOT update your app on Play Store."
echo ""
echo "📝 Next steps:"
echo "   1. Create android/keystore.properties with:"
echo "      storePassword=<your-keystore-password>"
echo "      keyPassword=<your-key-password>"
echo "      storeFile=aletheia-release.keystore"
echo "      keyAlias=aletheia"
echo ""
echo "   2. Add keystore.properties to .gitignore (if not already)"
echo "   3. Run: pnpm android --variant release"
