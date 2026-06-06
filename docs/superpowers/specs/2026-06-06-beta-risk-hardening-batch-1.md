---
title: Beta Risk Hardening Batch 1
date: 2026-06-06
author: Codex
SPEC_APPROVED: true
SPEC_ESCALATION: false
ESCALATION_FINDING: ""
---

# Beta Risk Hardening Batch 1

## Scope

This batch closes local, testable P1 privacy and security risks before wider backend or purchase work.

Included:
- Notification privacy mode: `full_text`, `discreet`, `off`.
- User settings and scheduling behavior for daily and weekly local notifications.
- Sentry event scrubber for private reading, AI, gift, token, and provider-error data.
- Gift token log redaction in Rust.
- Documentation status normalization for already-resolved P0 items and still-open P1 items.

Deferred:
- InsForge gift backend security contract and deployment.
- Full SQLite search API.
- Purchase receipt and entitlement schema.
- Signed model manifest and download resume policy.
- Streaming sentence safety gate and larger AI eval harness.

## Acceptance Criteria

- A user can choose notification privacy from Settings.
- `off` cancels daily and weekly notification schedules and persists user state.
- `discreet` schedules lock-screen-safe generic copy for daily and weekly notifications.
- `full_text` preserves current passage/snippet behavior.
- Sentry `beforeSend` removes sensitive keys and obvious secrets recursively from event extras, request data, breadcrumbs, and messages.
- Rust gift logs never print raw gift tokens.
- Tests fail before implementation and pass after implementation.

## Environment Preconditions

- No real InsForge credentials or backend calls are needed in this batch.
- Expo local notification runtime behavior still requires release-device validation later.
- Existing generated `lib/types.ts` must be updated only through `pnpm types:sync` after Rust contracts change.

## Risk Assessment (audit-design)
<!-- audit-design: DO NOT DUPLICATE — update this section, do not append a second one -->
<!-- last-run: 2026-06-06 | trigger: NORMAL | ESCALATION -->

**Tier:** 2 | **Date:** 2026-06-06

### Failure Modes
1. Notification privacy state persists in TS but not Rust/UserState — HIGH — mitigation in plan: YES.
2. Daily notifications become discreet but weekly summary still leaks passage snippets — HIGH — mitigation in plan: YES.
3. Sentry scrubs only shallow event fields while sensitive data survives in nested `extra`, breadcrumbs, or provider errors — HIGH — mitigation in plan: YES.

### Layer Signals
- L1 Logic: `off` must cancel both daily and weekly schedules, not only disable one toggle.
- L2 Concurrency: scheduling can run from Settings and startup; service APIs must accept explicit privacy mode and default safely.
- L3 Data: `UserState` schema needs a default `NotificationPrivacy.FullText` for existing users.
- L4 Integration: Expo lock-screen behavior still needs release-device validation after code-level privacy controls.
- L5 Security: gift token log redaction must cover create and redeem paths.
- L6 Observability: tests must assert scrubbed Sentry events rather than relying on comments.
- L7 Cross-cutting: privacy copy must match implementation; docs update is part of the deliverable.

### Assumptions to Verify
- ASSUMED: Existing users can read older `user_state` rows after adding `notification_privacy`.
- ASSUMED: Settings is the only user-facing control surface needed in this batch.
- ASSUMED: Release-device notification runtime behavior is outside this batch and remains a beta evidence task.

### Abductive Hypotheses
- A correct discreet daily implementation and correct weekly implementation can still leak if startup reschedules with the old default.
- A redacted Sentry event can still leak through stringified provider error messages if scrubber only masks object keys.

### Gate Result
PASS WITH FLAGS — proceed; implementation must include migration defaults, both notification paths, recursive scrubber tests, and release-device follow-up documentation.
