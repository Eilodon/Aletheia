# Store Listing Draft

Last verified against repo: 2026-06-02.

## App Identity

| Field | Current Draft |
|---|---|
| App name | Aletheia - Not a fortune. A mirror. |
| Version | 1.0.0 |
| Category | Lifestyle / Health & Fitness |
| Rating target | 12+ for philosophical/religious references |

Important: production bundle/package IDs are not finalized in this doc. Current `app.config.ts` derives a `space.manus...` bundle id. Decide final production IDs before store submission.

## Short Copy

Not a fortune. A mirror. Daily philosophical reflections for clarity and contemplation.

## Long Copy

Aletheia is a daily reflection app built around wisdom texts, symbolic choice, and quiet self-inquiry.

Features:

- Choose a symbol and receive a passage from traditions such as I Ching, Tao Te Ching, Rumi, Hafez, Marcus Aurelius, and universal wisdom sources.
- Add an optional situation so the reflection can meet the moment you are in.
- Use AI interpretation when available, with clear fallback behavior when offline or unconfigured.
- Keep reading history on device.
- Receive daily reflection reminders.

Not a fortune teller. Not advice. A mirror for what is already asking to be seen.

## Conditional Claims

Only include these claims if the corresponding beta surface is actually shipped:

- Gift readings: requires deployed gift backend and passing manual gift create/redeem tests.
- Pro subscription: requires configured RevenueCat products and purchase/restore tests.
- Local AI: requires real-device Android model download and inference tests.
- Share card generation: requires end-to-end generated image test.

## Screenshot Plan

Android beta minimum:

1. Home / reading entry.
2. Situation input.
3. Symbol or wildcard selection.
4. Passage display.
5. Archive/history.

Add paywall, gift, local AI, or share-card screenshots only if those surfaces are in beta scope.

## Privacy Copy Draft

Readings are stored locally on your device. Aletheia does not require an account for the core reading flow.

If AI interpretation is requested, the passage and optional situation text may be sent to the configured AI provider or server proxy. This content is used to generate the interpretation; only claim fully offline AI if local-only mode is the shipped scope.

Anonymous analytics may be used to understand feature usage when configured. No reading content should be logged as analytics data.

## Required Before Submission

- [ ] Final support email.
- [ ] Final website URL.
- [ ] Final privacy policy URL.
- [ ] Final production bundle/package IDs.
- [ ] Confirm beta feature scope and remove unsupported claims.
