# Server Surface

Current server state in this repo:

- `server/routers.ts`: active tRPC surface for `system.*` and `auth.logout`.
- `server/_core/index.ts`: Express bootstrap, CORS guard, health endpoints, tRPC mount, rate limiting.
- `server/db.ts`: optional in-memory / external user lookup helpers used by authenticated server paths.
- `server/storage.ts`: storage proxy helper for server-side uploads.

## What Is Not Active

- Manus OAuth callback routes are not part of the active runtime surface.
- The previous `server/_core/oauth.ts` flow has been removed because auth was left half-disabled and no app runtime path called it.
- Raw AI provider keys are no longer exposed through any client-accessible route.

## Auth Status

- Runtime auth is limited to server-side session verification in `server/_core/sdk.ts`.
- Client-side login helpers have been removed from the active app surface.
- If full account login is reintroduced later, add it back as an end-to-end design with nonce validation, CSRF protection, and tests. Do not restore the old partial flow.

## Database Status

- Aletheia currently ships with local/native persistence as the primary product path.
- The server database layer is not the source of truth for readings/history.
- If a real shared backend database is added later, wire migrations and schema docs from the actual repo state instead of reviving the old template text.

## Verification

Useful commands for the current repo:

```bash
pnpm check
pnpm test -- --run tests/store.test.ts tests/auth.logout.test.ts
cargo test test_user_state_operations --manifest-path core/Cargo.toml
```
