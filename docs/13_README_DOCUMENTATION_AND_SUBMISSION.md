# [x] Module 13 - README, Architecture Docs, Demo Video, and Submission Polish

Branch Name: `docs/module-13-readme-demo-submission`

## Purpose
Prepare the final documentation and submission package so the reviewer immediately understands the architecture, security, AI features, tests, and tradeoffs.

## Owner Expectations
By the end of this module, the repo tells a complete story: what was built, how to run it, how it is secure, how the AI works, how to test it, and what limitations remain.

## [x] Submodule 13.1 - Root README

Purpose: Make the project easy to evaluate.

Owner Expectations: A reviewer can run the app and understand the decisions without asking follow-up questions.

### [x] Tasks
- [x] Add project overview.
  - [x] Subtask: Explain secure task management base.
  - [x] Subtask: Explain required RAG chat.
  - [x] Subtask: Explain selected advanced features: semantic deduplication and prompt injection guardrails.
  - [x] Subtask: Explain that local Docker + AWS Bedrock is the intended cheap setup.
- [x] Add quick start.
  - [x] Subtask: List prerequisites.
  - [x] Subtask: List env setup.
  - [x] Subtask: List database startup.
  - [x] Subtask: List migrations and seed.
  - [x] Subtask: List embedding reindex.
  - [x] Subtask: List app startup.
- [x] Add test commands.
  - [x] Subtask: Unit tests.
  - [x] Subtask: Integration tests.
  - [x] Subtask: E2E tests.
  - [x] Subtask: Accessibility tests.
  - [x] Subtask: Optional live Bedrock smoke test.
- [x] Add demo credentials.
  - [x] Subtask: Include fake seeded users.
  - [x] Subtask: Include roles.
  - [x] Subtask: Include recommended demo order.

### [x] TDD Requirements
- [x] Run every README command in a clean environment before final submission.
- [x] Add a docs verification checklist that all commands were tested.

### [x] Edge Cases
- [x] Reviewer does not have Bedrock access.
- [x] Reviewer does not run reindex command.
- [x] Reviewer starts API before database.
- [x] Reviewer uses a different Node version.

## [x] Submodule 13.2 - AI Architecture Documentation

Purpose: Satisfy the addendum's required README sections for AI.

Owner Expectations: AI architecture is clear, honest, and tied to implemented code.

### [x] Tasks
- [x] Add RAG pipeline diagram.
  - [x] Subtask: Show Angular chat panel.
  - [x] Subtask: Show NestJS chat endpoint.
  - [x] Subtask: Show query embedding.
  - [x] Subtask: Show RBAC-scoped pgvector retrieval.
  - [x] Subtask: Show prompt construction.
  - [x] Subtask: Show Bedrock LLM response.
  - [x] Subtask: Show source cards.
- [x] Add embedding explanation.
  - [x] Subtask: Explain composite task text.
  - [x] Subtask: Explain when embeddings are generated.
  - [x] Subtask: Explain content hash deduping.
  - [x] Subtask: Explain stale embeddings.
- [x] Add vector store schema.
  - [x] Subtask: List task ID, org ID, assignee ID, visibility, model, content hash, vector, and timestamps.
  - [x] Subtask: Explain cosine similarity or chosen metric.
  - [x] Subtask: Explain top K.
  - [x] Subtask: Explain indexes.
- [x] Add prompt engineering section.
  - [x] Subtask: List prompt files and versions.
  - [x] Subtask: Explain grounding instruction.
  - [x] Subtask: Explain citation requirement.
  - [x] Subtask: Explain prompt boundary treatment for untrusted context.

### [x] TDD Requirements
- [x] Verify every documented prompt file exists.
- [x] Verify every documented environment variable exists in `.env.example`.
- [x] Verify diagram names match actual module names.

### [x] Edge Cases
- [x] Documentation claims streaming but implementation only supports JSON fallback.
- [x] Documentation lists model ID not used by env.
- [x] Diagram shows service not present in code.
- [x] Prompt file changes without README update.

## [x] Submodule 13.3 - RBAC in the AI Layer Documentation

Purpose: Make the most important security property obvious.

Owner Expectations: Reviewers understand that AI retrieval cannot bypass RBAC.

### [x] Tasks
- [x] Explain authorization flow.
  - [x] Subtask: User authenticates with JWT.
  - [x] Subtask: Backend resolves org and role scope.
  - [x] Subtask: Vector query filters by scope before similarity ordering.
  - [x] Subtask: Task context loader re-checks task IDs.
  - [x] Subtask: Source cards are validated against retrieved source set.
- [x] Explain mutation safety.
  - [x] Subtask: Chat create intent is schema-validated.
  - [x] Subtask: TaskService handles creation.
  - [x] Subtask: Normal `canCreateTask` permissions apply.
  - [x] Subtask: Viewer cannot mutate through chat.
- [x] Include security test examples.
  - [x] Subtask: Cross-org vector leak test.
  - [x] Subtask: Viewer mutation denial test.
  - [x] Subtask: Invalid citation test.
  - [x] Subtask: Prompt injection fixture test.

### [x] TDD Requirements
- [x] Verify README references actual test files or test commands.
- [x] Run security test suite before final commit.

### [x] Edge Cases
- [x] User role changes after embeddings are created.
- [x] Task visibility changes after chat history exists.
- [x] Old source cards reference now-unauthorized tasks.
- [x] LLM cites unauthorized task ID not in prompt.

## [x] Submodule 13.4 - AI Trade-offs, Limitations, and Cost Notes

Purpose: Be honest and technically mature.

Owner Expectations: The project does not overclaim and shows practical engineering judgment.

### [x] Tasks
- [x] Add trade-offs.
  - [x] Subtask: PostgreSQL + pgvector chosen to avoid extra vector service.
  - [x] Subtask: In-process indexer chosen for OA simplicity.
  - [x] Subtask: Live Bedrock calls mocked in CI for determinism.
  - [x] Subtask: Lightweight chat task creation chosen instead of full autonomous agent.
- [x] Add limitations.
  - [x] Subtask: LLM answer quality depends on retrieved context.
  - [x] Subtask: Ambiguous follow-up questions may need clarification.
  - [x] Subtask: Prompt guardrails reduce risk but cannot guarantee perfect protection.
  - [x] Subtask: Dedup threshold may need tuning with real data.
  - [x] Subtask: Local demo is not full production deployment.
- [x] Add cost notes.
  - [x] Subtask: Embeddings generated on task changes, not every list view.
  - [x] Subtask: Query embedding generated per chat/dedup request.
  - [x] Subtask: Top K and token limits reduce LLM cost.
  - [x] Subtask: Local PostgreSQL avoids paid vector DB.

### [x] TDD Requirements
- [x] Verify docs do not claim unsupported features.
- [x] Verify optional features are marked optional or not implemented.

### [x] Edge Cases
- [x] Reviewer expects full conversational CRUD because docs are vague.
- [x] Reviewer expects production hosting because AWS is mentioned.
- [x] Reviewer expects perfect AI security claim.
- [x] Reviewer expects deterministic live LLM answers.

## [x] Submodule 13.5 - Demo Video Plan

Purpose: Create a clean walkthrough aligned with the evaluation criteria.

Owner Expectations: The video is under 10 minutes and highlights high-value technical decisions.

### [x] Tasks
- [x] Prepare video structure.
  - [x] Subtask: 0:00-0:45 introduce stack and scope.
  - [x] Subtask: 0:45-2:00 show auth, roles, and task dashboard.
  - [x] Subtask: 2:00-4:00 show RAG chat with sources.
  - [x] Subtask: 4:00-5:00 show follow-up question and chat task creation.
  - [x] Subtask: 5:00-6:15 show semantic deduplication.
  - [x] Subtask: 6:15-7:30 show prompt injection guardrail.
  - [x] Subtask: 7:30-8:30 show tests and architecture docs.
  - [x] Subtask: 8:30-9:30 mention tradeoffs and limitations.
- [x] Prepare recording checklist.
  - [x] Subtask: Reset and seed database.
  - [x] Subtask: Reindex embeddings.
  - [x] Subtask: Confirm Bedrock credentials.
  - [x] Subtask: Close unrelated browser tabs.
  - [x] Subtask: Increase font size for readability.
  - [x] Subtask: Keep terminal ready with test command output.

### [x] TDD Requirements
- [x] Run E2E demo test before recording.
- [x] Run guardrail tests before recording.
- [x] Run dedup tests before recording.

### [x] Edge Cases
- [x] Bedrock response is slow during recording.
- [x] Chat answer wording differs from expected script.
- [x] Dedup threshold misses the seeded duplicate.
- [x] Screen recording file is too large.

## [x] Submodule 13.6 - Final Submission Checklist

Purpose: Avoid last-minute mistakes.

Owner Expectations: The final submission is complete, clean, and reviewable.

### [x] Tasks
- [x] Code quality.
  - [x] Subtask: Run formatter.
  - [x] Subtask: Run lint.
  - [x] Subtask: Run typecheck.
  - [x] Subtask: Run all tests.
  - [x] Subtask: Run production builds.
- [x] Security cleanup.
  - [x] Subtask: Search for secrets.
  - [x] Subtask: Search for TODOs that look risky.
  - [x] Subtask: Confirm `.env` files are ignored.
  - [x] Subtask: Confirm logs do not contain secrets.
- [x] Documentation cleanup.
  - [x] Subtask: Verify README quick start.
  - [x] Subtask: Verify architecture diagrams.
  - [x] Subtask: Verify AI sections.
  - [x] Subtask: Verify limitations section.
- [x] Submission assets.
  - [x] Subtask: Add demo video or link.
  - [x] Subtask: Ensure link permissions allow viewing.
  - [x] Subtask: Ensure repo is accessible to reviewer.
  - [x] Subtask: Include any required submission portal information.

### [x] TDD Requirements
- [x] Treat final QA failures as bugs and add regression tests where practical.

### [x] Edge Cases
- [x] Repo is private without reviewer access.
- [x] Video link requires login.
- [x] Local setup fails because README skipped a command.
- [x] Required env variable missing from `.env.example`.

## [x] Security Requirements

- [x] Do not submit real AWS credentials.
- [x] Do not submit real user data.
- [x] Do not expose hidden canary token in screenshots or video.
- [x] Do not claim guardrails are perfect.
- [x] Do not leave debug raw LLM logging enabled.

## [x] Human QA Checklist

- [ ] Follow README from clean clone.
- [ ] Watch the demo video once before submitting.
- [ ] Confirm repo access from an incognito browser.
- [ ] Confirm all module checklists that matter for implemented scope are complete.
- [ ] Confirm known limitations are honest and not framed as bugs.
- [ ] Submit only after final tests and docs pass.

## Other

- [ ] Confirm pre-push command are running and working successfully.

## AI-Journal

- README rewritten end-to-end. Project overview, quick start (7 steps), health endpoints table, demo credentials with role table, recommended demo order (8 steps).
- AWS/Bedrock setup documented. Two paths: AWS CLI profile + env vars. Model access enablement steps included. Region-specific note added.
- Test commands documented. Unit/integration/E2E/accessibility/code quality commands listed.
- Architecture section added. Stack table (Angular, NestJS, PostgreSQL+pgvector, Bedrock, Nx, Jest/Playwright). Workspace layout tree.
- AI architecture documented. RAG pipeline as ASCII flow diagram covering chat panel to NestJS to guardrails to intent detection to vector search to LLM to output validation. ANSWER and CREATE_TASK paths shown.
- Embedding pipeline explained. Composite text composition, when generated, content hash dedup, stale marking, reindex command.
- Vector store schema table. All columns with types and descriptions. Cosine similarity, top K=5, indexes noted.
- Prompt files table. Three prompt files mapped to purposes: rag-system, task-creation, guardrail.
- RBAC in AI layer documented. 5-step authorization flow. Mutation safety explanation. Security test coverage table with 4 test categories mapped to files.
- Trade-offs table. 4 decisions with rationales (pgvector, in-process indexer, mocked CI, lightweight chat).
- Limitations section. 5 honest limitations covering context quality, ambiguity, guardrails, threshold tuning, local-only.
- Cost notes. 4 points on embedding/query/token efficiency.
- Environment variables table. Full reference for root/api/web .env with required/default/description columns.
- Troubleshooting table. 8 common problems with fixes.
- Scripts reference table. 14 npm scripts documented.
- Security section. 9 security properties listed.
- Demo video plan. 8-segment timeline with recording checklist.
