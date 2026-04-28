# [ ] Module 10 - Application Security Hardening and Privacy Review

Branch Name: `security/module-10-application-hardening`

## Purpose
Review and harden the full application against common web, API, authentication, authorization, AI, logging, and deployment risks.

## Owner Expectations
By the end of this module, the app has a clear security posture, documented controls, passing security tests, and no obvious high-risk gaps for an OA reviewer to point out.

## [ ] Submodule 10.1 - API Hardening

Purpose: Protect NestJS APIs from common request-level attacks.

Owner Expectations: API responses are safe, consistent, and do not leak sensitive implementation details.

### [ ] Tasks
- [ ] Add security middleware.
  - [ ] Subtask: Enable Helmet or equivalent headers.
  - [ ] Subtask: Configure CORS to allowed frontend origins only.
  - [ ] Subtask: Set request body size limits.
  - [ ] Subtask: Disable server framework fingerprinting where practical.
- [ ] Add global validation.
  - [ ] Subtask: Reject unknown properties.
  - [ ] Subtask: Transform and validate DTOs consistently.
  - [ ] Subtask: Validate route params.
  - [ ] Subtask: Validate query params.
- [ ] Add error handling.
  - [ ] Subtask: Return consistent error envelope.
  - [ ] Subtask: Hide stack traces in non-development.
  - [ ] Subtask: Map authorization failures to safe not-found where needed.

### [ ] TDD Requirements
- [ ] Write test that unknown DTO field is rejected.
- [ ] Write test that large payload is rejected.
- [ ] Write test that production error does not include stack trace.
- [ ] Write test that CORS rejects unknown origin if testable.

### [ ] Edge Cases
- [ ] Missing content type.
- [ ] Invalid JSON body.
- [ ] Very large chat message.
- [ ] SQL-like strings in search fields.
- [ ] HTML or script strings in comments.

## [ ] Submodule 10.2 - Authorization Hardening

Purpose: Prevent broken access control, the highest-risk class for this project.

Owner Expectations: Every data access path is tested against cross-org and cross-role leaks.

### [ ] Tasks
- [ ] Create authorization inventory.
  - [ ] Subtask: List every API route.
  - [ ] Subtask: Mark required auth guard.
  - [ ] Subtask: Mark required RBAC/resource check.
  - [ ] Subtask: Mark expected safe error behavior.
- [ ] Audit repositories.
  - [ ] Subtask: Confirm task list uses authorization scope.
  - [ ] Subtask: Confirm task detail checks permission.
  - [ ] Subtask: Confirm vector search uses authorization scope.
  - [ ] Subtask: Confirm chat history uses ownership.
  - [ ] Subtask: Confirm dedup candidate search uses authorization scope.
- [ ] Add negative tests.
  - [ ] Subtask: Cross-org task detail.
  - [ ] Subtask: Cross-org task update.
  - [ ] Subtask: Cross-org vector retrieval.
  - [ ] Subtask: Cross-user chat history.
  - [ ] Subtask: Viewer mutation attempts.

### [ ] TDD Requirements
- [ ] Write authorization inventory test or route guard review checklist.
- [ ] Add missing forbidden tests before changing implementation.
- [ ] Require every new route to include authorization test.

### [ ] Edge Cases
- [ ] User membership changes during active session.
- [ ] Owner-child org traversal bug.
- [ ] Multiple memberships conflict.
- [ ] Unauthorized task ID is guessed.
- [ ] AI source card references task user can no longer access.

## [ ] Submodule 10.3 - Auth Token and Session Hardening

Purpose: Reduce token theft and session abuse risks.

Owner Expectations: Token behavior is documented and secure enough for a reviewer.

### [ ] Tasks
- [ ] Review token lifetimes.
  - [ ] Subtask: Keep access token short-lived.
  - [ ] Subtask: Keep refresh token longer but revocable.
  - [ ] Subtask: Rotate refresh tokens.
  - [ ] Subtask: Revoke refresh on logout.
- [ ] Review cookie settings.
  - [ ] Subtask: HttpOnly enabled.
  - [ ] Subtask: Secure enabled outside local HTTP development.
  - [ ] Subtask: SameSite set appropriately.
  - [ ] Subtask: CSRF protection for refresh and state-changing cookie flows.
- [ ] Review frontend storage.
  - [ ] Subtask: Store access token in memory.
  - [ ] Subtask: Do not store refresh token in local storage or session storage.

### [ ] TDD Requirements
- [ ] Write test that refresh cookie is HttpOnly.
- [ ] Write test that refresh token rotates.
- [ ] Write test that revoked refresh token fails.
- [ ] Write test that disabled user cannot refresh.

### [ ] Edge Cases
- [ ] Browser refresh loses in-memory access token.
- [ ] Multiple tabs refresh simultaneously.
- [ ] User password changes while refresh token exists.
- [ ] Cookie not sent due to SameSite mismatch.

## [ ] Submodule 10.4 - Data Privacy and Logging

Purpose: Keep logs useful for audit without exposing sensitive data.

Owner Expectations: Logs can help debug and prove controls, but do not become a liability.

### [ ] Tasks
- [ ] Define log redaction rules.
  - [ ] Subtask: Redact passwords.
  - [ ] Subtask: Redact JWTs and cookies.
  - [ ] Subtask: Redact AWS credentials.
  - [ ] Subtask: Redact canary tokens.
  - [ ] Subtask: Redact raw prompt/output by default.
- [ ] Define audit events.
  - [ ] Subtask: Login success/failure.
  - [ ] Subtask: Role or membership changes.
  - [ ] Subtask: Task create/update/delete.
  - [ ] Subtask: Chat task creation.
  - [ ] Subtask: Dedup decisions.
  - [ ] Subtask: Guardrail blocks.
- [ ] Define retention note.
  - [ ] Subtask: For OA, document that local logs are development-only.
  - [ ] Subtask: For production, recommend retention and deletion policy.

### [ ] TDD Requirements
- [ ] Write test that sensitive fields are redacted.
- [ ] Write test that audit event is created for task mutation.
- [ ] Write test that guardrail block logs safe metadata.

### [ ] Edge Cases
- [ ] Error object contains request body.
- [ ] LLM response contains secret-looking text.
- [ ] User enters password into chat by mistake.
- [ ] Debug logging accidentally enabled in production.

## [ ] Submodule 10.5 - Dependency and Supply Chain Review

Purpose: Reduce risk from vulnerable or unnecessary packages.

Owner Expectations: The project has a clean dependency story for review.

### [ ] Tasks
- [ ] Review dependencies.
  - [ ] Subtask: Remove unused packages.
  - [ ] Subtask: Prefer official SDKs and stable libraries.
  - [ ] Subtask: Pin versions through lockfile.
  - [ ] Subtask: Avoid packages for trivial utilities.
- [ ] Add scanning.
  - [ ] Subtask: Run package audit locally.
  - [ ] Subtask: Document any accepted vulnerability with reason.
  - [ ] Subtask: Add secret scanning reminder.
- [ ] Review build outputs.
  - [ ] Subtask: Ensure source maps are not exposed in production build unless intended.
  - [ ] Subtask: Ensure environment files are not bundled with secrets.

### [ ] TDD Requirements
- [ ] Add CI check for lockfile integrity.
- [ ] Add CI check for build success with production env placeholders.
- [ ] Add manual dependency review checklist to PR template if used.

### [ ] Edge Cases
- [ ] Transitive dependency vulnerability has no patch.
- [ ] Package audit reports dev-only issue.
- [ ] Angular build accidentally includes API-only config.

## [ ] Submodule 10.6 - AI-Specific Security Review

Purpose: Confirm AI features do not weaken the secure task system.

Owner Expectations: AI is an enhancement, not a bypass.

### [ ] Tasks
- [ ] Review RAG retrieval.
  - [ ] Subtask: Confirm authorization filter before semantic search.
  - [ ] Subtask: Confirm no unauthorized records in prompt context.
  - [ ] Subtask: Confirm source citations are validated.
- [ ] Review chat task creation.
  - [ ] Subtask: Confirm structured output validation.
  - [ ] Subtask: Confirm server-side permission check.
  - [ ] Subtask: Confirm TaskService handles mutation.
- [ ] Review guardrails.
  - [ ] Subtask: Confirm canary detection.
  - [ ] Subtask: Confirm prompt injection tests.
  - [ ] Subtask: Confirm rate limits.
  - [ ] Subtask: Confirm logs redact prompts by default.

### [ ] TDD Requirements
- [ ] Add AI security regression tests to CI.
- [ ] Add a test that fails if vector repository is called without authorization scope.
- [ ] Add a test that fails if LLM tool output bypasses schema validation.

### [ ] Edge Cases
- [ ] Embedding includes private task details.
- [ ] Chat history contains old source the user can no longer view.
- [ ] Prompt injection split between history and current message.
- [ ] LLM generates a plausible but unsupported answer.

## [ ] Security Requirements

- [ ] Address OWASP-style risks: broken access control, cryptographic failures, injection, insecure design, misconfiguration, vulnerable components, auth failures, integrity failures, logging gaps, and SSRF where relevant.
- [ ] Do not claim perfect security in README; document controls and known limitations honestly.
- [ ] Keep final demo data fake.
- [ ] Rotate secrets if accidentally committed during development.

## [ ] Human QA Checklist

- [ ] Run all security tests.
- [ ] Manually try unauthorized task URLs.
- [ ] Manually try prompt injection examples.
- [ ] Inspect browser devtools for tokens in local storage.
- [ ] Inspect network responses for stack traces or secrets.
- [ ] Confirm Angular build does not include AWS credentials.
- [ ] Confirm README documents security controls and limitations.

## Other

- [ ] Confirm pre-push command are running and working successfully.