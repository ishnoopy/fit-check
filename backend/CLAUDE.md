# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## TypeScript Check

```bash
npx tsc --noEmit   # type-check only — do NOT use pnpm build for this
```

## Layer Rules

### `controllers/`

HTTP boundary only. One file per resource (`kebab-case.controller.ts`).

- **Do:** schema validate → parse params/body/query → call service → return HTTP response
- **May:** call repository directly for trivial CRUD (no business rules, no cross-entity work, no extra state validation)
- **Do not:** business rules, raw DB queries, `/lib` calls

### `services/`

Business logic only. Answer _"what should happen?"_ — not how HTTP or DB work.

- **Do:** business rules, state validation, compose repos/services, call `/lib`
- **Do not:** HTTP concerns, raw DB ops, camelCase ↔ snake_case conversion
- **Structure:** fetch → validate → act → side effects → return
- **Helpers:** if only used inside one service function, keep them local to that file — do not export or move to `utils/`
- **Comments:** every exported function needs a short JSDoc explaining intent, rules enforced, side effects, and what it does NOT do

```ts
// Approves a settlement.
// Rules: must exist + status "pending". Side effects: updates status.
// Does NOT: send notifications, handle HTTP.
export async function approveSettlement(id: string) {
  const s = await settlementRepo.findById(id);
  if (!s) throw new NotFoundError("Settlement not found");
  if (s.status !== "pending") throw new DomainError("Already processed");
  await settlementRepo.updateById(id, { status: "approved" });
  return { success: true };
}
```

No premature abstractions — no base service classes, no generic factories. Extract shared logic only when it is duplicated, stable, and reuse is clear.

### `repositories/`

Persistence boundary. All DB reads and writes live here.

- **Do:** camelCase in/out; convert to/from snake_case internally; hide DB details
- **Do not:** business logic, orchestration
- **Method naming:** `findById` / `findMany` / `insertOne` / `updateById` / `deleteById`

### `lib/`

External/infrastructure adapters (DB client, S3, email, third-party SDKs). Services call `lib`; controllers do not.

### `middlewares/`

Request pipeline utilities (auth, logging, rate limiting). No business rules.

### `models/`

Types and schemas only — no logic.

- App/domain types: camelCase
- DB schema types: snake_case

### `routes/`

Wiring only: route → controller + guards/middlewares. No logic.

### `utils/`

Generic, non-domain helpers.

- Prefer lodash for common ops (`isEmpty`, `uniqBy`, `groupBy`, `keyBy`, `orderBy`, `pick`, `omit`, etc.)
- Do not wrap lodash unless the wrapper adds real meaning or enforces a project rule

## Data Shape Rule

Only repositories know snake_case. Everything above them (services, controllers) uses camelCase exclusively.

## Error Handling

| Layer | Throws |
|---|---|
| `repositories/` | Infrastructure errors (DB unavailable, constraint violations) |
| `services/` | Domain/application errors (rule violations, state conflicts) |
| `controllers/` | Maps errors → HTTP responses with a consistent shape |

## Naming

- Files: `kebab-case` (`file-upload.model.ts`, `user.service.ts`)
- Functions: `camelCase`, verb-first (`getUser`, `listWorkoutLogs`, `createPlan`)
