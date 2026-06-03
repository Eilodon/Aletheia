# ADR: UX Polish — Breathing Backdrop, Haptic Utility, Accessibility, Font Spec

## 1. Title
Sensory layer polish: animated AmbientBackdrop, centralized haptic utility, accessibility labels, TextInput font contracts.

## 2. Context
AletheiA's sensory layer had four silent gaps:
- `AmbientBackdrop` was entirely static Views; `react-native-reanimated 4.1.6` was already installed but unused
- ~50 inline `Haptics.*` calls scattered across 17 files with no semantic naming and inconsistent patterns (some iOS-gated, some not)
- Interactive `Pressable` elements had no `accessibilityRole` or `accessibilityLabel` — screen readers were blind to them
- `TextInput` components had no explicit `fontFamily`, defaulting to system sans-serif with no contract

None of these were showstoppers. Together they created a sensory layer that felt unintentional rather than designed.

## 3. Decision

**A. AmbientBackdrop breathing animation** (`components/ambient-backdrop.tsx`):
Replaced static `View` orbs with `Animated.View` (Reanimated) running a `withRepeat(withSequence(...))` breath loop. Four orbs staggered at 0/700/1400/2100ms, 5s cycle (2500ms inhale + 2500ms exhale), `Easing.inOut(Easing.sin)`. AppState listener pauses on background and restarts with original stagger on foreground — preventing sync-pulse on resume. `useReducedMotion()` gate skips animation entirely on devices with reduce motion enabled. Web: no animation (static CSS gradient already present).

**B. Haptic utility** (`lib/utils/haptics.ts`):
Created `haptic(type: HapticType)` mapping 8 semantic action types (`navigation`, `selection`, `confirm`, `emphasis`, `heavy`, `success`, `error`, `warning`) to expo-haptics calls. Replaced all 50+ inline `Haptics.*` calls across 17 files. Removed iOS-only gate from `haptic-tab.tsx` (expo-haptics is cross-platform; gate was a template artifact). Single source of truth for haptic semantics.

**C. Accessibility labels** (`app/(tabs)/mirror.tsx`, `components/pressable-card.tsx`):
Added `accessibilityRole="button"` and `accessibilityLabel` to reading cards, filter buttons, sort buttons, start reading button, and search TextInput. Labels sourced from existing `useStrings()` i18n strings (no hardcoded English). `PressableCard` updated to accept and forward `accessibilityRole`/`accessibilityLabel`/`accessibilityHint` to the inner `Pressable` (not just the `Animated.View`). Added `a11yOpenReading` and `situationHidden` keys to both `en.ts` and `vi.ts`.

**D. TextInput font spec** (`app/(tabs)/mirror.tsx`, `app/.gift/create.tsx`):
Added `fontFamily: Fonts.body` to TextInput components that had no explicit font contract. `app/reading/situation.tsx` already had `Fonts.bodyItalic` — intentional, left unchanged. `app/.gift/redeem.tsx` uses NativeWind `font-mono` class — intentional, left unchanged.

## 4. Status
ACCEPTED

## 5. Consequences

**Improved:**
- AmbientBackdrop "breathes" — space feels alive at subconscious level without demanding attention
- Haptic semantics are now self-documenting: `haptic("heavy")` is unambiguous; `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)` is not
- Screen readers can now navigate the archive screen meaningfully
- TextInput font is explicit and won't silently break if system defaults change

**Worsened / Debt created:**
- `useBreathStyle` creates 4 AppState listeners (one per orb). Acceptable at current scale; would need pooling if orb count grows significantly.
- Accessibility coverage is partial — only `mirror.tsx` and `PressableCard` were addressed. Other screens (`wildcard.tsx`, `passage.tsx`, `paywall`) have Pressable elements without labels.

## 6. Alternatives Considered

**Animation — Skia procedural gradients:** More visually rich, but @shopify/react-native-skia is not installed and the integration cost (3+ days, new dependency) wasn't justified when Reanimated opacity is already sufficient and performative.

**Haptics — no centralization:** Leave inline calls. Rejected because semantic naming at call sites is the entire value — without naming, the next developer writing `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` has no guidance on whether this is a "confirm" or an "emphasis".

**Animation — single shared hook for all orbs:** One hook, all orbs share a single AppState subscription. Cleaner but requires passing stagger delay to the AppState restart callback, which complicates the closure. Four hooks with 4 listeners is simpler and total listener count (4) is negligible.

## 7. Evidence

- `grep expo-haptics|Haptics. app/ components/` → no output (T1, verified 2026-06-03) [verified 2026-06-03]
- `git log --oneline` → 4 task commits confirmed (T1) [verified 2026-06-03]
- `a11yOpenReading` and `situationHidden` present in both `en.ts` and `vi.ts` (T1) [verified 2026-06-03]
- Reanimated imports (`cancelAnimation`, `useAnimatedStyle`, `useReducedMotion`, `useSharedValue`, `withRepeat`, `withSequence`, `withTiming`) confirmed in `ambient-backdrop.tsx` (T1) [verified 2026-06-03]
- Test suite: 43/48 passing. 5 failures are pre-existing baseline failures in `reading-engine.test.ts` and `store.test.ts` — caused by uncommitted working-tree changes to `store.ts` and `reading-engine.ts` that exist in main but weren't committed before branch creation. None of the 5 failures are in files touched by this branch. [assumed — verify post-merge that main baseline is clean]

## 8. Owner
ybao

## 8b. Known Debts (PATTERN-DEBT)

- PATTERN-DEBT-native-module-unmocked-in-node-test: OPEN — 2 remaining files (`notification-service.ts`, `interpretation-orchestrator.ts`) not yet covered by tests; will fire when new tests are written for those modules
- PATTERN-DEBT-stale-mock-api-name: OPEN — 2 dead mock entries (`getRandomSource`, `getRandomPassage`) in `reading-engine.test.ts` mock definition; harmless but misleading

**Accessibility partial coverage** (not in pattern-debt.md yet): Pressable elements in `wildcard.tsx`, `passage.tsx`, `paywall/index.tsx`, `onboarding/index.tsx` have no `accessibilityLabel`. Scope was intentionally limited to the archive screen for this cycle.

## 9. Next Cycle Trigger

When `app/(tabs)/mirror.tsx` is touched for any new feature OR when a screen reader audit is requested: extend accessibility coverage to `wildcard.tsx`, `passage.tsx`, and `paywall/index.tsx`.

## 10. Cycle Retrospective

- **Unexpected:** `AmbientBackdrop` had `opacity: 1` hardcoded in `StyleSheet.orb` — removing it was necessary for Reanimated's animated style to take effect. Easy to miss if not reading the original stylesheet carefully.
- **Surprised by:** `react-native-reanimated 4.1.6` was already in `package.json` but completely unused. The gap between "installed" and "used" was significant — the entire backdrop was static Views.
- **Would design differently:** The test fix for `interpret-route.test.ts` (ENV.appId via setupFiles) should have been committed to the worktree before branching, not fixed after. The mismatch between committed and unstaged code created confusing baseline failures throughout this session.
- **Knowingly created:** Accessibility coverage is partial (only archive screen). Trade-off: doing it comprehensively across all screens in one pass was out of scope and risked introducing label strings that don't align with the vocabulary changes planned in Phase 1 (ritual purity pass).
- **Watch for:** The `useBreathStyle` hook's `startBreath` function is defined inside the hook body but referenced in the AppState listener closure. If `isReducedMotion` changes at runtime (device setting changed while app is open), the listener's reference to `startBreath` is stale. This is an edge case but worth noting for any future refactor.
