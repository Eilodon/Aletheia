---
name: vheatm-decide
description: >
  VHEATM 5.0 Pillar [A] — Architecture Synthesis. Convert verified simulation results
  into enforceable architectural decisions (ADRs). Triggers when vheatm-orchestrate reaches [A],
  or when asked to "write an ADR", "document this architectural decision".
  Requires confirmed simulation evidence from [E]. Never make ADR on assumption.
---

# [A] Architecture Synthesis

> **Purpose:** Turn empirical evidence into hard boundaries. Decisions must be enforceable.

**Input:** KB-state.md with confirmed [E] simulation results  
**Output:** ADR entries with thermodynamic weight → KB-state.md ADR Log

---

## Rule: Evidence Before ADR

Every ADR requires simulation evidence from [E]. If lacks:
- A specific experiment that verified it
- Concrete results from that experiment

→ Return to [E] first. Do not write ADR on assumption.

---

## ADR Template — 5 Mandatory Fields

```markdown
### ADR-[NNN] | Level: [🔴 MANDATORY / 🟠 REQUIRED / 🟡 RECOMMENDED / ⚪ OPTIONAL]

**Problem:**
Clear, specific description of failure mode or uncertainty.
Not: "we should handle errors better"
Yes: "FastAPI lifespan events fail silently when async init throws"

**Decision:**
The specific choice made. No ambiguity.
Not: "errors should be handled"
Yes: "All lifespan startup hooks must use explicit try/except"

**Evidence:**
Which simulation confirmed this? Specific experiment ID and result.
"E-Sim H-02 confirmed: async lifespan event swallows RuntimeError..."

**Pattern:**
The mandatory code pattern or rule to enforce.

**Rejected Alternatives:**
What was considered and why not chosen.
```

---

## ADR 4-Level Classification

| Level | Meaning | Violation consequence | Verification |
|---|---|---|---|
| 🔴 **MANDATORY** | Cannot be violated | Crash, data loss, security | Must verify by simulation |
| 🟠 **REQUIRED** | Must implement | Latent bug | Strong recommendation to simulate |
| 🟡 **RECOMMENDED** | Best practice | Technical debt | Code review sufficient |
| ⚪ **OPTIONAL** | Nice-to-have | Skip if constrained | No verification required |

---

## Thermodynamic Weight Assignment

```python
LAMBDA_BASE_DEFAULT = 0.2  # tune ∈ [0.15, 0.25]

def thermodynamic_decay(weight: float, λ: float = 0.2) -> float:
    import math
    return weight * math.exp(-λ)

# Cycle 0:  w = 1.000
# Cycle 5:  w ≈ 0.37   (alive — above 0.3)
# Cycle 10: w ≈ 0.14   (fading)
# Cycle 20: w ≈ 0.018  (forgotten)
```

### When to tune λ:
- λ = 0.15: Stable, long-lived patterns (core auth, DB)
- λ = 0.20: Default for most
- λ = 0.25: Fast-moving areas (frontend, API versioning)

---

## Energy Tax — Priority Within Same Level

```python
# β=1.0, γ=0.5 — default
priority = (score * β) - (cost * γ)
# score: architectural impact (0-1)
# cost: estimated cost (0-1)
```

---

## Competing Decisions — Resolution Protocol

If two ADRs conflict:
1. Check evidence strength
2. Check recency
3. Check weight (w > 0.3?)
4. Write new ADR that explicitly supersedes

```markdown
ADR-[NNN] supersedes ADR-[X] and ADR-[Y].
Reason: [evidence from recent simulation]
Previous decisions archived: SUPERSEDED
```

---

## Output Format

Append to `KB-state.md`:

```markdown
## [A] Decide — Cycle #N — [timestamp]

### New ADRs This Cycle

#### ADR-[NNN] | 🔴 MANDATORY
**Problem:** ...
**Decision:** ...
**Evidence:** Simulation [H-ID], cycle #N
**Pattern:** [code or rule]
**Rejected:** [alternatives]
**Initial weight:** 1.0 | **λ:** 0.20 | **Energy Tax:** [calculated]

### Superseded ADRs
[list previous ADRs marked SUPERSEDED]

### ADR Weight Decay This Cycle
| ADR-ID | Previous | New | λ | Status |
|---|---|---|---|---|
| ADR-001 | 0.40 | 0.33 | 0.20 | ALIVE |
| ADR-003 | 0.12 | 0.10 | 0.20 | ⚠️ FADING |
```

---

## Checklist Before Handing Off to [T]

- [ ] Every ADR has all 5 fields
- [ ] Every ADR has a level
- [ ] Every ADR has simulation evidence reference
- [ ] Thermodynamic weight + λ documented
- [ ] Energy Tax calculated for same-level ADRs
- [ ] Conflicting ADRs identified and resolved
- [ ] KB-state.md ADR Log updated
- [ ] Weight decay applied

**→ Hand off to `vheatm-transform` ([T])**
