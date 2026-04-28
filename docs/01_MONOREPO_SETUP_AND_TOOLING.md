# [x] Module 01 - Monorepo Setup, Tooling, and Developer Experience

Branch Name: `chore/module-01-monorepo-tooling`

## Purpose
Create a clean Nx monorepo with Angular, NestJS, shared libraries, linting, formatting, testing, Docker Compose, environment validation, and CI foundations.

## Owner Expectations
By the end of this module, a developer can clone the repo, install dependencies, copy environment variables, start PostgreSQL, run the API, run the web app, run tests, and understand where every major code area belongs.

## [x] Submodule 01.1 - Nx Workspace Bootstrap

Purpose: Create the base workspace with clear app and library boundaries.

Owner Expectations: The workspace builds locally and each generated app/library has a clear purpose.

### [x] Tasks
- [x] Create a new Nx workspace with TypeScript enabled.
  - [x] Subtask: Generate `apps/api` as a NestJS application.
  - [x] Subtask: Generate `apps/web` as an Angular application.
  - [x] Subtask: Configure path aliases for `@task-ai/shared/*`, `@task-ai/tasks/*`, `@task-ai/auth/*`, and `@task-ai/ai/*`.
  - [x] Subtask: Add a root `README.md` with local setup placeholders.
- [x] Create base shared libraries.
  - [x] Subtask: Create `libs/shared/types` for DTO-safe shared interfaces.
  - [x] Subtask: Create `libs/shared/validation` for schemas and reusable validators.
  - [x] Subtask: Create `libs/shared/config` for typed environment access.
  - [x] Subtask: Create `libs/shared/test-utils` for test factories and mocks.
- [x] Create domain library placeholders.
  - [x] Subtask: Create `libs/auth/*` folders.
  - [x] Subtask: Create `libs/orgs/*` folders.
  - [x] Subtask: Create `libs/tasks/*` folders.
  - [x] Subtask: Create `libs/ai/*` folders.
  - [x] Subtask: Create `libs/ui/*` folders.

### [x] TDD Requirements
- [x] Add a smoke test that imports one function from each shared library.
- [x] Add an API health test that fails before the `/health` endpoint exists.
- [x] Add a web shell test that fails before the root app renders the expected title.

### [ ] Edge Cases
- [x] Imports must not create circular dependencies between feature libraries.
- [x] The web app must not import server-only libraries.
- [x] Shared types must not contain secrets, Prisma client code, or Node-only APIs.

## [x] Submodule 01.2 - Package Scripts and Tooling

Purpose: Make common development commands predictable.

Owner Expectations: The owner can run one command for linting, testing, building, formatting, database migration, and local startup.

### [x] Tasks
- [x] Define root scripts.
  - [x] Subtask: Add `dev:db` to start Docker Compose database.
  - [x] Subtask: Add `dev:api` to run the NestJS API.
  - [x] Subtask: Add `dev:web` to run Angular.
  - [x] Subtask: Add `dev` to run web and api together.
  - [x] Subtask: Add `test`, `test:api`, `test:web`, `lint`, `format`, `build`, and `typecheck`.
- [x] Add formatting and linting.
  - [x] Subtask: Configure Prettier.
  - [x] Subtask: Configure ESLint with TypeScript, Angular, and NestJS rules.
  - [x] Subtask: Add import-order rules.
  - [x] Subtask: Add no-floating-promises or equivalent async safety rule.
- [x] Add Git hygiene.
  - [x] Subtask: Add `.editorconfig`.
  - [x] Subtask: Add `.nvmrc` or `.node-version` using the current LTS Node version used by the project.
  - [x] Subtask: Add `.env.example` files for root, API, and web.
  - [x] Subtask: Add `.gitignore` for env files, coverage, build outputs, and local database volumes.

### [ ] TDD Requirements
- [ ] Add a script test or CI dry run that fails if `lint`, `typecheck`, or `test` are missing.
- [x] Add a formatting check in CI so unformatted files fail the build.

### [ ] Edge Cases
- [x] Commands must work on a clean clone.
- [x] Commands must not require global Nx installation.
- [x] Scripts must not echo secrets from environment files.

## [x] Submodule 01.3 - Local Docker Compose

Purpose: Provide the cheapest and easiest local infrastructure.

Owner Expectations: The local database starts with one command and includes pgvector.

### [x] Tasks
- [x] Create `docker-compose.yml`.
  - [x] Subtask: Add a PostgreSQL service with pgvector support.
  - [x] Subtask: Add persistent local volume.
  - [x] Subtask: Add healthcheck.
  - [x] Subtask: Expose database port only for local development.
- [ ] Create local database documentation.
  - [ ] Subtask: Document how to start DB.
  - [ ] Subtask: Document how to reset DB.
  - [ ] Subtask: Document how to run migrations.
  - [ ] Subtask: Document how to seed demo data.

### [x] TDD Requirements
- [x] Add a database connection smoke test that fails when Postgres is not reachable.
- [x] Add a pgvector extension smoke test that fails if `CREATE EXTENSION vector` has not run.

### [ ] Edge Cases
- [x] Database container may start slower than the API.
- [ ] Existing local volume may contain old migrations.
- [ ] Docker may not be running.
- [ ] Port 5432 may already be in use.

## [x] Submodule 01.4 - Environment Configuration

Purpose: Fail fast when required environment variables are missing or invalid.

Owner Expectations: Misconfigured environments show clear startup errors without leaking secrets.

### [x] Tasks
- [x] Create typed API config module.
  - [x] Subtask: Validate `DATABASE_URL`.
  - [x] Subtask: Validate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
  - [x] Subtask: Validate `AWS_REGION`.
  - [x] Subtask: Validate `BEDROCK_LLM_MODEL_ID`.
  - [x] Subtask: Validate `BEDROCK_EMBEDDING_MODEL_ID`.
  - [x] Subtask: Validate rate-limit values.
- [x] Create web runtime config.
  - [x] Subtask: Define `API_BASE_URL`.
  - [x] Subtask: Define feature flags for AI chat and semantic dedup.
  - [x] Subtask: Ensure frontend config never contains AWS secrets.

### [x] TDD Requirements
- [x] Add unit tests for missing required environment variables.
- [x] Add unit tests for invalid numeric configuration.
- [x] Add unit tests that ensure secret values are redacted in config errors.

### [x] Edge Cases
- [x] Empty strings must not pass validation.
- [x] Invalid URLs must fail validation.
- [x] Development defaults must never be used in production mode.

## [x] Submodule 01.5 - CI Baseline

Purpose: Make every pull request prove it is safe enough to merge.

Owner Expectations: CI runs fast and covers lint, types, unit tests, and builds.

### [x] Tasks
- [x] Add GitHub Actions workflow.
  - [x] Subtask: Install dependencies with lockfile enforcement.
  - [x] Subtask: Run lint.
  - [x] Subtask: Run typecheck.
  - [x] Subtask: Run unit tests.
  - [x] Subtask: Build API and web.
- [x] Add dependency and security checks.
  - [x] Subtask: Add `npm audit` or equivalent as a non-blocking first pass.
  - [ ] Subtask: Add secret scanning guidance in docs.
  - [x] Subtask: Add coverage output artifact.

### [ ] TDD Requirements
- [x] Add a deliberately simple test so CI visibly executes tests from both apps.
- [x] Add a build verification step before merging feature modules.

### [ ] Edge Cases
- [x] CI must not require real AWS credentials.
- [x] CI must not invoke real Bedrock calls.
- [x] CI must not depend on a developer's local `.env` file.

## [x] Security Requirements

- [x] Do not commit `.env` files.
- [x] Do not commit AWS credentials.
- [x] Do not print environment variables in CI logs.
- [x] Pin package versions through the lockfile.
- [x] Keep generated test coverage and build artifacts out of Git.
- [x] Use separate secrets for access tokens and refresh tokens.

## [ ] Human QA Checklist

- [ ] Clone the repo in a fresh folder.
- [ ] Run install command.
- [ ] Run database startup command.
- [ ] Run migrations and seed command when Module 02 exists.
- [ ] Run web and API together.
- [ ] Run all tests.
- [ ] Confirm no real AWS call happens during tests.
