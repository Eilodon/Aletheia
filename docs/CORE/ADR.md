# ADR.md — Architecture Decision Records
### {{TÊN_DỰ_ÁN}} · v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, BLUEPRINT v{{Y}}]

> **Mục đích file này:** Ghi lại *tại sao* hệ thống được thiết kế như vậy.
> Không phải *cái gì* (CONTRACTS.md) hay *như thế nào* (BLUEPRINT.md) — mà là *tại sao*.
>
> File này là research layer — nơi iterate design, cân nhắc alternatives, ghi lại trade-offs.
> Khi đọc lại sau 6 tháng, file này giải thích mọi quyết định "trông có vẻ lạ" trong codebase.

---

## Mục lục

> Cập nhật bảng này mỗi khi tạo ADR mới.

| ADR | Title | Status | Tags |
|---|---|---|---|
| [ADR-001](#adr-001----tên-quyết-định-đầu-tiên) | {{TÊN}} | ✅ ACCEPTED | `{{TAG}}` |
| [ADR-002](#adr-002----tên-quyết-định) | {{TÊN}} | ✅ ACCEPTED | `{{TAG}}` |
| 📝 | Thêm khi tạo ADR mới | | |

---

## Cách đọc file này

**Status của mỗi ADR:**

| Status | Ý nghĩa |
|---|---|
| 🟡 `PROPOSED` | Đang cân nhắc, chưa chốt |
| ✅ `ACCEPTED` | Đã chốt, đang implement |
| ❌ `REJECTED` | Đã cân nhắc, không chọn — nhưng giữ lại để tránh propose lại |
| 🔄 `SUPERSEDED by ADR-xxx` | Đã thay thế bởi ADR khác |
| ⏸️ `DEFERRED` | Quyết định hoãn lại đến phase sau |

**Khi nào cần tạo ADR mới:**
- Thay đổi ảnh hưởng đến schema hoặc I/O contract (breaking change)
- Chọn giữa hai hoặc nhiều technical approaches
- Quyết định về security, privacy, hoặc compliance
- Bất kỳ thứ gì mà sau này sẽ tự hỏi "tại sao lại làm vậy?"

---

## ADR-001 — {{Tên Quyết Định Đầu Tiên}}

**Status:** ✅ ACCEPTED
**Date:** {{NGÀY}}
**Deciders:** {{NGƯỜI/NHÓM}}
**Tags:** `{{TAG_1}}` `{{TAG_2}}`
**Review date:** {{NGÀY}} — re-evaluate khi {{ĐIỀU_KIỆN_TRIGGER}}

### Context

📝 **FILL-IN:** Mô tả vấn đề cần giải quyết và bối cảnh kỹ thuật.
Tập trung vào: constraints, forces, requirements dẫn đến quyết định này.

{{MÔ_TẢ_BỐI_CẢNH_VÀ_VẤN_ĐỀ}}

**Constraints:**
- {{CONSTRAINT_1}}
- {{CONSTRAINT_2}}

**Requirements:**
- {{REQUIREMENT_1}}
- {{REQUIREMENT_2}}

### Options Considered

📝 **FILL-IN:** Liệt kê tất cả options đã cân nhắc — kể cả options không chọn.
Với mỗi option: pros, cons, và lý do loại ra hoặc chọn.

#### Option A: {{TÊN_OPTION_A}} ← **CHOSEN**

```
Mô tả: {{MÔ_TẢ_KỸ_THUẬT}}
```

| Pros | Cons |
|---|---|
| {{PRO_1}} | {{CON_1}} |
| {{PRO_2}} | {{CON_2}} |

#### Option B: {{TÊN_OPTION_B}}

```
Mô tả: {{MÔ_TẢ_KỸ_THUẬT}}
```

| Pros | Cons |
|---|---|
| {{PRO_1}} | {{CON_1}} |
| {{PRO_2}} | {{CON_2}} |

**Loại vì:** {{LÝ_DO_LOẠI_NGẮN_GỌN}}

#### Option C: {{TÊN_OPTION_C}}

**Loại vì:** {{LÝ_DO_LOẠI}}

### Decision

> **Chọn Option A vì:** {{LÝ_DO_CHỌN — nối thẳng với constraints và requirements ở trên}}

### Impact

📝 **FILL-IN:** Điền sau khi decision được ACCEPTED.

**Schemas thay đổi:** `{{SCHEMA_1}}` (thêm field), `{{SCHEMA_2}}` (rename)
**Components thay đổi:** `{{COMP_A}}`, `{{COMP_B}}`
**Breaking change:** CÓ/KHÔNG — xem Schema Changelog v{{X.Y}}

### Consequences

**Tích cực:**
- {{HỆ_QUẢ_TỐT_1}}
- {{HỆ_QUẢ_TỐT_2}}

**Tiêu cực / Trade-offs chấp nhận được:**
- {{TRADE_OFF_1}} — chấp nhận vì {{LÝ_DO}}
- {{TRADE_OFF_2}} — sẽ revisit ở {{PHASE/VERSION}}

**Rủi ro:**
- {{RỦI_RO_1}} — mitigate bằng {{CÁCH}}
- {{RỦI_RO_2}} — trigger review nếu {{ĐIỀU_KIỆN}}

### Implementation Notes

📝 **FILL-IN:** Những điều đặc biệt cần lưu ý khi implement quyết định này.
Đây là cầu nối từ "tại sao" sang "như thế nào" — không trùng với BLUEPRINT.md
mà là context để hiểu đúng intent khi đọc BLUEPRINT.md.

- {{GHI_CHÚ_IMPL_1}}
- {{GHI_CHÚ_IMPL_2}}

**Xem thêm:** BLUEPRINT.md Section {{N}}, CONTRACTS.md `{{SCHEMA}}`

---

## ADR-002 — {{Tên Quyết Định}}

**Status:** ✅ ACCEPTED
**Date:** {{NGÀY}}
**Deciders:** {{NGƯỜI/NHÓM}}
**Tags:** `{{TAG}}`
**Review date:** {{NGÀY}} — re-evaluate khi {{ĐIỀU_KIỆN_TRIGGER}}

### Context

{{MÔ_TẢ}}

### Options Considered

#### Option A: {{TÊN}} ← **CHOSEN**

| Pros | Cons |
|---|---|
| {{PRO}} | {{CON}} |

#### Option B: {{TÊN}}

**Loại vì:** {{LÝ_DO}}

### Decision

> **Chọn Option A vì:** {{LÝ_DO}}

### Impact

**Schemas thay đổi:** `{{SCHEMA}}` ({{LOẠI_THAY_ĐỔI}})
**Components thay đổi:** `{{COMP}}`
**Breaking change:** CÓ/KHÔNG — xem Schema Changelog v{{X.Y}}

### Consequences

**Tích cực:** {{HỆ_QUẢ}}
**Trade-offs:** {{TRADE_OFF}}

---

## ADR-{{N}} — Template (copy khi tạo ADR mới)

**Status:** 🟡 PROPOSED
**Date:** {{NGÀY}}
**Deciders:** {{NGƯỜI/NHÓM}}
**Tags:** `{{TAG}}`
**Review date:** {{NGÀY}} — re-evaluate khi {{ĐIỀU_KIỆN_TRIGGER}}

### Context

{{MÔ_TẢ}}

### Options Considered

#### Option A: {{TÊN}}

| Pros | Cons |
|---|---|
| | |

#### Option B: {{TÊN}}

| Pros | Cons |
|---|---|
| | |

### Decision

> **Chọn ... vì:**

### Impact

**Schemas thay đổi:** *(điền sau khi ACCEPTED)*
**Components thay đổi:** *(điền sau khi ACCEPTED)*
**Breaking change:** CÓ/KHÔNG — xem Schema Changelog v{{X.Y}}

### Consequences

**Tích cực:**
**Trade-offs:**
**Rủi ro:**
