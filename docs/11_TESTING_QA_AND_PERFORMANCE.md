# [ ] Module 11 - Testing, QA, Performance, and Reliability

Branch Name: `test/module-11-testing-qa-performance`

## Purpose
Create the test strategy that proves the app is functional, secure, accessible, and stable enough for the OA.

## Owner Expectations
By the end of this module, the project has reliable unit, integration, E2E, accessibility, AI, and performance checks with a clear final QA checklist.

## [ ] Submodule 11.1 - Test Strategy and Coverage Map

Purpose: Make testing intentional and tied to risk.

Owner Expectations: Reviewers can see that critical behavior is covered, especially RBAC and AI security.

### [ ] Tasks
- [ ] Create testing documentation.
  - [ ] Subtask: List test types and commands.
  - [ ] Subtask: Define what must be mocked.
  - [ ] Subtask: Define what uses real PostgreSQL.
  - [ ] Subtask: Define critical path tests.
- [ ] Create coverage map.
  - [ ] Subtask: Auth and RBAC.
  - [ ] Subtask: Task CRUD.
  - [ ] Subtask: Activity and audit.
  - [ ] Subtask: Embedding pipeline.
  - [ ] Subtask: RAG retrieval.
  - [ ] Subtask: Prompt guardrails.
  - [ ] Subtask: Semantic deduplication.
  - [ ] Subtask: Angular accessibility.

### [ ] TDD Requirements
- [ ] Add test plan before adding final tests.
- [ ] Add missing tests before refactoring high-risk code.
- [ ] Treat every bug found during QA as a new failing test first.

### [ ] Edge Cases
- [ ] Tests pass individually but fail together.
- [ ] Tests depend on time zone.
- [ ] Tests depend on current date.
- [ ] Tests depend on live AWS Bedrock responses.

## [ ] Submodule 11.2 - Backend Unit and Integration Tests

Purpose: Prove services and repositories behave correctly.

Owner Expectations: High-risk backend logic has fast deterministic tests.

### [ ] Tasks
- [ ] Add service unit tests.
  - [ ] Subtask: PermissionService role matrix.
  - [ ] Subtask: AuthorizationScopeService org hierarchy.
  - [ ] Subtask: TaskCompositeTextBuilder.
  - [ ] Subtask: PromptRenderer.
  - [ ] Subtask: GuardrailService.
  - [ ] Subtask: IntentParser validation.
- [ ] Add repository integration tests.
  - [ ] Subtask: Task repository RBAC queries.
  - [ ] Subtask: Vector search with pgvector.
  - [ ] Subtask: Chat history ownership.
  - [ ] Subtask: Dedup event persistence.
- [ ] Add API E2E tests.
  - [ ] Subtask: Auth login/refresh/logout.
  - [ ] Subtask: Task CRUD by role.
  - [ ] Subtask: Chat ask JSON.
  - [ ] Subtask: Dedup conflict flow.
  - [ ] Subtask: Guardrail block flow.

### [ ] TDD Requirements
- [ ] Write failing tests for every new service method before implementation.
- [ ] Use factories instead of hard-coded fragile IDs.
- [ ] Use test database transaction cleanup or reset between tests.

### [ ] Edge Cases
- [ ] Database migration missing in test DB.
- [ ] Test order dependency.
- [ ] Race condition in refresh token rotation.
- [ ] Vector extension unavailable in CI.

## [ ] Submodule 11.3 - Frontend Component and E2E Tests

Purpose: Prove the user journey works from browser perspective.

Owner Expectations: The demo path is stable and accessible.

### [ ] Tasks
- [ ] Add Angular component tests.
  - [ ] Subtask: Login form.
  - [ ] Subtask: Task list.
  - [ ] Subtask: Task form.
  - [ ] Subtask: Chat panel.
  - [ ] Subtask: Dedup warning modal.
  - [ ] Subtask: Error alert and loading state.
- [ ] Add Playwright E2E tests.
  - [ ] Subtask: Login and logout.
  - [ ] Subtask: Create task.
  - [ ] Subtask: Edit task status.
  - [ ] Subtask: Ask chat and see source cards.
  - [ ] Subtask: Create task through chat.
  - [ ] Subtask: Dedup warning flow.
  - [ ] Subtask: Prompt injection safe response.
- [ ] Add accessibility tests.
  - [ ] Subtask: Run axe on login.
  - [ ] Subtask: Run axe on dashboard.
  - [ ] Subtask: Run axe on task form.
  - [ ] Subtask: Run axe on chat panel.
  - [ ] Subtask: Run keyboard-only tests for core flows.

### [ ] TDD Requirements
- [ ] Add E2E test for each demo step before final polish.
- [ ] Add regression test for every UI bug found manually.
- [ ] Keep tests independent and reset data between runs.

### [ ] Edge Cases
- [ ] Slow API response.
- [ ] Empty task list.
- [ ] Unauthorized UI action hidden but API still rejects direct call.
- [ ] Chat response with no sources.
- [ ] Dedup modal opened on mobile viewport.

## [ ] Submodule 11.4 - AI Deterministic Test Harness

Purpose: Test AI features without depending on live model randomness or cost.

Owner Expectations: CI never makes real Bedrock calls, but local smoke tests can.

### [ ] Tasks
- [ ] Create fake LLM client.
  - [ ] Subtask: Return configured answer for RAG tests.
  - [ ] Subtask: Return structured intent output for chat task creation tests.
  - [ ] Subtask: Return malformed output for validation tests.
  - [ ] Subtask: Return canary leakage for guardrail tests.
- [ ] Create fake embedding client.
  - [ ] Subtask: Return deterministic vectors by fixture key.
  - [ ] Subtask: Return similar vectors for duplicate test cases.
  - [ ] Subtask: Return invalid dimension for error tests.
- [ ] Add optional live smoke tests.
  - [ ] Subtask: Gate behind `RUN_LIVE_BEDROCK_TESTS=true`.
  - [ ] Subtask: Use one small embedding call.
  - [ ] Subtask: Use one small chat call.
  - [ ] Subtask: Never run in CI by default.

### [ ] TDD Requirements
- [ ] Write tests for fake clients first so feature tests can rely on them.
- [ ] Verify fake embeddings produce expected nearest-neighbor order.
- [ ] Verify fake LLM can simulate streaming chunks.

### [ ] Edge Cases
- [ ] Fake behavior hides real provider format issue.
- [ ] Live test fails because model access not enabled.
- [ ] Live test costs more than expected due to long prompt.
- [ ] Token count is missing in provider response.

## [ ] Submodule 11.5 - Performance Benchmarks

Purpose: Provide bonus-quality evidence without spending too much time.

Owner Expectations: The README can show basic latency targets and measured local results.

### [ ] Tasks
- [ ] Define performance targets.
  - [ ] Subtask: Task list API under 300 ms locally for seeded data.
  - [ ] Subtask: Vector search under 500 ms locally for seeded data.
  - [ ] Subtask: Chat first token or first response event under reasonable local/demo threshold.
  - [ ] Subtask: Embedding indexer handles seeded tasks without manual steps.
- [ ] Add benchmark scripts.
  - [ ] Subtask: Measure task list query.
  - [ ] Subtask: Measure vector query.
  - [ ] Subtask: Measure embedding throughput with mocked provider.
  - [ ] Subtask: Measure end-to-end chat with mocked provider.
- [ ] Add simple performance report.
  - [ ] Subtask: Store results in `docs/demo/performance.md`.
  - [ ] Subtask: Include hardware and dataset size.
  - [ ] Subtask: Mention live Bedrock latency varies by region/model.

### [ ] TDD Requirements
- [ ] Add benchmark smoke tests that fail only on functional errors, not strict timing in CI.
- [ ] Keep strict timing checks manual to avoid flaky CI.

### [ ] Edge Cases
- [ ] Cold start after Docker reset.
- [ ] First Bedrock call slower than later calls.
- [ ] Large retrieved context slows answer generation.
- [ ] Approximate vector index changes result ordering.

## [ ] Submodule 11.6 - Final Manual QA Matrix

Purpose: Ensure the final app is demo-ready.

Owner Expectations: Manual testing covers the exact things a reviewer is likely to try.

### [ ] Tasks
- [ ] Create manual QA matrix.
  - [ ] Subtask: Auth flows.
  - [ ] Subtask: RBAC flows.
  - [ ] Subtask: Task CRUD flows.
  - [ ] Subtask: Chat RAG flows.
  - [ ] Subtask: Chat task creation.
  - [ ] Subtask: Deduplication flows.
  - [ ] Subtask: Prompt injection flows.
  - [ ] Subtask: Accessibility flows.
- [ ] Record results.
  - [ ] Subtask: Mark pass/fail.
  - [ ] Subtask: Link bugs to tests.
  - [ ] Subtask: Add known limitations honestly.

### [ ] TDD Requirements
- [ ] Convert any manual failure into an automated regression test before final submission.

### [ ] Edge Cases
- [ ] Demo seed data does not match demo script.
- [ ] Browser cache holds old frontend bundle.
- [ ] Local database has stale data.
- [ ] AWS credentials expire during demo.

## [ ] Security Requirements

- [ ] CI tests use mocked AI providers.
- [ ] Test fixtures contain fake data only.
- [ ] E2E tests do not log passwords or tokens.
- [ ] Performance scripts do not spam Bedrock.
- [ ] Accessibility tests include chat output as untrusted content.

## [ ] Human QA Checklist

- [ ] Run `lint`.
- [ ] Run `typecheck`.
- [ ] Run backend tests.
- [ ] Run frontend tests.
- [ ] Run Playwright tests.
- [ ] Run accessibility checks.
- [ ] Run optional live Bedrock smoke only once.
- [ ] Run final demo script start to finish without resetting mid-way.
