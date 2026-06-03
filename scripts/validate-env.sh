#!/usr/bin/env bash
# validate-env.sh — ADR-AL-56 (VHEATM Cycle 5)
#
# Validates that all required environment variables are present before
# EAS build or server start. Exits 1 on first missing variable.
#
# Usage:
#   bash scripts/validate-env.sh              # check all required
#   bash scripts/validate-env.sh --server     # check server-only vars
#   bash scripts/validate-env.sh --ci         # lightweight CI check
set -euo pipefail

MODE="${1:-}"

# Auto-source .env from project root for local/default checks.
# CI mode uses the workflow environment as source of truth.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ "$MODE" != "--ci" && -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_ROOT/.env"
  set +a
fi

ERRORS=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_var() {
    local name="$1"
    local val="${!name:-}"
    if [[ -z "$val" || "$val" == placeholder* ]]; then
        echo -e "${RED}✗ MISSING${NC}: $name"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓${NC}: $name"
    fi
}

warn_var() {
    local name="$1"
    local val="${!name:-}"
    if [[ -z "$val" || "$val" == placeholder* ]]; then
        echo -e "${YELLOW}⚠ OPTIONAL MISSING${NC}: $name (non-blocking)"
    else
        echo -e "${GREEN}✓${NC}: $name"
    fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Aletheia — Environment Validation"
echo "  Mode: ${MODE:-default}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Required: EAS + App config ───────────────────────────────────────────────
if [[ "$MODE" != "--server" ]]; then
    echo "▶ EAS / App config:"
    check_var EXPO_PUBLIC_EAS_PROJECT_ID
    warn_var  EXPO_PUBLIC_OWNER_NAME
    echo ""
fi

# ── Required: Server ─────────────────────────────────────────────────────────
if [[ "$MODE" != "--ci" ]]; then
    echo "▶ Server / Auth:"
    check_var JWT_SECRET
    warn_var  EXPO_PUBLIC_API_BASE_URL
    warn_var  EXPO_PUBLIC_SENTRY_DSN
    echo ""
fi

# ── AI providers (at least one required for AI features) ─────────────────────
if [[ "$MODE" != "--ci" ]]; then
    echo "▶ AI Providers (at least one required):"
    CLAUDE_KEY="${ALETHEIA_CLAUDE_API_KEY:-}"
    OPENAI_KEY="${ALETHEIA_OPENAI_API_KEY:-}"
    GEMINI_KEY="${ALETHEIA_GEMINI_API_KEY:-}"

    warn_var ALETHEIA_CLAUDE_API_KEY
    warn_var ALETHEIA_OPENAI_API_KEY
    warn_var ALETHEIA_GEMINI_API_KEY

    if [[ -z "$CLAUDE_KEY" && -z "$OPENAI_KEY" && -z "$GEMINI_KEY" ]]; then
        echo -e "${RED}✗ ERROR${NC}: At least one AI provider key is required"
        ERRORS=$((ERRORS + 1))
    fi
    echo ""
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$ERRORS" -eq 0 ]]; then
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo -e "${RED}✗ $ERRORS required variable(s) missing${NC}"
    echo ""
    echo "  To fix: copy .env.example → .env and fill in values"
    echo "  For EAS project ID: run  npx eas project:init"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi
