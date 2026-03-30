# Repository Guidelines

## Project Structure & Module Organization

FitCheck is split into two apps:

- `frontend/`: Next.js App Router UI (`app/`, `components/`, `hooks/`, `lib/`, `assets/`, `public/`).
- `backend/`: Hono API (`src/routes`, `src/controllers`, `src/services`, `src/repositories`, `src/models`, `src/middlewares`, `src/tests`).

Infra and operations files live at the repo root (`docker-compose.yml`, `scripts/`) and `deployed/` (Caddy/Nginx deployment templates).

## Build, Test, and Development Commands

Run commands from the folder shown:

- Root: `pnpm dev` — runs workspace dev processes in parallel (if workspace tooling is configured).
- `frontend/`: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`.
- `backend/`: `pnpm dev`, `pnpm build`, `pnpm start`.
- `backend/` migrations: `pnpm migration:create <name>`, `pnpm migration:up`, `pnpm migration:down`, `pnpm migration:status`.
- Docker (repo root): `docker compose up --build`.

## Coding Style & Naming Conventions

- Language: TypeScript (ESM, explicit `.js` import extensions in backend runtime imports).
- Formatting: 2-space indentation, double quotes, trailing commas where supported.
- Backend file patterns: `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.middleware.ts`.
- Keep diffs minimal: avoid unrelated renames/refactors and preserve existing API contracts.
- Frontend changes should preserve SSR/SEO behavior unless explicitly changing it.

## Testing Guidelines

- Backend uses Vitest (`backend/src/tests/*.test.ts`).
- Run tests from `backend/` with `npx vitest run` (or `npx vitest` for watch mode).
- Add/adjust tests when changing routes, validation, auth, or error paths.
- Frontend currently has lint checks configured; add focused tests when introducing non-trivial UI logic.

## Commit & Pull Request Guidelines

- Follow Conventional Commit style seen in history: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- Keep commits scoped and descriptive (e.g., `fix: validate workout payload before save`).
- PRs should include: summary, affected areas (`frontend`, `backend`, `infra`), manual verification steps, and screenshots for UI changes.
- For data model/migration updates, call out backward compatibility and rollback risk.

## Agent-Specific Guardrails

- Check backend request validation, auth, and error handling on API changes.
- Before finishing, list exact files changed and manual verification steps.
