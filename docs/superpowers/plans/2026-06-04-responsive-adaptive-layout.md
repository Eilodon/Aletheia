# Responsive Adaptive Layout — Tier 1 + Tier 2

> **For agentic workers:** Use `executing-plans` to implement this plan task-by-task.

**Goal:** Add a central `useLayout` hook and apply viewport-aware ornament scaling, content clamping, display typography scaling, and a navigation rail for medium+ screens.

**Architecture:** A single `hooks/use-layout.ts` hook derives `ornamentScale`, `typeScale`, `contentMaxWidth`, and breakpoint booleans from `useWindowDimensions`. All screens consume this hook; hard-coded absolute px values for decorative halos and display text are replaced with scaled inline styles merged on top of static `StyleSheet` entries.

**Tech Stack:** React Native, NativeWind, expo-router v6, @react-navigation/bottom-tabs v7

**Audit Gate:** Engineering improvement — no formal spec, internal review sufficient.

**Risk Flags:** Task 7 (navigation rail) touches the root tab layout; test on both compact and medium viewports after that task.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `hooks/use-layout.ts` | **CREATE** | Central viewport hook: breakpoint, ornamentScale, typeScale, contentMaxWidth |
| `app/(tabs)/index.tsx` | **MODIFY** | Consume useLayout: scale halos, clamp maxWidth, center content, scale title |
| `app/onboarding/index.tsx` | **MODIFY** | Consume useLayout: scale heroHalo, clamp body maxWidth, scale title/sectionTitle |
| `app/reading/ritual.tsx` | **MODIFY** | Consume useLayout: scale all 5 concentric rings, scale title |
| `app/reading/wildcard.tsx` | **MODIFY** | Consume useLayout: scale deckHalo |
| `app/reading/ai-streaming.tsx` | **MODIFY** | Consume useLayout: scale waitHalo |
| `app/(tabs)/_layout.tsx` | **MODIFY** | Adaptive tab bar: floating bottom on compact, navigation rail on medium+ |

---

## Task 1 — Create `hooks/use-layout.ts`

**Files:**
- Create: `hooks/use-layout.ts`

- [ ] **Step 1: Write the file**

```typescript
import { useWindowDimensions } from "react-native";

export type LayoutBreakpoint = "compact" | "medium" | "expanded";

export interface LayoutInfo {
  width: number;
  height: number;
  breakpoint: LayoutBreakpoint;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  /** Max readable content width. Phone = screen width; tablet caps at 560; desktop at 720. */
  contentMaxWidth: number;
  /** Multiplier for decorative circular ornaments. 360dp→1.0, 600dp→1.1, 900dp+→1.3. */
  ornamentScale: number;
  /** Multiplier for display (heading) font sizes only. Body text is never scaled. */
  typeScale: number;
}

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();

  const breakpoint: LayoutBreakpoint =
    width >= 900 ? "expanded" : width >= 600 ? "medium" : "compact";

  const isCompact = breakpoint === "compact";
  const isMedium = breakpoint === "medium";
  const isExpanded = breakpoint === "expanded";

  const contentMaxWidth = isExpanded ? 720 : isMedium ? 560 : width;

  // Linear interpolation: 1.0 at 360dp, 1.3 at 1080dp. Capped at 1.3, floored at 1.0.
  const ornamentScale = Math.min(1.3, Math.max(1.0, 1.0 + (width - 360) / 2400));

  const typeScale = isExpanded ? 1.2 : isMedium ? 1.1 : 1.0;

  return {
    width,
    height,
    breakpoint,
    isCompact,
    isMedium,
    isExpanded,
    contentMaxWidth,
    ornamentScale,
    typeScale,
  };
}
```

- [ ] **Step 2: Verify file exists** `ls hooks/use-layout.ts` → expected: file listed

- [ ] **Step 3: Commit** `git commit -m "feat(layout): add useLayout hook — breakpoint, ornamentScale, typeScale, contentMaxWidth"`

---

## Task 2 — `app/(tabs)/index.tsx`: halos + maxWidth + content centering

**Files:**
- Modify: `app/(tabs)/index.tsx`

Current hard-coded values being replaced:
- `heroHalo: { width: 300, height: 300, borderRadius: 150 }`
- `heroRing: { width: 248, height: 248, borderRadius: 124 }`
- `heroRingInner: { width: 208, height: 208, borderRadius: 104 }`
- `subtitle: { maxWidth: 320 }`
- `ctaHint: { maxWidth: 300 }`

- [ ] **Step 1: Add import + computed values inside `HomeScreen` component**

Add after existing hook calls (after `const insets = useSafeAreaInsets()`):
```tsx
const { ornamentScale, contentMaxWidth } = useLayout();
const haloSize = Math.round(300 * ornamentScale);
const ringSize = Math.round(248 * ornamentScale);
const ringInnerSize = Math.round(208 * ornamentScale);
```

Add import at top of file:
```tsx
import { useLayout } from "@/hooks/use-layout";
```

- [ ] **Step 2: Update halo JSX — add inline dimension overrides**

```tsx
// FROM:
<View style={[styles.heroHalo, { backgroundColor: colors.primary + "0E" }]} />
<View style={[styles.heroRing, { borderColor: colors.primary + "16" }]} />
<View style={[styles.heroRingInner, { borderColor: colors.primary + "12" }]} />

// TO:
<View style={[styles.heroHalo, { width: haloSize, height: haloSize, borderRadius: haloSize / 2, backgroundColor: colors.primary + "0E" }]} />
<View style={[styles.heroRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: colors.primary + "16" }]} />
<View style={[styles.heroRingInner, { width: ringInnerSize, height: ringInnerSize, borderRadius: ringInnerSize / 2, borderColor: colors.primary + "12" }]} />
```

- [ ] **Step 3: Override maxWidth on subtitle and ctaHint inline**

```tsx
// FROM:
<Text style={[styles.subtitle, { color: colors.foreground, fontFamily: Fonts.bodyItalic }]}>
<Text style={[styles.ctaHint, { color: colors.muted }]}>

// TO:
<Text style={[styles.subtitle, { maxWidth: Math.min(320, contentMaxWidth * 0.82), color: colors.foreground, fontFamily: Fonts.bodyItalic }]}>
<Text style={[styles.ctaHint, { maxWidth: Math.min(300, contentMaxWidth * 0.78), color: colors.muted }]}>
```

- [ ] **Step 4: Wrap root View with content centering for medium+ screens**

```tsx
// FROM (inside ScrollView):
<View style={styles.root}>

// TO:
<View style={[styles.root, !isCompact && { maxWidth: contentMaxWidth, width: "100%", alignSelf: "center" }]}>
```

Add `isCompact` to the destructure:
```tsx
const { ornamentScale, contentMaxWidth, isCompact } = useLayout();
```

- [ ] **Step 5: Remove hard-coded `width`, `height`, `borderRadius`, `maxWidth` from StyleSheet**

```typescript
// StyleSheet.create after changes:
heroHalo: { position: "absolute", top: -26 },
heroRing: { position: "absolute", top: 2, borderWidth: 1 },
heroRingInner: { position: "absolute", top: 22, borderWidth: 1 },
subtitle: { textAlign: "center", fontSize: 15, lineHeight: 25, fontFamily: Fonts.bodyItalic },
ctaHint: { textAlign: "center", fontSize: 13, lineHeight: 20, fontFamily: Fonts.bodyItalic },
```

- [ ] **Step 6: Commit** `git commit -m "feat(layout): scale home halos + clamp text maxWidth by viewport"`

---

## Task 3 — `app/onboarding/index.tsx`: heroHalo + maxWidth

**Files:**
- Modify: `app/onboarding/index.tsx`

Current hard-coded values:
- `heroHalo: { width: 240, height: 240, borderRadius: 120, top: -24 }`
- `body: { maxWidth: 320 }`

- [ ] **Step 1: Add import + computed values inside `OnboardingScreen` component**

```tsx
import { useLayout } from "@/hooks/use-layout";

// Inside component, after existing hooks:
const { ornamentScale, contentMaxWidth } = useLayout();
const heroHaloSize = Math.round(240 * ornamentScale);
const bodyMaxWidth = Math.min(320, contentMaxWidth * 0.82);
```

- [ ] **Step 2: Update heroHalo JSX**

```tsx
// FROM:
<View style={[styles.heroHalo, { backgroundColor: colors.primary + "10" }]} />

// TO:
<View style={[styles.heroHalo, { width: heroHaloSize, height: heroHaloSize, borderRadius: heroHaloSize / 2, backgroundColor: colors.primary + "10" }]} />
```

- [ ] **Step 3: Override maxWidth on all `body` usages (appears twice in JSX)**

```tsx
// Both occurrences FROM:
<Text style={[styles.body, { color: colors.muted }]}>

// TO:
<Text style={[styles.body, { maxWidth: bodyMaxWidth, color: colors.muted }]}>
```

- [ ] **Step 4: Update StyleSheet — remove hard-coded dims + maxWidth**

```typescript
heroHalo: { position: "absolute", top: -24 },
body: { textAlign: "center", fontSize: 15, lineHeight: 24, fontFamily: Fonts.bodyItalic },
```

- [ ] **Step 5: Commit** `git commit -m "feat(layout): scale onboarding halo + clamp body maxWidth"`

---

## Task 4 — `app/reading/ritual.tsx`: all concentric ring halos

**Files:**
- Modify: `app/reading/ritual.tsx`

Current hard-coded values (all relative to shell 270):
- `shell: { width: 270, height: 270 }`
- `outerHalo: { width: 236, height: 236 }` (236/270 = 0.874)
- `middleHalo: { width: 186, height: 186 }` (186/270 = 0.689)
- `innerHalo: { width: 148, height: 148 }` (148/270 = 0.548)
- `coreHalo: { width: 124, height: 124 }` (124/270 = 0.459)

- [ ] **Step 1: Add import + computed halo sizes inside `RitualScreen` component**

```tsx
import { useLayout } from "@/hooks/use-layout";

// Inside component, after existing hooks:
const { ornamentScale } = useLayout();
const shellSize = Math.round(270 * ornamentScale);
const outerSize = Math.round(shellSize * 0.874);
const middleSize = Math.round(shellSize * 0.689);
const innerSize = Math.round(shellSize * 0.548);
const coreSize = Math.round(shellSize * 0.459);
```

- [ ] **Step 2: Update JSX — add inline dimension overrides**

```tsx
// FROM:
<View style={styles.shell}>
  <Animated.View
    style={[
      styles.outerHalo,
      { borderColor: colors.primary + "24", transform: [...] },
    ]}
  />
  <Animated.View
    style={[
      styles.middleHalo,
      { borderColor: colors.border + "95", transform: [...] },
    ]}
  />
  <Animated.View
    style={[
      styles.innerHalo,
      { borderColor: colors.primary + "18", transform: [...] },
    ]}
  />
  <View style={[styles.coreHalo, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "66" }]}>

// TO:
<View style={[styles.shell, { width: shellSize, height: shellSize }]}>
  <Animated.View
    style={[
      styles.outerHalo,
      { width: outerSize, height: outerSize, borderColor: colors.primary + "24", transform: [...] },
    ]}
  />
  <Animated.View
    style={[
      styles.middleHalo,
      { width: middleSize, height: middleSize, borderColor: colors.border + "95", transform: [...] },
    ]}
  />
  <Animated.View
    style={[
      styles.innerHalo,
      { width: innerSize, height: innerSize, borderColor: colors.primary + "18", transform: [...] },
    ]}
  />
  <View style={[styles.coreHalo, { width: coreSize, height: coreSize, backgroundColor: colors.primary + "14", borderColor: colors.primary + "66" }]}>
```

`[...]` = keep existing `transform` arrays unchanged.

- [ ] **Step 3: Update StyleSheet — remove width/height, keep everything else**

```typescript
shell: { alignItems: "center", justifyContent: "center" },
outerHalo: { position: "absolute", borderRadius: 999, borderWidth: 1, borderStyle: "dashed" },
middleHalo: { position: "absolute", borderRadius: 999, borderWidth: 1 },
innerHalo: { position: "absolute", borderRadius: 999, borderWidth: 1 },
coreHalo: { borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
```

- [ ] **Step 4: Commit** `git commit -m "feat(layout): scale ritual concentric ring halos by viewport"`

---

## Task 5 — `wildcard.tsx` + `ai-streaming.tsx`: single halos

**Files:**
- Modify: `app/reading/wildcard.tsx`
- Modify: `app/reading/ai-streaming.tsx`

### wildcard.tsx

Current: `deckHalo: { position: "absolute", width: 320, height: 320, borderRadius: 160, alignSelf: "center", top: 88 }`

- [ ] **Step 1: Add import + computed value in `WildcardScreen`**

```tsx
import { useLayout } from "@/hooks/use-layout";

// Inside WildcardScreen component, after existing hooks:
const { ornamentScale } = useLayout();
const deckHaloSize = Math.round(320 * ornamentScale);
```

- [ ] **Step 2: Update JSX**

```tsx
// FROM:
<View style={[styles.deckHalo, { backgroundColor: colors.primary + "0D" }]} />

// TO:
<View style={[styles.deckHalo, { width: deckHaloSize, height: deckHaloSize, borderRadius: deckHaloSize / 2, backgroundColor: colors.primary + "0D" }]} />
```

- [ ] **Step 3: Update StyleSheet**

```typescript
deckHalo: { position: "absolute", alignSelf: "center", top: 88 },
```

### ai-streaming.tsx

Current: `waitHalo: { position: "absolute", width: 180, height: 180, borderRadius: 90, top: -10 }`

- [ ] **Step 4: Add import + computed value in `AIStreamingScreen`**

```tsx
import { useLayout } from "@/hooks/use-layout";

// Inside AIStreamingScreen component, after existing hooks:
const { ornamentScale } = useLayout();
const waitHaloSize = Math.round(180 * ornamentScale);
```

- [ ] **Step 5: Update JSX**

```tsx
// FROM (line ~89):
<View style={[styles.waitHalo, { backgroundColor: colors.primary + "12" }]} />

// TO:
<View style={[styles.waitHalo, { width: waitHaloSize, height: waitHaloSize, borderRadius: waitHaloSize / 2, backgroundColor: colors.primary + "12" }]} />
```

- [ ] **Step 6: Update StyleSheet**

```typescript
waitHalo: { position: "absolute", top: -10 },
```

- [ ] **Step 7: Commit** `git commit -m "feat(layout): scale wildcard deck halo and ai-streaming wait halo"`

---

## Task 6 — Typography scaling (Tier 2)

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/onboarding/index.tsx`
- Modify: `app/reading/ritual.tsx`

**Rule:** Only scale display/heading text (fontSize ≥ 28). Body text (≤ 18) is NOT scaled.

### index.tsx

- [ ] **Step 1: Add `typeScale` to destructure (already has useLayout from Task 2)**

```tsx
const { ornamentScale, contentMaxWidth, isCompact, typeScale } = useLayout();
```

- [ ] **Step 2: Override title fontSize inline**

```tsx
// FROM:
<Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.brand }]}>

// TO:
<Text style={[styles.title, { fontSize: Math.round(44 * typeScale), color: colors.foreground, fontFamily: Fonts.brand }]}>
```

- [ ] **Step 3: Remove fontSize from StyleSheet title entry**

```typescript
title: { letterSpacing: 9 },
```

### onboarding/index.tsx

`title` (fontSize 40) and `sectionTitle` (fontSize 28) both get scaled.

- [ ] **Step 4: Add `typeScale` to destructure (already has useLayout from Task 3)**

```tsx
const { ornamentScale, contentMaxWidth, typeScale } = useLayout();
```

- [ ] **Step 5: Override title and sectionTitle inline**

```tsx
// title usage FROM:
<Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.brand }]}>

// TO:
<Text style={[styles.title, { fontSize: Math.round(40 * typeScale), color: colors.foreground, fontFamily: Fonts.brand }]}>

// sectionTitle usage FROM:
<Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>

// TO:
<Text style={[styles.sectionTitle, { fontSize: Math.round(28 * typeScale), color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
```

- [ ] **Step 6: Remove fontSize from StyleSheet entries**

```typescript
title: { letterSpacing: 8 },
sectionTitle: { lineHeight: 34, textAlign: "center" },
```

### ritual.tsx

- [ ] **Step 7: Add `typeScale` to destructure (already has useLayout from Task 4)**

```tsx
const { ornamentScale, typeScale } = useLayout();
```

- [ ] **Step 8: Override title fontSize inline**

```tsx
// title usage FROM:
<Text testID="reading-ritual-title" style={[styles.title, { color: colors.foreground, fontFamily: Fonts.viDisplay }]}>

// TO:
<Text testID="reading-ritual-title" style={[styles.title, { fontSize: Math.round(30 * typeScale), color: colors.foreground, fontFamily: Fonts.viDisplay }]}>
```

- [ ] **Step 9: Remove fontSize from StyleSheet title entry**

```typescript
title: { letterSpacing: 1.2, textAlign: "center" },
```

- [ ] **Step 10: Commit** `git commit -m "feat(layout): scale display typography (heading ≥28px) by typeScale on larger viewports"`

---

## Task 7 — Navigation rail in `_layout.tsx` (Tier 2)

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

React Navigation v7 (`@react-navigation/bottom-tabs ^7.4.0`) supports `tabBarPosition: 'left'` as a direct prop on the navigator. expo-router v6 forwards extra props from `<Tabs>` to the underlying navigator.

On **compact** (< 600dp): keep existing floating bottom tab with rounded pill design.
On **medium+** (≥ 600dp): left navigation rail, icons only, no floating style.

- [ ] **Step 1: Add `useLayout` import**

```tsx
import { useLayout } from "@/hooks/use-layout";
```

- [ ] **Step 2: Add layout values inside `TabLayout`**

```tsx
// After existing hooks:
const { isCompact } = useLayout();
const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
const tabBarHeight = 62 + bottomPadding; // unchanged
```

- [ ] **Step 3: Define conditional tab bar styles**

```tsx
const compactTabBarStyle = {
  paddingTop: 10,
  paddingBottom: bottomPadding,
  height: tabBarHeight,
  backgroundColor: colors.surface + "EE",
  borderTopColor: colors.primary + "24",
  borderTopWidth: 1,
  position: "absolute" as const,
  left: 14,
  right: 14,
  bottom: 10,
  borderRadius: 22,
};

const railTabBarStyle = {
  backgroundColor: colors.surface + "EE",
  borderRightColor: colors.primary + "24",
  borderRightWidth: 1,
  paddingTop: insets.top + 8,
  paddingBottom: insets.bottom + 8,
  width: 72,
};
```

- [ ] **Step 4: Update `<Tabs>` with conditional props**

```tsx
<Tabs
  tabBarPosition={isCompact ? "bottom" : "left"}
  screenOptions={{
    tabBarActiveTintColor: colors.tint,
    headerShown: false,
    tabBarButton: HapticTab,
    tabBarShowLabel: isCompact,
    tabBarStyle: isCompact ? compactTabBarStyle : railTabBarStyle,
    tabBarLabelStyle: isCompact
      ? { fontSize: 11, letterSpacing: 0.5 }
      : undefined,
  }}
>
```

- [ ] **Step 5: Fix bottom padding in `app/(tabs)/index.tsx` ScrollView**

When the rail is on the left, the 100px bottom clearance for the floating tab is no longer needed.

`index.tsx` already imports `useLayout` from Task 2. Update the ScrollView:

```tsx
// FROM:
<ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>

// TO:
<ScrollView
  contentContainerStyle={{ flexGrow: 1, paddingBottom: isCompact ? insets.bottom + 100 : insets.bottom + 24 }}
  showsVerticalScrollIndicator={false}
>
```

- [ ] **Step 6: Commit** `git commit -m "feat(layout): adaptive tab bar — floating bottom on compact, navigation rail on medium+"`

---

## Post-Implementation Checklist

```
[ ] Launch on phone emulator (360×800, compact) — verify floating tab bar + orbs + text unchanged
[ ] Launch on tablet emulator (768×1024, medium) — verify rail appears, content centered, orbs larger
[ ] Rotate phone to landscape — verify layout reacts (ornaments grow slightly, text scales up slightly)
[ ] Verify ritual.tsx animation still works after inline style merging (transform arrays intact)
[ ] Verify ai-streaming loading state shows waitHalo correctly
[ ] Verify onboarding steps scroll correctly on small phone
```

---

## Known Limitations (out of scope)

- `app/(tabs)/mirror.tsx` and `settings.tsx` have their own bottom padding for the floating tab bar — they'll be slightly over-padded at bottom when on medium+ screens with the nav rail. Fix with the same `isCompact ? insets.bottom + 100 : insets.bottom + 24` pattern after this plan.
- `app/reading/share-card.tsx` uses hard-coded dimensions intentionally (it is a fixed-size export canvas) — do not touch those.
- Full 2-column reading layout on tablet landscape is Tier 3 work.
