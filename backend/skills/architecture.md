# Backend Architecture

## Purpose

This document defines backend layering, folder responsibilities, naming conventions, and data-shape rules.
It ensures consistency, predictability, and long-term maintainability.

Goals:

- Keep it simple (KISS)
- Don’t build what we don’t need (YAGNI)
- Make responsibilities obvious
- Make AI-generated code predictable

---

# Folder Structure & Responsibilities

## `/controllers`

**Role:** HTTP boundary + orchestration only.

### Responsibilities

- Parse and validate requests (schema validation)
- Map HTTP → application inputs (DTOs)
- Call **services** for business logic
- Call **repositories** only for pure CRUD with zero business rules
- Handle HTTP concerns (status codes, headers, pagination, response format)

### Must Not

- Contain business rules
- Contain DB queries directly
- Call `/lib` integrations directly

### Convention

- One controller per entity/resource
- `kebab-case.controller.ts`
  - Example: `user.controller.ts`
  - Example: `workout-log.controller.ts`

---

## `/services`

**Role:** Business logic layer.

### Responsibilities

- Implement business rules and workflows
- Compose multiple repositories and other services
- Enforce domain invariants
- Handle transactions (if supported)
- Return domain/application results (not HTTP responses)

### Must Not

- Know about HTTP request/response objects
- Perform camelCase ↔ snake_case conversion

---

## `/repositories`

**Role:** Data access boundary (application → persistence).

### Responsibilities

- All DB reads and writes
- Convert camelCase ↔ snake_case
- Return camelCase only
- Hide DB implementation details

### Must Not

- Contain business logic
- Orchestrate multi-entity workflows (belongs to services)

---

## `/lib`

**Role:** External integrations and infrastructure clients.

### Examples

- Database initialization
- S3 client wrappers
- Email/SMS providers
- Third-party SDK adapters

### Rule

- Services may call `/lib`
- Controllers must not call `/lib` directly

---

## `/middlewares`

**Role:** Request pipeline utilities.

### Examples

- Authentication / Authorization
- Logging / tracing
- Rate limiting
- CORS / compression

### Rule

- Keep pure and reusable
- No business rules here

---

## `/models`

**Role:** Data definitions and schemas.

### Contains

- Application/domain interfaces (camelCase)
- Database schema types (snake_case)
- Validation schemas (optional)

### Rule

- Defines data shape only
- No logic

---

## `/routes`

**Role:** Route definitions.

### Responsibilities

- Map route → controller
- Apply guards/middlewares
- Export via barrel exports

### Rule

- No logic beyond wiring

---

## `/utils`

**Role:** Shared generic utilities.

### Examples

- Constants
- Generic helpers
- Type utilities
- Error helpers

### Rule

- If domain-specific, move to services

---

# Data Shape & Mapping Rules

## Case Conventions

- Application layer → camelCase
- Database layer → snake_case

## Mapping Responsibility

- Repositories accept camelCase inputs
- Repositories convert to snake_case for DB
- Repositories convert DB results back to camelCase
- Services and controllers never handle snake_case

---

# Naming Conventions

## Files

- `kebab-case`
  - Example: `file-upload.model.ts`

## Functions

- `camelCase`
- Verb-first naming

### Examples

- `getUser`
- `listWorkoutLogs`
- `createPlan`

## Repository Methods

- `findById`
- `findMany`
- `insertOne`
- `updateById`
- `deleteById`

## Service Methods

- `approveSettlement`
- `generateMonthlyReport`
- `assignUserToPlan`

---

# Error Handling Standard

## Repositories

- Throw infrastructure errors (DB unavailable, constraint violations)

## Services

- Throw domain/application errors (state conflict, rule violation)

## Controllers

- Translate errors into HTTP responses
- Return consistent error shape

---

# Controller-to-Repository Direct Access Rule

Controllers may call repositories directly ONLY if:

- The operation is simple CRUD
- No business rule or cross-entity workflow exists
- No state validation beyond schema validation is required

If business logic is introduced later, move the logic to a service.

---

# Design Principles

- Separation of concerns is enforced strictly.
- Services orchestrate workflows.
- Repositories isolate persistence details.
- Controllers remain thin.
- Data shape conversion happens only in repositories.
- External integrations are abstracted behind `/lib`.

This architecture ensures clarity, scalability, and AI-friendly determinism.

- Throw infrastructure errors (DB unavailable, constraint violations)

## Services

- Throw domain/application errors (state conflict, rule violation)

## Controllers

- Translate errors into HTTP responses
- Return consistent error shape

---

# Controller-to-Repository Direct Access Rule

Controllers may call repositories directly ONLY if:

- The operation is simple CRUD
- No business rule or cross-entity workflow exists
- No state validation beyond schema validation is required

If business logic is introduced later, move the logic to a service.

---

# Design Principles

- Separation of concerns is enforced strictly.
- Services orchestrate workflows.
- Repositories isolate persistence details.
- Controllers remain thin.
- Data shape conversion happens only in repositories.
- External integrations are abstracted behind `/lib`.

This architecture ensures clarity, scalability, and AI-friendly determinism.

# Backend Architecture

## Purpose

This document defines backend layering, folder responsibilities, naming conventions, and data-shape rules.
It ensures consistency, predictability, and long-term maintainability.

Goals:

- Keep it simple (KISS)
- Don’t build what we don’t need (YAGNI)
- Make responsibilities obvious
- Keep business logic readable in one pass
- Make AI-generated code predictable and deterministic

---

# Folder Structure & Responsibilities

## /controllers

Role: HTTP boundary only.

Responsibilities:

- Parse and validate requests (schema validation)
- Extract params, body, and query
- Call services for business logic
- Call repositories directly ONLY for simple CRUD (no business logic)
- Return HTTP response

Must NOT:

- Contain business rules
- Perform DB queries directly
- Call /lib integrations directly

Convention:

- One controller per entity/resource
- File naming: kebab-case.controller.ts
  - user.controller.ts
  - workout-log.controller.ts

Controllers must remain thin. If logic grows, move it to a service.

---

## /services

Role: Business logic layer.

Services answer:
“What should happen?”
Not:
“How does HTTP respond?”
“How does the database work?”

Responsibilities:

- Implement business rules
- Validate state beyond schema validation
- Coordinate multiple repositories
- Handle cross-entity workflows
- Call external integrations via /lib
- Return application-level results (not HTTP responses)

Must NOT:

- Access HTTP request/response objects
- Convert camelCase ↔ snake_case
- Perform raw database operations

---

# Service Function Rules (KISS + YAGNI)

1. One Function = One Business Action

Good examples:

- approveSettlement
- createWorkoutPlan
- assignUserToPlan

Avoid vague names like:

- processData
- handleRequest

1. Keep Functions Small and Linear

Preferred structure inside a service function:

1. Fetch data
2. Validate state
3. Execute main action
4. Perform side effects (if required)
5. Return result

Avoid deep nesting and mixed responsibilities.

1. Service Comment Standard

Every service function must include a short comment explaining:

- What it does
- Business rules enforced
- Side effects
- What it explicitly does NOT handle

Example:

Approves a settlement.

Business Rules:

- Settlement must exist
- Status must be "pending"
- Cannot be approved twice

Side Effects:

- Updates settlement status

Does NOT:

- Send notifications
- Handle HTTP responses

Explain business intent, not obvious code.

1. No Premature Abstractions (YAGNI)

Do NOT:

- Create base service classes
- Create generic service factories
- Abstract "just in case"

Extract shared logic only when:

- It is duplicated
- It is stable
- Reuse is clear

---

## /repositories

Role: Database abstraction layer.

Responsibilities:

- All database reads and writes
- Convert camelCase ↔ snake_case
- Return camelCase only
- Hide database implementation details

Must NOT:

- Contain business logic
- Orchestrate workflows

Repositories are data access only.

---

## /lib

Role: External integrations and infrastructure clients.

Examples:

- Database initialization
- S3 client wrappers
- Email/SMS providers
- Third-party SDK adapters

Rule:

- Services may call /lib
- Controllers must not call /lib directly

---

## /middlewares

Role: Request pipeline utilities.

Examples:

- Authentication / Authorization
- Logging / tracing
- Rate limiting
- CORS / compression

Rule:

- Keep pure and reusable
- No business rules

---

## /models

Role: Data definitions only.

Contains:

- Application/domain interfaces (camelCase)
- Database schema types (snake_case)

No business logic here.

---

## /routes

Role: Route wiring.

Responsibilities:

- Map route → controller
- Apply guards and middlewares
- Export via barrel exports

No business logic allowed.

---

## /utils

Role: Generic shared utilities.

Examples:

- Constants
- Generic helpers
- Type utilities
- Error helpers

If logic becomes domain-specific, move it to services.

---

# Data Shape & Mapping Rules

Case Convention:

- Application layer → camelCase
- Database layer → snake_case

Mapping Responsibility:

- Repositories accept camelCase input
- Repositories convert to snake_case for DB
- Repositories convert DB results back to camelCase
- Services and controllers must never handle snake_case

---

# Naming Conventions

Files:

- kebab-case
  - file-upload.model.ts
  - user.service.ts

Functions:

- camelCase
- Verb-first naming

Examples:

- getUser
- listWorkoutLogs
- createPlan
- approveSettlement

Repository Methods:

- findById
- findMany
- insertOne
- updateById
- deleteById

Service Methods:

- approveSettlement
- generateMonthlyReport
- assignUserToPlan

---

# Error Handling Standard

Repositories:

- Throw infrastructure errors (DB unavailable, constraint violations)

Services:

- Throw domain/application errors (state conflict, rule violation)

Controllers:

- Translate errors into HTTP responses
- Return consistent error shape

---

# Controller-to-Repository Direct Access Rule

Controllers may call repositories directly ONLY if:

- The operation is simple CRUD
- No business rule exists
- No cross-entity workflow exists
- No state validation beyond schema validation is required

If business logic is introduced later, move the logic to a service.

---

# Core Principles

- Keep services simple and readable.
- Keep controllers thin.
- Keep repositories isolated.
- Avoid premature abstraction.
- Add complexity only when required.
- Make business rules explicit.
- Keep logic understandable in one pass.

KISS.
YAGNI.
Clear boundaries.
Deterministic architecture.
P responses

- Return consistent error shape

---

# Controller-to-Repository Direct Access Rule

Controllers may call repositories directly ONLY if:

- The operation is simple CRUD
- No business rule exists
- No cross-entity workflow exists
- No state validation beyond schema validation is required

If business logic is introduced later, move the logic to a service.

---

# Core Principles

- Keep services simple and readable.
- Keep controllers thin.
- Keep repositories isolated.
- Avoid premature abstraction.
- Add complexity only when required.
- Make business rules explicit.
- Keep logic understandable in one pass.

KISS.
YAGNI.
Clear boundaries.
Deterministic architecture.

# Backend Architecture

## Purpose

This document defines backend layering, folder responsibilities, naming conventions, and data-shape rules.

Goals:

- Keep it simple (KISS)
- Don’t build what we don’t need (YAGNI)
- Make responsibilities obvious
- Keep business logic readable in one pass
- Make AI-generated code predictable and consistent

---

# Folder Structure & Responsibilities

## /controllers

Role: HTTP boundary only.

Responsibilities:

- Validate request (schema)
- Extract params/body/query
- Call services for business logic
- Call repositories directly ONLY for simple CRUD (no business logic)
- Return HTTP response

Must NOT:

- Contain business rules
- Perform DB queries directly
- Call /lib integrations directly

Convention:

- One controller per entity/resource
- File naming: kebab-case.controller.ts
  - user.controller.ts
  - workout-log.controller.ts

Controllers must remain thin. If logic grows, move it to a service.

---

## /services

Role: Business logic layer.

Services answer:

- What should happen?

Services do NOT answer:

- How does HTTP respond?
- How does the database work?

Responsibilities:

- Implement business rules
- Validate state beyond schema validation
- Coordinate multiple repositories
- Handle cross-entity workflows
- Call external integrations via /lib
- Return application-level results (not HTTP responses)

Must NOT:

- Access HTTP request/response objects
- Convert camelCase ↔ snake_case
- Perform raw database operations

---

# Service Function Rules (KISS + YAGNI)

1. One Function = One Business Action

Good:

- approveSettlement
- createWorkoutPlan
- assignUserToPlan

Avoid vague names:

- processData
- handleRequest

1. Keep Functions Small and Linear

Preferred structure inside a service function:

1. Fetch data
2. Validate state
3. Execute main action
4. Perform side effects (if required)
5. Return result

Avoid deep nesting and mixed responsibilities.

1. Service Comment Standard

Every service function must include a short comment explaining:

- What it does
- Business rules enforced
- Side effects
- What it explicitly does NOT handle

Example format:

Approves a settlement.

Business Rules:

- Settlement must exist
- Status must be "pending"
- Cannot be approved twice

Side Effects:

- Updates settlement status

Does NOT:

- Send notifications
- Handle HTTP responses

Explain business intent, not obvious code.

1. No Premature Abstractions (YAGNI)

Do NOT:

- Create base service classes
- Create generic service factories
- Abstract "just in case"

Extract shared logic only when:

- It is duplicated
- It is stable
- Reuse is clear

---

## /repositories

Role: Database abstraction layer.

Responsibilities:

- All database reads and writes
- Convert camelCase ↔ snake_case
- Return camelCase only
- Hide database implementation details

Must NOT:

- Contain business logic
- Orchestrate workflows

Repositories are data access only.

---

## /lib

Role: External integrations and infrastructure clients.

Examples:

- Database initialization
- S3 client wrappers
- Email/SMS providers
- Third-party SDK adapters

Rule:

- Services may call /lib
- Controllers must not call /lib directly

---

## /middlewares

Role: Request pipeline utilities.

Examples:

- Authentication / Authorization
- Logging / tracing
- Rate limiting
- CORS / compression

Rule:

- Keep pure and reusable
- No business rules

---

## /models

Role: Data definitions only.

Contains:

- Application/domain interfaces (camelCase)
- Database schema types (snake_case)

No business logic here.

---

## /routes

Role: Route wiring.

Responsibilities:

- Map route → controller
- Apply guards and middlewares
- Export via barrel exports

No business logic allowed.

---

## /utils

Role: Generic shared utilities.

Examples:

- Constants
- Generic helpers
- Type utilities
- Error helpers

Rules:

- Keep utils generic (not domain-specific). If it becomes domain-specific, move it to services.
- Prefer lodash for common, boring operations instead of writing custom helpers.
  - Examples: get/set, isEmpty, uniq/uniqBy, groupBy, keyBy, orderBy, clamp, omit/pick, debounce/throttle
- Do NOT wrap lodash with another helper unless the wrapper adds real meaning or enforces a project rule.

---

# Data Shape & Mapping Rules

Case Convention:

- Application layer → camelCase
- Database layer → snake_case

Mapping Responsibility:

- Repositories accept camelCase input
- Repositories convert to snake_case for DB
- Repositories convert DB results back to camelCase
- Services and controllers must never handle snake_case

---

# Naming Conventions

Files:

- kebab-case
  - file-upload.model.ts
  - user.service.ts

Functions:

- camelCase
- Verb-first naming

Examples:

- getUser
- listWorkoutLogs
- createPlan
- approveSettlement

Repository Methods:

- findById
- findMany
- insertOne
- updateById
- deleteById

Service Methods:

- approveSettlement
- generateMonthlyReport
- assignUserToPlan

---

# Error Handling Standard

Repositories:

- Throw infrastructure errors (DB unavailable, constraint violations)

Services:

- Throw domain/application errors (state conflict, rule violation)

Controllers:

- Translate errors into HTTP responses
- Return consistent error shape

---

# Controller-to-Repository Direct Access Rule

Controllers may call repositories directly ONLY if:

- The operation is simple CRUD
- No business rule exists
- No cross-entity workflow exists
- No state validation beyond schema validation is required

If business logic is introduced later, move the logic to a service.

---

# Core Principles

- Keep services simple and readable.
- Keep controllers thin.
- Keep repositories isolated.
- Avoid premature abstraction.
- Add complexity only when required.
- Make business rules explicit.
- Keep logic understandable in one pass.

KISS.
YAGNI.
Clear boundaries.
Deterministic architecture.

Services:

- Throw domain/application errors (state conflict, rule violation)

Controllers:

- Translate errors into HTTP responses
- Return consistent error shape

---

# Controller-to-Repository Direct Access Rule

Controllers may call repositories directly ONLY if:

- The operation is simple CRUD
- No business rule exists
- No cross-entity workflow exists
- No state validation beyond schema validation is required

If business logic is introduced later, move the logic to a service.

---

# Core Principles

- Keep services simple and readable.
- Keep controllers thin.
- Keep repositories isolated.
- Avoid premature abstraction.
- Add complexity only when required.
- Make business rules explicit.
- Keep logic understandable in one pass.

KISS.
YAGNI.
Clear boundaries.
Deterministic architecture.

# Backend Architecture (Token-Efficient)

## Goals

- KISS: keep code simple and readable.
- YAGNI: no premature abstractions.
- Deterministic structure for humans + AI.

## Layer Rules (do not mix)

### controllers/

HTTP boundary only.

- Do: schema validate, parse params/body/query, call service, return HTTP.
- May: call repository ONLY for trivial CRUD (no rules, no cross-entity, no extra validation).
- Do not: business logic, DB queries, /lib calls.
- Naming: one per resource, kebab-case.controller.ts

### services/

Business logic only.

- Do: business rules, state validation, workflows, compose repos/services, call /lib.
- Do not: HTTP concerns, raw DB ops, camel↔snake conversion.
- Structure (typical): fetch → validate → act → side effects → return.
- Comments: explain intent (rules + side effects + what it does NOT do). Keep short.
- Helpers: if used only by one service function, keep it private/local to that file (don’t export or move to utils).

Example (1):

```ts
// Approve settlement: must exist + pending; updates status; no HTTP/toasts here.
export async function approveSettlement(id: string) {
  const s = await settlementRepo.findById(id);
  if (!s) throw new NotFoundError("Settlement not found");
  if (s.status !== "pending") throw new DomainError("Already processed");
  await settlementRepo.updateById(id, { status: "approved" });
  return { success: true };
}
```

### repositories/

Persistence boundary.

- Do: all DB reads/writes; hide DB details.
- Do: camelCase in/out; convert to/from snake_case internally.
- Do not: business rules, workflows.
- Naming (suggested): findById/findMany/insertOne/updateById/deleteById.

### lib/

External/infrastructure adapters (DB client, S3, email, 3rd-party SDK). Services call lib; controllers do not.

### middlewares/

Request pipeline utilities (auth, logging, rate limit). No business rules.

### models/

Types/schemas only.

- App types: camelCase.
- DB types: snake_case.

### routes/

Wiring only: route → controller + guards/middlewares. No logic.

### utils/

Generic helpers only (non-domain).

- Prefer lodash for common ops (get/set/isEmpty/uniqBy/groupBy/keyBy/orderBy/pick/omit/debounce/throttle).
- Don’t wrap lodash unless it adds meaning or enforces a project rule.

## Data Shape Rule

- App layer: camelCase.
- DB layer: snake_case.
- Only repositories know snake_case.

## Errors

- Repos: infrastructure errors.
- Services: domain/app errors.
- Controllers: map errors → HTTP responses (consistent shape).

# Backend Architecture (Token-Efficient)

## Goals

- KISS: keep code simple and readable.
- YAGNI: no premature abstractions.
- Deterministic structure for humans + AI.

## Layer Rules (do not mix)

### controllers/

HTTP boundary only.

- Do: schema validate, parse params/body/query, call service, return HTTP.
- May: call repository ONLY for trivial CRUD (no rules, no cross-entity, no extra validation).
- Do not: business logic, DB queries, /lib calls.
- Naming: one per resource, kebab-case.controller.ts

### services/

Business logic only.

- Do: business rules, state validation, workflows, compose repos/services, call /lib.
- Do not: HTTP concerns, raw DB ops, camel↔snake conversion.
- Structure: fetch → validate → act → side effects → return.
- Comments: intent (rules + side effects + what it does NOT do). Keep short.
- Helpers: if used only by one service function, keep it private/local to that file (don’t export or move to utils).

Example (1):

```ts
// Approve settlement: must exist + pending; updates status; no HTTP/toasts here.
export async function approveSettlement(id: string) {
  const s = await settlementRepo.findById(id);
  if (!s) throw new NotFoundError("Settlement not found");
  if (s.status !== "pending") throw new DomainError("Already processed");
  await settlementRepo.updateById(id, { status: "approved" });
  return { success: true };
}
```

### repositories/

Persistence boundary.

- Do: all DB reads/writes; hide DB details.
- Do: camelCase in/out; convert to/from snake_case internally.
- Do not: business rules, workflows.

### lib/

External/infrastructure adapters (DB client, S3, email, 3rd-party SDK). Services call lib; controllers do not.

### middlewares/

Request pipeline utilities (auth, logging, rate limit). No business rules.

### models/

Types/schemas only.

- App types: camelCase.
- DB types: snake_case.

### routes/

Wiring only: route → controller + guards/middlewares. No logic.

### utils/

Generic helpers only (non-domain).

- Prefer lodash for common ops (get/set/isEmpty/uniqBy/groupBy/keyBy/orderBy/pick/omit/debounce/throttle).
- Don’t wrap lodash unless it adds meaning or enforces a project rule.

## Data Shape Rule

- App layer: camelCase.
- DB layer: snake_case.
- Only repositories know snake_case.

## Errors

- Repos: infrastructure errors.
- Services: domain/app errors.
- Controllers: map errors → HTTP responses (consistent shape).

## TypeScript Build Check

- To check TS build errors, use:
  - `npx tsc --noEmit`
- Do NOT use `npm run build` for type-checking unless you specifically need bundling/output.
