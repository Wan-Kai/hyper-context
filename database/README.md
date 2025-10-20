Hyper Context Local SQLite Database

- Engine: SQLite (file at `database/hyper-context.db`)
- Managed by: Prisma (see `packages/backend/prisma/schema.prisma`)
- Ignored by git: Yes (`.gitignore` excludes `*.db` and `database/*.db`)

Usage
- Create/Update schema and client
  - `pnpm --filter @hyper-context/backend db:generate`
  - `pnpm --filter @hyper-context/backend db:push`
- Seed example data
  - `pnpm --filter @hyper-context/backend db:seed`
- Reset database (dangerous)
  - Delete `database/hyper-context.db` and rerun the 2 steps above.

Path Notes
- Prisma resolves SQLite paths relative to `schema.prisma` directory.
- Local `.env` now points to: `file:../../../database/hyper-context.db` so the DB lives in this folder.
- Docker Compose sets `DATABASE_URL=file:/app/database/hyper-context.db` and mounts this folder in the container.

What gets seeded
- 1 project (p-001 Hyper Docs), a simple knowledge tree (folder + file), and one published stable version (2.1.0) with main/node contents. Adjust `packages/backend/prisma/seed.js` as needed.

Troubleshooting
- If a file appears at `packages/database/hyper-context.db`, it means the path was resolved incorrectly. Ensure `packages/backend/.env` uses `file:../../../database/hyper-context.db`.
