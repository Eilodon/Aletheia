# Prompt Contract — Canonical Interpretation Prompt

> **Source of truth**: `server/_core/interpretationService.ts`
> All other implementations (Rust `ai_client.rs`, Rust `local_inference.rs`, Android `AletheiaCoreModule.kt`) must converge to this contract.

## System Prompt

Defined in `server/_core/interpretationService.ts:22-44` and `core/src/ai_client.rs:36-58`.

Both copies are identical. Any change to one must be mirrored to the other.

## Build Prompt Order

The user prompt is assembled in this exact order:

1. **Language instruction**: `Hãy trả lời hoàn toàn bằng ngôn ngữ của đoạn trích này: {language}.`
2. **Structure instruction**: `Chỉ trả về đúng 2 phần: một đoạn phản chiếu ngắn và một câu hỏi mở ở dòng cuối.`
3. **Intent tone** (if `userIntent` provided):
   - `clarity` → `Tone cho lần đọc này: rõ ràng, gọn, chính xác. User cần thấy pattern trong tình huống.`
   - `comfort` → `Tone cho lần đọc này: ấm áp, nhẹ, giàu compassion nhưng không lên lớp.`
   - `challenge` → `Tone cho lần đọc này: trực tiếp, tỉnh táo, không né điều khó.`
   - `guidance` → `Tone cho lần đọc này: mở, không định hướng, giữ không gian để người đọc tự nghe mình.`
4. **Situation** (if `situationText` provided): `Tình huống: {situationText}`
5. **Mirror instruction** (if `situationText` provided): `Mirror lại ngôn ngữ của người dùng khi phản chiếu, nhưng đừng lặp lại một cách máy móc.`
6. **Symbol**: `Biểu tượng đã chọn: {symbol.display_name}`
7. **Passage**: `Đoạn trích ({passage.reference}):\n{passage.text}`
8. **Hidden context** (if `resonanceContext || passage.resonance_context || passage.context`): `Ngữ cảnh ẩn cho người đọc (không nhắc lộ ra): {context}`

Parts are joined with `\n\n`.

## Post-Processing (server-only)

Server applies `finalizeInterpretationText()` after AI response:
- `ensureClosingQuestion()`: guarantees a closing question in `*...*` format
- `splitInlineClosingQuestion()`: separates inline questions to their own line
- `normalizeFreeText()`: strips control characters, collapses whitespace

Rust and Android paths do **not** apply post-processing. This is acceptable because:
- Claude/GPT4 generally follow the system prompt's closing question instruction
- Local models may occasionally miss it — acceptable trade-off for on-device inference

## Implementation Files

| Path | Status |
|---|---|
| `server/_core/interpretationService.ts` | Source of truth |
| `core/src/ai_client.rs` | Synced |
| `core/src/local_inference.rs` | Synced |
| `modules/aletheia-core-module/.../AletheiaCoreModule.kt` | Synced |

## CI Drift Check

When TS binding generation is implemented (BUG-01), add a CI step that diffs the prompt constants across all 4 files and fails on mismatch.
