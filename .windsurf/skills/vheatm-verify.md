---
name: vheatm-verify
description: >
  VHEATM 5.0 Pillar [E] — Experiment via Simulation. Empirically verify or reject hypotheses
  through micro-simulations before any architecture decision. Triggers when vheatm-orchestrate
  reaches [E], or when asked to "verify this hypothesis", "simulate this failure mode".
  [T] cannot run without [E] verification first.
---

# [E] Experiment via Simulation

> **Purpose:** Create empirical proof before committing to architecture or code changes.

**Input:** KB-state.md with hypothesis queue from [G]  
**Output:** Confirmed/rejected hypotheses with evidence → feeds [A]

---

## When to Simulate (mandatory)

Always simulate when:
- Failure mode can occur **silently** (no exception thrown)
- Cost of being wrong > **2 hours of debug time**
- Behavior depends on **runtime lifecycle** (startup, teardown, async init)
- **Version mismatch** possible
- **Blast radius** is HIGH or MEDIUM

---

## FinOps Filter v2 — Before Running Simulations

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

THRESHOLD_FLOOR = 0.3   # minimum ROI ratio
MIN_KB_DATAPOINTS = 3   # fallback_mode if < 3 records
```

### Filter Decision

```
KB cost datapoints < 3?
  YES → fallback_mode = SEQUENTIAL
  NO  → Apply ROI filter:
        roi = value / COST_TABLE[sim_type]
        if roi >= 0.3 → ADMIT
        if roi <  0.3 → DEFER
```

---

## Micro-Simulation Anatomy — 5 Parts

### Part 1: Setup
```python
# SETUP: Isolated environment. Import minimal.
import [minimal_required_imports]
state = {...}
```

### Part 2: Reproduce
```python
# REPRODUCE: Create exact conditions that trigger failure.
# If cannot reproduce → hypothesis not testable → flag to [G].
```

### Part 3: Execute
```python
# EXECUTE: Run only the code being verified.
result = [function_under_test](args)
```

### Part 4: Assert
```python
# ASSERT: Both happy path AND failure case.
assert result == expected_value
with pytest.raises(ExpectedError):
    [operation_that_should_fail](bad_input)
```

### Part 5: Conclusion
```python
# CONCLUSION: Explicit verdict.
# Hypothesis CONFIRMED / REJECTED / INCONCLUSIVE
# Next step: → [A] with evidence / → [G] with new info
```

---

## Parallel vs Sequential

```
KB ≥ 3 datapoints AND all hypotheses pass ROI?
  → PARALLEL (order by blast radius: HIGH first)

KB < 3 datapoints OR any hypothesis fails ROI?
  → SEQUENTIALLY, highest blast radius first
  → Log actual cost after each
```

---

## Simulation Result Format

```markdown
### Simulation: [H-ID] — [Hypothesis Summary]

**Type:** [micro_sim_small / micro_sim_medium / full_e2e_test]
**Est. cost:** $[X] | **Actual cost:** $[Y]
**Blast radius:** [HIGH / MEDIUM / LOW]

**Setup:** [brief]
**Reproduce:** [conditions]
**Execute:** [what ran]
**Assert:** [what checked]

**Verdict:** ✅ CONFIRMED / ❌ REJECTED / ⚠️ INCONCLUSIVE
**Evidence:** [specific output/error]
**Implication for [A]:** [what this enables/blocks]
```

---

## Handling Inconclusive Results

If INCONCLUSIVE:
1. Document exactly why
2. Return to [G] with new evidence
3. Refine hypothesis or add sub-hypothesis
4. Run new simulation
5. Do NOT proceed to [A] with inconclusive evidence

---

## Output Format

Append to `KB-state.md`:

```markdown
## [E] Verify — Cycle #N — [timestamp]

### FinOps Filter Decision
KB datapoints: [N] → Mode: [SEQUENTIAL / PARALLEL]
Filter threshold: 0.3

| H-ID | Sim Type | Est. Cost | ROI | Decision |
|---|---|---|---|---|
| H-01 | micro_sim_medium | $0.03 | 4.2 | ADMIT |
| H-02 | architecture_rewrite | $1.00 | 0.15 | DEFER |

### Simulation Results
[results per hypothesis]

### Summary for [A]
Confirmed: [H-IDs]
Rejected: [H-IDs] + why
Deferred: [H-IDs] + when to revisit

### Cost Record
| Operation | Estimated | Actual | Delta |
|---|---|---|---|
```

---

## Checklist Before Handing Off to [A]

- [ ] FinOps filter applied (mode documented)
- [ ] Every admitted hypothesis has all 5 simulation parts
- [ ] Every simulation has explicit verdict
- [ ] Actual costs logged to KB
- [ ] No INCONCLUSIVE results proceeding to [A]
- [ ] KB-state.md updated

**→ Hand off to `vheatm-decide` ([A])**
