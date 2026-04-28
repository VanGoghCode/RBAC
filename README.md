# RBAC

Secure task management workspace built with Nx, Angular, NestJS, and PostgreSQL.

## Local Setup

```sh
pnpm install
pnpm dev:web
```

The web app serves on port 4200 and proxies API requests to the NestJS app.

## Available Scripts

- `pnpm dev:web` - start the Angular app
- `pnpm dev:api` - start the NestJS API
- `pnpm dev` - start the web app with the API dependency chain
- `pnpm build` - build every project in the workspace
- `pnpm test` - run all project tests
- `pnpm lint` - lint all projects
- `pnpm typecheck` - run TypeScript project builds for the generated projects

## Workspace Layout

- `web/` - Angular application
- `apps/api/` - NestJS API
- `libs/shared/` - shared validation, config, and test utilities

## Status

This is the initial scaffold. The domain feature libraries, database layer, auth, and AI features will be added in later modules.
