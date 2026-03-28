---
name: vheatm-vision
description: >
  VHEATM 5.0 Pillar [V] — Vision & Boundary Mapping. Map the architecture of a complex system
  before any audit, research, or upgrade. Triggers when user wants to understand system boundaries,
  draw a C4 model, define resource constraints, or when vheatm-orchestrate reaches [V] step.
  Must run FIRST in every VHEATM cycle.
---

# [V] Vision & Boundary Mapping

> **Purpose:** Know what you're solving before you touch anything.

**Input:** Project description, codebase overview, or system documentation  
**Output:** C4 architecture map + Resource Constraints table → KB-state.md

---

## Step 1 — Gather Context

Ask or extract:
- What is the system? (service, monolith, distributed, ML pipeline)
- What is the trigger? (incident, planned upgrade, perf issue)
- What is the scope? (full system vs specific domain)
- Available resources? (budget, time, compute, team size)

If missing → ask explicitly before proceeding.

---

## Step 2 — Build C4 Model

### Level 1: System Context
```
Who are the users? What external systems does this interact with?

[User/Actor] ──► [This System] ──► [External Dependency A]
                                └──► [External Dependency B]
```

### Level 2: Container
Major deployable units:
- Web App / Mobile App
- API Services
- Databases (type, tech)
- Message queues / event buses
- Background workers

### Level 3: Component (focus on audited domain)
- Module/service names
- Responsibilities
- Communication patterns (sync/async, protocol)

### Level 4: Code (only when root cause is at code level)
Only if [G] identified a specific code-level hypothesis.

---

## Step 3 — Identify Bounded Contexts

| Context | Owner | Depends On | Consumers | Notes |
|---|---|---|---|---|
| Auth | Platform | DB, Cache | All services | JWT, session mgmt |
| Billing | Finance | Auth, DB, Stripe | API | async events |

---

## Step 4 — Resource Constraints

| Resource | Budget | Unit | Alert Threshold | Notes |
|---|---|---|---|---|
| Financial | | USD/cycle | 80% consumed | |
| API tokens | | tokens/session | 80% consumed | |
| Time | | hours | - | hard deadline? |
| Compute | | CPU/RAM | - | cloud costs? |

If budget unknown → flag as `UNCONSTRAINED`.

---

## Step 5 — Alert Thresholds

- **Warning:** 80% consumed → alert
- **Hard stop:** 100% consumed → pause cycle, escalate
- **Rollback trigger:** burn rate > 2× baseline

---

## Output Format

Append to `KB-state.md`:

```markdown
## [V] Vision — Cycle #N — [timestamp]

### C4 Model
[your C4 text]

### Bounded Contexts
[table]

### Resource Budget
[table]

### Alert Thresholds
[thresholds]

### Flags
- Architecture type: [monolith / microservices / distributed]
- Known high-coupling areas: [list]
- Areas OUT of scope: [list]
```

---

## Checklist Before Handing Off to [G]

- [ ] C4 Level 1 + 2 complete
- [ ] At least one bounded context identified
- [ ] Resource budget filled (or UNCONSTRAINED)
- [ ] Alert thresholds set
- [ ] Out-of-scope documented
- [ ] KB-state.md updated

**→ Hand off to `vheatm-diagnose` ([G])**
