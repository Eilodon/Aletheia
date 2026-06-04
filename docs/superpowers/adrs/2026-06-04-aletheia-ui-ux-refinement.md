# ADR: AletheiA UI/UX Premium Refinement & Archetype Integration

## 1. Title
Refactoring the visual architecture to enforce Low Entropy (max-w-[430px]), Privacy-First settings, and Native integration of Premium Archetype Symbols with deterministic fallback.

## 2. Context
AletheiA's mission is to act as a Cognitive Sanctuary. However, the previous UI suffered from high visual entropy on wide screens, misplaced settings priorities (Account above Privacy), and "Tarot-coded" language ("Lật một lá") rather than the intended philosophical/Archetype tone. Furthermore, Vietnamese typography using Cinzel experienced severe degradation (fallback font rendering) due to incompatible lowercase glyphs, and the core symbol representation relied on simple text emojis rather than premium visual assets.

## 3. Decision
We enacted a systemic UI/UX remediation:
1. Enforced a rigid `max-w-[430px]` constraint on Web to maintain Mobile-First focus and prevent layout drift.
2. Restructured the Settings screen to place "Privacy & Data" at the absolute top, reinforcing the local-first philosophy.
3. Rewrote copywriting from "Lật một lá" to "Chọn một biểu tượng" to center on Archetypes.
4. Generated and integrated 6 high-fidelity premium image assets (`earth`, `water`, `lightning`, `fire`, `wind`, `mirror`).
5. Implemented a deterministic hashing fallback map (`archetypeMap`) in the Asset Registry to gracefully downgrade any of the 64 unknown symbols from the Mock DB into the 6 available core archetypes.
6. Forced `textTransform: "uppercase"` on Vietnamese labels to bypass the Cinzel small-caps fallback bug.

## 4. Status
ACCEPTED

## 5. Consequences
*   **Improved:** Visual integrity is preserved across devices; Premium Assets vastly improve the immersion; the product philosophy (Privacy & Archetypes) is immediately apparent in the UX structure.
*   **Worsened:** Additional image assets increase bundle size slightly. The hashing fallback means that specific symbols (like 'Fox' or 'Forest') will share visual assets with their elemental archetype ('Fire' or 'Wind') until distinct assets are generated.
*   **Debt Created:** The `archetypeMap` is hardcoded. If the source DB expands significantly, this deterministic map must be maintained or fully replaced by dynamically generated assets per symbol ID.

## 6. Alternatives Considered
*   **Fixing Cinzel with a Custom Font Build:** Rejected because it would bloat the payload and delay deployment. `textTransform: "uppercase"` immediately fixed the artifacting without new HTTP requests.
*   **Generating 64 Unique Assets at Once:** Rejected due to time constraints and the need to verify the core pipeline first. Mapped to 6 foundational archetypes to achieve immediate MVP premium state.

## 7. Evidence
[VERIFIED 2026-06-04] E2E visual audit via Browser Subagent confirms the `max-w-[430px]` applies correctly on Web. 
[VERIFIED 2026-06-04] Symbol `summit` automatically hashed/mapped to `earth` asset rendering perfectly in `app/reading/wildcard.tsx` and `passage.tsx`.
[VERIFIED 2026-06-04] Text rendering `CỬA SÔNG` via `uppercase` successfully circumvents the Cinzel fallback bug.

## 8. Owner
Eidolon-V

## 8b. Known Debts (PATTERN-DEBT)
PATTERN-DEBT entries introduced or affected by this change:
  - PATTERN-DEBT-hardcoded-archetype-map: OPEN — 1

## 9. Next Cycle Trigger
When the number of unique symbols in the Database exceeds 100 OR when users report cognitive dissonance from the shared fallback assets (e.g., 'Fox' rendering as 'Fire' feeling mismatched).

## 10. Cycle Retrospective
* What assumption proved wrong during this implementation? We assumed the Cinzel font supported full Vietnamese small-caps; it failed aggressively, requiring CSS intervention.
* What surprised us about the codebase / domain / dependencies? The `aletheia-core` seed data had vastly more symbols than the MVP 6, meaning an immediate deterministic fallback map was required to prevent blank images.
* What would we design differently if starting over? We would separate the `Archetype` (Image Asset) from the `Symbol` (Thematic identifier) strictly in the DB schema, rather than coercing the `symbol.id` to map directly to an image filename.
* What debt was knowingly created and why? Hardcoded `archetypeMap` to safely map 64 symbols into 6 assets to unblock the MVP "Premium" UI feel.
* What signal should the next cycle watch for? Watch for visual layout breaks on ultra-small screens (e.g., iPhone SE) since the typography sizes were increased slightly for legibility.
