# [x] Module 10 - Application Security Hardening and Privacy Review

Branch Name: `security/module-10-application-hardening`

## Purpose
Review and harden the full application against common web, API, authentication, authorization, AI, logging, and deployment risks.

## Owner Expectations
By the end of this module, the app has a clear security posture, documented controls, passing security tests, and no obvious high-risk gaps for an OA reviewer to point out.

## [x] Submodule 10.1 - API Hardening

Purpose: Protect NestJS APIs from common request-level attacks.

Owner Expectations: API responses are safe, consistent, and do not leak sensitive implementation details.

### [x] Tasks
- [x] Add security middleware.
  - [x] Subtask: Enable Helmet or equivalent headers.
  - [x] Subtask: Configure CORS to allowed frontend origins only.
  - [x] Subtask: Set request body size limits.
  - [x] Subtask: Disable server framework fingerprinting where practical.
- [x] Add global validation.
  - [x] Subtask: Reject unknown properties.
  - [x] Subtask: Transform and validate DTOs consistently.
  - [x] Subtask: Validate route params.
  - [x] Subtask: Validate query params.
- [x] Add error handling.
  - [x] Subtask: Return consistent error envelope.
  - [x] Subtask: Hide stack traces in non-development.
  - [x] Subtask: Map authorization failures to safe not-found where needed.

### [x] TDD Requirements
- [x] Write test that unknown DTO field is rejected.
- [x] Write test that large payload is rejected.
- [x] Write test that production error does not include stack trace.
- [x] Write test that CORS rejects unknown origin if testable.

### [x] Edge Cases
- [x] Missing content type.
- [x] Invalid JSON body.
- [x] Very large chat message.
- [x] SQL-like strings in search fields.
- [x] HTML or script strings in comments.

## [x] Submodule 10.2 - Authorization Hardening

Purpose: Prevent broken access control, the highest-risk class for this project.

Owner Expectations: Every data access path is tested against cross-org and cross-role leaks.

### [x] Tasks
- [x] Create authorization inventory.
  - [x] Subtask: List every API route.
  - [x] Subtask: Mark required auth guard.
  - [x] Subtask: Mark required RBAC/resource check.
  - [x] Subtask: Mark expected safe error behavior.
- [x] Audit repositories.
  - [x] Subtask: Confirm task list uses authorization scope.
  - [x] Subtask: Confirm task detail checks permission.
  - [x] Subtask: Confirm vector search uses authorization scope.
  - [x] Subtask: Confirm chat history uses ownership.
  - [x] Subtask: Confirm dedup candidate search uses authorization scope.
- [x] Add negative tests.
  - [x] Subtask: Cross-org task detail.
  - [x] Subtask: Cross-org task update.
  - [x] Subtask: Cross-org vector retrieval.
  - [x] Subtask: Cross-user chat history.
  - [x] Subtask: Viewer mutation attempts.

### [x] TDD Requirements
- [x] Write authorization inventory test or route guard review checklist.
- [x] Add missing forbidden tests before changing implementation.
- [x] Require every new route to include authorization test.

### [x] Edge Cases
- [x] User membership changes during active session.
- [x] Owner-child org traversal bug.
- [x] Multiple memberships conflict.
- [x] Unauthorized task ID is guessed.
- [x] AI source card references task user can no longer access.

## [x] Submodule 10.3 - Auth Token and Session Hardening

Purpose: Reduce token theft and session abuse risks.

Owner Expectations: Token behavior is documented and secure enough for a reviewer.

### [x] Tasks
- [x] Review token lifetimes.
  - [x] Subtask: Keep access token short-lived.
  - [x] Subtask: Keep refresh token longer but revocable.
  - [x] Subtask: Rotate refresh tokens.
  - [x] Subtask: Revoke refresh on logout.
- [x] Review cookie settings.
  - [x] Subtask: HttpOnly enabled.
  - [x] Subtask: Secure enabled outside local HTTP development.
  - [x] Subtask: SameSite set appropriately.
  - [x] Subtask: CSRF protection for refresh and state-changing cookie flows.
- [x] Review frontend storage.
  - [x] Subtask: Store access token in memory.
  - [x] Subtask: Do not store refresh token in local storage or session storage.

### [x] TDD Requirements
- [x] Write test that refresh cookie is HttpOnly.
- [x] Write test that refresh token rotates.
- [x] Write test that revoked refresh token fails.
- [x] Write test that disabled user cannot refresh.

### [x] Edge Cases
- [x] Browser refresh loses in-memory access token.
- [x] Multiple tabs refresh simultaneously.
- [x] User password changes while refresh token exists.
- [x] Cookie not sent due to SameSite mismatch.

## [x] Submodule 10.4 - Data Privacy and Logging

Purpose: Keep logs useful for audit without exposing sensitive data.

Owner Expectations: Logs can help debug and prove controls, but do not become a liability.

### [x] Tasks
- [x] Define log redaction rules.
  - [x] Subtask: Redact passwords.
  - [x] Subtask: Redact JWTs and cookies.
  - [x] Subtask: Redact AWS credentials.
  - [x] Subtask: Redact canary tokens.
  - [x] Subtask: Redact raw prompt/output by default.
- [x] Define audit events.
  - [x] Subtask: Login success/failure.
  - [x] Subtask: Role or membership changes.
  - [x] Subtask: Task create/update/delete.
  - [x] Subtask: Chat task creation.
  - [x] Subtask: Dedup decisions.
  - [x] Subtask: Guardrail blocks.
- [x] Define retention note.
  - [x] Subtask: For OA, document that local logs are development-only.
  - [x] Subtask: For production, recommend retention and deletion policy.

### [x] TDD Requirements
- [x] Write test that sensitive fields are redacted.
- [x] Write test that audit event is created for task mutation.
- [x] Write test that guardrail block logs safe metadata.

### [x] Edge Cases
- [x] Error object contains request body.
- [x] LLM response contains secret-looking text.
- [x] User enters password into chat by mistake.
- [x] Debug logging accidentally enabled in production.

## [x] Submodule 10.5 - Dependency and Supply Chain Review

Purpose: Reduce risk from vulnerable or unnecessary packages.

Owner Expectations: The project has a clean dependency story for review.

### [x] Tasks
- [x] Review dependencies.
  - [x] Subtask: Remove unused packages.
  - [x] Subtask: Prefer official SDKs and stable libraries.
  - [x] Subtask: Pin versions through lockfile.
  - [x] Subtask: Avoid packages for trivial utilities.
- [x] Add scanning.
  - [x] Subtask: Run package audit locally.
  - [x] Subtask: Document any accepted vulnerability with reason.
  - [x] Subtask: Add secret scanning reminder.
- [x] Review build outputs.
  - [x] Subtask: Ensure source maps are not exposed in production build unless intended.
  - [x] Subtask: Ensure environment files are not bundled with secrets.

### [x] TDD Requirements
- [x] Add CI check for lockfile integrity.
- [x] Add CI check for build success with production env placeholders.
- [x] Add manual dependency review checklist to PR template if used.

### [x] Edge Cases
- [x] Transitive dependency vulnerability has no patch.
- [x] Package audit reports dev-only issue.
- [x] Angular build accidentally includes API-only config.

## [x] Submodule 10.6 - AI-Specific Security Review

Purpose: Confirm AI features do not weaken the secure task system.

Owner Expectations: AI is an enhancement, not a bypass.

### [x] Tasks
- [x] Review RAG retrieval.
  - [x] Subtask: Confirm authorization filter before semantic search.
  - [x] Subtask: Confirm no unauthorized records in prompt context.
  - [x] Subtask: Confirm source citations are validated.
- [x] Review chat task creation.
  - [x] Subtask: Confirm structured output validation.
  - [x] Subtask: Confirm server-side permission check.
  - [x] Subtask: Confirm TaskService handles mutation.
- [x] Review guardrails.
  - [x] Subtask: Confirm canary detection.
  - [x] Subtask: Confirm prompt injection tests.
  - [x] Subtask: Confirm rate limits.
  - [x] Subtask: Confirm logs redact prompts by default.

### [x] TDD Requirements
- [x] Add AI security regression tests to CI.
- [x] Add a test that fails if vector repository is called without authorization scope.
- [x] Add a test that fails if LLM tool output bypasses schema validation.

### [x] Edge Cases
- [x] Embedding includes private task details.
- [x] Chat history contains old source the user can no longer view.
- [x] Prompt injection split between history and current message.
- [x] LLM generates a plausible but unsupported answer.

## [x] Security Requirements

- [x] Address OWASP-style risks: broken access control, cryptographic failures, injection, insecure design, misconfiguration, vulnerable components, auth failures, integrity failures, logging gaps, and SSRF where relevant.
- [x] Do not claim perfect security in README; document controls and known limitations honestly.
- [x] Keep final demo data fake.
- [x] Rotate secrets if accidentally committed during development.

## [ ] Human QA Checklist

- [ ] Run all security tests.
- [ ] Manually try unauthorized task URLs.
- [ ] Manually try prompt injection examples.
- [ ] Inspect browser devtools for tokens in local storage.
- [ ] Inspect network responses for stack traces or secrets.
- [ ] Confirm Angular build does not include AWS credentials.
- [ ] Confirm README documents security controls and limitations.

## Other

- [x] Confirm pre-push command are running and working successfully.

---

## AI-Journal

- **AllExceptionsFilter.** `common/filters/all-exceptions.filter.ts`. `@Catch()` wraps all errors → `{success, error, statusCode}`. ZodError → 400 readable string. ForbiddenException with resource denial → 404 (prevents enumeration). Stack traces only in dev. Logs full error server-side.
- **SanitizeBodyPipe.** `common/pipes/sanitize-body.pipe.ts`. Strips `__proto__`, `constructor`, `prototype` own-property keys. Deep recursion on nested objects + arrays. Registered global.
- **main.ts hardening.** Body limit `json({limit:'10kb'})`. `res.removeHeader('x-powered-by')` middleware. Helmet already active. Global filter + pipe + RedactingLogger wired.
- **RedactingLogger.** `common/logging/redacting-logger.ts`. Extends ConsoleLogger. Redacts JWTs, Bearer tokens, passwords, AWS keys, DB connection strings, canary hints from all log output. 6 regex patterns in `redaction.patterns.ts`.
- **Token hardening.** Removed 3 fallback secrets (`'change-me-...'`) from `auth.service.ts` + `jwt-access.strategy.ts`. App crashes at startup if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` missing. `token-hardening.spec.ts` verifies no fallbacks, correct expiry (15m/7d), cookie security (HttpOnly, Secure in prod, SameSite strict, restricted paths).
- **Authorization inventory.** `authorization-inventory.spec.ts`. 17 routes inventoried. Only login + refresh public. All others require JwtAccessGuard. 7 inventory tests verify coverage.
- **Chat service negative auth tests.** `chat.service.spec.ts`. Cross-org chat → ForbiddenException. Cross-user conversation → NotFoundException. Viewer create_task → denied. Guardrail input blocks → audited.
- **Audit repository tests.** `audit.repository.spec.ts`. 8 tests. Log stores actor/org/action/metadata. findMany scopes by orgId/actorId/action. Limit clamped to 100.
- **RAG authorization regression.** `rag-authorization.spec.ts`. Vector search called with auth scope. Cross-org results filtered at app level. Private tasks excluded for non-creators. Output guardrail blocks audited. Viewer cannot create tasks via chat.
- **CI hardening.** `.github/workflows/ci.yml`. `pnpm audit --audit-level=high` now blocking (removed `continue-on-error`).
- **Build security.** `build-security.spec.ts`. 7 tests verify helmet, x-powered-by removal, body limit, CORS config, .env gitignored, .env.example exists.
- **Tests.** 235 API tests pass. 21 test suites. API build clean.
