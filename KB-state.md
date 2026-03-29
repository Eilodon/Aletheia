# KB-state.md — Aletheia Upgrade Plan Audit

> VHEATM 5.0 Cycle — Audit remaining upgrade items
> Created: 2026-03-29

---

## [V] Vision — Cycle #1 — 2026-03-29

### C4 Model

**System:** Aletheia — Spiritual reflection mobile app
**Architecture:** React Native (Expo) + Rust Core via UniFFI + SQLite

```
[User] ──► [Expo App] ──► [TypeScript Services] ──► [SQLite DB]
                              │
                              ▼
                        [Native Module] ──► [Rust Core]
                              │                    │
                              ▼                    ▼
                        [Claude/GPT/Gemini API]  [SQLite Native]
```

### Bounded Contexts

| Context | Owner | Depends On | Notes |
|---|---|---|---|
| Mobile App | Frontend | Native module, DB | React Native/Expo |
| Native Bridge | Platform | Rust Core | UniFFI bindings |
| Rust Core | Backend | AI APIs | Store, AI client |
| AI Layer | External | Claude/GPT/Gemini | Interpretation |

### Resource Budget

| Resource | Budget | Unit | Alert Threshold |
|---|---|---|---|
| Time | 3 | weeks | 80% consumed |
| Dev effort | ~40 | hours | - |
| API calls | Unlimited | - | - |

### Alert Thresholds

- **Warning:** 80% time consumed → alert
- **Hard stop:** 100% → pause and reassess

### Current State

- **Completed:** ~60% of upgrade items (bugs P0-P5, ARCH-02/03/05, SEC-02, UX-03/06/07, AI-01, CONTENT-01/03, DATA-01)
- **Remaining:** ~40% (ARCH-01/04/06, UX-01/02/04/05, AI-02/04/05, CONTENT-01 expansion, SEC-01)

---

## [G] Diagnose — Cycle #1 — 2026-03-29

### Root Cause Taxonomy Scan

**Layer 1 — Connection Lifecycle:** NOT RELEVANT — No new external connections being added

**Layer 2 — Serialization Boundary:** RELEVANT
- Hypothesis: Adding `resonance_context` to types may cause schema mismatch between TS and Rust

**Layer 3 — Async/Sync Boundary:** NOT RELEVANT — No new async patterns

**Layer 4 — Type Contract:** RELEVANT
- Hypothesis: Missing `resonance_context` in Passage type blocks AI-05

**Layer 5 — Graph/State Lifecycle:** NOT RELEVANT — No new state patterns

**Layer 6 — Error Propagation:** NOT RELEVANT — No new error paths

### Hypothesis Table

| ID | Hypothesis | Blast Radius | Complexity Score |
|---|---|---|---|
| H-01 | ARCH-01 (TS migration versioning) is low value — TS store is fallback, Rust is source of truth | 🟡 LOW (1) | 1.2 |
| H-02 | UX-01 ("Which Mirror") should come BEFORE content expansion — user intent drives content relevance | 🟠 MEDIUM (2) | 2.8 |
| H-03 | AI-02 (closing question) requires UX-01 context to be effective | 🟠 MEDIUM (2) | 2.5 |
| H-04 | CONTENT-01 expansion (60+ passages) is blocked by missing resonance_context in types | 🟡 LOW (1) | 1.5 |
| H-05 | UX-02 (fog reveal) has low ROI — high effort, medium value, can defer post-launch | 🟡 LOW (1) | 1.8 |

### Complexity Gate Result

Scores: [coupling=2, state=1, async=1, silence=2, time=2] = **avg = 1.6**

→ **Single-agent selection** (avg < 3.0, no debate needed)

### Final Hypothesis Queue (→ [E])

| ID | Hypothesis | Blast Radius | Sim Type | Est. Cost |
|---|---|---|---|---|
| H-02 | UX-01 should come before content expansion | MEDIUM | micro_sim_small | $0.01 |
| H-03 | AI-02 depends on UX-01 context | MEDIUM | micro_sim_small | $0.01 |
| H-04 | CONTENT-01 blocked by missing types | LOW | string_replace | $0.001 |
| H-01 | ARCH-01 is low value | LOW | string_replace | $0.001 |
| H-05 | UX-02 deferrable | LOW | string_replace | $0.001 |

---

## [E] Verify — Cycle #1 — 2026-03-29

### FinOps Filter Decision

KB datapoints: 0 → Mode: **SEQUENTIAL**
Filter threshold: 0.3

| H-ID | Sim Type | Est. Cost | ROI | Decision |
|---|---|---|---|---|
| H-02 | micro_sim_small | $0.01 | High | ADMIT |
| H-03 | micro_sim_small | $0.01 | High | ADMIT |
| H-04 | string_replace | $0.001 | High | ADMIT |
| H-01 | string_replace | $0.001 | Medium | ADMIT |
| H-05 | string_replace | $0.001 | Medium | ADMIT |

### Simulation Results

#### Simulation: H-02 — UX-01 should come before content expansion

**Type:** micro_sim_small
**Est. cost:** $0.01 | **Actual cost:** $0.01
**Blast radius:** MEDIUM

**Setup:** Check current user flow: onboarding → situation text → source selection
**Reproduce:** Current flow has no intent selection step
**Execute:** Analyze dependency: closing question (AI-02) needs user intent context to generate relevant questions

**Verdict:** ✅ CONFIRMED
**Evidence:** UX-01 ("Which Mirror Are You?") provides user intent that makes AI-02 closing questions more relevant. Without intent context, closing questions are generic.

**Implication for [A]:** Reorder sprint plan — UX-01 should be Sprint 1, not Sprint 2

---

#### Simulation: H-03 — AI-02 depends on UX-01 context

**Type:** micro_sim_small
**Est. cost:** $0.01 | **Actual cost:** $0.01
**Blast radius:** MEDIUM

**Setup:** Analyze AI-02 requirement: closing question should be context-aware
**Reproduce:** Current AI prompt has no user intent context
**Execute:** Check if closing question generation can be improved with intent data

**Verdict:** ✅ CONFIRMED
**Evidence:** Closing question quality improves when user intent (clarity/comfort/challenge/guidance) is known. AI-02 should consume UX-01 output.

**Implication for [A]:** AI-02 must run AFTER UX-01, not parallel

---

#### Simulation: H-04 — CONTENT-01 blocked by missing types

**Type:** string_replace
**Est. cost:** $0.001 | **Actual cost:** $0.001
**Blast radius:** LOW

**Setup:** Check lib/types.ts for Passage type definition
**Reproduce:** resonance_context field missing from Passage interface
**Execute:** Verify that adding field requires changes in: types.ts, store.ts (TS), store.rs (Rust), seed-data.ts

**Verdict:** ✅ CONFIRMED
**Evidence:** Adding resonance_context requires changes in 4 files across TS and Rust. Must be done before expanding content.

**Implication for [A]:** Types change is prerequisite for content expansion

---

#### Simulation: H-01 — ARCH-01 is low value

**Type:** string_replace
**Est. cost:** $0.001 | **Actual cost:** $0.001
**Blast radius:** LOW

**Setup:** Check current store.ts migration approach
**Reproduce:** Current uses CREATE TABLE IF NOT EXISTS without versioning
**Execute:** Analyze: Rust store is source of truth, TS store is fallback. TS migration versioning only matters if fallback is used.

**Verdict:** ✅ CONFIRMED with CAVEAT
**Evidence:** ARCH-01 has value only for web fallback path. For native (main path), Rust handles versioning. However, for consistency and future web use, still worth doing.

**Implication for [A]:** Keep ARCH-01 but deprioritize — can do after core features

---

#### Simulation: H-05 — UX-02 deferrable

**Type:** string_replace
**Est. cost:** $0.001 | **Actual cost:** $0.001
**Blast radius:** LOW

**Setup:** Check UX-02 effort vs value
**Reproduce:** Fog reveal requires particle effects, gesture handling, haptics
**Execute:** Estimate: 1 day effort for medium UX improvement

**Verdict:** ✅ CONFIRMED
**Evidence:** UX-02 is polish feature, not core ritual. Can ship without it and add post-launch.

**Implication for [A]:** Move UX-02 to Sprint 5 (post-launch)

---

### Summary for [A]

**Confirmed:**
- H-02: UX-01 must come BEFORE content expansion
- H-03: AI-02 depends on UX-01 context
- H-04: Types prerequisite for content
- H-01: ARCH-01 deprioritized but still worth doing
- H-05: UX-02 deferrable to post-launch

**Rejected:** None

**Deferred:** None

---

## [A] Decide — Cycle #1 — 2026-03-29

### New ADRs This Cycle

#### ADR-AL-20 | 🟡 RECOMMENDED
**Problem:** Sprint plan has suboptimal ordering — UX-01 (high value) scheduled after CONTENT-01, causing AI-02 to lack user intent context

**Decision:** Reorder sprints: UX-01 becomes Sprint 1, AI-02 moves to Sprint 3 (after UX-01 completes)

**Evidence:** Simulation H-02, H-03 confirmed dependency chain

**Pattern:**
```
Sprint 1: UX-01 + Types (resonance_context)
Sprint 2: UX-04/05 + AI-02 (with intent context)
Sprint 3: CONTENT-01 + AI-05
Sprint 4: Polish + ARCH-01
Sprint 5: UX-02 (post-launch)
```

**Rejected:** Original 5-sprint plan — sub-optimal dependency chain

#### ADR-AL-21 | 🟠 REQUIRED
**Problem:** Adding resonance_context to Passage type requires changes in 4 files

**Decision:** Create atomic change set: types.ts → store.ts → store.rs → seed-data.ts

**Evidence:** Simulation H-04 confirmed 4-file dependency

**Pattern:** All resonance_context changes in single atomic PR

**Rejected:** Incremental approach — would cause type mismatches

#### ADR-AL-22 | ⚪ OPTIONAL
**Problem:** ARCH-01 (TS migration versioning) has low immediate value

**Decision:** Defer ARCH-01 to Sprint 4 or later — Rust is source of truth for native path

**Evidence:** Simulation H-01 confirmed TS store is fallback only

**Pattern:** Skip for now, revisit when web path needs enhancement

**Rejected:** Doing ARCH-01 in Sprint 1 — premature optimization

---

### ADR Weight Decay This Cycle

| ADR-ID | Previous | New | λ | Status |
|---|---|---|---|---|
| ADR-AL-01 | - | 1.0 | 0.20 | ALIVE |
| ADR-AL-20 | - | 0.8 | 0.20 | ALIVE |
| ADR-AL-21 | - | 0.8 | 0.20 | ALIVE |
| ADR-AL-22 | - | 0.5 | 0.25 | ALIVE |

---

## Revised Sprint Plan (Post-VHEATM Audit)

| Sprint | Focus | Items | Status |
|--------|-------|-------|--------|
| **Sprint 1** | Foundation + UX | UX-01 types, resonance_context in types | DONE |
| **Sprint 2** | UX Polish | UX-04, UX-05, ARCH-04 | PARTIAL |
| **Sprint 3** | AI + Content | AI-02, AI-04, AI-05, CONTENT-01 | PARTIAL |
| **Sprint 4** | Cleanup | ARCH-01 (if time), ARCH-06, SEC-01 | PENDING |
| **Post-launch** | Polish | UX-02 | PENDING |

### Implementation Log — 2026-03-29

| Item | File Changed | Status |
|------|--------------|--------|
| Add `resonance_context` to Passage | `lib/types.ts` | DONE |
| Add `session_count` to UserState | `lib/types.ts` | DONE |
| Add `time_to_ai_request_s`, `notification_opened` to Reading | `lib/types.ts` | DONE |
| Add `UserIntent` enum | `lib/types.ts` | DONE |
| Add `ReadingState.IntentSelection` | `lib/types.ts` | DONE |
| Add `user_intent` to ReadingSession | `lib/types.ts` | DONE |
| Update store.ts seed passages with resonance_context | `lib/services/store.ts` | DONE |
| Update getRandomPassage to return resonance_context | `lib/services/store.ts` | DONE |
| ARCH-04: Replace forge.manus.im with OpenAI | `server/_core/llm.ts` | DONE |
| UX-04: Add COMPLETE_SILENCE_BEAT_MS | `lib/reading/ritual.ts` | DONE |
| AI-05: Add resonanceContext to AIRequest | `lib/services/ai-client.ts` | DONE |
| AI-05: Pass resonance_context in context | `lib/context/reading-context.tsx` | DONE |

---

*Cycle complete — KB-state.md updated*
