# BLUEPRINT.md — Behavior Specification
### {{TÊN_DỰ_ÁN}} · v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, ADR v{{Z}}]

> **Mục đích file này:** Mô tả hệ thống *hoạt động như thế nào* — không phải *trông như thế nào*.
> Schemas đã có trong CONTRACTS.md — file này chỉ **reference**, không redefine.
>
> Agent đọc file này: hiểu đủ để implement mà không cần hỏi thêm bất kỳ câu nào.

---

## Mục lục

1. [System Overview](#1-system-overview)
2. [Component Registry](#2-component-registry)
3. [Data Flow](#3-data-flow)
4. [State Machine](#4-state-machine)
5. [Component Specifications](#5-component-specifications)
6. [Integration Points](#6-integration-points)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Scaffolding & Build Order](#8-scaffolding--build-order)
9. [Observability](#9-observability)

---

## 1. SYSTEM OVERVIEW

📝 **FILL-IN:** ASCII diagram mô tả kiến trúc tổng thể.
Mục tiêu: agent đọc xong biết ngay đây là hệ thống kiểu gì, các thành phần lớn là gì.

```
┌─────────────────────────────────────────────────────┐
│                   {{TÊN_HỆ_THỐNG}}                  │
│                                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐    │
│  │{{COMP_A}}│────▶│{{COMP_B}}│────▶│{{COMP_C}}│    │
│  └──────────┘     └──────────┘     └──────────┘    │
│                        │                            │
│                        ▼                            │
│                   ┌──────────┐                      │
│                   │{{COMP_D}}│                      │
│                   └──────────┘                      │
└─────────────────────────────────────────────────────┘
       ▲ {{EXTERNAL_INPUT}}         {{OUTPUT}} ▶
```

**Luồng chính một câu:** {{MÔ_TẢ_LUỒNG_E2E_NGẮN_GỌN}}

**Những gì hệ thống này KHÔNG làm:** {{OUT_OF_SCOPE}} — xem ADR-{{N}} để biết lý do.

---

## 2. COMPONENT REGISTRY

> Mỗi component có một nhiệm vụ duy nhất. Không overlap.

📝 **FILL-IN**

| Component | File/Module | Nhiệm vụ | Input | Output | Stateful? |
|---|---|---|---|---|---|
| **{{COMP_A}}** | `{{path}}` | {{MỘT_CÂU}} | `Ref<{{SCHEMA}}>` | `Ref<{{SCHEMA}}>` | {{CÓ/KHÔNG}} |
| **{{COMP_B}}** | `{{path}}` | {{MỘT_CÂU}} | `Ref<{{SCHEMA}}>` | `Ref<{{SCHEMA}}>` | {{CÓ/KHÔNG}} |
| **{{COMP_C}}** | `{{path}}` | {{MỘT_CÂU}} | `Ref<{{SCHEMA}}>` | `Ref<{{SCHEMA}}>` | {{CÓ/KHÔNG}} |

> **"Stateful"** = component giữ state giữa các invocations.
> Stateful components cần strategy rõ ràng trong Section 4 (State Machine).

---

## 3. DATA FLOW

> Dữ liệu đi qua hệ thống như thế nào — từ input đến output.
> Mỗi bước: ai làm, dùng operation gì, input/output là schema nào.

📝 **FILL-IN**

### Happy Path — {{TÊN_LUỒNG_CHÍNH}}

```
[1] {{ACTOR/TRIGGER}}
      │ produces: Ref<{{SCHEMA}}>
      ▼
[2] {{COMP_A}}: {{OPERATION}}
      │ input:  Ref<{{INPUT_SCHEMA}}>
      │ output: Ref<{{OUTPUT_SCHEMA}}>
      │ side effect: {{NẾU_CÓ}}
      ▼
[3] {{COMP_B}}: {{OPERATION}}
      │ input:  Ref<{{INPUT_SCHEMA}}>
      │ output: Ref<{{OUTPUT_SCHEMA}}>
      ▼
[N] {{FINAL_STATE}}
      └─ result: Ref<{{RESULT_SCHEMA}}>
```

### Error Path — {{TÊN_ERROR_SCENARIO}}

```
[2] {{COMP_A}}: {{OPERATION}} → FAIL
      │ error: Ref<{{ERROR_CODE}}>   // khi {{ĐIỀU_KIỆN}}
      ▼
[2a] {{XỬ_LÝ_LỖI}}
      └─ {{RECOVERY_HOẶC_PROPAGATION}}
```

### Edge Case — {{TÊN_EDGE_CASE}}

📝 **FILL-IN:** Mỗi edge case quan trọng cần một flow diagram riêng.

```
[{{STEP}}] {{ĐIỀU_KIỆN_ĐẶC_BIỆT}}
      ▼
{{XỬ_LÝ_ĐẶC_BIỆT}}
```

---

## 4. STATE MACHINE

> Chỉ điền section này nếu hệ thống có stateful components (xem Component Registry).
> Đây là source of truth cho mọi state transition — không implement transition nào
> không có trong diagram này.

📝 **FILL-IN** *(bỏ qua nếu toàn stateless)*

```
STATES:
  {{STATE_INIT}}      — {{Ý_NGHĨA}}
  {{STATE_A}}         — {{Ý_NGHĨA}}
  {{STATE_B}}         — {{Ý_NGHĨA}}
  {{STATE_TERMINAL}}  — {{Ý_NGHĨA}}
  {{STATE_ERROR}}     — {{Ý_NGHĨA}}

TRANSITIONS:
  {{STATE_INIT}}  ──[{{EVENT}}]──▶  {{STATE_A}}
                     guard: {{ĐIỀU_KIỆN}}
                     action: {{GÌ_XẢY_RA}}

  {{STATE_A}}     ──[{{EVENT}}]──▶  {{STATE_B}}
                     guard: {{ĐIỀU_KIỆN}}
                     action: {{GÌ_XẢY_RA}}

  {{STATE_A}}     ──[{{EVENT}}]──▶  {{STATE_ERROR}}
                     guard: {{ĐIỀU_KIỆN_LỖI}}
                     action: {{GÌ_XẢY_RA}}

  {{STATE_B}}     ──[{{EVENT}}]──▶  {{STATE_TERMINAL}}
                     guard: none
                     action: {{GÌ_XẢY_RA}}

INVARIANTS:
  - Không thể transition từ {{STATE_TERMINAL}} sang bất kỳ state nào
  - {{STATE_ERROR}} chỉ có thể đến từ {{LIST_STATES}}
  - {{INVARIANT_KHÁC}}
```

### Concurrency Model

> Điền khi có stateful components và khả năng concurrent access.
> Nếu toàn stateless → bỏ qua subsection này.

📝 **FILL-IN** *(bỏ qua nếu không có concurrent mutation)*

```
CONCURRENCY STRATEGY: {{OPTIMISTIC_LOCK / PESSIMISTIC_LOCK / ACTOR_MODEL / IMMUTABLE_EVENTS}}

IDEMPOTENCY KEY: {{FIELD}} — dùng để detect và reject duplicate requests

CONFLICT SCENARIO: 2 actors cùng mutate {{STATE}} của cùng một {{ENTITY}}
  Strategy  : {{LAST_WRITE_WINS / FIRST_WRITE_WINS / MERGE / REJECT_SECOND}}
  Detect    : so sánh {{VERSION_FIELD / ETAG / TIMESTAMP}}
  On conflict → {{XỬ_LÝ_CỤ_THỂ — return error / retry / merge}}

STATE PERSISTENCE: {{IN_MEMORY / DATABASE / CACHE}}
  - Nếu process crash → state recover từ {{NGUỒN}}
  - Initialization: {{LOAD_FROM_DB / START_FRESH / REPLAY_EVENTS}}

RACE CONDITION RISKS:
  - {{RISK_1}}: xảy ra khi {{ĐIỀU_KIỆN}} → mitigate bằng {{CÁCH}}
  - {{RISK_2}}: xảy ra khi {{ĐIỀU_KIỆN}} → mitigate bằng {{CÁCH}}
```

---

## 5. COMPONENT SPECIFICATIONS

> Với mỗi component: pseudocode đủ chi tiết để implement mà không cần clarification.
> Level of detail: nếu agent đọc xong mà vẫn cần hỏi → chưa đủ detail.

📝 **FILL-IN:** Một section cho mỗi component trong Component Registry.

---

### {{COMP_A}}

**File:** `{{path/to/file}}`
**Dependencies:** `{{COMP_B}}` (gọi), `{{EXTERNAL_SERVICE}}` (gọi)
**Được gọi bởi:** `{{COMP_C}}`, `{{ORCHESTRATOR}}`

#### Hàm: `{{function_name}}()`

```
SIGNATURE:
  {{function_name}}(
    param_1: Ref<{{SCHEMA}}>,
    param_2: {{Type}}
  ) → Ref<{{OUTPUT_SCHEMA}}> | Ref<{{ERROR_CODE}}>

PSEUDOCODE:
  1. Validate param_1:
       nếu param_1.{{field}} là null → return Ref<{{ERR_VALIDATION}}>
       nếu param_1.{{field}} < 0     → return Ref<{{ERR_RANGE}}>

  2. Lấy {{RESOURCE}} từ {{SOURCE}}:
       result = {{COMP_B}}.{{operation}}(param_1.{{field}})
       nếu result là error → propagate Ref<{{ERR_NOT_FOUND}}>

  3. Transform:
       output = Ref<{{OUTPUT_SCHEMA}}> {
         {{out_field_1}}: result.{{in_field}},
         {{out_field_2}}: compute_{{x}}(param_1, result),
         {{out_field_3}}: {{CONST_1}}
       }

  4. Side effect: {{MÔ_TẢ_NẾU_CÓ}}

  5. return output

COMPLEXITY: {{O(n) / O(1) / ...}} — {{LÝ_DO_NẾU_KHÔNG_HIỂN_NHIÊN}}
```

**Test cases cần cover:**
```
✅ Happy path: {{MÔ_TẢ}}
✅ Edge case:  {{MÔ_TẢ}}
✅ Error:      param_1.{{field}} null → Ref<{{ERR_VALIDATION}}>
✅ Error:      {{COMP_B}} unavailable → Ref<{{ERR_DEPENDENCY}}>
```

---

#### Hàm: `{{function_2_name}}()`

📝 Thêm theo cùng format.

```
SIGNATURE:
  {{function_2_name}}(
    param_1: {{Type}}
  ) → {{ReturnType}}

PSEUDOCODE:
  1. {{BƯỚC_1}}
  2. {{BƯỚC_2}}
  3. return {{GIÁ_TRỊ}}
```

---

### {{COMP_B}}

**File:** `{{path/to/file}}`
**Dependencies:** `{{LIST}}`
**Được gọi bởi:** `{{LIST}}`

#### Hàm: `{{function_name}}()`

```
SIGNATURE:
  {{function_name}}(
    param_1: {{Type}}
  ) → {{ReturnType}} | Ref<{{ERROR_CODE}}>

PSEUDOCODE:
  1. {{BƯỚC_1}}
  2. {{BƯỚC_2}}
  3. return {{GIÁ_TRỊ}}
```

📝 Thêm components theo cùng pattern.

---

## 6. INTEGRATION POINTS

> Cách hệ thống này tích hợp với thế giới bên ngoài.
> Đây là implementation guide cho external contracts đã define trong CONTRACTS.md Section 6.

📝 **FILL-IN**

### {{EXTERNAL_SERVICE_1}}

**Dùng ở component:** `{{COMP}}`
**Protocol:** {{REST/gRPC/WebSocket/Queue/...}}
**Auth:** {{API_KEY/OAuth2/mTLS/...}}

```
// Retry strategy
MAX_RETRIES = {{N}}
BACKOFF     = exponential, base {{N}}ms, cap {{N}}ms
TIMEOUT     = {{N}}ms per attempt

// Circuit breaker (nếu áp dụng)
OPEN khi:    {{N}} failures trong {{WINDOW}}s
HALF-OPEN:   thử lại sau {{N}}s
CLOSE khi:   {{N}} successes liên tiếp
```

**Token refresh (nếu dùng OAuth2/JWT):**
```
TOKEN_TTL   = {{N}}s
REFRESH_AT  = TTL - {{BUFFER}}s         // refresh chủ động trước khi hết hạn
REFRESH_BY  : {{COMP_CHỊU_TRÁCH_NHIỆM}} // component DUY NHẤT được gọi refresh

// Khi nhận 401 Unauthorized:
  1. {{COMP}} gọi {{TOKEN_REFRESH_ENDPOINT}}
  2. Nếu refresh thành công → retry request gốc MỘT lần duy nhất
  3. Nếu refresh fail       → propagate Ref<{{ERR_AUTH_EXPIRED}}>, KHÔNG retry
  4. Nếu có concurrent requests đang pending → đợi refresh xong, KHÔNG tạo nhiều refresh đồng thời
```

**Fallback khi unavailable:** {{MÔ_TẢ_FALLBACK_HOẶC_"KHÔNG_CÓ_FALLBACK_—_FAIL_FAST"}}

---

## 7. NON-FUNCTIONAL REQUIREMENTS

> Những ràng buộc không phải về behavior mà về quality attributes.
> Đây là constraints cho implementation — agent phải respect khi generate code.

📝 **FILL-IN**

### Performance

```
{{OPERATION_1}}:
  P50 latency  ≤ {{N}}ms
  P99 latency  ≤ {{N}}ms
  Throughput   ≥ {{N}} req/s

{{OPERATION_2}}:
  Max processing time ≤ {{N}}s
  Memory footprint    ≤ {{N}}MB
```

### Reliability

```
Availability target : {{99.x%}}
Recovery time (RTO) : ≤ {{N}} phút
Recovery point (RPO): ≤ {{N}} phút
```

### Security

```
Authentication : {{MÔ_TẢ}}
Authorization  : {{MÔ_TẢ}}
Data at rest   : {{ENCRYPT/PLAIN/N/A}}
Data in transit: {{TLS_VERSION/N/A}}
Sensitive fields KHÔNG được log: {{LIST_FIELDS}}
```

### Scalability

```
Current target : {{N}} users / {{N}} req/day
Design ceiling : {{N}}x current (không cần re-architect)
Scaling trigger: {{METRIC}} > {{THRESHOLD}} → {{ACTION}}
```

### Testing Strategy

> Ranh giới test rõ ràng ngăn agent generate thiếu test hoặc test sai layer.

📝 **FILL-IN**

| Layer | Scope | What to mock | Gate (xem Section 8) |
|---|---|---|---|
| **Unit** | Pure functions trong từng component | Tất cả I/O và dependencies | Phase {{N}} |
| **Integration** | {{COMP_A}} ↔ {{COMP_B}} boundary | External services | Phase {{N}} |
| **Contract** | Tất cả I/O contracts trong CONTRACTS.md Section 4 | — | Phase {{N}} |
| **E2E** | Happy path + {{N}} critical error paths end-to-end | — | Phase {{N}} |

```
// Test data strategy
Happy path data  : {{SOURCE — fixtures / factory / seed script}}
Edge case data   : {{SOURCE}}
Error simulation : {{CÁCH inject failure — mock / chaos / feature flag}}

// Coverage targets
Unit coverage    : ≥ {{N}}% line coverage trên business logic
Contract tests   : 100% operations trong CONTRACTS.md Section 4
```

### Configuration Management

> Tất cả giá trị có thể thay đổi theo môi trường phải đi qua config — không hard-code.

📝 **FILL-IN**

| Config key | Type | Default | Override by | Dùng ở component | Sensitive? |
|---|---|---|---|---|---|
| `{{ENV_VAR_1}}` | string | `{{DEFAULT}}` | env var | `{{COMP}}` | KHÔNG |
| `{{ENV_VAR_2}}` | int | `{{DEFAULT}}` | env var / config file | `{{COMP}}` | CÓ — mask trong logs |
| `{{FEATURE_FLAG}}` | bool | `false` | feature flag system | `{{COMP}}` | KHÔNG |

```
// Config validation tại startup (fail fast — không chạy với config thiếu/sai)
Nếu {{REQUIRED_VAR}} không được set        → exit với error message rõ ràng
Nếu {{VAR}} nằm ngoài range [{{MIN}}, {{MAX}}] → exit với error message rõ ràng
KHÔNG dùng default ngầm cho required config
```

---

## 8. SCAFFOLDING & BUILD ORDER

> Thứ tự tạo files và implement features.
> Dependencies kỹ thuật giữa các bước là THỰC TẾ — không đảo thứ tự.

📝 **FILL-IN**

```
PHASE 0 — Foundation (implement trước mọi thứ)
  [0.1] {{FILE/MODULE}}     — vì: {{LÝ_DO_ĐI_TRƯỚC}}
  [0.2] {{FILE/MODULE}}     — vì: {{LÝ_DO_ĐI_TRƯỚC}}
  Gate: {{ĐIỀU_KIỆN_PASS_PHASE_0}}

PHASE 1 — Core Logic
  [1.1] {{FILE/MODULE}}     — depends on: [0.1]
  [1.2] {{FILE/MODULE}}     — depends on: [0.1], [0.2]
  [1.3] {{FILE/MODULE}}     — depends on: [1.1]
  Gate: {{ĐIỀU_KIỆN_PASS_PHASE_1}}

PHASE 2 — Integration
  [2.1] {{FILE/MODULE}}     — depends on: [1.x]
  [2.2] {{FILE/MODULE}}     — depends on: [1.x], [2.1]
  Gate: {{ĐIỀU_KIỆN_PASS_PHASE_2}}

PHASE N — {{TÊN_PHASE}}
  [N.x] {{FILE/MODULE}}
  Gate: {{ĐIỀU_KIỆN_PASS}}
```

**File scaffold đầy đủ:**

```
{{PROJECT_ROOT}}/
│
├── {{FILE_1}}               ← created in phase [{{X.Y}}]
├── {{FILE_2}}               ← created in phase [{{X.Y}}]
│
├── {{MODULE_1}}/
│   ├── {{FILE_3}}           ← created in phase [{{X.Y}}]
│   └── {{FILE_4}}           ← created in phase [{{X.Y}}]
│
└── {{MODULE_2}}/
    └── {{FILE_5}}           ← created in phase [{{X.Y}}]
```

---

## 9. OBSERVABILITY

> Spec logging, metrics, và tracing để agent generate code với instrumentation đúng ngay từ đầu.
> Tên event/metric là contract với monitoring platform — thay đổi tên là breaking change.

📝 **FILL-IN**

### Log Events

> Mỗi event quan trọng cần được log với đúng level và đúng fields.
> Fields trong cột "Không log" là sensitive — agent tuyệt đối không đưa vào log.

| Event | Level | Emitted by | Required fields | Không log |
|---|---|---|---|---|
| `{{EVENT_1}}` | INFO | `{{COMP}}` | `{{field_a}}`, `{{field_b}}` | `{{SENSITIVE_FIELD}}` |
| `{{EVENT_2}}` | WARN | `{{COMP}}` | `{{field_a}}`, `error.code` | — |
| `{{EVENT_3}}` | ERROR | `{{COMP}}` | `{{field_a}}`, `error.code`, `error.trace` | `{{SENSITIVE_FIELD}}` |

> **Log format chuẩn (JSON structured logging):**
> ```
> {
>   "timestamp"  : "{{ISO_8601}}",
>   "level"      : "{{INFO/WARN/ERROR}}",
>   "event"      : "{{EVENT_NAME}}",       // từ bảng trên, stable — không tự ý đổi tên
>   "component"  : "{{COMP}}",
>   "trace_id"   : "{{ID}}",              // để correlate với distributed traces
>   "span_id"    : "{{ID}}",
>   ...fields                              // từ cột "Required fields"
> }
> ```

### Metrics

> Metrics để monitor SLAs đã define trong Section 7 (Performance).
> Tên metric phải stable — thay đổi tên là breaking change với dashboard và alert rules.

| Metric name | Type | Unit | Emitted by | Labels | Alert threshold |
|---|---|---|---|---|---|
| `{{METRIC_1}}` | counter | — | `{{COMP}}` | `{{label_1}}`, `{{label_2}}` | — |
| `{{METRIC_2}}` | histogram | ms | `{{COMP}}` | `{{label}}` | P99 > {{N}}ms → WARN |
| `{{METRIC_3}}` | gauge | — | `{{COMP}}` | — | < {{N}} → FATAL |

> **Metric types:**
> - `counter`   — chỉ tăng (số requests, số errors, số retries)
> - `histogram` — phân phối latency, kích thước payload
> - `gauge`     — giá trị tại thời điểm đo (queue depth, active connections, cache size)

### Distributed Traces

> Tạo span tại mọi I/O boundary để trace end-to-end latency.

📝 **FILL-IN** *(bỏ qua nếu không dùng distributed tracing)*

```
SPAN tạo tại:
  - Mỗi inbound request vào hệ thống         → ROOT SPAN
  - Mỗi lần gọi external service             → CHILD SPAN
  - Mỗi lần gọi database / cache             → CHILD SPAN
  - {{BOUNDARY_KHÁC}}                        → CHILD SPAN

SPAN attributes bắt buộc:
  - {{ATTR_1}} : {{GIÁ_TRỊ_VÀ_NGUỒN}}
  - {{ATTR_2}} : {{GIÁ_TRỊ_VÀ_NGUỒN}}
  - error      : true + error.message nếu operation fail

KHÔNG tạo span cho: {{PURE_COMPUTATION / IN_MEMORY_OPS}} — overhead không đáng
```
