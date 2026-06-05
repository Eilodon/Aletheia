# DSDD — Design-Sufficient Design Document
> Format tài liệu thiết kế đủ chính xác để generate code mà không cần clarification,
> đồng thời đủ rõ ràng để iterate architecture mà không cần chạy code.

---

## Ba files, ba câu hỏi

| File | Trả lời câu hỏi | Dùng khi |
|---|---|---|
| `CONTRACTS.md` | **Cái gì?** — Types, schemas, I/O contracts | Thiết kế data model; spot type bugs; generate types/interfaces |
| `BLUEPRINT.md` | **Như thế nào?** — Behavior, pseudocode, state machine | Implement logic; verify correctness; generate code |
| `ADR.md` | **Tại sao?** — Decisions, alternatives, trade-offs | Iterate architecture; onboard người mới; review với team |

---

## Nguyên tắc cốt lõi

**1. Single definition**
Mọi type/schema được define **một lần duy nhất** trong CONTRACTS.md.
BLUEPRINT.md chỉ `Ref<SchemaName>` — không redefine, không copy.
Đây là điều ngăn `CategoryScore`-class bugs.

**2. Explicit references**
Khi BLUEPRINT.md cần một schema, nó viết `Ref<SchemaName>`.
Khi hai nơi dùng cùng tên → đảm bảo chúng reference cùng một definition.

**3. Pseudocode là contract**
Pseudocode trong BLUEPRINT.md đủ chi tiết để agent implement mà không hỏi thêm.
Nếu agent vẫn cần hỏi → pseudocode chưa đủ detail.

**4. ADR là memory**
Mọi quyết định "trông có vẻ lạ" đều có ADR giải thích.
Khi muốn thay đổi design → đọc ADR trước để hiểu tại sao design hiện tại lại như vậy.

---

## Workflow

### Khi thiết kế (research mode)

```
1. ADR.md       — brainstorm options, cân nhắc trade-offs
2. CONTRACTS.md — define schemas từ decision đã chốt
3. BLUEPRINT.md — specify behavior dùng schemas đó
4. Loop: phát hiện issue ở BLUEPRINT → update CONTRACTS → update ADR nếu cần
```

### Khi generate code (build mode)

```
Agent đọc theo thứ tự:
1. CONTRACTS.md  → có full type system
2. BLUEPRINT.md  → có full behavior spec
3. BLUEPRINT.md Section 8 → có build order

Agent implement theo Phase order trong Section 8.
Không bắt đầu phase N+1 khi chưa pass gate của phase N.
```

### Khi iterate architecture

```
1. Tạo ADR mới với status PROPOSED
2. Liệt kê options, pros/cons
3. Chốt → update status ACCEPTED
4. Update CONTRACTS.md nếu schema thay đổi (ghi vào Schema Changelog)
5. Update BLUEPRINT.md nếu behavior thay đổi
6. Breaking change → bump version ở cả 3 files (xem Version Sync Rule bên dưới)
```

### Spec-is-Primary Rule

```
DSDD là SSOT. Khi implementation conflict với spec — spec thắng.

Khi phát hiện conflict:
  1. Dừng implement
  2. Quyết định: spec đúng hay reality đúng?
     ├─ Spec đúng  → fix code
     └─ Reality đúng → update DSDD trước (CONTRACTS / BLUEPRINT / ADR nếu cần)
  3. Tiếp tục implement theo spec đã được reconcile

KHÔNG implement workaround rồi "backfill spec sau" — backfill không xảy ra.
Phase gate trong Section 8 không pass nếu spec không phản ánh reality.
```

### Version Sync Rule

```
Breaking change ở bất kỳ file nào  →  bump MAJOR version CẢ 3 files cùng lúc.
Non-breaking addition               →  bump minor version file đó + ghi vào Schema Changelog.

Header của mỗi file phải ghi:
  v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, BLUEPRINT v{{Y}}, ADR v{{Z}}]

"Breaking change" bao gồm:
  - Xóa hoặc rename field/schema trong CONTRACTS.md
  - Thay đổi operation signature hoặc pre/post-conditions trong BLUEPRINT.md
  - ADR SUPERSEDED dẫn đến thay đổi behavior đang hoạt động
```

---

## Kết hợp với .agent/

DSDD và `.agent/` phục vụ hai mục đích khác nhau:

```
DSDD/               ← "Hệ thống này là gì và làm như thế nào"
  CONTRACTS.md        Thiết kế, specification, iteration
  BLUEPRINT.md
  ADR.md

.agent/             ← "Agent phải hành xử như thế nào khi làm việc với hệ thống này"
  RULES.md            Governance, invariants, audit trail
  INVARIANTS.md
  ...
```

Trong thực tế: DSDD là **input** để tạo ra `.agent/INVARIANTS.md` và `.agent/STACK.md`.
Sau khi có DSDD, extract những invariants critical nhất vào `.agent/INVARIANTS.md`
để agent có thể load chúng nhanh mà không cần đọc lại toàn bộ spec.

---

## Checklist trước khi feed cho agent

```
[ ] Tất cả FILL-IN placeholders đã được điền
[ ] Không có schema nào được define ở nhiều hơn một nơi
[ ] Mọi Ref<X> trong BLUEPRINT.md đều có X trong CONTRACTS.md
[ ] Mọi error code trong BLUEPRINT.md đều có trong Error Registry
[ ] Mọi operation có pre/post conditions rõ ràng
[ ] Build order trong Section 8 không có circular dependency
[ ] ADR tồn tại cho mọi quyết định "trông có vẻ lạ"
[ ] Mọi stateful component có concurrency strategy trong BLUEPRINT Section 4
[ ] Mọi external call có failure mode được xử lý trong BLUEPRINT Section 6
```

---

## ⚠️ DSDD Smell Indicators

Nếu thấy một trong những dấu hiệu này → cần fix **trước khi** feed agent:

```
❌ Agent hỏi lại sau khi đọc BLUEPRINT     → pseudocode chưa đủ detail (Rule 3)
❌ Tìm thấy tên schema ở 2 nơi khác nhau  → vi phạm Single Definition (Rule 1)
❌ Có Ref<X> trong BLUEPRINT nhưng không
   tìm thấy X trong CONTRACTS              → broken reference
❌ Operation có side effect nhưng không
   có POST-CONDITIONS                      → contract incomplete
❌ State machine có transition không có
   guard/action                            → underspecified
❌ Phase N depend on Phase N+1             → circular dependency trong build order
❌ 3 files có version header không sync
   sau breaking change                     → version drift (Version Sync Rule)
❌ Stateful component không có
   concurrency strategy                    → race condition risk (BLUEPRINT Section 4)
```
