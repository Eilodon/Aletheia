---
title: UX Polish — Breathing Backdrop, Haptic Utility, Accessibility, Font Spec
date: 2026-06-03
author: ybao
SPEC_APPROVED: true
SPEC_ESCALATION: false
ESCALATION_FINDING: ""
---

## Context

AletheiA là ritual sanctuary. Bốn cải tiến này không thêm tính năng mới — chúng polish lớp cảm nhận để không-gian vừa "sống" vừa "im lặng". Mọi thay đổi phải pass product law: giúp user rời đi nhẹ hơn, không giữ user ở lại lâu hơn.

---

## A — AmbientBackdrop Breathing Animation

**Problem:** `ambient-backdrop.tsx` là static Views hoàn toàn. Reanimated 4.1.6 đã có trong package nhưng chưa được dùng ở đây.

**Solution:** Breathing opacity loop trên các orbs bằng Reanimated `withRepeat`/`withSequence`.

**Design:**
- Mỗi orb animate `opacity` từ `1.0 → 0.6 → 1.0`, chu kỳ 5s
- Stagger giữa 4 orbs: 0ms / 700ms / 1400ms / 2100ms — tạo cảm giác organic, không cơ học
- Easing: `Easing.inOut(Easing.sin)` — mượt nhất cho breath metaphor
- **Hard gate:** `AccessibilityInfo.isReduceMotionEnabled()` → nếu true, không chạy animation (giữ static)
- Web: không animate (CSS gradient tĩnh, web đã có `webGradientStyle`)
- Không thay đổi visual layout, không thêm dependency mới

**Acceptance criteria:**
- Animation chạy trên iOS và Android native
- `reduceMotion = true` → static (không flash, không jump)
- Không có JS thread work (toàn bộ chạy trên Reanimated worklet)
- Không thấy được rõ ràng khi nhìn thẳng (subconscious level only)

---

## B — Centralize Haptic Utility

**Problem:** ~50+ inline `Haptics.impactAsync(...)` calls scattered across 10+ files. Không nhất quán — cùng action type (navigation press) dùng Light ở chỗ này, Medium ở chỗ khác.

**Solution:** `lib/utils/haptics.ts` — action-type map, replace tất cả inline calls.

**Action type map:**
```
navigation   → ImpactFeedbackStyle.Light      (tab press, card open)
selection    → ImpactFeedbackStyle.Light      (filter toggle, sort toggle)
confirm      → ImpactFeedbackStyle.Medium     (submit, proceed)
emphasis     → ImpactFeedbackStyle.Medium     (wildcard reveal start)
heavy        → ImpactFeedbackStyle.Heavy      (wildcard final reveal)
success      → NotificationFeedbackType.Success
error        → NotificationFeedbackType.Error
warning      → NotificationFeedbackType.Warning
```

**API:**
```ts
import { haptic } from '@/lib/utils/haptics';
haptic('navigation');
haptic('success');
```

**Platform gate:** iOS only (existing pattern — `process.env.EXPO_OS === 'ios'`)

**Acceptance criteria:**
- Tất cả inline `Haptics.*` calls được replace bằng `haptic(type)`
- Không có behavior change — mapping phải reproduce existing patterns
- File `lib/utils/haptics.ts` là single source of truth cho haptic semantics

---

## C — Accessibility Labels

**Problem:** `Pressable` interactive elements không có `accessibilityRole` hay `accessibilityLabel`. Screen reader users không biết elements làm gì.

**Solution:** Thêm `accessibilityRole="button"` và `accessibilityLabel` vào các Pressable quan trọng:
- Filter buttons (mirror.tsx)
- Sort buttons (mirror.tsx)  
- Reading card (mirror.tsx)
- Navigation pressables trong reading flow
- CTA buttons (start reading, paywall)

**Scope:** Chỉ interactive Pressable elements — không touch View, Text không-interactive.

**Acceptance criteria:**
- Mọi `<Pressable onPress={...}>` có `accessibilityRole="button"`
- Các icon-only / emoji-only buttons có `accessibilityLabel` mô tả action
- TextInput có `accessibilityLabel` = placeholder text

---

## D — TextInput Font Spec

**Problem:** `TextInput` trong mirror.tsx và các screens khác không set `fontFamily` → system default. Không có spec rõ ràng trong codebase.

**Solution:** Thêm `fontFamily: Fonts.body` vào style của tất cả `TextInput` components. `Fonts.body` = `AletheiaBody-Regular` (EB Garamond on web, custom font on native).

**Scope:** Search toàn bộ codebase cho `<TextInput`, thêm fontFamily nếu chưa có.

**Acceptance criteria:**
- Tất cả TextInput có explicit `fontFamily`
- Không có visual regression (Fonts.body đã load tại app start)

---

## Implementation Order

D → B → C → A (nhỏ → lớn, rủi ro tăng dần)

---

## Risk Assessment (audit-design)
<!-- audit-design: DO NOT DUPLICATE — update this section, do not append a second one -->
<!-- last-run: 2026-06-03 | trigger: NORMAL -->

**Tier:** 1 | **Date:** 2026-06-03

### Failure Modes
1. Haptic mapping silently breaks existing feel — no test coverage for haptic output → MED — mitigation in plan: YES (snapshot mapping against original calls before replace)
2. `withRepeat(-1)` animation active when app backgrounded → battery regression on Android → MED — mitigation in plan: YES (AppState listener to pause/resume)
3. `isReduceMotionEnabled()` async gap → first-frame flicker on reduce-motion devices → LOW — mitigation in plan: YES (read value synchronously via ref before first render)

### Layer Signals
- L1: Haptic iOS gate inconsistent across codebase. `haptic-tab.tsx` gates on `EXPO_OS === 'ios'`, `mirror.tsx` does not. Utility must declare explicit policy and apply uniformly.

### Assumptions to Verify
- ASSUMED: `Fonts.body` loaded before TextInput renders on all platforms.
- ASSUMED: `accessibilityLabel` strings — spec doesn't specify i18n source. Must use `useStrings()` where available, not hardcoded English.

### Abductive Hypotheses
1. On app foreground after background, Reanimated restarts all animations simultaneously → orbs sync-pulse, losing organic stagger.
2. accessibilityLabel hardcoded in English → screen reader users on Vietnamese locale receive English labels.

### Gate Result
PASS WITH FLAGS — writing-plans MUST include:
- Explicit haptic gate policy (iOS-only vs cross-platform)
- accessibilityLabel sourced from `useStrings()` i18n strings
- AppState pause/resume hook for breathing animation
- `useReduceMotion` initialized before first render (not async)

---

## Non-goals

- Không thêm Skia (overkill, Reanimated đủ)
- Không thêm ambient audio (scope riêng, cần product decision)
- Không refactor layout sang Grid (FlatList virtualization đang hoạt động tốt)
- Không thêm Inter/Geist font (custom AletheiaBody đã là sans-serif alias cho native)
