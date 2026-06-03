/**
 * Aletheia — Animation & Style Constants (v7)
 *
 * Single source of truth for all timing, easing, and style tokens.
 * ADR-V7: Standardized motion language across all screens.
 *
 * Usage:
 *   import { DURATION, EASING, STYLES } from '@/lib/constants/animation';
 */

import { Easing } from 'react-native-reanimated';

// ─── Durations (ms) ──────────────────────────────────────────────────────────

export const DURATION = {
  instant: 100,
  fast:    200,
  normal:  300,
  slow:    500,
  slower:  700,  // entrance transitions
  ritual:  800,  // ritual reveal (GatewayReveal returning user)
  gateway: 3500, // first-launch ceremony full sequence
  beat:    4000, // silence beat after reading completion
} as const;

// ─── Easing presets ───────────────────────────────────────────────────────────

export const EASING = {
  /** Primary — soft landing. Use for most entrances. */
  spring:  Easing.bezier(0.22, 1,    0.36, 1),
  /** Standard ease-out — exits and confirmations. */
  easeOut: Easing.bezier(0,    0,    0.2,  1),
  /** Standard ease-in — when something leaves the screen. */
  easeIn:  Easing.bezier(0.4,  0,    1,    1),
  /** Card reveal — from Remix audit, ideal for wildcard unveil. */
  reveal:  Easing.bezier(0.16, 1,    0.3,  1),
  /** Spring with tiny overshoot — for selection feedback. */
  settle:  Easing.bezier(0.34, 1.56, 0.64, 1),
} as const;

// ─── Semantic motion patterns (docs) ─────────────────────────────────────────
//
//  entrance   → DURATION.slower, EASING.spring,  Y: 16→0, opacity: 0→1
//  reveal     → DURATION.ritual,  EASING.reveal,  scale: 0.94→1, opacity: 0→1
//  selection  → DURATION.fast,    EASING.settle,  scale: 1→1.02→1
//  confirm    → DURATION.normal,  EASING.easeOut + Haptics.Medium
//  fade-out   → DURATION.slow,    EASING.easeIn,  opacity → 0
//  completion → DURATION.beat (silence) then navigate

// ─── Legacy compat (keep until callers migrated) ──────────────────────────────

export const ANIMATIONS = {
  fast:   DURATION.fast,
  normal: DURATION.normal,
  slow:   DURATION.slow,
  spring: { damping: 15, stiffness: 150, speed: 50, bounciness: 8 },
} as const;

export const EASINGS = {
  easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
  easeOut:   'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring:    'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

export const STYLES = {
  borderRadius: {
    sm:  8,
    md:  12,
    lg:  16,
    xl:  24,
    xxl: 32,
    full: 9999,
  },
  spacing: {
    xs:  4,
    sm:  8,
    md:  12,
    lg:  16,
    xl:  24,
    xxl: 32,
  },
} as const;
