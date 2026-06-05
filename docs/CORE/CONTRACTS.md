# CONTRACTS.md — Schema Registry
### {{TÊN_DỰ_ÁN}} · v{{VERSION}} · compatible with: [BLUEPRINT v{{Y}}, ADR v{{Z}}]

> **Nguyên tắc vàng:** Mọi type, schema, enum, constant được define **MỘT LẦN DUY NHẤT** tại đây.
> BLUEPRINT.md và code **reference** — không redefine, không copy, không paraphrase.
>
> Khi thấy conflict giữa file này và bất kỳ file nào khác → file này thắng.

---

## Mục lục

1. [Primitive Types & Constants](#1-primitive-types--constants)
2. [Enums](#2-enums)
3. [Core Schemas](#3-core-schemas)
4. [Input / Output Contracts](#4-input--output-contracts)
5. [Error Registry](#5-error-registry)
6. [External Contracts](#6-external-contracts)
7. [Naming Conventions](#7-naming-conventions)
8. [Schema Changelog](#8-schema-changelog)
9. [Deprecation Registry](#9-deprecation-registry)
10. [Glossary](#10-glossary)

---

## 1. PRIMITIVE TYPES & CONSTANTS

> Các kiểu và hằng số dùng xuyên suốt hệ thống.
> Agent KHÔNG hard-code giá trị của các constants này ở bất kỳ nơi nào khác.

📝 **FILL-IN**

```
{{CONST_1}} :: {{TYPE}} = {{VALUE}}
  // Lý do: {{TẠI_SAO_GIÁ_TRỊ_NÀY}}

{{CONST_2}} :: {{TYPE}} = {{VALUE}}
  // Lý do: {{TẠI_SAO_GIÁ_TRỊ_NÀY}}
```

> **Type notation dùng trong file này:**
> ```
> FieldName :: Type                         — required field
> FieldName :: Type?                        — optional field (nullable)
> FieldName :: List<Type>                   — ordered list
> FieldName :: Map<KeyType, ValueType>      — map / dict
> FieldName :: TypeA | TypeB               — union type (chọn một)
> FieldName :: Ref<SchemaName>              — reference đến schema khác
> FieldName :: Result<OkType, ErrCode>     — success hoặc typed error (không dùng exception)
> FieldName :: (TypeA, TypeB, TypeC)       — tuple, thứ tự có ý nghĩa, không thay đổi
> FieldName :: ~ExpressionOrField          — derived/computed từ fields khác, KHÔNG persist vào DB
> ```

---

## 2. ENUMS

> Mọi enum được define tại đây. Không tạo inline enum trong schema.

📝 **FILL-IN**

### {{ENUM_1_NAME}}

```
{{ENUM_1_NAME}} ::
  | {{VARIANT_A}}   // {{MÔ_TẢ_KHI_NÀO_DÙNG}}
  | {{VARIANT_B}}   // {{MÔ_TẢ_KHI_NÀO_DÙNG}}
  | {{VARIANT_C}}   // {{MÔ_TẢ_KHI_NÀO_DÙNG}}
```

**Dùng ở:** `{{SCHEMA_A}}`, `{{SCHEMA_B}}`
**Không dùng cho:** {{EDGE_CASE_LOẠI_TRỪ}}

### {{ENUM_2_NAME}}

```
{{ENUM_2_NAME}} ::
  | {{VARIANT_A}}
  | {{VARIANT_B}}
```

**Dùng ở:** `{{SCHEMA}}`

---

## 3. CORE SCHEMAS

> Schemas được sắp xếp từ primitive → composite.
> Schema phụ thuộc schema khác → schema kia phải được define TRÊN nó.

📝 **FILL-IN**

---

### {{SCHEMA_1_NAME}}

> {{MÔ_TẢ_NGẮN_MỘT_DÒNG — schema này đại diện cho cái gì trong domain}}
> **Owner:** {{TEAM/PERSON}}

```
{{SCHEMA_1_NAME}} :: {
  {{field_1}}  :: {{Type}}                    // {{ý_nghĩa_business}}
  {{field_2}}  :: {{Type}}?                   // {{ý_nghĩa_business}} — optional vì {{lý_do}}
  {{field_3}}  :: Ref<{{OTHER_SCHEMA}}>        // {{ý_nghĩa_relationship}}
  {{field_4}}  :: {{ENUM_NAME}}               // {{ý_nghĩa_business}}
  ~{{field_5}} :: {{Type}}                    // computed từ {{field_1}} + {{field_2}}, KHÔNG lưu DB
}
```

**Constraints:**
```
INVARIANT: {{field_1}} không được rỗng khi {{field_4}} == {{VARIANT}}
INVARIANT: {{field_2}} phải present khi {{field_3}} != null
RANGE:     {{field_1}}.length ∈ [{{MIN}}, {{MAX}}]
```

**Không được nhầm với:** `{{SIMILAR_SCHEMA}}` — khác ở chỗ {{ĐIỂM_KHÁC_BIỆT}}

---

### {{SCHEMA_2_NAME}}

> {{MÔ_TẢ_NGẮN}}
> **Owner:** {{TEAM/PERSON}}

```
{{SCHEMA_2_NAME}} :: {
  {{field_1}}  :: {{Type}}
  {{field_2}}  :: List<Ref<{{SCHEMA_1_NAME}}>>
  {{field_3}}  :: Map<string, {{Type}}>
}
```

**Constraints:**
```
INVARIANT: {{field_2}}.length >= 1   // phải có ít nhất một item
```

---

### {{SCHEMA_N_NAME}}

📝 Thêm schemas theo cùng format. Mỗi schema cần: mô tả, owner, field definitions, constraints, disambiguation nếu cần.

---

## 4. INPUT / OUTPUT CONTRACTS

> I/O contract của từng entry point / API boundary trong hệ thống.
> Đây là "giao kèo" giữa các components — không thay đổi mà không có ADR entry.

📝 **FILL-IN**

---

### {{OPERATION_1}}

> {{MÔ_TẢ_OPERATION — làm gì, tại sao}}

```
INPUT  :: Ref<{{INPUT_SCHEMA}}>

OUTPUT :: Ref<{{OUTPUT_SCHEMA}}>
       | Ref<{{ERROR_CODE}}>   // khi {{ĐIỀU_KIỆN_LỖI}}
       | Ref<{{ERROR_CODE}}>   // khi {{ĐIỀU_KIỆN_LỖI}}

SIDE EFFECTS:
  - {{STATE_MUTATION_1}} : {{MÔ_TẢ}}
  - {{EXTERNAL_CALL}}    : gọi {{SERVICE}} với {{DATA}}

PRE-CONDITIONS:
  - {{field}} phải {{ĐIỀU_KIỆN}} trước khi gọi
  - {{STATE}} phải ở trạng thái {{TRẠNG_THÁI}}

POST-CONDITIONS:
  - {{STATE}} sẽ chuyển sang {{TRẠNG_THÁI_MỚI}}
  - {{RESOURCE}} sẽ được {{CREATED/UPDATED/DELETED}}

IDEMPOTENT: {{CÓ/KHÔNG}} — {{LÝ_DO}}
```

---

### {{OPERATION_2}}

📝 Thêm operations theo cùng format.

```
INPUT  :: Ref<{{INPUT_SCHEMA}}>

OUTPUT :: Ref<{{OUTPUT_SCHEMA}}>
       | Ref<{{ERROR_CODE}}>

SIDE EFFECTS: none

PRE-CONDITIONS:
  - {{ĐIỀU_KIỆN}}

POST-CONDITIONS:
  - {{KẾT_QUẢ}}

IDEMPOTENT: CÓ
```

---

## 5. ERROR REGISTRY

> Mọi error code được define tại đây với HTTP status, retryability, severity,
> message template, và context cần thiết để debug.

📝 **FILL-IN**

| Code | HTTP | Retryable? | Severity | Message Template | Context cần thiết | Khi nào xảy ra |
|---|---|---|---|---|---|---|
| `{{ERR_1}}` | {{4xx/5xx}} | CÓ (backoff) | ERROR | `"{{MESSAGE_TEMPLATE}}"` | `{{FIELD_1}}`, `{{FIELD_2}}` | {{TRIGGER_CONDITION}} |
| `{{ERR_2}}` | {{4xx/5xx}} | KHÔNG | INFO | `"{{MESSAGE_TEMPLATE}}"` | `{{FIELD}}` | {{TRIGGER_CONDITION}} |

> **Severity guide:**
> - `FATAL` — hệ thống không thể tiếp tục, page on-call ngay
> - `ERROR` — operation fail, cần investigate; hệ thống vẫn chạy
> - `WARN`  — không fail nhưng bất thường, cần monitor
> - `INFO`  — lỗi do user input, không cần alert
>
> **Retryable guide:**
> - `CÓ (backoff)` — retry với exponential backoff, tối đa {{N}} lần
> - `CÓ (immediate)` — retry ngay lập tức, tối đa {{N}} lần
> - `KHÔNG` — retry sẽ không thay đổi kết quả, client không nên retry
>
> **Error format chuẩn:**
> ```
> Error :: {
>   code      :: ErrorCode        // từ registry này
>   message   :: string           // theo message template
>   context   :: Map<string, any> // các fields liệt kê trong cột "Context"
>   retryable :: bool             // từ cột "Retryable?" trong registry
>   severity  :: Severity         // từ cột "Severity" trong registry
>   trace     :: string?          // optional, chỉ trong dev mode
> }
> ```

---

## 6. EXTERNAL CONTRACTS

> Interface với các external services, third-party APIs, hoặc databases.
> Ghi lại những gì hệ thống này *expect* từ bên ngoài — không phải implementation của bên ngoài.

📝 **FILL-IN**

### {{EXTERNAL_SERVICE_1}}

**API Version expected:** v{{N}}
**SLA expected:** {{N}}% uptime · P99 ≤ {{N}}ms response time
**Last verified:** {{YYYY-MM-DD}}
**Contact / Docs:** {{URL_HOẶC_TEAM}}

```
// Hệ thống này gọi {{SERVICE}} với:
REQUEST :: {
  {{field}} :: {{Type}}
}

// Hệ thống này expect {{SERVICE}} trả về:
RESPONSE :: {
  {{field}} :: {{Type}}
}

// Failure modes hệ thống phải handle:
FAILURES ::
  | TIMEOUT          // sau {{N}}ms → {{XỬ_LÝ_GÌ}}
  | UNAVAILABLE      // {{XỬ_LÝ_GÌ}}
  | VERSION_MISMATCH // detect qua {{FIELD/HEADER}} → fail fast + alert, KHÔNG cố parse
  | {{ERROR}}        // {{XỬ_LÝ_GÌ}}
```

> Nếu response schema thay đổi không tương thích → alert + fail fast.
> KHÔNG cố parse partial response. Xem BLUEPRINT.md Section 6 để biết retry/circuit breaker strategy.

---

## 7. NAMING CONVENTIONS

> Quy ước đặt tên xuyên suốt codebase. Agent phải tuân theo khi generate code.

📝 **FILL-IN**

| Context | Convention | Ví dụ |
|---|---|---|
| Schema names | `PascalCase` | `UserProfile`, `OrderItem` |
| Field names | `snake_case` | `user_id`, `created_at` |
| Constants | `SCREAMING_SNAKE` | `MAX_RETRY`, `DEFAULT_TIMEOUT` |
| Functions | `snake_case` | `compute_score()`, `build_report()` |
| Error codes | `SCREAMING_SNAKE` với prefix domain | `AUTH_INVALID_TOKEN`, `ORDER_NOT_FOUND` |
| File / module names | `snake_case` | `user_service.py`, `order_handler.ts` |
| {{CONTEXT}} | `{{CONVENTION}}` | `{{EXAMPLE}}` |

**Domain-specific rules:**

📝 **FILL-IN:** Những quy tắc đặc thù của domain này mà agent không thể infer từ convention chung.

```
{{RULE_1}}: {{MÔ_TẢ}}
  ✅ {{ĐÚNG}}
  ❌ {{SAI}}
```

---

## 8. SCHEMA CHANGELOG

> Append-only. Mọi thay đổi schema đều phải có entry ở đây.
> Breaking changes phải có ADR entry tương ứng trong ADR.md.
> **Date format: YYYY-MM-DD (ISO 8601).**

| Version | Date | Schema | Thay đổi | Breaking? | ADR Ref |
|---|---|---|---|---|---|
| v1.0 | {{YYYY-MM-DD}} | — | Init schema registry | — | — |
| 📝 | | | | | |

> **Template một entry:**
> `| v{{X.Y}} | {{YYYY-MM-DD}} | {{SCHEMA}} | {{ADDED/REMOVED/RENAMED/DEPRECATED}}: {{FIELD}} {{→ NEW_NAME/TYPE}} | {{CÓ/KHÔNG}} | ADR-{{N}} |`

---

## 9. DEPRECATION REGISTRY

> Fields và schemas đang trong quá trình loại bỏ.
> Entry ở đây: vẫn tồn tại trong schema definition nhưng **KHÔNG dùng cho logic mới**.
> Code gen PHẢI emit deprecation warning khi gặp các fields/schemas trong registry này.
> Removal là breaking change → bắt buộc có ADR entry trước khi xóa.

📝 **FILL-IN** *(bỏ qua nếu chưa có deprecation nào)*

| Schema | Field / Schema bị deprecated | Deprecated since | Removal target | Migration path | ADR Ref |
|---|---|---|---|---|---|
| `{{SCHEMA}}` | `{{field}}` | v{{X.Y}} | v{{X+1.0}} | Dùng `{{NEW_FIELD}}` thay thế | ADR-{{N}} |
| `{{SCHEMA}}` | *(toàn bộ schema)* | v{{X.Y}} | v{{X+1.0}} | Dùng `{{NEW_SCHEMA}}` | ADR-{{N}} |

> **Lifecycle của một field/schema:**
> ```
> ACTIVE
>   │
>   ├─[team quyết định loại bỏ]──▶ DEPRECATED ─── ghi vào registry này, bump minor version
>   │                                   │
>   │                                   ├─[migration done, sau ≥1 release cycle]
>   │                                   ▼
>   │                               REMOVED ────── ghi vào Schema Changelog, bump major + ADR
>   │
>   └─ Không được skip từ ACTIVE thẳng sang REMOVED nếu có consumer bên ngoài
> ```

---

## 10. GLOSSARY

> Domain terms và abbreviations dùng trong schemas, comments, và pseudocode.
> Agent PHẢI dùng đúng định nghĩa này khi generate code, docs, log messages, và error messages.
> Nếu một term xuất hiện trong schema comment mà không có trong bảng này → thêm vào.

📝 **FILL-IN** *(bỏ qua nếu tất cả terms đều self-explanatory)*

| Term | Định nghĩa | Không nhầm với |
|---|---|---|
| **{{TERM_1}}** | {{ĐỊNH_NGHĨA_CHÍNH_XÁC_THEO_BUSINESS_DOMAIN}} | `{{SIMILAR_TERM}}` — khác ở {{ĐIỂM_KHÁC_BIỆT}} |
| **{{TERM_2}}** | {{ĐỊNH_NGHĨA}} | — |
| **{{ABBR}}** | {{VIẾT_ĐẦY_ĐỦ}} ({{ĐỊNH_NGHĨA_NGẮN}}) | — |

> Nếu hai người trong team định nghĩa cùng một term khác nhau → đây là nơi chốt định nghĩa chính thức.
> Khi có conflict → tạo ADR để document quyết định chọn định nghĩa nào.
