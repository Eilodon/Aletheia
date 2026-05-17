---
name: vheatm-orchestrate
description: >
  Master orchestrator for VHEATM 5.0 framework. Use as ENTRY POINT for auditing systems,
  researching architectures, analyzing complex projects, planning upgrades, or systematically
  improving a codebase. Routes through all VHEATM pillars: [V] → [G] → [E] → [A] → [T] → [M].
---

# VHEATM 5.0 — Orchestrator

> "No patch without proof — and no proof is free."
> *B.ONE · v5.0 · 2026*

## What This Framework Does

VHEATM 5.0 enforces: map before act, verify before transform, measure everything, forget at the right speed.

**Six pillars, one living feedback loop:**

| Skill | Pillar | Role |
|---|---|---|
| `vheatm-vision` | [V] Vision & Boundary Mapping | Map system, set resource budget |
| `vheatm-diagnose` | [G] Generation & Hypothesis | Root cause taxonomy + debate gate |
| `vheatm-verify` | [E] Experiment via Simulation | Empirical verification before any change |
| `vheatm-decide` | [A] Architecture Synthesis | ADR decisions with thermodynamic weight |
| `vheatm-transform` | [T] Transformation via Automation | Safe, verified, rollback-ready changes |
| `vheatm-measure` | [M] Advanced Metrics + KB | Close the loop, update knowledge base |

## Orchestration Flow

```
START
  │
  ▼
[V] vheatm-vision          ← Always first. No [V] = no boundaries.
  │  Output: C4 map + resource budget
  │
  ▼
[G] vheatm-diagnose        ← Map ALL root causes (G.H), then complexity gate (G.D)
  │  Output: Ranked hypothesis list + blast radius
  │
  ▼
[E] vheatm-verify          ← Simulate BEFORE any architecture decision
  │  Output: Confirmed/rejected hypotheses
  │
  ▼
[A] vheatm-decide          ← Convert evidence into enforceable ADRs
  │  Output: ADR entries (MANDATORY/REQUIRED/RECOMMENDED/OPTIONAL)
  │
  ▼
[T] vheatm-transform       ← Apply ONLY what [E] verified. Never assumption-based.
  │  Output: Applied changes + rollback plan
  │
  ▼
[M] vheatm-measure         ← Measure ROI, burn rate, update decay weights
  │  Output: Cycle metrics + KB-state.md update
  │
  └─► Non-linear exit: Back to [V] if architecture changed, back to [G] if new symptoms
```

## How to Run a VHEATM Cycle

### Step 1 — Prepare KB State
- **New project:** Create `KB-state.md` for this project
- **Existing project:** Load current `KB-state.md` — carries all history forward

### Step 2 — Call skills in order
Read each pillar's skill when reaching that step. Pass full `KB-state.md` as context. Each pillar appends output to KB before handing off.

### Step 3 — Non-linear branching
After [M], decide:

| Condition | Next step |
|---|---|
| Architecture changed significantly | → Back to [V] to update C4 |
| New symptoms emerged | → Back to [G] with new evidence |
| [E] rejected all hypotheses | → Back to [G] with critic feedback |
| Burn rate > threshold | → Trigger rollback, pause cycle |
| All hypotheses resolved, ROI positive | → Cycle complete, archive to KB |

## Mandatory Mindset

Before any architectural decision, answer:

1. **Adversarial:** "Where can this go wrong?"
2. **Evolutionary:** "Is this still valid in the current context?"
3. **Topological:** "What contradictions are being ignored?"
4. **Quantum+FinOps:** "What if we try 10 solutions in parallel? At what cost?"
5. **ROI:** "Is this pattern worth the resources it consumes?"

## Cost Reference

```python
COST_TABLE = {
    "string_replace":           0.001,
    "micro_sim_small":          0.010,
    "micro_sim_medium":         0.030,
    "single_llm_call":          0.020,
    "multi_agent_debate_round": 0.150,
    "full_e2e_test":            0.200,
    "architecture_rewrite":     1.000,
}
```

## Anti-Patterns to Refuse

| Anti-pattern | Response |
|---|---|
| Skip [V], jump to [G] | Refuse. No boundary map = undefined problem space. |
| Skip [E], go to [T] | Refuse. Transform on assumption = silent bug risk. |
| Implement Lyapunov Early Warning | Skip. PENDING CALIBRATION. |
| Implement Topological Sheaf Diffusion | Skip. THEORETICAL — blocked. |
| ε < 0.1 or ε > 0.3 in debate | Flag as anti-pattern. Revert to ε=0.2. |
| Fixed λ (not configurable) | Flag. λ must be tunable ∈ [0.15, 0.25]. |
| Override complexity gate | Refuse. Debate at avg<3.0 has negative ROI. |

## Usage

When user wants to run VHEATM:
1. Start with this skill
2. Create or load KB-state.md
3. Route through pillars in order
4. Handle non-linear exits as needed

**→ Start VHEATM cycle**
