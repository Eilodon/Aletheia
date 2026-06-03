import type { Strings } from "./vi";

export const en: Strings = {
  common: {
    loading: "Loading...",
    error: "Something went wrong",
    retry: "Retry",
    cancel: "Cancel",
    skip: "Skip",
    share: "Share",
  },

  onboarding: {
    skipLabel: "Skip",
    stepOf: (step, total) => `Step ${step} of ${total}`,
    continueLabel: "Continue",
    enterLabel: "Enter →",
    enteringLabel: "Opening...",

    welcome: {
      kicker: "not a fortune • a mirror",
      title: "ALETHEIA",
      tagline: "Pause. Reflect. Understand.",
      body: "Aletheia doesn't predict the future. It creates a dark, slow, quiet space for you to look inward through philosophical passages.",
    },

    intent: {
      title: "What kind of mirror do you need today?",
      body: "Choose an opening intention. It helps Aletheia adjust the tone of reflection for your first reading.",
      clarity: { title: "Clarity", description: "When you need to name what's really happening." },
      comfort: { title: "Comfort", description: "When you need a gentler voice." },
      challenge: { title: "A challenge", description: "When you're ready to hear what's difficult." },
      guidance: { title: "Let the universe guide", description: "When you want to release control and receive what comes." },
    },

    preview: {
      label: "a moment before you begin",
    },

    how: {
      title: "How Aletheia works",
      steps: [
        "Describe what's happening, or leave it blank.",
        "Choose a symbol to reveal a passage.",
        "AI interpretation is available only when you ask for it.",
        "Your history and state are stored locally on your device.",
      ],
    },
  },

  home: {
    kicker: "not a fortune • a mirror",
    title: "ALETHEIA",
    tagline: "Pause. Reflect. Understand.",
    subtitle: "Take a few minutes. Name what you're carrying. Then let a passage reflect it back.",
    cta: "Draw a card",
    ctaHint: "You'll describe your situation, choose a symbol, then receive the passage that fits this moment.",
    passageLabel: "PASSAGE OF THE PRACTICE",
    passageRef: "Aletheia opening ritual",
    pillars: [
      "Stored locally, no account needed",
      "AI only appears when you ask",
      "Slow, dark design built for reflection",
    ],
    footerText: "No need to hurry. Just be honest.",
  },

  situation: {
    title: "What are you carrying?",
    subtitle: "Write a few lines if you want. The reading works without it, but the reflection lands deeper when you give it something real.",
    placeholder: "I'm feeling... / I'm facing...",
    inputKicker: "threshold note",
    inputHint: "The more honest you are, the more the passage and interpretation will resonate.",
    cta: "Enter the ritual",
    ctaLoading: "Preparing...",
    skipText: "I'm not sure what I'm thinking yet",
    error: "Unable to start reading. Please try again.",
  },

  wildcard: {
    title: "Choose a symbol",
    hint: "Don't overthink it.",
    metaSuffix: "signs are waiting for you",
    cardTapHint: "Tap to reveal",
    autoCountdown: (s) => `Auto-selecting in ${s}s`,
    autoButton: "Let the universe choose",
    autoButtonLoading: "Choosing...",
    selectedText: "Opening the card...",
    error: "Unable to choose symbol. Please try again.",
  },

  passage: {
    loading: "Loading...",
    languageLabel: "Language",
    languageVi: "Vietnamese",
    languageEn: "Source / English",
    interpretLabel: "Interpretation",
    interpretStreaming: "Streaming",
    interpretFallback: "Fallback",
    interpretDone: "Done",
    interpretOnDemand: "On request",

    aiKicker: "OPTIONAL",
    aiButton: "Request interpretation",
    aiHint: "AI only opens when you ask.",
    aiLoadingText: "Requesting interpretation...",
    aiLoadingHint: "Aletheia is weaving your situation, symbol, and passage context together.",
    aiLabelOracle: "INTERPRETATION",
    aiLabelFallback: "INNER REFLECTION",
    oracleLabel: "oracle reflection",
    fallbackLabel: "fallback reflection",

    shareButton: "Share",
    completeButton: "Complete",
    completingButton: "Closing the ritual...",
  },

  mirror: {
    title: "Mirror",
    countLabel: (visible, total) => `${visible} of ${total} readings shown`,
    searchPlaceholder: "Search by situation, source, or symbol",

    emptyTitle: "No readings yet",
    emptyBody: "Start your first reading. Every reading will be saved here.",
    emptyFilteredTitle: "No results found",
    emptyFilteredBody: "Try changing the search, filter, or sort to see your archive from a different angle.",
    startReading: "Start reading",
    noSituation: "No situation",

    filterAll: "All",
    filterFavorites: "Favorites",
    filterAI: "With AI",
    filterShared: "Shared",
    sortLatest: "Newest",
    sortOldest: "Oldest",
    sortDepth: "Deepest",

    dateToday: "Today",
    dateYesterday: "Yesterday",
    daysAgo: (n) => `${n} days ago`,

    a11yOpenReading: "Open reading",
    situationHidden: "Situation hidden",
  },

  preview: {
    tapHint: "tap to skip ahead",
  },

  settings: {
    title: "Settings",
    subtitle: "Language, notifications, and personal preferences.",

    languageSection: "Language",
    languageVi: "Tiếng Việt",
    languageEn: "English",

    notificationSection: "Daily Passage",
    notificationToggleOn: "On",
    notificationToggleOff: "Off",
    notificationTimeLabel: "Send at",
    notificationBody: "Each morning, Aletheia sends a passage to your lock screen — no need to open the app to read it.",
    notificationPermissionDenied: "Notification permission denied. Go to system Settings to re-enable.",

    weeklySummarySection: "Weekly Mirror",
    weeklySummaryToggleOn: "On",
    weeklySummaryToggleOff: "Off",
    weeklySummaryBody: "Every Saturday, your device privately summarises your reading week — fully offline, no data leaves your phone.",

    aboutSection: "About Aletheia",
    aboutPrivacy: "Data is stored locally and never sent anywhere.",
    aboutVersion: "Version",
  },
};
