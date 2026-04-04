# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
# Start all services (frontend + backend) in parallel
pnpm dev

# Frontend only
cd frontend && pnpm dev

# Backend only
cd backend && pnpm dev
```

### Build & Lint

```bash
# Build backend
cd backend && pnpm build

# Build frontend
cd frontend && pnpm build

# Lint frontend
cd frontend && pnpm lint
```

### Testing

```bash
# Run backend tests (Vitest)
cd backend && pnpm test

# Run a single test file
cd backend && pnpm vitest run src/path/to/file.test.ts
```

### Database Migrations

```bash
cd backend
pnpm migration:create <name>
pnpm migration:up
pnpm migration:down
pnpm migration:status
```

### Docker

```bash
# Start full stack (frontend, backend, MongoDB, Redis)
docker-compose up
```

## Architecture

This is a **pnpm monorepo** with two workspaces: `backend/` and `frontend/`.

### Backend (`backend/src/`)

Hono HTTP framework with clean architecture layers:

- **`routes/`** — Endpoint definitions; grouped by feature, mounted in `index.ts`
- **`controllers/`** — Input validation and delegation to services
- **`services/`** — Business logic; most complexity lives here
- **`repositories/`** — Data access abstraction over Mongoose models
- **`models/`** — Mongoose schemas (User, Post, Log, Plan, Workout, Exercise, etc.)
- **`middlewares/`** — Auth (JWT), error handling, logging, rate limiting (Redis-backed)
- **`lib/`** — Database connection, S3 client, external service setup
- **`utils/`** — Shared types, constants, error classes, helpers

Request flow: `routes → controllers → services → repositories → models`

Key integrations: OpenAI (AI coaching), AWS S3 (file storage), Google OAuth, Redis (caching + rate limiting).

### Frontend (`frontend/`)

Next.js 16 App Router with React 19.

- **`app/(private)/`** — Auth-protected routes: `dashboard`, `feed`, `log`, `logs`, `plans`, `profile`, `stats`, `coach`, `feedback`
- **`app/(public)/`** — `login`, `register`
- **`app/onboarding/`** — First-time user flow
- **`components/ui/`** — Radix UI + Shadcn base components
- **`components/`** — Feature-aware shared components (BottomNav, PageHeader, TimerPill, etc.)
- **`hooks/query/`** — React Query hooks per feature
- **`lib/api.ts`** — Central `apiFetch` wrapper: handles token refresh on 401, rate-limit retries (429), and error toasts
- **`lib/store.ts`** — Zustand global client state
- **`contexts/`** — React Context for shared timer state

State management: React Query for server state, Zustand for client state, React Context for ephemeral shared state (timer).

### Authentication

JWT stored in HttpOnly cookies. The `apiFetch` wrapper in `lib/api.ts` automatically refreshes tokens on 401 and retries the original request — no manual handling needed in feature code.

### API Base URL

- **Dev (Docker):** `http://backend:4000`
- **Production:** relative paths (same origin)

Configured in `lib/api.ts`; do not hardcode URLs in feature code.

### Path Alias

Frontend uses `@/*` → `./src/*` (configured in `tsconfig.json`).
