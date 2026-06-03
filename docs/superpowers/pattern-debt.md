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
