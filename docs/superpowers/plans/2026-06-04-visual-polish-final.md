# Visual Upgrade - Final Polish Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended)
> or `executing-plans` to implement this plan task-by-task.

**Goal:** Hoàn thiện triệt để các hạng mục P0/P1 còn sót lại từ báo cáo Visual Audit (sửa lỗi typography tiếng Việt và tinh chỉnh bảng màu Gold).
**Architecture:** Tích hợp font Lora cho `viDisplay` và cập nhật design tokens.
**Tech Stack:** React Native, Expo, CSS/Tailwind.
**Audit Gate:** PASS
**Risk Flags:** none

---

### Task 1: Tích hợp Vietnamese Display Font (Lora)

**Files:**
- Create: `assets/fonts/Lora-Regular.ttf` (via download)
- Create: `assets/fonts/Lora-SemiBold.ttf` (via download)
- Modify: `app/_layout.tsx`
- Modify: `lib/theme.ts`
- Modify: `constants/theme.ts`

- [ ] **Step 1: Download Lora Fonts**
```bash
wget -O assets/fonts/Lora-Regular.ttf "https://github.com/google/fonts/raw/main/ofl/lora/Lora-Regular.ttf"
wget -O assets/fonts/Lora-SemiBold.ttf "https://github.com/google/fonts/raw/main/ofl/lora/Lora-SemiBold.ttf"
```

- [ ] **Step 2: Load fonts in `app/_layout.tsx`**
```typescript
// Add to useFonts block
        "AletheiaViDisplay-Regular": require("../assets/fonts/Lora-Regular.ttf"),
        "AletheiaViDisplay-SemiBold": require("../assets/fonts/Lora-SemiBold.ttf"),
```

- [ ] **Step 3: Define font constants in `constants/theme.ts`**
```typescript
// Add to Fonts object
export const Fonts = {
  // ... existing fonts
  viDisplay: "AletheiaViDisplay-Regular",
  viDisplayStrong: "AletheiaViDisplay-SemiBold",
};
```

- [ ] **Step 4: Update typography logic in `lib/theme.ts` (nếu có) hoặc các component sử dụng font tiếng Việt.**
(Sẽ thay thế các chỗ gọi `Fonts.display` thành `Fonts.viDisplay` tùy theo ngôn ngữ, hoặc cấu hình stylesheet chung).

- [ ] **Step 5: Commit** `git commit -m "feat(ui): add Lora font for vietnamese typography"`

---

### Task 2: Tinh chỉnh bảng màu (Reduce Gold)

**Files:**
- Modify: `theme.config.js`

- [ ] **Step 1: Write minimal implementation**
  Giảm sắc độ Gold mặc định, để dành Gold sáng cho trạng thái active.
```javascript
// Modify dark mode primary colors in theme.config.js to be slightly more muted, leaving the bright gold for specific accents.
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#C1A661", // Slightly muted gold
          bright: "#D8B86A",  // The original bright gold for active states
        },
// ...
```

- [ ] **Step 2: Commit** `git commit -m "style(theme): reduce default gold saturation for mirror philosophy"`

---

Plan complete: docs/superpowers/plans/2026-06-04-visual-polish-final.md
Risk summary: [0 HIGH tasks, 0 CROSS boundaries]

Execution options:
1. Subagent-Driven
2. Inline Execution
