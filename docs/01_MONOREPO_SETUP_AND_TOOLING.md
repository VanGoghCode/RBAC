# [ ] Module 01 - Monorepo Setup, Tooling, and Developer Experience

Branch Name: `chore/module-01-monorepo-tooling`

## Purpose
Create a clean Nx monorepo with Angular, NestJS, shared libraries, linting, formatting, testing, Docker Compose, environment validation, and CI foundations.

## Owner Expectations
By the end of this module, a developer can clone the repo, install dependencies, copy environment variables, start PostgreSQL, run the API, run the web app, run tests, and understand where every major code area belongs.

## [ ] Submodule 01.1 - Nx Workspace Bootstrap

Purpose: Create the base workspace with clear app and library boundaries.

Owner Expectations: The workspace builds locally and each generated app/library has a clear purpose.

### [ ] Tasks
- [x] Create a new Nx workspace with TypeScript enabled.
  - [x] Subtask: Generate `apps/api` as a NestJS application.
  - [x] Subtask: Generate `apps/web` as an Angular application.
  - [ ] Subtask: Configure path aliases for `@task-ai/shared/*`, `@task-ai/tasks/*`, `@task-ai/auth/*`, and `@task-ai/ai/*`.
  - [x] Subtask: Add a root `README.md` with local setup placeholders.
- [x] Create base shared libraries.
  - [ ] Subtask: Create `libs/shared/types` for DTO-safe shared interfaces.
  - [x] Subtask: Create `libs/shared/validation` for schemas and reusable validators.
  - [x] Subtask: Create `libs/shared/config` for typed environment access.
  - [x] Subtask: Create `libs/shared/test-utils` for test factories and mocks.
- [ ] Create domain library placeholders.
  - [ ] Subtask: Create `libs/auth/*` folders.
  - [ ] Subtask: Create `libs/orgs/*` folders.
  - [ ] Subtask: Create `libs/tasks/*` folders.
  - [ ] Subtask: Create `libs/ai/*` folders.
  - [ ] Subtask: Create `libs/ui/*` folders.

### [ ] TDD Requirements
- [ ] Add a smoke test that imports one function from each shared library.
- [ ] Add an API health test that fails before the `/health` endpoint exists.
- [ ] Add a web shell test that fails before the root app renders the expected title.

### [ ] Edge Cases
- [ ] Imports must not create circular dependencies between feature libraries.
- [ ] The web app must not import server-only libraries.
- [ ] Shared types must not contain secrets, Prisma client code, or Node-only APIs.

## [ ] Submodule 01.2 - Package Scripts and Tooling

Purpose: Make common development commands predictable.

Owner Expectations: The owner can run one command for linting, testing, building, formatting, database migration, and local startup.

### [ ] Tasks
- [x] Define root scripts.
  - [ ] Subtask: Add `dev:db` to start Docker Compose database.
  - [x] Subtask: Add `dev:api` to run the NestJS API.
  - [x] Subtask: Add `dev:web` to run Angular.
  - [x] Subtask: Add `dev` to run web and api together.
  - [x] Subtask: Add `test`, `test:api`, `test:web`, `lint`, `format`, `build`, and `typecheck`.
- [x] Add formatting and linting.
  - [x] Subtask: Configure Prettier.
  - [x] Subtask: Configure ESLint with TypeScript, Angular, and NestJS rules.
  - [ ] Subtask: Add import-order rules.
  - [ ] Subtask: Add no-floating-promises or equivalent async safety rule.
- [ ] Add Git hygiene.
  - [x] Subtask: Add `.editorconfig`.
  - [ ] Subtask: Add `.nvmrc` or `.node-version` using the current LTS Node version used by the project.
  - [ ] Subtask: Add `.env.example` files for root, API, and web.
  - [x] Subtask: Add `.gitignore` for env files, coverage, build outputs, and local database volumes.

### [ ] TDD Requirements
- [ ] Add a script test or CI dry run that fails if `lint`, `typecheck`, or `test` are missing.
- [ ] Add a formatting check in CI so unformatted files fail the build.

### [ ] Edge Cases
- [ ] Commands must work on a clean clone.
- [ ] Commands must not require global Nx installation.
- [ ] Scripts must not echo secrets from environment files.

## [ ] Submodule 01.3 - Local Docker Compose

Purpose: Provide the cheapest and easiest local infrastructure.

Owner Expectations: The local database starts with one command and includes pgvector.

### [ ] Tasks
- [ ] Create `docker-compose.yml`.
  - [ ] Subtask: Add a PostgreSQL service with pgvector support.
  - [ ] Subtask: Add persistent local volume.
  - [ ] Subtask: Add healthcheck.
  - [ ] Subtask: Expose database port only for local development.
- [ ] Create local database documentation.
  - [ ] Subtask: Document how to start DB.
  - [ ] Subtask: Document how to reset DB.
  - [ ] Subtask: Document how to run migrations.
  - [ ] Subtask: Document how to seed demo data.

### [ ] TDD Requirements
- [ ] Add a database connection smoke test that fails when Postgres is not reachable.
- [ ] Add a pgvector extension smoke test that fails if `CREATE EXTENSION vector` has not run.

### [ ] Edge Cases
- [ ] Database container may start slower than the API.
- [ ] Existing local volume may contain old migrations.
- [ ] Docker may not be running.
- [ ] Port 5432 may already be in use.

## [ ] Submodule 01.4 - Environment Configuration

Purpose: Fail fast when required environment variables are missing or invalid.

Owner Expectations: Misconfigured environments show clear startup errors without leaking secrets.

### [ ] Tasks
- [ ] Create typed API config module.
  - [ ] Subtask: Validate `DATABASE_URL`.
  - [ ] Subtask: Validate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
  - [ ] Subtask: Validate `AWS_REGION`.
  - [ ] Subtask: Validate `BEDROCK_LLM_MODEL_ID`.
  - [ ] Subtask: Validate `BEDROCK_EMBEDDING_MODEL_ID`.
  - [ ] Subtask: Validate rate-limit values.
- [ ] Create web runtime config.
  - [ ] Subtask: Define `API_BASE_URL`.
  - [ ] Subtask: Define feature flags for AI chat and semantic dedup.
  - [ ] Subtask: Ensure frontend config never contains AWS secrets.

### [ ] TDD Requirements
- [ ] Add unit tests for missing required environment variables.
- [ ] Add unit tests for invalid numeric configuration.
- [ ] Add unit tests that ensure secret values are redacted in config errors.

### [ ] Edge Cases
- [ ] Empty strings must not pass validation.
- [ ] Invalid URLs must fail validation.
- [ ] Development defaults must never be used in production mode.

## [ ] Submodule 01.5 - CI Baseline

Purpose: Make every pull request prove it is safe enough to merge.

Owner Expectations: CI runs fast and covers lint, types, unit tests, and builds.

### [ ] Tasks
- [ ] Add GitHub Actions workflow.
  - [ ] Subtask: Install dependencies with lockfile enforcement.
  - [ ] Subtask: Run lint.
  - [ ] Subtask: Run typecheck.
  - [ ] Subtask: Run unit tests.
  - [ ] Subtask: Build API and web.
- [ ] Add dependency and security checks.
  - [ ] Subtask: Add `npm audit` or equivalent as a non-blocking first pass.
  - [ ] Subtask: Add secret scanning guidance in docs.
  - [ ] Subtask: Add coverage output artifact.

### [ ] TDD Requirements
- [ ] Add a deliberately simple test so CI visibly executes tests from both apps.
- [ ] Add a build verification step before merging feature modules.

### [ ] Edge Cases
- [ ] CI must not require real AWS credentials.
- [ ] CI must not invoke real Bedrock calls.
- [ ] CI must not depend on a developer's local `.env` file.

## [ ] Security Requirements

- [ ] Do not commit `.env` files.
- [ ] Do not commit AWS credentials.
- [ ] Do not print environment variables in CI logs.
- [ ] Pin package versions through the lockfile.
- [ ] Keep generated test coverage and build artifacts out of Git.
- [ ] Use separate secrets for access tokens and refresh tokens.

## [ ] Human QA Checklist

- [ ] Clone the repo in a fresh folder.
- [ ] Run install command.
- [ ] Run database startup command.
- [ ] Run migrations and seed command when Module 02 exists.
- [ ] Run web and API together.
- [ ] Run all tests.
- [ ] Confirm no real AWS call happens during tests.
