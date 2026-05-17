---
name: vheatm-measure
description: >
  VHEATM 5.0 Pillar [M] — Advanced Metrics & Knowledge Base. Close the feedback loop:
  calculate cycle ROI, track burn rate, apply thermodynamic forgetting to KB, decide
  next step. Triggers when vheatm-orchestrate reaches [M], or when asked to "measure impact",
  "what was ROI", "update KB", "calculate cycle metrics".
---

# [M] Advanced Metrics & Knowledge Base

> **Purpose:** If you don't measure it, the loop is open. Close it.

**Input:** KB-state.md with [T] complete (or partial cycle data)  
**Output:** Cycle metrics + updated KB with decayed weights + next-step decision

---

## Metrics to Compute Each Cycle

### 1. Real-Time Burn Rate

```python
burn_rate_usd_per_hr = total_cost_this_session / elapsed_hours
burn_rate_tokens_per_hr = total_tokens_this_session / elapsed_hours

# Alert if:
# burn_rate > 2× baseline
# Remaining budget < 20%
```

### 2. ROI Per Cycle

```python
bugs_prevented = [count confirmed hypotheses resolved]
avg_debug_hours = 2.0  # conservative
hourly_rate = 100.0
regressions_avoided = [count regressions blocked by MANDATORY ADRs]
rollback_cost = 200.0

value = (bugs × avg_debug × hourly_rate) + (regressions × rollback_cost)
operating_cost = sum(actual_costs_from_E_and_T)
roi_ratio = value / operating_cost  # >1.0 = positive
roi_usd = value - operating_cost
```

### 3. Cost Prediction (forward-looking)

```python
predicted_remaining_cost = sum(COST_TABLE[sim_type] for h in pending_queue)
headroom = remaining_budget - predicted_remaining_cost
if headroom < 0:
    flag_warning("Predicted costs exceed budget. Defer or descope.")
```

### 4. Thermodynamic Forgetting

```python
LAMBDA_BASE_DEFAULT = 0.2

def apply_decay_cycle(patterns):
    for p in patterns:
        if p.used_this_cycle:
            p.weight = 1.0
        else:
            p.weight = p.weight * math.exp(-p.λ)

        if p.weight < 0.1:
            p.status = "⚠️ FADING"
        elif p.weight < 0.3:
            p.status = "🟡 DIMMING"
        else:
            p.status = "✅ ALIVE"
    return patterns
```

**Forgetting is a feature.** KB self-curates over time.

### 5. Lyapunov Early Warning — ⚠️ SKIP
**Status: PENDING CALIBRATION.** Do not implement.

### 6. Topological Sheaf Diffusion — ⚠️ SKIP
**Status: THEORETICAL — BLOCKED.** Do not implement.

---

## KB Pattern Registry Update

```markdown
| Pattern | Weight Before | Weight After | λ | Used | Status |
|---|---|---|---|---|---|
| async_lifespan_guard | 1.00 | 0.82 | 0.20 | ✅ | ALIVE |
| connection_pool_reset | 0.45 | 0.37 | 0.20 | ❌ | ALIVE |
| frugal_retry_backoff | 0.30 | 0.25 | 0.20 | ❌ | 🟡 DIMMING |
| legacy_sync_wrapper | 0.12 | 0.10 | 0.20 | ❌ | ⚠️ FADING |
```

**Frugal pattern tagging:**
- Tag `frugal: true` if solves ≥80% of use cases at ≤30% cost
- Frugal patterns preferred when budget < 30%

---

## Next-Step Decision Tree

```
Burn rate > 2× baseline?
  YES → Trigger rollback, PAUSE, alert, exit

All hypotheses resolved AND ROI positive?
  YES → Cycle COMPLETE. Archive summary. Propose next cycle.

Architecture changed significantly?
  YES → Back to [V] — update C4 before next [G]

New symptoms emerged during [E] or [T]?
  YES → Back to [G] — add to Root Cause Taxonomy

[E] rejected ALL hypotheses?
  YES → Back to [G] — explore ε>current temporarily

Budget < 20% remaining?
  YES → Run FinOps audit: defer OPTIONAL, flag RECOMMENDED
```

---

## Cycle Summary Format

```markdown
## [M] Measure — Cycle #N — [timestamp]

### Cycle Metrics
| Metric | Value |
|---|---|
| Hypotheses confirmed | N |
| Hypotheses rejected | N |
| ADRs written | N (X MANDATORY, Y REQUIRED, Z RECOMMENDED) |
| Transforms applied | N |
| Bugs prevented (est.) | N |
| Total cycle cost | $X |
| ROI ratio | X.X |
| ROI net | $X |

### Burn Rate
| Point | USD/hr | Tokens/hr |
|---|---|---|
| Session start | | |
| Post-[G] | | |
| Post-[E] | | |
| Post-[T] | | |
| Cycle end | | |

### KB Pattern Registry — Post-Decay
[updated table]

### Patterns Reaching Fading Threshold
[list for archive consideration]

### Next Step
→ [COMPLETE / Back to [V] / Back to [G]] — reason: [explain]

### Proposed Next Cycle Scope
[brief description]
```

---

## Checklist — Cycle Complete

- [ ] Burn rate computed and within threshold
- [ ] ROI calculated (ratio and net USD)
- [ ] Thermodynamic decay applied to all KB patterns
- [ ] Fading patterns (w < 0.1) flagged
- [ ] Cost prediction for pending queue
- [ ] Next-step decision made with reason
- [ ] Lyapunov and Sheaf marked SKIP
- [ ] KB-state.md fully updated
- [ ] Cycle summary appended

**→ Next: [COMPLETE] or route back per decision tree**
