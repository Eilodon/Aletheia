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

  tabs: {
    home: "Open",
    mirror: "Mirror",
    settings: "Settings",
  },

  home: {
    kicker: "not a fortune • a mirror",
    title: "ALETHEIA",
    tagline: "Pause. Reflect. Understand.",
    subtitle: "Take a few minutes. Name what you're carrying. Then let a passage reflect it back.",
    cta: "Choose a symbol",
    ctaHint: "Write a few lines. Choose a symbol. Let a passage reflect it back.",
    passageLabel: "PASSAGE OF THE PRACTICE",
    passageRef: "Aletheia opening ritual",
    pillarSummary: "Stored locally • No account • Optional AI",
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
    crisisTitle: "AletheiA is here with you.",
    crisisBody: "What you're writing signals you may be in a very difficult place. This is not a moment for a mirror — this is a moment that needs real people.",
    crisisHotlineLabel: "Immediate support:",
    crisisContinue: "I still want to continue",
    crisisReturn: "Go back",

    ephemeralToggle: "Don't save this reading",
    ephemeralHint: "This reading won't appear in the Mirror.",
  },

  wildcard: {
    title: "Choose a symbol",
    hint: "Don't overthink it.",
    metaSuffix: "signs are waiting for you",
    cardTapHint: "Tap to reflect",
    autoCountdown: (s) => `Auto-selecting in ${s}s`,
    autoButton: "Let AletheiA choose for you",
    autoButtonLoading: "Choosing...",
    selectedText: "Reflecting on the moment...",
    error: "Unable to choose symbol. Please try again.",
  },

  passage: {
    loading: "Loading...",
    languageLabel: "Language",
    languageVi: "Vietnamese",
    languageEn: "Source / English",
    interpretLabel: "Reflection layer",
    interpretStreaming: "Listening",
    interpretFallback: "Inner",
    interpretDone: "Reflected",
    interpretOnDemand: "When invited",

    aiKicker: "OPTIONAL",
    aiButton: "Look deeper",
    aiHint: "A second mirror layer — only when you want it.",
    aiLoadingText: "Listening with the passage...",
    aiLoadingHint: "Aletheia is weaving your situation, symbol, and passage context together.",
    aiLabelOracle: "A SECOND MIRROR",
    aiLabelFallback: "INNER REFLECTION",
    oracleLabel: "reflection layer",
    fallbackLabel: "inner reflection",

    shareButton: "Share",
    completeButton: "Complete",
    completingButton: "Closing the ritual...",

    aiTrustTitle: "AletheiA + AI",
    aiTrustPoints: [
      "AI is only called when you tap.",
      "AletheiA sends the passage, symbol, and what you wrote to create the reflection.",
      "Your reading history stays on your device.",
      "You can use AletheiA without AI.",
    ] as string[],
    aiTrustConfirm: "Look deeper",
    aiTrustCancel: "Stay with the passage",

    aiError: "The mirror is quiet right now. Let the passage speak for itself.",
    saveError: "Could not save this reading. The moment still belongs to you.",

    aftertastePrompt: "What does this reading leave behind?",
    aftertasteLighter: "Lighter",
    aftertasteClearer: "Clearer",
    aftertasteStillHeavy: "Still heavy",
    aftertasteTouched: "Touched",
    aftertasteNotRight: "Not quite right",
  },

  mirror: {
    title: "Mirror",
    countLabel: (visible: number, total: number) => total === 0 ? "Mirror is empty" : `${visible} of ${total} readings shown`,
    searchPlaceholder: "Search by situation, source, or symbol",

    deleteReading: "Delete this reading",
    deleteConfirmTitle: "Delete reading?",
    deleteConfirmBody: "This reading will be removed from the Mirror. This cannot be undone.",
    deleteConfirmYes: "Delete",
    deleteConfirmNo: "Keep it",

    emptyTitle: "Mirror is empty",
    emptyBody: "Start your first reading. Every reading will be saved here.",
    emptyFilteredTitle: "No results found",
    emptyFilteredBody: "Try changing the search, filter, or sort to see your archive from a different angle.",
    startReading: "Start reading",
    noSituation: "No situation",

    filterAll: "All",
    filterFavorites: "Kept",
    filterAI: "Looked deeper",
    filterShared: "Sent away",
    sortLatest: "Newest",
    sortOldest: "Oldest",
    sortDepth: "Resonant",

    dateToday: "Today",
    dateYesterday: "Yesterday",
    daysAgo: (n) => `${n} days ago`,

    hideSituationOn: "Hide situation",
    hideSituationOff: "Show situation",
    situationHidden: "· · ·",
    a11yOpenReading: "Open reading",
  },

  preview: {
    tapHint: "tap to skip ahead",
  },

  settings: {
    title: "Settings",
    subtitle: "Language, notifications, and what you want to keep.",

    languageSection: "Language",
    languageVi: "Tiếng Việt",
    languageEn: "English",

    notificationSection: "Daily Passage",
    notificationToggleOn: "On",
    notificationToggleOff: "Off",
    notificationTimeLabel: "Send at",
    notificationBody: "Each morning, if you want, Aletheia leaves a small passage on your lock screen. No need to open the app.",
    notificationPermissionDenied: "Notification permission denied. Go to system Settings to re-enable.",

    weeklySummarySection: "Weekly Mirror",
    weeklySummaryToggleOn: "On",
    weeklySummaryToggleOff: "Off",
    weeklySummaryBody: "Every Saturday, your device privately summarises your reading week — fully offline, no data leaves your phone.",

    aboutSection: "About Aletheia",
    aboutPrivacy: "Data is stored locally and never sent anywhere.",
    aboutVersion: "Version",

    privacySection: "Privacy & Data",
    analyticsSection: "Anonymous Analytics",
    analyticsToggleOn: "On",
    analyticsToggleOff: "Off",
    analyticsBody: "Counts anonymous events — no personal content, no identifiers.",

    privacyLedgerSection: "Data Footprint",
    privacyLedgerStaysTitle: "Stays on your device",
    privacyLedgerStaysItems: [
      "All readings and situation text",
      "Symbol history and mood tags",
      "Settings and user intent",
    ] as string[],
    privacyLedgerLeavesTitle: "Leaves when you use AI",
    privacyLedgerLeavesItems: [
      "The passage selected",
      "The symbol chosen",
      "The situation text you wrote (if any)",
    ] as string[],

    deleteAllReadingsLabel: "Delete all readings",
    deleteAllConfirmTitle: "Delete everything?",
    deleteAllConfirmBody: "All readings will be permanently deleted. This cannot be undone.",
    deleteAllConfirmYes: "Delete all",
    deleteAllSuccess: "All readings deleted",
    
    syncSectionTitle: "Sync Options",
    syncNoAccountInfo: "AletheiA works completely offline without an account. Sign in only if you want to sync between devices.",
  },

  auth: {
    signIn: "Sign in",
    signUp: "Create account",
    signOut: "Sign out",
    continueAsGuest: "Continue without account",
    email: "Email",
    password: "Password",
    name: "Your name (optional)",
    alreadyHaveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    verifyEmailTitle: "Verify email",
    verifyEmailBody: "We sent a 6-digit code to your email.",
    verifyCode: "Enter verification code",
    verify: "Verify",
    resendCode: "Resend code",
    signedInAs: "Signed in",
    guestMode: "Guest mode",
    accountBenefits: "Sign in to sync your reading history across devices.",
    errorInvalid: "Invalid email or password.",
    errorGeneric: "Something went wrong. Please try again.",
    orContinueWith: "or",
    backToSignIn: "Back to sign in",
  },
};
