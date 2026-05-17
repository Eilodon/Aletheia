# App Store & Play Store Assets

## App Information

**App Name:** Aletheia - Not a fortune. A mirror.

**Bundle Identifier (iOS):** `app.aletheia.mirror`

**Package Name (Android):** `app.aletheia.mirror`

**Version:** 1.0.0

**Category:** Lifestyle / Health & Fitness

**Age Rating:** 12+ (for philosophical/religious content references)

---

## Store Listings

### iOS App Store

**Title:** Aletheia - Daily Reflection

**Subtitle:** Not a fortune. A mirror.

**Description:**
```
Aletheia is a daily reflection app that helps you find clarity through wisdom from around the world.

• Choose a symbol and receive a philosophical passage from sources like I Ching, Rumi, Marcus Aurelius, and more
• Optional AI interpretation connects the passage to your current situation
• Everything stays on your device - no account required
• Perfect for daily mindfulness and reflection

Keywords: meditation, mindfulness, journal, reflection, wisdom, philosophy, I Ching, Rumi, daily, self-improvement

---
Not a fortune. A mirror.
```

**Promotional Text:** 
```
✨ Daily philosophical reflections
🔒 100% offline, private
✨ AI-powered interpretation
🎁 Gift readings to loved ones
```

**What's New in 1.0.0:**
```
• Initial release
• Reading flow with symbol selection
• AI interpretation (optional)
• Share card generation
• Gift reading creation and redemption
• Daily notification reminders
```

---

### Google Play Store

**Title:** Aletheia - Daily Reflection

**Short Description:**
Not a fortune. A mirror. Daily philosophical reflections for clarity and mindfulness.

**Full Description:**
```
Aletheia is a daily reflection app that helps you find clarity through wisdom from around the world.

Features:
• Choose a symbol and receive a philosophical passage from I Ching, Rumi, Marcus Aurelius, Tao Te Ching, Hafez, and more
• Optional AI interpretation connects the passage to your current situation
• Everything stays on your device — no account required, readings stay local
• Share beautiful cards with friends
• Gift readings to loved ones
• Daily notification reminders

Perfect for daily mindfulness, meditation, and reflection. Not a fortune teller - this is a mirror for your thoughts.

---
Not a fortune. A mirror.
```

---

## Keywords (ASO)

**iOS:**
- meditation
- mindfulness  
- journal
- reflection
- wisdom
- philosophy
- I Ching
- Rumi
- daily
- self-improvement
- spiritual
- contemplation

**Android:**
- meditation app
- mindfulness
- daily reflection
- philosophy
- wisdom
- I Ching
- journal
- self care
- spiritual
- contemplation

---

## Screenshots Requirements

### iOS (6.5" - iPhone 14 Pro)
Required: 3-5 screenshots (1290 x 2796 px)

1. **Home Screen** - "Lật lá" button, app branding
2. **Situation Input** - Text input for current situation
3. **Wildcard Screen** - 3 symbol cards
4. **Passage Display** - Reading result with passage
5. **Paywall** - Pro subscription benefits

### Android (Phone)
Required: 2-3 screenshots (1080 x 1920 px)

Same content as iOS

### App Preview Video (Optional)
- 15-30 seconds
- Show reading flow: symbol selection → passage → share

---

## Privacy & Compliance

### Data Collection
- **All readings stored locally on device** — never uploaded
- **Anonymous usage analytics** via PostHog (event types: reading flow, AI usage, feature engagement)
  - No user identity: `distinct_id` is always `"anonymous"`, không linked to bất kỳ PII nào
  - Chỉ active trong production build (`!__DEV__`) khi `EXPO_PUBLIC_POSTHOG_API_KEY` được set
  - Opt-out: xóa app
- No account required

### Privacy Policy URL Required
Create `https://aletheia.app/privacy` with nội dung sau:

```
Aletheia Privacy Policy

Readings: All readings are stored locally on your device using SQLite.
No reading content is transmitted to our servers.

Analytics: We use PostHog to collect anonymous usage data.
This includes: app events (reading started, AI requested, features used),
device platform (iOS/Android), and session timestamps.
No personally identifiable information is collected.
All events use distinct_id = "anonymous" — we cannot identify individual users.

To opt out: Uninstall the app. No account deletion required.

AI Interpretation: When you request AI interpretation, your situation text
and the philosophical passage are sent to our AI provider (Anthropic Claude).
This data is not stored by us after processing.

Contact: [your contact email]
```

### Content Rating

**iOS - IARC:**
- Religion & Belief: Mild
- Gambling: None

**Android:**
- Contains references to philosophical/religious texts
- No explicit content

---

## Contact

**Support Email:** support@aletheia.app

**Website:** https://aletheia.app

**Privacy Policy:** https://aletheia.app/privacy
