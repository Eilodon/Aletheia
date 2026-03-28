# Aletheia Mobile App - Interface Design

## Design Philosophy

Aletheia is a **contemplation ritual app**, not a productivity tool. Every interaction should feel intentional, calm, and spacious. The design language draws from iOS Human Interface Guidelines with a focus on one-handed usage in portrait orientation (9:16).

**Core Design Principles:**
- **Ritual pacing**: Interactions are deliberately slow, never rushed
- **Visual silence**: Minimal UI chrome, maximum breathing room
- **Symbolic clarity**: Each symbol and element carries meaning
- **Graceful degradation**: Offline experience is as complete as online

---

## Screen Architecture

### 1. Home Screen
**Purpose**: Entry point and reading initiation

**Layout:**
- Top: App logo/title "✦ ALETHEIA ✦" (centered, subtle)
- Middle: Large, tappable "Lật lá" (Flip the Pages) button with subtle animation
- Bottom: Navigation to History and Settings tabs
- Background: Soft gradient (light: cream to pale blue; dark: charcoal to deep blue)

**Content:**
- Tagline: "Not a fortune. A mirror." (small, secondary text)
- Optional: Daily reading streak counter (if user has read today)
- Optional: Pro badge if user is subscribed

**Interactions:**
- Tap "Lật lá" → navigate to Situation Input screen
- Tap History icon → navigate to History screen
- Tap Settings icon → navigate to Settings screen

---

### 2. Situation Input Screen
**Purpose**: Optional context capture before reading

**Layout:**
- Top: "Tình huống của bạn" (Your Situation) title
- Middle: Large text input field with placeholder "Bạn đang suy nghĩ về điều gì? (optional)"
- Bottom: Two buttons side-by-side: "Bỏ qua" (Skip) and "Tiếp tục" (Continue)

**Content:**
- Subtitle: "Chia sẻ tình huống nếu bạn muốn, hoặc bỏ qua để đọc tự do."
- Character limit: 200 characters
- Input field grows as user types (max 3 lines visible)

**Interactions:**
- Tap input field → keyboard appears
- Tap "Bỏ qua" → navigate to Source Selection (situation_text = null)
- Tap "Tiếp tục" → navigate to Source Selection (situation_text = captured text)
- Keyboard return key → same as "Tiếp tục"

---

### 3. Source Selection Screen
**Purpose**: Choose wisdom tradition or random

**Layout:**
- Top: "Chọn nguồn" (Choose Source) title
- Middle: Vertical list of 6 sources as cards
- Bottom: "Để vũ trụ chọn" (Let the Universe Choose) button

**Content:**
Each source card shows:
- Source name (e.g., "I Ching — Kinh Dịch")
- Tradition icon (Chinese, Christian, Islamic, etc.)
- Passage count (e.g., "64 passages")
- Tradition-specific color accent

**Card Design:**
- Width: Full screen minus 16px padding each side
- Height: ~60px
- Rounded corners: 12px
- Border: Subtle 1px border in theme color
- Tap state: Scale 0.98 + opacity 0.8

**Interactions:**
- Tap source card → navigate to Wildcard screen (source_id = selected)
- Tap "Để vũ trụ chọn" → navigate to Wildcard screen (source_id = random)

---

### 4. Wildcard Screen
**Purpose**: Ritual symbol selection ceremony

**Layout:**
- Top: "Vũ trụ lật ra ba biểu tượng" (The Universe Reveals Three Symbols)
- Middle: 3 symbols displayed in a triangle formation
- Bottom: "Để vũ trụ chọn" (Let the Universe Choose) button

**Symbol Display:**
- Each symbol: Large icon (80×80px) with display name below
- Initial state: Symbols fade in with staggered timing (200ms each)
- Hover state: Slight glow + scale 1.05
- Selected state: Solid glow + scale 1.1 + haptic feedback

**Symbol Layout:**
```
        [Symbol 1]
    [Symbol 2]  [Symbol 3]
```

**Interactions:**
- Tap symbol → record symbol_method = Manual, navigate to Ritual Animation
- Tap "Để vũ trụ chọn" → animate symbols swirling 600ms, one settles, record symbol_method = Auto, navigate to Ritual Animation
- Haptic feedback: Medium on manual tap, Light on auto selection

---

### 5. Ritual Animation Screen
**Purpose**: Ceremonial transition with book flip animation

**Layout:**
- Full screen: Animated book flip effect
- Center: Book icon rotating 360° with fade-in/out
- Text: "Vũ trụ đang lật..." (The Universe is Flipping...)

**Animation:**
- Duration: 600-800ms
- Easing: Ease-in-out
- Haptic: Light vibration at midpoint
- Auto-advance: After animation completes, navigate to Passage Display

**Interactions:**
- None (automatic transition)

---

### 6. Passage Display Screen
**Purpose**: Read the passage in contemplative space

**Layout:**
- Top: Source reference (e.g., "Hexagram 42 · 益") in small text
- Middle: Passage text in large, readable font
- Bottom: "Diễn giải" (Interpret) and "Lưu" (Save) buttons

**Content:**
- Passage text: 20-500 characters, centered, generous line-height (1.6×)
- Font: System font, size 18-20px
- Color: Foreground color with high contrast
- Background: Soft, neutral (light or dark mode appropriate)

**Buttons:**
- "Diễn giải": Primary button (filled background)
- "Lưu": Secondary button (outline)
- Both buttons: Full width, 48px height, rounded 12px

**Interactions:**
- Tap "Diễn giải" → navigate to AI Streaming screen (or AI Fallback if offline)
- Tap "Lưu" → save reading, navigate to Complete screen
- Auto-save: After 30 seconds, automatically save and navigate to Complete screen
- Timer: Silently track read_duration_s

---

### 7. AI Streaming Screen
**Purpose**: Display AI interpretation with typewriter effect

**Layout:**
- Top: "Diễn giải từ Aletheia" (Aletheia's Interpretation)
- Middle: Streaming AI response with typewriter effect
- Bottom: "Lưu" (Save) button

**Content:**
- AI response streams character-by-character
- Ends with reflective question in italics on new line
- Loading indicator (spinner or dots) while streaming
- Timeout fallback: If no response after 15 seconds, switch to AI Fallback screen

**Interactions:**
- Tap "Lưu" → save reading with ai_interpreted = true, navigate to Complete screen
- Auto-save: After 30 seconds, automatically save and navigate to Complete screen

---

### 8. AI Fallback Screen
**Purpose**: Display static reflection prompts when AI unavailable

**Layout:**
- Top: "Vũ trụ đang im lặng hôm nay. Hãy tự hỏi:" (The Universe is Silent Today. Ask Yourself:)
- Middle: 3 reflection prompts displayed as cards
- Bottom: "Lưu" (Save) button

**Content:**
Each prompt card:
- Width: Full screen minus 16px padding
- Height: Auto (text-based)
- Rounded corners: 12px
- Border: Subtle 1px border
- Tap state: Scale 0.98 + opacity 0.8

**Interactions:**
- Tap prompt card → copy to clipboard + show "Copied" toast
- Tap "Lưu" → save reading with ai_interpreted = true, ai_used_fallback = true, navigate to Complete screen
- Auto-save: After 30 seconds, automatically save and navigate to Complete screen

---

### 9. Complete Screen
**Purpose**: Reading finished, options to save or share

**Layout:**
- Top: "Lần đọc đã lưu" (Reading Saved)
- Middle: Summary card showing:
  - Symbol chosen
  - Passage snippet
  - Source reference
  - Read duration
- Bottom: "Chia sẻ" (Share) and "Đóng" (Close) buttons

**Summary Card:**
- Background: Subtle gradient or surface color
- Rounded corners: 16px
- Padding: 20px
- Shadow: Subtle elevation

**Interactions:**
- Tap "Chia sẻ" → generate share card, open system share sheet
- Tap "Đóng" → navigate back to Home screen
- After share completes: Mark reading as shared in database

---

### 10. History Screen
**Purpose**: Browse past readings

**Layout:**
- Top: "Lịch sử đọc" (Reading History) title with date range selector
- Middle: Vertical list of readings as cards
- Bottom: Empty state if no readings

**Reading Card:**
- Date (e.g., "Today, 3:45 PM")
- Source name
- Passage snippet (first 60 chars)
- Symbol chosen (with icon)
- Tap to expand → full reading details

**Interactions:**
- Tap reading card → expand to show full passage + AI response (if available)
- Swipe left → delete reading (with confirmation)
- Date range selector: "Today", "This Week", "This Month", "All Time"

---

### 11. Settings Screen
**Purpose**: User preferences and account management

**Layout:**
- Top: "Cài đặt" (Settings) title
- Middle: Sections for:
  - **Notification Settings**: Toggle daily notification, select time
  - **Subscription**: Show current tier, upgrade button for Free users
  - **Appearance**: Light/Dark mode toggle
  - **About**: App version, "Not a fortune. A mirror." tagline
  - **Legal**: Privacy policy, terms of service links

**Content:**
Each section:
- Section header (small, secondary text)
- Toggle switches for on/off settings
- Buttons for actions (Upgrade, Learn More, etc.)

**Interactions:**
- Toggle notification → enable/disable daily notifications
- Select notification time → time picker modal
- Tap "Upgrade to Pro" → RevenueCat subscription UI
- Tap "Privacy Policy" → open in web browser

---

## Color Palette

### Light Mode
| Token | Color | Usage |
|-------|-------|-------|
| Background | #FFFFFF | Screen background |
| Surface | #F8F8F8 | Cards, elevated surfaces |
| Foreground | #1A1A1A | Primary text |
| Muted | #666666 | Secondary text |
| Border | #E0E0E0 | Borders, dividers |
| Primary | #0A7EA4 | Buttons, accents |
| Success | #22C55E | Success states |
| Warning | #F59E0B | Warning states |
| Error | #EF4444 | Error states |

### Dark Mode
| Token | Color | Usage |
|-------|-------|-------|
| Background | #0F0F0F | Screen background |
| Surface | #1A1A1A | Cards, elevated surfaces |
| Foreground | #ECECEC | Primary text |
| Muted | #999999 | Secondary text |
| Border | #333333 | Borders, dividers |
| Primary | #0A7EA4 | Buttons, accents |
| Success | #4ADE80 | Success states |
| Warning | #FBBF24 | Warning states |
| Error | #F87171 | Error states |

### Tradition-Specific Accents
- **Chinese**: Deep red (#8B0000)
- **Christian**: Gold (#FFD700)
- **Islamic**: Teal (#008080)
- **Sufi**: Purple (#9370DB)
- **Stoic**: Sage green (#6B8E23)
- **Universal**: Slate (#708090)

---

## Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| App Title | System | 28px | Bold | 1.2 |
| Screen Title | System | 24px | Semibold | 1.2 |
| Heading | System | 18px | Semibold | 1.3 |
| Body | System | 16px | Regular | 1.6 |
| Caption | System | 12px | Regular | 1.4 |
| Button | System | 16px | Semibold | 1.2 |

**Font Family**: System font (SF Pro Display on iOS, Roboto on Android)

---

## Spacing & Layout

| Element | Value | Usage |
|---------|-------|-------|
| Screen padding | 16px | Horizontal margins |
| Card padding | 16px | Internal card spacing |
| Section spacing | 24px | Between sections |
| Element spacing | 12px | Between elements |
| Button height | 48px | Minimum tap target |
| Border radius | 12px | Cards, inputs |
| Border radius (large) | 16px | Large surfaces |

---

## Interaction & Animation

### Press Feedback
- **Primary buttons**: Scale 0.97 + haptic Light
- **Secondary buttons**: Opacity 0.8
- **Cards**: Scale 0.98 + opacity 0.8
- **Icons**: Opacity 0.6

### Animations
- **Symbol reveal**: Fade in with 200ms stagger
- **Book flip**: 600-800ms ease-in-out rotation
- **Typewriter**: Character-by-character streaming
- **Transitions**: 250ms fade between screens

### Haptics
- **Light**: Symbol selection (auto), AI fallback
- **Medium**: Symbol selection (manual), primary actions
- **Success**: Reading saved
- **Error**: Action failed

---

## Accessibility

- **Minimum tap target**: 48×48px
- **Color contrast**: WCAG AA compliant (4.5:1 for text)
- **Font sizes**: Minimum 16px for body text
- **VoiceOver**: All interactive elements labeled
- **Dark mode**: Automatic support via system setting

---

## Responsive Behavior

- **Portrait only**: App locked to portrait orientation
- **Safe area**: Content respects notch and home indicator
- **Text scaling**: Respects system text size settings (up to 200%)
- **Landscape**: Not supported in v1.0

---

## Key User Flows

### Happy Path: Complete Reading with AI
1. Home → Situation Input (skip) → Source Selection (random) → Wildcard (manual) → Ritual Animation → Passage Display → AI Streaming → Complete → Share

### Offline Path: Complete Reading without AI
1. Home → Situation Input (skip) → Source Selection (random) → Wildcard (auto) → Ritual Animation → Passage Display → AI Fallback → Complete

### History Review
1. Home → History → Tap reading → View full passage + AI response → Back to History

### Subscription Upgrade
1. Settings → Tap "Upgrade to Pro" → RevenueCat UI → Confirm purchase → Return to Settings

---

## Performance Targets

- **Screen transition**: ≤250ms
- **Symbol reveal**: 600ms (intentional ritual pacing)
- **Book flip animation**: 600-800ms
- **AI first token**: ≤2000ms (network dependent)
- **Share card generation**: ≤500ms
- **History list scroll**: 60 FPS

---

## Branding

**App Name**: Aletheia
**Tagline**: "Not a fortune. A mirror."
**Logo**: Circular symbol with Greek letter Α (Alpha) or mirror icon
**Color**: Primary blue (#0A7EA4)
**Typography**: Elegant, serif-friendly (but using system fonts for performance)

---

## Notes for Implementation

- All screens use `ScreenContainer` component for safe area handling
- Use `FlatList` for History screen (never `ScrollView` with `.map()`)
- Implement state machine strictly per BLUEPRINT.md Section 4
- Store all data in SQLite via Expo
- Use AsyncStorage for user preferences
- Implement offline detection for AI fallback
- Add haptic feedback using `expo-haptics`
- Use `react-native-reanimated` for smooth animations
- Test on both iOS and Android devices
