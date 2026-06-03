# UX Polish — Breathing Backdrop, Haptic Utility, Accessibility, Font Spec

> **For agentic workers:** Use `executing-plans` to implement task-by-task.

**Goal:** Polish AletheiA's sensory layer — living backdrop, consistent haptics, accessible interactions, explicit font contracts — without adding dependencies or changing layout.
**Architecture:** 4 independent improvements in order D→B→C→A. Each commit is self-contained and shippable.
**Tech Stack:** React Native, Reanimated 4.1.6 (already installed), expo-haptics, NativeWind
**Audit Gate:** PASS WITH FLAGS
**Risk Flags:** Task B (50+ call sites), Task A (infinite animation + AppState + reduceMotion)

---

## Task D: TextInput Font Spec

**Files:**
- Modify: `app/(tabs)/mirror.tsx:251`
- Modify: `app/reading/situation.tsx:115–130`
- Modify: `app/.gift/create.tsx:275–284`
- No test needed — TypeScript will catch missing Fonts import; verify no crash on run.

### Context
4 TextInput sites found. `redeem.tsx:221` uses `font-mono` via NativeWind className — intentional, skip. The other 3 have inline styles with no `fontFamily`.

- [ ] **Step 1: Add `fontFamily` to mirror.tsx TextInput**

In `app/(tabs)/mirror.tsx` line ~251, update the `style` prop:
```tsx
// Before:
style={{ color: colors.foreground, paddingVertical: 12, fontSize: 14 }}

// After:
style={{ color: colors.foreground, paddingVertical: 12, fontSize: 14, fontFamily: Fonts.body }}
```
`Fonts` is already imported from `@/constants/theme` at line 13.

- [ ] **Step 2: Add `fontFamily` to situation.tsx TextInput**

In `app/reading/situation.tsx` around line 115, the `<TextInput>` already has `accessibilityLabel`. Add `fontFamily` to its `style` prop. Check current style first — if it uses a `StyleSheet`, add `fontFamily: Fonts.body` to that stylesheet entry. If inline, add the prop.

- [ ] **Step 3: Add `fontFamily` to gift/create.tsx TextInput**

In `app/.gift/create.tsx` line ~282, the TextInput uses `className="bg-muted/20 rounded-xl p-4 text-base text-foreground"` — NativeWind doesn't set `fontFamily`. Add:
```tsx
style={{ fontFamily: Fonts.body }}
```
Verify `Fonts` is imported (add `import { Fonts } from '@/constants/theme';` if not).

- [ ] **Step 4: Commit**
```
git commit -m "fix(typography): explicit fontFamily on all TextInput components"
```

---

## Task B: Centralize Haptic Utility

**Files:**
- Create: `lib/utils/haptics.ts`
- Modify: `components/haptic-tab.tsx`
- Modify: `components/pressable-card.tsx`
- Modify: `components/gateway-reveal.tsx`
- Modify: `app/(tabs)/mirror.tsx`
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/reading/situation.tsx`
- Modify: `app/reading/passage.tsx`
- Modify: `app/reading/wildcard.tsx`
- Modify: `app/reading/ritual.tsx`
- Modify: `app/reading/share-card.tsx`
- Modify: `app/reading/ai-streaming.tsx`
- Modify: `app/reading/[id].tsx`
- Modify: `app/.paywall/index.tsx`
- Modify: `app/onboarding/index.tsx`
- Modify: `app/.gift/create.tsx`
- Modify: `app/.gift/redeem.tsx`

### Action-Type Map (source of truth)

| Type | Haptic | Semantic meaning |
|---|---|---|
| `navigation` | ImpactFeedbackStyle.Light | Tab press, card open, back, basic nav |
| `selection` | ImpactFeedbackStyle.Light | Filter toggle, sort toggle, option pick |
| `confirm` | ImpactFeedbackStyle.Medium | Submit, proceed, save |
| `emphasis` | ImpactFeedbackStyle.Medium | Flow climax moments (wildcard start) |
| `heavy` | ImpactFeedbackStyle.Heavy | Wildcard final symbol reveal |
| `success` | NotificationFeedbackType.Success | Completion, saved, gifted |
| `error` | NotificationFeedbackType.Error | Validation failure, network error |
| `warning` | NotificationFeedbackType.Warning | Soft warning, rate limit notice |

**Platform gate:** No gate — `expo-haptics` is a no-op on web, works on Android (vibration fallback). The iOS-only gate in `haptic-tab.tsx` was a template artifact; remove it.

- [ ] **Step 1: Create `lib/utils/haptics.ts`**

```ts
import * as Haptics from 'expo-haptics';

export type HapticType =
  | 'navigation'
  | 'selection'
  | 'confirm'
  | 'emphasis'
  | 'heavy'
  | 'success'
  | 'error'
  | 'warning';

export function haptic(type: HapticType): void {
  switch (type) {
    case 'navigation':
    case 'selection':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'confirm':
    case 'emphasis':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
  }
}
```

- [ ] **Step 2: Update all call sites**

Replace every `import * as Haptics from 'expo-haptics'` + inline `Haptics.*` call with `import { haptic } from '@/lib/utils/haptics'` + `haptic(type)`.

Full mapping per file:

**`components/haptic-tab.tsx`** — remove iOS gate, use utility:
```tsx
import { haptic } from '@/lib/utils/haptics';
// Remove: import * as Haptics from 'expo-haptics';
// Remove: if (process.env.EXPO_OS === 'ios') check

onPressIn={(ev) => {
  haptic('navigation');
  props.onPressIn?.(ev);
}}
```

**`components/pressable-card.tsx:45`** → `haptic('navigation')`
**`components/pressable-card.tsx:126`** → `haptic('confirm')`
**`components/gateway-reveal.tsx:54`** → `haptic('navigation')`

**`app/(tabs)/mirror.tsx:77`** → `haptic('navigation')`
**`app/(tabs)/mirror.tsx:260`** → `haptic('selection')`
**`app/(tabs)/mirror.tsx:272`** → `haptic('selection')`

**`app/(tabs)/index.tsx:23`** → `haptic('confirm')`

**`app/reading/situation.tsx:35`** → `haptic('error')`
**`app/reading/situation.tsx:45`** → `haptic('confirm')`
**`app/reading/situation.tsx:57`** → `haptic('error')`
**`app/reading/situation.tsx:77`** → `haptic('selection')`
**`app/reading/situation.tsx:84`** → `haptic('error')`
**`app/reading/situation.tsx:170`** → `haptic('selection')`

**`app/reading/passage.tsx:78`** → `haptic('error')`
**`app/reading/passage.tsx:86`** → `haptic('confirm')`
**`app/reading/passage.tsx:107`** → `haptic('navigation')`
**`app/reading/passage.tsx:118`** → `haptic('error')`
**`app/reading/passage.tsx:125`** → `haptic('confirm')`
**`app/reading/passage.tsx:255`** → `haptic('selection')`

**`app/reading/wildcard.tsx:54`** → `haptic('emphasis')`
**`app/reading/wildcard.tsx:115`** → `haptic('success')`
**`app/reading/wildcard.tsx:123`** → `haptic('heavy')`
**`app/reading/wildcard.tsx:130`** → `haptic('error')`
**`app/reading/wildcard.tsx:146`** → `haptic('error')`

**`app/reading/ritual.tsx:22`** → `haptic('warning')`

**`app/reading/share-card.tsx:110`** → `haptic('confirm')`
**`app/reading/share-card.tsx:151`** → `haptic('navigation')`
**`app/reading/share-card.tsx:215`** → `haptic('selection')`

**`app/reading/ai-streaming.tsx:44`** → `haptic('confirm')`
**`app/reading/ai-streaming.tsx:50`** → `haptic('navigation')`

**`app/reading/[id].tsx:103`** → `haptic('navigation')`
**`app/reading/[id].tsx:122`** → `haptic('confirm')`
**`app/reading/[id].tsx:148`** → `haptic('confirm')`
**`app/reading/[id].tsx:162`** → `haptic('success')`
**`app/reading/[id].tsx:178`** → `haptic('navigation')`
**`app/reading/[id].tsx:194`** → `haptic('confirm')`
**`app/reading/[id].tsx:213`** → `haptic('confirm')`

**`app/.paywall/index.tsx:77`** → `haptic('confirm')`
**`app/.paywall/index.tsx:86`** → `haptic('warning')`
**`app/.paywall/index.tsx:94`** → `haptic('success')`
**`app/.paywall/index.tsx:101`** → `haptic('error')`
**`app/.paywall/index.tsx:110`** → `haptic('navigation')`
**`app/.paywall/index.tsx:119`** → `haptic('success')`
**`app/.paywall/index.tsx:123`** → `haptic('warning')`
**`app/.paywall/index.tsx:127`** → `haptic('error')`
**`app/.paywall/index.tsx:276`** → `haptic('selection')`
**`app/.paywall/index.tsx:340`** → `haptic('selection')`
**`app/.paywall/index.tsx:385`** → `haptic('selection')`

**`app/onboarding/index.tsx:65`** → `haptic('success')`
**`app/onboarding/index.tsx:75`** → `haptic('navigation')`
**`app/onboarding/index.tsx:85`** → `haptic('navigation')`
**`app/onboarding/index.tsx:159`** → `haptic('confirm')`

**`app/.gift/create.tsx:76`** → `haptic('navigation')`
**`app/.gift/create.tsx:90`** → `haptic('error')`
**`app/.gift/create.tsx:94`** → `haptic('confirm')`
**`app/.gift/create.tsx:115`** → `haptic('success')`
**`app/.gift/create.tsx:126`** → `haptic('error')`
**`app/.gift/create.tsx:134`** → `haptic('navigation')`

**`app/.gift/redeem.tsx:36`** → `haptic('error')`
**`app/.gift/redeem.tsx:40`** → `haptic('confirm')`
**`app/.gift/redeem.tsx:53`** → `haptic('success')`
**`app/.gift/redeem.tsx:75`** → `haptic('error')`
**`app/.gift/redeem.tsx:91`** → `haptic('confirm')`

- [ ] **Step 3: Verify no remaining raw Haptics imports in app/components**
```bash
grep -rn "expo-haptics" app/ components/ --include="*.tsx" --include="*.ts"
```
Expected: zero results (only `lib/utils/haptics.ts` imports expo-haptics).

- [ ] **Step 4: Commit**
```
git commit -m "refactor(haptics): centralize all haptic calls into lib/utils/haptics.ts"
```

---

## Task C: Accessibility Labels

**Files:**
- Modify: `app/(tabs)/mirror.tsx`
- Modify: `app/reading/wildcard.tsx`
- Modify: `app/reading/[id].tsx`
- Modify: `lib/i18n/en.ts` (add a11y keys)
- Modify: `lib/i18n/vi.ts` (add a11y keys)

### Scope
Add `accessibilityRole="button"` + `accessibilityLabel` to interactive Pressable elements. Source labels from `useStrings()` i18n — never hardcode English strings.

- [ ] **Step 1: Add a11y string keys to i18n**

In `lib/i18n/en.ts`, find the `mirror` section and add:
```ts
// inside mirror: { ... }
a11yOpenReading: 'Open reading',
a11yFilterAll: 'Filter: All readings',
a11yFilterFavorites: 'Filter: Favourites only',
a11yFilterAI: 'Filter: With AI reflection',
a11yFilterShared: 'Filter: Shared readings',
a11ySortLatest: 'Sort by latest',
a11ySortOldest: 'Sort by oldest',
a11ySortDepth: 'Sort by depth',
a11yStartReading: 'Start a new reading',
```

In `lib/i18n/vi.ts`, add the same keys with Vietnamese values:
```ts
a11yOpenReading: 'Mở lần đọc',
a11yFilterAll: 'Lọc: Tất cả',
a11yFilterFavorites: 'Lọc: Đã giữ lại',
a11yFilterAI: 'Lọc: Có soi thêm',
a11yFilterShared: 'Lọc: Đã chia sẻ',
a11ySortLatest: 'Sắp xếp: Mới nhất',
a11ySortOldest: 'Sắp xếp: Cũ nhất',
a11ySortDepth: 'Sắp xếp: Có dư âm',
a11yStartReading: 'Bắt đầu lần đọc mới',
```

- [ ] **Step 2: Add accessibility props to mirror.tsx Pressables**

In `renderReadingItem` (line ~173), the outer `PressableCard`:
```tsx
<PressableCard
  onPress={() => handleReadingPress(item)}
  accessibilityRole="button"
  accessibilityLabel={s.mirror.a11yOpenReading}
  // ...existing props
>
```

In `renderHeader` filter buttons (line ~258):
```tsx
<Pressable
  key={option.key}
  onPress={...}
  accessibilityRole="button"
  accessibilityLabel={s.mirror[`a11yFilter${option.key.charAt(0).toUpperCase() + option.key.slice(1)}` as keyof typeof s.mirror] as string}
  // OR simpler — use option.label directly since it's already i18n:
  accessibilityLabel={option.label}
  // ...
>
```

Actually simpler: `option.label` is already `s.mirror.filterAll` etc. — use it directly as `accessibilityLabel`.

In sort buttons (line ~271): same pattern — use `option.label` as `accessibilityLabel`.

In `renderEmpty` start reading Pressable (line ~224):
```tsx
<Pressable
  onPress={() => router.push('/reading/situation')}
  accessibilityRole="button"
  accessibilityLabel={s.mirror.a11yStartReading}
  // ...
>
```

In `renderHeader` TextInput (line ~246):
```tsx
<TextInput
  accessibilityLabel={s.mirror.searchPlaceholder}
  // ...existing props
>
```

- [ ] **Step 3: Commit**
```
git commit -m "feat(a11y): add accessibilityRole and accessibilityLabel to interactive elements"
```

---

## Task A: AmbientBackdrop Breathing Animation

**Files:**
- Modify: `components/ambient-backdrop.tsx`

### Design
- 4 orbs animate `opacity` via Reanimated `withRepeat(withSequence(...), -1)`
- Stagger: orb1=0ms, orb2=700ms, orb3=1400ms, orb4=2100ms
- Cycle: 2500ms inhale + 2500ms exhale = 5s total
- Easing: `Easing.inOut(Easing.sin)` — breath curve
- `useReducedMotion()` gate: if true, no animation (static)
- Web: no animation (existing web gradient is static by design)
- AppState: pause on background, restart with stagger on foreground (fixes sync-pulse issue)

- [ ] **Step 1: Rewrite `ambient-backdrop.tsx`**

Complete replacement:

```tsx
import { memo, useEffect } from "react";
import { AppState, Easing, Platform, StyleSheet, View, useWindowDimensions, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/use-colors";

type WebGradientStyle = ViewStyle & { backgroundImage: string };

const BREATH_IN = 2500;
const BREATH_OUT = 2500;
const BREATH_MIN = 0.6;

function useBreathStyle(delayMs: number) {
  const isReducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  function startBreath() {
    opacity.value = withRepeat(
      withSequence(
        withTiming(BREATH_MIN, { duration: BREATH_IN, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: BREATH_OUT, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }

  useEffect(() => {
    if (isReducedMotion || Platform.OS === "web") return;

    const startTimer = setTimeout(startBreath, delayMs);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        cancelAnimation(opacity);
        opacity.value = 1;
      } else if (state === "active") {
        setTimeout(startBreath, delayMs);
      }
    });

    return () => {
      clearTimeout(startTimer);
      cancelAnimation(opacity);
      opacity.value = 1;
      appStateSub.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReducedMotion]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

export const AmbientBackdrop = memo(function AmbientBackdrop() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();

  const orbSize = Math.max(width * 0.84, 300);
  const lowerOrbSize = Math.max(width * 1.08, 360);
  const centerHalo = Math.max(width * 0.56, 220);

  const webGradientStyle: WebGradientStyle = {
    backgroundImage:
      "radial-gradient(circle at 20% 20%, rgba(216,184,106,0.08) 0%, transparent 32%), radial-gradient(circle at 80% 10%, rgba(135,96,189,0.07) 0%, transparent 26%), radial-gradient(circle at 50% 100%, rgba(0,0,0,0.24) 0%, transparent 42%), radial-gradient(circle at 50% 40%, rgba(255,230,182,0.05) 0%, transparent 24%)",
  };

  const breath1 = useBreathStyle(0);
  const breath2 = useBreathStyle(700);
  const breath3 = useBreathStyle(1400);
  const breath4 = useBreathStyle(2100);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#07060A", opacity: 0.18 }]} />

      <Animated.View
        style={[
          styles.orb,
          breath1,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            backgroundColor: colors.primary + "18",
            top: -orbSize * 0.16,
            left: -orbSize * 0.16,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          breath2,
          {
            width: orbSize * 0.9,
            height: orbSize * 0.9,
            borderRadius: (orbSize * 0.9) / 2,
            backgroundColor: colors.border + "16",
            top: height * 0.12,
            right: -orbSize * 0.18,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          breath3,
          {
            width: centerHalo,
            height: centerHalo,
            borderRadius: centerHalo / 2,
            backgroundColor: colors.primary + "10",
            top: height * 0.22,
            alignSelf: "center",
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          breath4,
          {
            width: lowerOrbSize,
            height: lowerOrbSize,
            borderRadius: lowerOrbSize / 2,
            backgroundColor: colors.primary + "0C",
            bottom: -lowerOrbSize * 0.2,
            alignSelf: "center",
          },
        ]}
      />

      <View style={[styles.edgeTop, { borderBottomColor: colors.primary + "08" }]} />
      <View style={[styles.edgeBottom, { backgroundColor: "#07060A", opacity: 0.28 }]} />
      <View style={[styles.veil, { borderColor: colors.border + "14" }]} />

      {Platform.OS === "web" ? (
        <View style={[StyleSheet.absoluteFill, webGradientStyle]} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    opacity: 0.9,
  },
  edgeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    borderBottomWidth: 1,
  },
  edgeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
});
```

Note: `opacity: 1` removed from `styles.orb` — Animated.View manages opacity via `breath*` style.

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**
```
git commit -m "feat(ui): AmbientBackdrop breathing animation via Reanimated, AppState-aware, reduceMotion-safe"
```

---

## Self-Review

**Spec coverage:**
- ✅ D — TextInput fontFamily on 3 sites (redeem.tsx intentionally skipped: font-mono class)
- ✅ B — lib/utils/haptics.ts + all 50+ call sites mapped
- ✅ C — accessibilityRole + accessibilityLabel from i18n strings
- ✅ A — breathing animation, AppState pause/resume, reduceMotion gate, web skip

**Audit flags addressed:**
- ✅ Haptic iOS gate inconsistency → removed, utility is cross-platform
- ✅ accessibilityLabel from useStrings() i18n, not hardcoded
- ✅ AppState listener → pause on background, restart on foreground
- ✅ useReducedMotion() checked before animation start (synchronous Reanimated hook, no async gap)

**Placeholder scan:** none.

---

## Risk Summary

| Task | Risk | Mitigation |
|---|---|---|
| B — 50+ call sites | Missed call leaves raw import | Step 3 grep verifies zero remaining raw imports |
| B — line numbers shift | Edits in earlier steps shift later line refs | Work file-by-file in one pass; use code search not line numbers |
| A — useReducedMotion before render | Reanimated hook is synchronous — no async gap | ✅ Confirmed: `useReducedMotion()` returns value synchronously |
| A — AppState listener per orb | 4 listeners × 4 orbs = 16 listeners | `useBreathStyle` called once per orb, 1 listener per orb = 4 total — acceptable |
| C — i18n type safety | New keys missing from type | Add to both en.ts and vi.ts simultaneously |

**HIGH tasks:** None. **CROSS boundaries:** None.

---

## Task Risk Summary (task-risk-score)
<!-- task-risk-score: DO NOT DUPLICATE — update this section -->
<!-- last-run: 2026-06-03 | formula: (S×B)/D -->

| Task | Context | S×B/D | QBR | Risk | Boundary | Action |
|------|---------|-------|-----|------|----------|--------|
| D — TextInput font | UI | SKIP | — | LOW | SINGLE | trivial styling, no async/state |
| B — Haptic utility | UI | 2×3/1 | 6 | HIGH ⚠️ | SINGLE | single concern (no decompose); add device spot-check after commit |
| C — A11y labels | UI | SKIP | — | LOW | SINGLE | trivial additive props + i18n strings |
| A — Backdrop anim | UI | 2×1/2 | 1 | LOW | SINGLE | proceed normally |

**Summary:**
- High-risk tasks: **Task B** — 17 files, haptic mapping unverifiable by automated tests (D=1)
- Cross-boundary tasks: none
- Required mitigation for Task B: after commit, manually trigger 3–5 action types on device (navigation press, confirm, success, error, heavy/wildcard) to verify feel is preserved.

---

Plan complete: `docs/superpowers/plans/2026-06-03-ux-polish-breathing-haptics-a11y.md`
Risk summary: 1 HIGH task (Task B — single concern, spot-check required), 0 CROSS boundaries.
