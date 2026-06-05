# Pattern Debt Registry

<!-- Format: PATTERN-DEBT-<slug> per shared/pattern-debt-schema.md -->
<!-- Lifecycle: OPEN → IN_PROGRESS → RESOLVED. Fill actual_outcome after retro. -->

---

PATTERN-DEBT-native-module-unmocked-in-node-test:
  pattern: "lib/service or lib/util imports a React Native / Expo native module (expo-secure-store, expo-notifications, AsyncStorage) — if a test imports this lib in environment:node without vi.mock, Rollup parse fails with 'Expected X, got Y'"
  grep_cmd: "grep -rn 'expo-secure-store|expo-notifications|@react-native-async-storage' lib/services/ lib/utils/ --include='*.ts'"
  found: 4
  fixed_now:
    - "lib/utils/novelty-guard.ts — mocked in tests/reading-engine.test.ts"
    - "lib/services/current-user-id.ts — already mocked in tests/reading-engine.test.ts"
  remaining: 2
  remaining_files:
    - "lib/services/notification-service.ts (expo-notifications) — no test imports it yet"
    - "lib/services/interpretation-orchestrator.ts (AsyncStorage) — no test imports it yet"
  priority: MEDIUM
  owner: ybao
  created_date: "2026-06-03"
  created_sprint: "ux-polish-breathing-haptics-a11y"
  review_interval: "when a new test imports notification-service or interpretation-orchestrator"
  resolution_trigger: "any new test that imports notification-service or interpretation-orchestrator must add vi.mock for the native dep before the test can pass"
  status: OPEN
  resolved_date: null
  actual_outcome: UNKNOWN

---

PATTERN-DEBT-stale-mock-api-name:
  pattern: "Test mocks a store/service method by name after the service renamed it. Mock targets old name silently — no error unless method is called, causes 'X is not a function' at runtime."
  grep_cmd: "grep -rn 'getRandomSource:|getRandomPassage:' tests/ --include='*.ts'"
  found: 2
  fixed_now:
    - "tests/reading-engine.test.ts — getRandomSource→getRandomSourceWeighted, getRandomPassage→getRandomPassageExcluding"
  remaining: 2
  remaining_files:
    - "tests/reading-engine.test.ts:9 — dead mock entry 'getRandomSource: vi.fn()' (harmless, misleading)"
    - "tests/reading-engine.test.ts:11 — dead mock entry 'getRandomPassage: vi.fn()' (harmless, misleading)"
  priority: LOW
  owner: ybao
  created_date: "2026-06-03"
  created_sprint: "ux-polish-breathing-haptics-a11y"
  review_interval: "next store API refactor"
  resolution_trigger: "next time store mock is updated: remove dead entries getRandomSource and getRandomPassage from mock definition"
  status: OPEN
  resolved_date: null
  actual_outcome: UNKNOWN

---

PATTERN-DEBT-locale-hardcoded-display-font:
  pattern: "i18n localized strings rendered with Fonts.viDisplay hardcoded instead of useDisplayFont().display — English-locale users see EB Garamond instead of Cinzel for display/title text"
  grep_cmd: "grep -rn 'Fonts\\.viDisplay\\|Fonts?.viDisplay' . --include='*.tsx' --include='*.ts' | grep -v node_modules"
  found: 40
  fixed_now:
    - "components/ai-trust-sheet.tsx:25 — s.passage.aiTrustTitle title"
    - "components/ai-trust-sheet.tsx:43 — s.passage.aiTrustConfirm button"
    - "components/pressable-card.tsx:179 — AnimatedButton title prop"
    - "app/_layout.tsx:73 — RootGate gateTitle"
    - "app/_layout.tsx:81 — RootGate gateButtonText"
    - "app/(tabs)/mirror.tsx:219 — s.mirror.emptyTitle"
    - "app/(tabs)/mirror.tsx:233 — s.mirror.startReading"
    - "app/(tabs)/mirror.tsx:244 — s.mirror.title"
    - "app/(tabs)/index.tsx:72 — s.home.cta"
    - "components/error-boundary.tsx:21 — s.errorBoundary.title"
    - "components/error-boundary.tsx:34 — s.errorBoundary.retry"
  remaining: 29
  remaining_files:
    - "components/onboarding-passage-preview.tsx:157"
    - "components/crisis-response-modal.tsx:34,59"
    - "app/onboarding/index.tsx:148,175,219"
    - "app/reading/ritual.tsx:139"
    - "app/reading/passage.tsx:200,223,333,385"
    - "app/reading/ai-streaming.tsx:66,82,96,182"
    - "app/(auth)/sign-in.tsx:118,201"
    - "app/(tabs)/settings.tsx:218"
    - "app/reading/share-card.tsx:200,250,339"
    - "app/reading/wildcard.tsx:108,200,238"
    - "app/reading/situation.tsx:104,152"
    - "app/reading/[id].tsx:262,279,289,309,340,349,429(x2)"
  priority: HIGH
  owner: ybao
  created_date: "2026-06-05"
  created_sprint: "vheatm-audit-typography-color"
  review_interval: "every sprint until resolved"
  resolution_trigger: "zero results from grep_cmd targeting Fonts.viDisplay on i18n-rendered text — add ESLint rule to enforce useDisplayFont() instead of raw Fonts.viDisplay/Fonts.display on localized strings"
  status: RESOLVED
  resolved_date: "2026-06-05"
  actual_outcome: NO_IMPACT
