# Cycle 4 Audit Review - VHEATM Meta-Audit

## Ngày review: 2026-04-16
## Mục đích: Kiểm tra kết quả Cycle 4 Comprehensive Audit để phát hiện bỏ sót, sai lầm, hoặc cần điều chỉnh

---

## Tóm tắt phát hiện

**Tổng số vấn đề:** 5 gaps chính + 3 đề xuất bổ sung
**Mức độ nghiêm trọng:** 1 CRITICAL, 2 HIGH, 2 MEDIUM, 3 LOW

---

## 🔴 CRITICAL: C4 Level 4 Mapping Bị Bỏ Sót

### Vấn đề
C4 Level 4 (Code) được ghi là "Not mapped - no specific code-level hypothesis yet" nhưng thực tế có **H-04 đến H-08** là code-level hypotheses cần được map.

### Evidence
- H-04: Runtime contract violations → cần map GiftClient code paths
- H-05: Singleton lifecycle → cần map global state management code
- H-06: Silent failures → cần map unwrap() calls và error handling
- H-07: Local inference stub → cần map `local_inference.rs` stub methods
- H-08: Facade boundary → cần map interpretation orchestrator

### Đề xuất điều chỉnh
Thêm C4 Level 4 mapping cho các components liên quan đến H-04 đến H-08:

```
#### Level 4: Code (H-04 đến H-08)

**GiftClient Error Handling (H-04, H-06):**
```rust
// core/src/gift_client.rs
pub async fn redeem_gift(&self, token: &str) -> Result<GiftReading, AletheiaError> {
    // Line 85-86: unwrap_or() silent fallback
    let redeemed_at = json["redeemed_at"].as_i64().unwrap_or(chrono_timestamp());
    // Risk: Silent default on parse failure
}
```

**Store unwrap() calls (H-06):**
```rust
// core/src/store.rs - 76 unwrap() calls identified
// Line 34: self.conn.lock().unwrap()
// Line 287: serde_json::to_string(...).unwrap()
// Risk: Panic on serialization failure
```

**LocalInferenceEngine Stub (H-07):**
```rust
// core/src/local_inference.rs
pub fn check_device_capability(&self) -> DeviceCapability {
    // Stub implementation - native module will override (line 74)
    DeviceCapability { supported: false, ... }
}
```

**Interpretation Job Lifecycle (H-05):**
```rust
// core/src/lib.rs
// Line 424-435: Job inserted but no cleanup on drop
// Line 446-448: Mutex lock held during callback
```
```

---

## 🟠 HIGH: unwrap() Call Analysis Bị Nông

### Vấn đề
Simulation H-06 đề cập "Some unwrap() calls" nhưng không phân tích **76 unwrap() calls** trong store.rs cụ thể.

### Evidence chi tiết
Từ grep search, các unwrap() calls phân bố:

| File | Số lượng | Nguy hiểm |
|------|----------|-----------|
| store.rs | 76 | **HIGH** - Database operations, serialization |
| lib.rs | 13 | **MEDIUM** - Job management, AI client |
| contracts.rs | 1 | **LOW** - Default value |

**Các unwrap() nguy hiểm cụ thể:**

1. **serde_json::to_string().unwrap()** (lines 287, 294, 298, 447, 453)
   - Risk: Panic nếu struct chứa invalid UTF-8 hoặc recursive reference
   - Impact: Crash toàn bộ reading operation

2. **self.conn.lock().unwrap()** (26 occurrences)
   - Risk: Poisoned mutex nếu thread panic trong khi giữ lock
   - Impact: Store becomes permanently inaccessible

3. **std::thread::spawn()** trong interpretation streaming (lib.rs:443)
   - Risk: Thread leak nếu job không được cleanup
   - Impact: Memory leak + thread exhaustion

### Đề xuất điều chỉnh
Thêm hypothesis H-06b: **Mutex poisoning và thread leak trong interpretation streaming**

---

## 🟠 HIGH: H-07 Local Inference Bị Đánh giá Thấp

### Vấn đề
H-07 được đánh giá là 🟡 LOW nhưng thực tế ảnh hưởng đến **ADR-AL-45 (local-first AI)** - một trong những architectural quan trọng nhất.

### Evidence
```rust
// local_inference.rs - stub implementation
pub fn check_device_capability(&self) -> DeviceCapability {
    // Stub - native module will override
    DeviceCapability { supported: false, ... }  // Always returns false!
}

pub fn run_inference(&self, ...) -> Result<InferenceResult, AletheiaError> {
    // Stub
    Err(AletheiaError::invalid_input(...))  // Always fails!
}
```

**Impact:**
- Local inference path hoàn toàn không hoạt động
- Orchestrator buộc phải fallback sang cloud hoặc static prompts
- Đi ngược lại ADR-AL-45 "local-first, cloud-optional"

### Đề xuất điều chỉnh
Nâng H-07 từ 🟡 LOW lên 🟠 MEDIUM hoặc 🔴 HIGH, và tạo ADR mới:
- **ADR-AL-49 | 🔴 MANDATORY**: Local inference stub must be implemented or removed

---

## 🟡 MEDIUM: Resource Budget UNCONSTRAINED Không Được Giải Thích

### Vấn đề
Resource Budget table ghi UNCONSTRAINED cho nhiều items nhưng không giải thích rõ:
1. Tại sao không có budget?
2. Risk của việc không có budget là gì?
3. Khi nào cần đặt budget?

### Đề xuất bổ sung
```markdown
### Resource Budget - UNCONSTRAINED Justification

| Resource | Budget | Justification for UNCONSTRAINED | Risk if Unbounded |
|---|---|---|---|
| Financial | UNCONSTRAINED | Solo project, no external funding | Overspending on cloud APIs |
| API Tokens | UNCONSTRAINED | Development only, not production | Rate limiting, unexpected costs |
| Compute - Android | UNCONSTRAINED | Local builds, no CI/CD cost | Developer machine resource exhaustion |
| Compute - Server | UNCONSTRAINED | Dev server only | None |

**Mitigation:**
- Cloud AI calls currently use mock/stub in local-dev
- If enabling real cloud AI, set token limit: 1000 requests/cycle
- Set build time alert: > 10 minutes → investigate
```

---

## 🟡 MEDIUM: Simulations Là Code Review, Không Phải Executable Micro-Sim

### Vấn đề
Các simulation trong [E] (H-01, H-02, H-03) thực chất là **static code review**, không phải **executable micro-simulations** theo đúng VHEATM spec.

### Evidence
```markdown
// Hiện tại:
**Setup:** Examined `core/src/store.rs`...
**Execute:** Reviewed SQLite documentation...
**Assert:** Current pattern will serialize...

// Đúng spec:
**Setup:** Create isolated test with SQLite + concurrent threads
**Execute:** Run 10 concurrent reading operations
**Assert:** Measure P95 latency, confirm degradation
```

### Đề xuất điều chỉnh
Ghi rõ trong KB-state.md:
```markdown
### Simulation Methodology Note
**Cycle 4 simulations used static code review instead of executable micro-simulations** due to:
1. Rust project complexity (requires full build)
2. No existing test harness for isolated components
3. Time constraint (2-week audit cycle)

**Limitations:**
- Results are architectural analysis, not empirical measurements
- Latency claims ("P95 will degrade") are projections, not measurements
- Risk: False positive/negative possible

**Recommendation:** Future cycles should create executable micro-sims for critical hypotheses.
```

---

## 🟢 LOW: Bounded Contexts Thiếu Interaction Mapping

### Vấn đề
Bounded Contexts table liệt kê 9 contexts nhưng không map interactions giữa chúng.

### Đề xuất bổ sung
```markdown
### Bounded Context Interactions

```
[Reading Flow] ←→ [AI Interpretation] (synchronous, blocking)
    ↓                    ↓
[User State] ←→ [Store] ←→ [Archive/History]
    ↓
[Notifications] (async, scheduled)
    ↓
[Gift System] → [External Gift Backend]

[Monetization] (mock, no real connections)
[Share Cards] ←→ [Reading Flow] (data flow only)
```

**High-coupling pairs:**
1. Reading Flow ↔ AI Interpretation (tight coupling via orchestrator)
2. Store ↔ All contexts (single Mutex serializes access)
```

---

## 🟢 LOW: Complexity Gate Scoring Thiếu Chi Tiết

### Vấn đề
Complexity rubric scoring (4, 4, 4, 3, 2) được đưa ra nhưng không giải thích cụ thể tại sao.

### Đề xuất bổ sung
```markdown
### Complexity Scoring Rationale

| Dimension | Score | Evidence |
|---|---|---|
| Component coupling | 4 | Store mutex affects 5+ components; UniFFI bridge affects all Android ops; Gift backend is external dependency |
| State complexity | 4 | Global Tokio runtime + 2 HashMaps + SQLite + in-memory TS state = distributed state |
| Async boundaries | 4 | UniFFI sync → Rust async → HTTP async → callback sync = 3+ handoffs |
| Failure silence | 3 | unwrap() in serde, gift_client unwrap_or(), AI fallback without telemetry |
| Time sensitivity | 2 | Development phase, no production SLA, solo project |
```

---

## 🟢 LOW: ADR Patterns Thiếu Enforcement Mechanism

### Vấn đề
ADR-AL-47 pattern gợi ý bash script nhưng không có enforcement mechanism (không gắn vào CI, không có test tự động).

### Đề xuất bổ sung
```markdown
**ADR-AL-47 Enforcement:**
```yaml
# .github/workflows/contract-verify.yml
name: Contract Verification
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Verify Contract Alignment
        run: |
          chmod +x scripts/verify-contracts.sh
          ./scripts/verify-contracts.sh
```
```

---

## Danh sách đề xuất Action Items

### Cần điều chỉnh ngay (trong KB-state.md hiện tại)
1. ✅ Bổ sung C4 Level 4 mapping cho H-04 đến H-08
2. ✅ Ghi rõ simulation methodology (code review vs executable)
3. ✅ Thêm UNCONSTRAINED justification vào Resource Budget
4. ✅ Nâng H-07 lên MEDIUM/HIGH

### Cần thêm ADR mới
5. 🆕 ADR-AL-49: Local inference stub implementation (từ H-07 nâng cấp)
6. 🆕 ADR-AL-50: unwrap() audit và error handling improvement (từ H-06 chi tiết)
7. 🆕 ADR-AL-51: Interpretation job lifecycle management (từ H-05 chi tiết)

### Cần thêm hypothesis mới
8. 🆕 H-06b: Mutex poisoning và thread leak (HIGH priority)
9. 🆕 H-09: Web app persistence path divergence (MEDIUM - Android dùng Rust SSOT nhưng Web dùng TS services/store)

### Cần verify thêm
10. 🔍 H-04: GiftClient contract violations - cần verify actual runtime behavior
11. 🔍 H-08: Facade boundary - cần map actual service calls

---

## Kết luận

Cycle 4 Comprehensive Audit đã hoàn thành các pillar [V][G][E][A] với **chất lượng tốt** nhưng có **5 gaps chính** cần điều chỉnh:

1. **CRITICAL:** C4 Level 4 mapping bị thiếu
2. **HIGH:** unwrap() analysis chưa đủ sâu  
3. **HIGH:** H-07 local inference bị đánh giá thấp
4. **MEDIUM:** Resource budget UNCONSTRAINED không giải thích
5. **MEDIUM:** Simulations là code review, không phải executable

**Đề nghị:** Bổ sung các điều chỉnh trên vào KB-state.md trước khi chuyển sang [T] Transformation hoặc bắt đầu Cycle tiếp theo.
