# Repository Guidelines

## Project Structure & Module Organization
- `packages/frontend/` Vue 3 + Vite app (port 3000); mocks in `packages/frontend/mock/`; router in `src/router/`.
- `packages/backend/` Next.js 14 (app dir, port 3001); Prisma expected in `packages/backend/prisma/`; SQLite files in `database/`.
- `packages/shared/` TypeScript types/utilities compiled to `dist/`.
- `scripts/` helper scripts (`dev.sh`, `build.sh`, `docker-build.sh`).
- Key docs: `README.md`, `REQUIRE.md`, `前端页面设计.md`, `后端接口+数据库设计.md`.

## Frontend Key Dependencies
- UI: Tailwind CSS (`tailwind.config.js`), `@headlessui/vue`, `@heroicons/vue`.
- State & Routing: Pinia, `vue-router@4`.
- HTTP: `axios` (interceptors in `packages/frontend/src/api/index.ts`).
- Markdown & Editor: `markdown-it`, `vue3-markdown-it`, CodeMirror 6 (`@codemirror/*`), `highlight.js`.
- Tooling: Vite + `@vitejs/plugin-vue`, `vite-plugin-mock` (dev-only), TypeScript, ESLint + `eslint-plugin-vue`, `vue-tsc`.

## Build, Test, and Development Commands
- Install: `pnpm install` (Node >= 18, pnpm >= 8).
- Dev (all packages): `pnpm dev` or `./scripts/dev.sh`.
- Dev (single): `pnpm --filter @hyper-context/frontend dev` | `pnpm --filter @hyper-context/backend dev`.
- Build: `pnpm build` (or `./scripts/build.sh`).
- Lint/Format/Types: `pnpm lint`, `pnpm format`, `pnpm type-check`.
- DB (proxied to backend): `pnpm db:generate`, `pnpm db:push`, `pnpm db:migrate`, `pnpm db:seed` (requires Prisma schema).
- Docker: `pnpm docker:build`, `pnpm docker:up`, `pnpm docker:down`.

## Coding Style & Naming Conventions
- Prettier: 2 spaces, no semicolons, single quotes, width 100, LF EOL (`.prettierrc`).
- ESLint: `eslint:recommended` + `@typescript-eslint/recommended`; `no-console` warn, `no-debugger` error in prod.
- Naming: Vue SFC files PascalCase (e.g., `MarkdownEditor.vue`); TS types/interfaces PascalCase; variables/functions camelCase.
- Imports: use `@/` alias for `src/` in frontend and backend.

## Testing Guidelines
- No test runner is configured yet. If adding tests:
  - Frontend: prefer Vitest for unit tests; optional Playwright for e2e.
  - Backend: Jest/tsx/Node test runner for API and logic.
  - Place tests as `*.spec.ts` next to code or under `__tests__/`.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `build:`, `ci:`.
  - Example: `feat(frontend): add VersionTimeline with stable flag toggle`.
- PRs: include clear description, linked issues, and checklists; attach before/after screenshots for UI changes.
- Ensure `pnpm lint`, `pnpm type-check`, and `pnpm build` pass before requesting review.

## Security & Configuration Tips
- Do not commit secrets; use `.env`/`.env.local` (client vars must start with `VITE_`).
- Toggle local mocks: `VITE_USE_MOCK=false pnpm --filter @hyper-context/frontend dev`.
- Docker compose sets `DATABASE_URL` and mounts `./database/`; review `docker-compose.yml` before deploying.
