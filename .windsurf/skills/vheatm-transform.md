---
name: vheatm-transform
description: >
  VHEATM 5.0 Pillar [T] — Transformation via Automation. Apply verified, ADR-backed changes
  safely and deterministically. Triggers when vheatm-orchestrate reaches [T], or when asked to
  "apply the fix", "implement the ADR". CRITICAL: REFUSES without [E] evidence and [A] ADR.
---

# [T] Transformation via Automation

> **Purpose:** Apply what [E] verified and [A] decided. Deterministically. With rollback ready.

**Input:** KB-state.md with confirmed ADRs from [A]  
**Output:** Applied changes + cost record + rollback plan → KB-state.md

---

## Non-Negotiable Entry Gate

**Before any transformation, verify all three:**

```
1. [E] has CONFIRMED the hypothesis? ✅/❌
2. [A] has an ADR (MANDATORY or REQUIRED) for this change? ✅/❌
3. Estimated cost < remaining budget? ✅/❌

All three must be ✅ to proceed.
If any is ❌ → STOP. Return to appropriate pillar.
```

No transform on:
- Unverified assumptions (return to [E])
- RECOMMENDED/OPTIONAL ADRs unless approved (flag to user)
- Changes exceeding budget (propose deferral)

---

## 3 Levels of Automation

Choose lowest level sufficient. Do not use Level 3 when Level 1 works.

### Level 1: String Replace
**Use when:** Textual pattern, unambiguous, no logic change  
**Risk:** Low — easy to verify, easy to revert

```python
old_pattern = 'DB_CONNECTION_STRING'
new_pattern = 'DATABASE_URL'
# Verify count before replacing
```

**Verification:** Grep confirms pattern no longer exists

### Level 2: AST Transform
**Use when:** Context-aware transformation  
**Risk:** Medium — test after each file batch

```python
# Use ast module, libcst, rope, or jscodeshift
# Parse → identify targets → apply → write back → verify
```

**Verification:** Parse transformed files, diff review, run tests

### Level 3: Code Generation
**Use when:** Complex pattern, spans multiple files, net-new code  
**Risk:** Highest — requires [E] re-verification

**Verification:** Must re-run [E] simulation after generation

---

## Safety Conditions (all mandatory)

### 1. Cost Estimation Before Transform

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

estimated_cost = files × COST_TABLE["string_replace"]
if estimated_cost > remaining_budget:
    return DEFER(reason=f"${estimated_cost:.3f} > ${remaining_budget:.3f}")
```

### 2. Rollback Plan (document before touching anything)

```markdown
**Rollback Plan for [ADR-NNN]:**
- Rollback method: [git revert / feature flag / config change]
- Rollback trigger: burn rate > 2× baseline OR new errors
- Rollback owner: [who executes]
- Rollback test: [how to verify]
- Data impact: [any state changes that cannot rollback]
```

### 3. Burn Rate Monitoring

```
Post-transform check:
→ Re-run [E] simulation
→ Output must match pre-transform behavior
→ If diverges → trigger rollback immediately

Ongoing:
→ Burn rate > 2× baseline → auto-rollback + alert
→ New error patterns → pause + escalate
```

---

## Transform Execution Format

```markdown
### Transform: [ADR-NNN] — [description]

**Level:** [1 / 2 / 3]
**Scope:** [files/services affected]
**Estimated cost:** $[X] | **Actual:** $[Y]
**Changes made:**
  - [file]: [what changed and why]

**Rollback plan:** [method + trigger + owner]
**Post-transform verification:** ✅/❌
**Burn rate before:** [$/hr] | **after:** [$/hr]
```

---

## Partial Transform Protocol

For large-scope changes:
1. Identify smallest meaningful unit
2. Transform that unit only
3. Verify via [E] re-simulation
4. Log cost and burn rate delta
5. If clean → proceed to next unit
6. If degraded → rollback, escalate to [G]

---

## Output Format

Append to `KB-state.md`:

```markdown
## [T] Transform — Cycle #N — [timestamp]

### Transforms Applied
[list of transform records]

### Cost Record
| ADR | Level | Estimated | Actual | Delta |
|---|---|---|---|---|

### Verification Results
| Transform | Post-sim | Burn Rate Delta | Status |
|---|---|---|---|

### Rollback Log
[Any rollbacks triggered]

### Deferred Transforms
[Changes approved but deferred]
```

---

## Checklist Before Handing Off to [M]

- [ ] Entry gate passed (all three ✅)
- [ ] Rollback plan documented
- [ ] Lowest sufficient automation level used
- [ ] Post-transform [E] re-simulation run
- [ ] Actual costs logged
- [ ] Burn rate delta recorded
- [ ] Deferred transforms documented
- [ ] KB-state.md updated

**→ Hand off to `vheatm-measure` ([M])**
