# Visual Upgrade Finalization Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended)
> or `executing-plans` to implement this plan task-by-task.

**Goal:** Finalize the P0 and P1 visual upgrade items identified in the browser-verified audit report.
**Architecture:** Updates to Expo React Native UI components and i18n dictionary to adhere to the Local-First and Mirror Philosophy.
**Tech Stack:** React Native, Expo, TypeScript.
**Audit Gate:** PASS
**Risk Flags:** none

---

### Task 1: Fix Home Screen Layout (Padding & Trust Pills)

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `lib/i18n/vi.ts`

- [ ] **Step 1: Write minimal implementation in `lib/i18n/vi.ts`**
  Modify `home` object to replace the `pillars` array with a single `pillarSummary`.
```typescript
  home: {
    kicker: "not a fortune • a mirror",
    title: "ALETHEIA",
    tagline: "Dừng lại. Phản chiếu. Hiểu.",
    subtitle: "Dừng lại trong vài phút. Gọi tên điều bạn đang mang. Rồi để một đoạn trích phản chiếu lại nó.",
    cta: "Chọn một biểu tượng",
    ctaHint: "Bạn sẽ mô tả tình huống, chọn một biểu tượng, rồi nhận đoạn trích phù hợp nhất với khoảnh khắc này.",
    passageLabel: "PASSAGE OF THE PRACTICE",
    passageRef: "Nghi thức mở đầu của Aletheia",
    pillarSummary: "Lưu local • Thiết kế tĩnh • AI tuỳ chọn", // <-- ADD THIS, remove pillars array
    footerText: "Không cần nhanh. Chỉ cần thành thật.",
  },
```

- [ ] **Step 2: Write minimal implementation in `app/(tabs)/index.tsx`**
  Modify the `ScrollView` to have padding at the bottom so the footer is not covered by the tab bar. Also, render the new `pillarSummary` instead of mapping over `pillars`.
```typescript
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Add this import if missing

// Inside HomeScreen component:
const insets = useSafeAreaInsets();

// Modify ScrollView:
<ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>

// Replace the pillars rendering block:
          <View style={styles.pillars}>
            <View style={[styles.pillar, { backgroundColor: colors.surface + "B8", borderColor: colors.primary + "1E" }]}>
              <Text style={[styles.pillarText, { color: colors.foreground, textAlign: "center" }]}>{s.home.pillarSummary}</Text>
            </View>
          </View>
```

- [ ] **Step 3: Commit** `git commit -m "fix(ui): add bottom padding to home screen and merge trust pills"`

---

### Task 2: Fix Tab Bar Typography

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Write minimal implementation**
  Modify `tabBarLabelStyle` to remove `textTransform: "uppercase"` which breaks Vietnamese diacritics with the Cinzel font, and adjust `letterSpacing`.
```typescript
        tabBarLabelStyle: {
          fontSize: 12,
          letterSpacing: 0.5,
          fontFamily: Fonts.bodyMedium, // Use body font for better Vietnamese rendering
        },
```

- [ ] **Step 2: Commit** `git commit -m "fix(ui): improve tab bar typography for vietnamese characters"`

---

### Task 3: Refine Mirror Language & Settings i18n

**Files:**
- Modify: `lib/i18n/vi.ts`
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Write minimal implementation in `lib/i18n/vi.ts`**
  Fix Tarot terminology, mirror empty state copy, and add missing settings strings.
```typescript
  wildcard: {
    title: "Chọn một biểu tượng",
    hint: "Đừng chọn bằng lý trí quá nhanh.",
    metaSuffix: "dấu hiệu đang chờ bạn",
    cardTapHint: "Chạm để soi", // <-- CHANGED
    autoCountdown: (s: number) => `Tự động chọn sau ${s}s`,
    autoButton: "Để AletheiA chọn giúp",
    autoButtonLoading: "Đang chọn...",
    selectedText: "Đang phản chiếu khoảnh khắc...", // <-- CHANGED
    error: "Không thể chọn biểu tượng. Vui lòng thử lại.",
  },

// ...
  mirror: {
    // ...
    emptyTitle: "Gương đang trống", // <-- CHANGED
    // ...
  },
// ...
  settings: {
    // ... Add to the bottom of settings object:
    syncSectionTitle: "Tùy chọn đồng bộ",
    syncNoAccountInfo: "AletheiA hoạt động đầy đủ không cần tài khoản. Đăng nhập chỉ dùng nếu bạn muốn đồng bộ giữa các thiết bị.",
  },
```

- [ ] **Step 2: Write minimal implementation in `app/(tabs)/settings.tsx`**
  Replace hardcoded strings in the Account section.
```typescript
      {/* Account */}
      {currentUser !== undefined && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>
            {s.settings.syncSectionTitle}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "22" }]}>
            {currentUser ? (
              // ...
            ) : (
              <>
                <View style={styles.row}>
                  <Text style={[styles.rowSubLabel, { color: colors.muted }]}>
                    {s.settings.syncNoAccountInfo}
                  </Text>
                </View>
                // ...
              </>
            )}
```

- [ ] **Step 3: Commit** `git commit -m "fix(i18n): remove tarot language, update mirror empty state and extract settings strings"`
