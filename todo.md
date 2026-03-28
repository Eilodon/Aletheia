# Aletheia App - Project TODO

## Phase 1: Core Infrastructure & Data Layer

- [ ] Set up SQLite database schema with migrations
- [ ] Create TypeScript types and contracts (Reading, Source, Passage, Theme, Symbol, etc.)
- [ ] Seed bundled sources data (I Ching, Bible, Hafez, Rumi, Meditations, Tao Te Ching)
- [ ] Implement Store service (CRUD operations for all entities)
- [ ] Set up AsyncStorage for user preferences and session state
- [ ] Create UserState management (subscription tier, daily limits, preferences)

## Phase 2: Core Reading Engine

- [ ] Implement ReadingEngine service (perform_reading, choose_symbol, complete_reading)
- [ ] Implement ThemeEngine service (get_random_theme, random_three_symbols)
- [ ] Create reading state machine (Idle → Complete)
- [ ] Implement daily limit checking (Free tier: 3 readings/day)
- [ ] Add read_duration tracking
- [ ] Implement auto-save after 30 seconds

## Phase 3: UI Screens - Basic Navigation

- [ ] Create Home screen with "Lật lá" button
- [ ] Create Situation Input screen (optional, skippable)
- [ ] Create Source Selection screen with 6 sources + random option
- [ ] Create Wildcard screen with 3 symbols (manual + auto paths)
- [ ] Create Ritual Animation screen (book flip)
- [ ] Create Passage Display screen
- [ ] Create Complete screen with Save/Share options
- [ ] Create History screen with list of past readings
- [ ] Create Settings screen with preferences
- [ ] Set up tab navigation (Home, History, Settings)

## Phase 4: UI Polish - Animations & Interactions

- [ ] Add symbol reveal animation (staggered fade-in, 200ms each)
- [ ] Add book flip animation (600-800ms rotation)
- [ ] Add typewriter effect for AI responses
- [ ] Add press feedback (scale + opacity) to buttons and cards
- [ ] Add haptic feedback (Light, Medium, Success, Error)
- [ ] Add screen transitions (250ms fade)
- [ ] Add loading indicators (spinners, dots)

## Phase 5: AI Integration

- [ ] Set up Claude API integration
- [ ] Implement AIClient service with streaming
- [ ] Create AI prompt builder (passage + symbol + situation)
- [ ] Implement 15-second timeout with fallback
- [ ] Implement AI Streaming screen with typewriter effect
- [ ] Implement AI Fallback screen with static prompts
- [ ] Add offline detection for automatic fallback
- [ ] Implement daily AI limit (Free tier: 1/day)

## Phase 6: Share Card Generation

- [ ] Create CardGenerator service (SVG → PNG)
- [ ] Design share card template with tradition-specific ornaments
- [ ] Implement card rendering (1080×1920px story format)
- [ ] Add watermark for Free tier users
- [ ] Implement share sheet integration
- [ ] Add "shared" flag to reading data
- [ ] Test card generation performance (target ≤500ms)

## Phase 7: Notifications

- [ ] Set up daily notification scheduling
- [ ] Create notification matrix (150 symbol + question pairs)
- [ ] Implement deterministic seeding (hash(user_id + date))
- [ ] Add notification settings screen (toggle, time picker)
- [ ] Test notification delivery on iOS and Android
- [ ] Add notification permission handling

## Phase 8: Subscription & Monetization

- [ ] Integrate RevenueCat SDK
- [ ] Set up Pro tier entitlements
- [ ] Create subscription UI (upgrade button, pricing)
- [ ] Implement paywall for premium themes
- [ ] Add subscription status to settings
- [ ] Test subscription flows (purchase, restore, expiry)

## Phase 9: Data Persistence & Sync

- [ ] Implement SQLite migrations
- [ ] Add database backup/restore functionality
- [ ] Test data persistence across app restarts
- [ ] Implement history export (optional)
- [ ] Add data deletion (clear history, reset app)

## Phase 10: Testing & QA

- [ ] Unit tests for ReadingEngine
- [ ] Unit tests for ThemeEngine
- [ ] Unit tests for Store service
- [ ] Integration tests for reading flow
- [ ] End-to-end testing (all screens, all flows)
- [ ] Offline testing (airplane mode)
- [ ] Performance testing (cold start, screen transitions)
- [ ] Accessibility testing (VoiceOver, text scaling)
- [ ] iOS device testing
- [ ] Android device testing

## Phase 11: Branding & Assets

- [ ] Generate app logo (square, iconic, fills entire space)
- [ ] Create splash screen icon
- [ ] Create favicon for web
- [ ] Create Android adaptive icon (foreground + background)
- [ ] Update app.config.ts with branding (appName, logoUrl)
- [ ] Design tradition-specific ornaments (6 variations)
- [ ] Create symbol icons for all themes

## Phase 12: Polish & Optimization

- [ ] Optimize app bundle size
- [ ] Implement code splitting for lazy loading
- [ ] Add error boundaries and error handling
- [ ] Implement analytics (optional, privacy-respecting)
- [ ] Add app store screenshots and descriptions
- [ ] Create onboarding flow (first-time user experience)
- [ ] Add tutorial/help screen
- [ ] Implement dark mode support

## Phase 13: Documentation & Deployment

- [ ] Write README with setup instructions
- [ ] Document API contracts
- [ ] Create user privacy policy
- [ ] Create terms of service
- [ ] Prepare app store listings (iOS App Store, Google Play)
- [ ] Create beta testing group (TestFlight, Google Play Beta)
- [ ] Gather feedback from beta testers
- [ ] Fix critical bugs from beta feedback

## Phase 14: Launch & Post-Launch

- [ ] Final QA pass
- [ ] Deploy to iOS App Store
- [ ] Deploy to Google Play Store
- [ ] Monitor crash reports and analytics
- [ ] Respond to user reviews
- [ ] Plan v1.1 features based on feedback
- [ ] Track key metrics (DAU, subscription conversion, share rate)

## Deferred Features (v2.0+)

- [ ] Your Mirror UI (emotional pattern tracking)
- [ ] UGC Marketplace (user-created themes)
- [ ] Cloud sync (cross-device history)
- [ ] Social features (follow friends, shared readings)
- [ ] Gift redemption UI improvements
- [ ] Advanced analytics dashboard
- [ ] Audio narration of passages
- [ ] Video content support
