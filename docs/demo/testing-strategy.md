# Testing Strategy

## Test Types and Commands

| Type | Command | Scope |
|------|---------|-------|
| Backend Unit | `pnpm test:api` | Services, repositories, guards, pipes |
| Frontend Unit | `pnpm test:web` | Components, services, state, guards |
| Lib Unit | `pnpm test` (all) | Shared libs (auth, ai, tasks, orgs, ui) |
| API E2E | `pnpm exec nx run api-e2e:e2e` | HTTP-level auth, CRUD, chat flows |
| Web E2E | `pnpm exec nx run web-e2e:e2e` | Playwright browser login, task, chat |
| Lint | `pnpm lint` | ESLint across all projects |
| Typecheck | `pnpm typecheck` | TypeScript compilation check |

## What Gets Mocked

- **AWS Bedrock SDK** — never called in CI. Fake LLM and embedding clients.
- **External HTTP services** — no outbound network in tests.
- **Time-dependent logic** — use fixed dates in factories, not `Date.now()`.
- **Email** — no email provider in test environment.

## What Uses Real PostgreSQL

- `AuthorizationScopeService` integration tests — real DB, cleaned up in `afterAll`.
- `database.smoke.spec.ts` — verifies schema constraints and pgvector extension.
- `repository.scope.spec.ts` — tests RBAC queries against real data.
- `schema.constraints.spec.ts` — validates DB-level constraints.
- `seed.idempotence.spec.ts` — confirms seed script is re-runnable.

All DB-dependent tests skip gracefully if database is unreachable.

## Critical Path Tests

These must always pass before any merge:

1. **Auth**: login/refresh/logout, token rotation, disabled user rejection
2. **RBAC**: PermissionService role matrix, AuthorizationScopeService org hierarchy
3. **Task CRUD**: create, read, update, delete by each role
4. **Chat**: RAG retrieval scoped by auth, guardrail input/output checks
5. **Guardrails**: prompt injection blocked, canary detection, citation validation
6. **Security**: token hardening, build security, authorization inventory

## Coverage Map

### Auth and RBAC

| Area | Test File | Coverage |
|------|-----------|----------|
| Permission matrix | `libs/auth/src/lib/permission.service.spec.ts` | All 5 role types, cross-org, edge cases |
| Org hierarchy | `libs/auth/src/lib/authorization-scope.service.spec.ts` | Parent/child org, disabled user, nonexistent user |
| Token security | `apps/api/src/auth/token-hardening.spec.ts` | No fallback secrets, correct expiry, cookie flags |
| Auth flow | `apps/api/src/auth/auth.service.spec.ts` | Login, refresh, logout, profile, rotation |
| Auth inventory | `apps/api/src/app/authorization-inventory.spec.ts` | All routes require guards |

### Task CRUD

| Area | Test File | Coverage |
|------|-----------|----------|
| Task service | `apps/api/src/tasks/tasks.service.spec.ts` | Create, update, delete, list, activities, comments |
| DTO validation | `apps/api/src/tasks/dto/task.dto.spec.ts` | Schema validation, field rules |

### Activity and Audit

| Area | Test File | Coverage |
|------|-----------|----------|
| Repository scope | `apps/api/src/app/repository.scope.spec.ts` | Audit logs scoped by org |

### Embedding Pipeline

| Area | Test File | Coverage |
|------|-----------|----------|
| Vector validation | `libs/ai/src/lib/embedding/vector-validator.spec.ts` | Dimension mismatch detection |
| Embedding client | `libs/ai/src/lib/embedding/bedrock-embedding-client.spec.ts` | Mock provider interface |
| Bedrock factory | `libs/ai/src/lib/bedrock/bedrock-client.factory.spec.ts` | Client creation |

### RAG Retrieval

| Area | Test File | Coverage |
|------|-----------|----------|
| RAG auth | `apps/api/src/chat/rag-authorization.spec.ts` | Vector search auth-scoped, cross-org filtered |
| Chat service | `apps/api/src/chat/chat.service.spec.ts` | Cross-org denied, viewer denied, guardrail audit |

### Prompt Guardrails

| Area | Test File | Coverage |
|------|-----------|----------|
| Guardrail service | `apps/api/src/chat/guardrails/guardrail.service.spec.ts` | Input normalization, output validation, canary, adversarial |
| Adversarial fixtures | `apps/api/src/chat/guardrails/adversarial-fixtures.spec.ts` | Known attack patterns |

### Semantic Deduplication

| Area | Test File | Coverage |
|------|-----------|----------|
| Composite text | `libs/tasks/src/lib/composite-text/task-composite-text-builder.spec.ts` | Text building, truncation, hashing |

### Security

| Area | Test File | Coverage |
|------|-----------|----------|
| Build security | `apps/api/src/app/build-security.spec.ts` | Helmet, body limit, CORS, env |
| Exception filter | `apps/api/src/common/filters/all-exceptions.filter.spec.ts` | Error envelope, stack trace hiding |
| Sanitize pipe | `apps/api/src/common/pipes/sanitize-body.pipe.spec.ts` | Prototype pollution prevention |
| Log redaction | `apps/api/src/common/logging/redaction.patterns.spec.ts` | JWT, password, AWS key redaction |
| Schema | `apps/api/src/app/schema.constraints.spec.ts` | DB-level constraints |

### Frontend

| Area | Test File | Coverage |
|------|-----------|----------|
| Login page | `apps/web/src/app/pages/login/login.spec.ts` | Validation, login call, error display |
| Dashboard | `apps/web/src/app/pages/dashboard/dashboard.spec.ts` | Welcome, empty state, summary cards |
| Auth guard | `apps/web/src/app/auth/auth.guard.spec.ts` | Redirect to login |
| Auth state | `apps/web/src/app/auth/auth.state.spec.ts` | Login/logout state |
| Tasks API | `apps/web/src/app/services/tasks.api.spec.ts` | HTTP methods |
| Badges | `apps/web/src/app/shared/priority-badge.spec.ts`, `status-badge.spec.ts` | Rendering |
| E2E auth | `apps/web-e2e/src/auth.spec.ts` | Login, logout, redirect |
| API E2E auth | `apps/api-e2e/src/auth/auth.spec.ts` | Login, refresh, CSRF |
