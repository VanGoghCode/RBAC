# RBAC

Secure task management workspace built with Nx, Angular, NestJS, and PostgreSQL.

## Prerequisites

- **Node.js**: version specified in `.nvmrc`
- **pnpm**: v10+
- **Docker**: required for local PostgreSQL with pgvector

## Local Setup

```sh
pnpm install
cp .env.example .env               # root config
cp apps/api/.env.example apps/api/.env   # API config
cp apps/web/.env.example apps/web/.env   # web config
pnpm dev:db                        # start PostgreSQL
pnpm dev                           # start API + web
```

The web app serves on port 4200 and proxies API requests to the NestJS API on port 3000.

## Database

### Start

```sh
pnpm dev:db
```

Uses `pgvector/pgvector:pg16` image. Data persists in a Docker volume named `pgdata`.

### Stop

```sh
pnpm dev:db:down
```

### Reset (drops volume)

```sh
pnpm dev:db:reset
```

Removes the `pgdata` volume and starts a fresh container. Use this when old migrations cause schema conflicts.

### Migrations

Migrations will be managed via Prisma in Module 02. After that module is complete:

```sh
pnpm db:migrate       # apply pending migrations
pnpm db:migrate:dev   # create a new migration
```

### Seed

Seeding will be added in Module 02. After that module is complete:

```sh
pnpm db:seed          # insert demo data
```

### Troubleshooting

| Problem | Fix |
|---|---|
| Docker not running | Start Docker Desktop or the Docker daemon before running `dev:db` |
| Port 5432 in use | Stop the conflicting service, or change the port in `docker-compose.yml` and `apps/api/.env` |
| Old volume conflicts | Run `pnpm dev:db:reset` to drop and recreate the volume |
| Container not healthy | Run `docker logs taskai-db` to inspect PostgreSQL logs |

## Available Scripts

- `pnpm dev:web` - start the Angular app
- `pnpm dev:api` - start the NestJS API
- `pnpm dev:db` - start PostgreSQL in Docker
- `pnpm dev:db:down` - stop PostgreSQL
- `pnpm dev:db:reset` - wipe and restart PostgreSQL
- `pnpm dev` - start the web app with the API dependency chain
- `pnpm build` - build every project in the workspace
- `pnpm test` - run all project tests
- `pnpm lint` - lint all projects
- `pnpm format` - format all files with Prettier
- `pnpm format:check` - check formatting without writing
- `pnpm typecheck` - run TypeScript type checking

## Workspace Layout

- `apps/api/` - NestJS API
- `apps/web/` - Angular application
- `libs/shared/types/` - shared TypeScript interfaces
- `libs/shared/validation/` - Zod schemas and validators
- `libs/shared/config/` - typed environment configuration
- `libs/shared/test-utils/` - test factories and mocks
- `libs/auth/` - auth domain library
- `libs/orgs/` - organization domain library
- `libs/tasks/` - task domain library
- `libs/ai/` - AI domain library
- `libs/ui/` - shared UI library

## Security

- `.env` files are excluded from Git via `.gitignore`. Never commit secrets.
- CI runs `pnpm audit` as a non-blocking security check.
- **Secret scanning**: Enable GitHub secret scanning on the repository (Settings > Code security > Secret scanning). This detects accidentally pushed API keys, tokens, and credentials.
- Locally, use `git diff --staged` before committing to verify no secrets are staged.

## Status

This is the initial scaffold. The domain feature libraries, database layer, auth, and AI features will be added in later modules.
