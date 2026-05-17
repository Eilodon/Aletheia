---
name: vheatm-diagnose
description: >
  VHEATM 5.0 Pillar [G] — Generation & Hypothesis. Map root causes, assess blast radius,
  and generate verified hypotheses. Triggers when auditing a system, diagnosing bugs,
  or when vheatm-orchestrate reaches [G] step. Requires [V] output first.
---

# [G] Generation & Hypothesis

> **Purpose:** Map every possible root cause before committing to one.

**Input:** KB-state.md with [V] complete, symptoms description  
**Output:** Ranked hypothesis list + blast radius + complexity score → KB-state.md

---

## Sub-layer [G.H] — Hypothesis Mapping (ALWAYS FIRST)

### Root Cause Taxonomy — 6 Layers

Systematically check each layer:

| Layer | Key Questions |
|---|---|
| **1. Connection Lifecycle** | When is connection created/closed? Pool management? Leak? |
| **2. Serialization Boundary** | Can data serialize/deserialize across process boundaries? Schema mismatch? |
| **3. Async/Sync Boundary** | Mixed async/sync incorrectly? Event loop blocking? |
| **4. Type Contract** | Types enforced at runtime? Schema drift between producer/consumer? |
| **5. Graph/State Lifecycle** | Singleton initialized and cleaned up correctly? Stale state? |
| **6. Error Propagation** | Silent failures? Exception routing broken? Retry storms? |

For each layer:
```markdown
Layer N — [name]: [RELEVANT / NOT RELEVANT / UNKNOWN]
Hypothesis: [specific statement about what might be wrong]
Evidence so far: [what we know vs what we assume]
```

### Blast Radius Assessment

For each hypothesis: *"If this root cause is wrong, how many components affected?"*

| Hypothesis ID | Root Cause Summary | Components Affected | Blast Radius | Verify Priority |
|---|---|---|---|---|
| H-01 | Connection leak in pool manager | DB, all API services | 🔴 HIGH (>3) | Immediate |
| H-02 | Schema mismatch in event payload | Event consumer only | 🟡 LOW (1) | After H-01 |

**Blast Radius levels:**
- 🔴 HIGH: >3 components — verify FIRST
- 🟠 MEDIUM: 2-3 components — verify second
- 🟡 LOW: 1 component — verify last

---

## Sub-layer [G.D] — Debate Gate (runs AFTER G.H)

### Complexity Rubric — Score (1-5 each)

```python
avg_score = sum(scores) / 5
avg_score < 3.0  →  Single-agent selection
avg_score ≥ 3.0  →  Multi-Agent Debate
```

| Dimension | 1 (low) | 3 (medium) | 5 (high) | Score |
|---|---|---|---|---|
| **Component coupling** | 1 module | 3 modules | 5+ modules | |
| **State complexity** | Stateless | Some local state | Distributed | |
| **Async boundaries** | None | 1-2 handoffs | 3+ handoffs | |
| **Failure silence** | Always throws | Sometimes silent | Completely silent | |
| **Time sensitivity** | No deadline | Soft deadline | Production SLA | |

---

### Multi-Agent Debate (fires when avg ≥ 3.0)

#### 🟢 Proposer Agent
- Generate top 3 hypotheses using ε=0.2 (80% exploit, 20% explore)
- ε < 0.1 = under-explore, ε > 0.3 = over-explore

```markdown
**Proposer:**
H-01: [hypothesis] | Confidence: [%] | Est. cost: [T-shirt]
H-02: [hypothesis] | Confidence: [%] | Est. cost: [T-shirt]
```

#### 🔴 Critic Agent
- Challenge each hypothesis on technical + cost grounds
- **Veto rule:** If cumulative cost > 20% remaining budget → veto

```markdown
**Critic:**
H-01: [objection or APPROVED] | Cost: [$X] vs budget [$Y] → [APPROVED/VETOED]
```

#### ⚖️ Synthesizer Agent
- Merge surviving hypotheses into hybrid where applicable
- Produce final ranked list ready for [E]

---

## Cost Reference

```python
COST_TABLE = {
    "string_replace":           0.001,  # 1 file, no logic
    "micro_sim_small":          0.010,  # <50 lines, isolated
    "micro_sim_medium":         0.030,  # 50-100 lines, with setup
    "single_llm_call":          0.020,  # ~1000 tokens
    "multi_agent_debate_round": 0.150,  # 3 agents × 1 round
    "full_e2e_test":            0.200,  # DB + Redis + full graph
    "architecture_rewrite":     1.000,  # 1 full refactor
}
```

---

## Output Format

Append to `KB-state.md`:

```markdown
## [G] Diagnose — Cycle #N — [timestamp]

### Root Cause Taxonomy Scan
[Layer-by-layer findings]

### Hypothesis Table
| ID | Hypothesis | Blast Radius | Complexity Score |
|---|---|---|---|

### Complexity Gate Result
Scores: [coupling, state, async, silence, time] = [x, x, x, x, x]
avg = [X.X] → [Single-agent | Debate triggered]

### Debate Result (if triggered)
Proposer: [hypotheses]
Critic: [objections + veto]
Synthesizer: [final list]

### Final Hypothesis Queue (→ [E])
| ID | Hypothesis | Blast Radius | Sim Type | Est. Cost |
|---|---|---|---|---|
```

---

## Checklist Before Handing Off to [E]

- [ ] All 6 taxonomy layers checked
- [ ] Blast radius assigned to every hypothesis
- [ ] Complexity rubric scored (5 dimensions)
- [ ] Gate decision documented
- [ ] If debate: all three agents completed
- [ ] No vetoed hypothesis exceeds 20% budget
- [ ] KB-state.md updated

**→ Hand off to `vheatm-verify` ([E])**
