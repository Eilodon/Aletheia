# Aletheia Contracts

Last verified against repo: 2026-06-02.

Executable source of truth lives in `core/src/contracts.rs`. This document summarizes the active contracts and points to implementation files.

## Domain Enums

| Contract | Current Values |
|---|---|
| `Tradition` | `chinese`, `christian`, `islamic`, `sufi`, `stoic`, `universal` |
| `SourceType` | `hexagram`, `bibliomancy`, `meditation` |
| `SymbolMethod` | `manual`, `auto` |
| `MoodTag` | `confused`, `hopeful`, `anxious`, `curious`, `grateful`, `grief` |
| `SubscriptionTier` | `free`, `pro` |
| `UserIntent` | `clarity`, `comfort`, `challenge`, `guidance` |
| `ReadingState` | `idle`, `situation_input`, `source_selection`, `wildcard_reveal`, `wildcard_chosen`, `ritual_animation`, `passage_displayed`, `ai_streaming`, `ai_fallback`, `complete` |

## Core Data

| Contract | Key Fields |
|---|---|
| `Source` | `id`, `name`, `tradition`, `language`, `passage_count`, `is_bundled`, `is_premium`, `fallback_prompts`, `source_type` |
| `Passage` | `id`, `source_id`, `reference`, `text`, `context`, `resonance_context` |
| `Reading` | `id`, `created_at`, `source_id`, `passage_id`, `theme_id`, `symbol_chosen`, `symbol_method`, `situation_text`, `ai_interpreted`, `ai_used_fallback`, `mood_tag`, `is_favorite`, `shared`, `user_intent` |
| `UserState` | user identity, subscription tier, daily counters, session count, notification prefs, onboarding flag, current `user_intent` |
| `GiftReading` | `token`, `buyer_note`, `source_id`, `created_at`, `expires_at`, `redeemed`, `redeemed_at` |
| `LocalModelInfo` | model id/version/size/path/status/download progress/error |
| `DeviceCapability` | support flag, RAM, CPU cores, SIMD, estimated TPS, unsupported reason |

## Native Bridge

TypeScript bridge contract lives in `modules/aletheia-core-module/src/index.ts`.

Important native methods:

- `init()`
- `bootstrapBundledContent()`
- `performReading()`
- `chooseSymbol()`
- `completeReading()`
- `getUserState()` / `updateUserState()`
- `getReadings()` / `getReadingById()` / `updateReadingFlags()`
- `getSources()`
- `requestInterpretation()` / stream start-poll-cancel methods
- `createGift()` / `redeemGift()`
- `checkDeviceCapability()`
- `getLocalModelStatus()`
- `prepareLocalModel()` / cancel / delete
- `startLocalInterpretationStream()` / poll / cancel

## External Contracts

### Gift Backend

```text
POST /gift/create
input:  { source_id?: string, buyer_note?: string }
output: { token: string, deep_link: string }

POST /gift/redeem
input:  { token: string }
output: GiftReading
errors: GiftNotFound, GiftExpired, GiftAlreadyRedeemed, InvalidInput, Network
```

### RevenueCat

Runtime reads:

- Android key: `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
- iOS key: `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- entitlement id: `pro`
- package types expected by UI: `MONTHLY`, `ANNUAL`, `LIFETIME`

Failure policy: missing SDK/key/offering means Free tier and no crash.

### AI Providers

Provider keys are server-side:

- `ALETHEIA_CLAUDE_API_KEY`
- `ALETHEIA_OPENAI_API_KEY`
- `ALETHEIA_GEMINI_API_KEY`

Default models in active code:

- Claude: `claude-haiku-4-5-20251001`
- Server OpenAI: `gpt-4.1-mini`
- Server Gemini: `gemini-2.5-flash`
- Android local: `gemma-3-1b-it-qat-q4_0`

## Contract Change Rule

When changing a contract, update in this order:

1. `core/src/contracts.rs`
2. `core/src/aletheia.udl`
3. generated UniFFI bindings
4. `modules/aletheia-core-module/src/index.ts`
5. app/server callers
6. this document
