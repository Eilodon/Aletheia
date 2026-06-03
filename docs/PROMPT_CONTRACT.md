# Prompt Contract

Last verified against repo: 2026-06-02.

## Canonical Sources

| File | Role |
|---|---|
| `server/_core/interpretationService.ts` | Server/cloud source of truth for validation, prompt assembly, provider routing, and post-processing. |
| `core/src/ai_client.rs` | Rust cloud client copy of the system prompt and prompt assembly. |
| `core/src/local_inference.rs` | Rust local inference interface and prompt builder for native local lanes. |
| `modules/aletheia-core-module/android/.../LocalInferenceEngine.kt` | Android execution engine for downloaded local model. |

The server and Rust `SYSTEM_PROMPT` copies should stay semantically identical. Line numbers drift, so search for `systemPrompt` and `SYSTEM_PROMPT` instead of relying on old line refs.

## Output Shape

Every interpretation should return exactly:

1. One short reflective paragraph.
2. One final open question on its own line, formatted as `*[question]*`.

The prompt forbids:

- specific advice,
- future prediction,
- judging the user's decision,
- empty reassurance,
- speaking as if the model is the user.

## Prompt Assembly Order

1. Language instruction.
2. Two-part structure instruction.
3. Optional `userIntent` tone instruction.
4. Optional sanitized `situationText`.
5. Optional mirror instruction when situation text exists.
6. Selected symbol.
7. Passage reference and text.
8. Optional hidden context from `resonanceContext`, `passage.resonance_context`, or `passage.context`.

Parts are joined with blank lines.

## Sanitization

User-supplied free text must be normalized, bounded to 500 chars, and checked for prompt-injection prefixes. DB-sourced passage fields are schema-bounded and should not be truncated by the same user-input sanitizer.

## Post-Processing

Server path applies `finalizeInterpretationText()`:

- ensures a closing question,
- splits inline final questions onto their own line,
- strips control characters and normalizes whitespace.

Rust/native local paths may not apply all server post-processing. This is acceptable only if local output is treated as beta-quality and fallback behavior remains clear.

## Drift Check

Before changing prompt behavior:

```bash
rg -n "systemPrompt|SYSTEM_PROMPT|buildPrompt|build_prompt|build_interpretation_prompt" server core modules
pnpm test -- --run tests/ai-client.test.ts tests/interpretation-service.test.ts tests/interpretation-eval.test.ts
```
