# [ ] Module 13 - README, Architecture Docs, Demo Video, and Submission Polish

Branch Name: `docs/module-13-readme-demo-submission`

## Purpose
Prepare the final documentation and submission package so the reviewer immediately understands the architecture, security, AI features, tests, and tradeoffs.

## Owner Expectations
By the end of this module, the repo tells a complete story: what was built, how to run it, how it is secure, how the AI works, how to test it, and what limitations remain.

## [ ] Submodule 13.1 - Root README

Purpose: Make the project easy to evaluate.

Owner Expectations: A reviewer can run the app and understand the decisions without asking follow-up questions.

### [ ] Tasks
- [ ] Add project overview.
  - [ ] Subtask: Explain secure task management base.
  - [ ] Subtask: Explain required RAG chat.
  - [ ] Subtask: Explain selected advanced features: semantic deduplication and prompt injection guardrails.
  - [ ] Subtask: Explain that local Docker + AWS Bedrock is the intended cheap setup.
- [ ] Add quick start.
  - [ ] Subtask: List prerequisites.
  - [ ] Subtask: List env setup.
  - [ ] Subtask: List database startup.
  - [ ] Subtask: List migrations and seed.
  - [ ] Subtask: List embedding reindex.
  - [ ] Subtask: List app startup.
- [ ] Add test commands.
  - [ ] Subtask: Unit tests.
  - [ ] Subtask: Integration tests.
  - [ ] Subtask: E2E tests.
  - [ ] Subtask: Accessibility tests.
  - [ ] Subtask: Optional live Bedrock smoke test.
- [ ] Add demo credentials.
  - [ ] Subtask: Include fake seeded users.
  - [ ] Subtask: Include roles.
  - [ ] Subtask: Include recommended demo order.

### [ ] TDD Requirements
- [ ] Run every README command in a clean environment before final submission.
- [ ] Add a docs verification checklist that all commands were tested.

### [ ] Edge Cases
- [ ] Reviewer does not have Bedrock access.
- [ ] Reviewer does not run reindex command.
- [ ] Reviewer starts API before database.
- [ ] Reviewer uses a different Node version.

## [ ] Submodule 13.2 - AI Architecture Documentation

Purpose: Satisfy the addendum's required README sections for AI.

Owner Expectations: AI architecture is clear, honest, and tied to implemented code.

### [ ] Tasks
- [ ] Add RAG pipeline diagram.
  - [ ] Subtask: Show Angular chat panel.
  - [ ] Subtask: Show NestJS chat endpoint.
  - [ ] Subtask: Show query embedding.
  - [ ] Subtask: Show RBAC-scoped pgvector retrieval.
  - [ ] Subtask: Show prompt construction.
  - [ ] Subtask: Show Bedrock LLM response.
  - [ ] Subtask: Show source cards.
- [ ] Add embedding explanation.
  - [ ] Subtask: Explain composite task text.
  - [ ] Subtask: Explain when embeddings are generated.
  - [ ] Subtask: Explain content hash deduping.
  - [ ] Subtask: Explain stale embeddings.
- [ ] Add vector store schema.
  - [ ] Subtask: List task ID, org ID, assignee ID, visibility, model, content hash, vector, and timestamps.
  - [ ] Subtask: Explain cosine similarity or chosen metric.
  - [ ] Subtask: Explain top K.
  - [ ] Subtask: Explain indexes.
- [ ] Add prompt engineering section.
  - [ ] Subtask: List prompt files and versions.
  - [ ] Subtask: Explain grounding instruction.
  - [ ] Subtask: Explain citation requirement.
  - [ ] Subtask: Explain prompt boundary treatment for untrusted context.

### [ ] TDD Requirements
- [ ] Verify every documented prompt file exists.
- [ ] Verify every documented environment variable exists in `.env.example`.
- [ ] Verify diagram names match actual module names.

### [ ] Edge Cases
- [ ] Documentation claims streaming but implementation only supports JSON fallback.
- [ ] Documentation lists model ID not used by env.
- [ ] Diagram shows service not present in code.
- [ ] Prompt file changes without README update.

## [ ] Submodule 13.3 - RBAC in the AI Layer Documentation

Purpose: Make the most important security property obvious.

Owner Expectations: Reviewers understand that AI retrieval cannot bypass RBAC.

### [ ] Tasks
- [ ] Explain authorization flow.
  - [ ] Subtask: User authenticates with JWT.
  - [ ] Subtask: Backend resolves org and role scope.
  - [ ] Subtask: Vector query filters by scope before similarity ordering.
  - [ ] Subtask: Task context loader re-checks task IDs.
  - [ ] Subtask: Source cards are validated against retrieved source set.
- [ ] Explain mutation safety.
  - [ ] Subtask: Chat create intent is schema-validated.
  - [ ] Subtask: TaskService handles creation.
  - [ ] Subtask: Normal `canCreateTask` permissions apply.
  - [ ] Subtask: Viewer cannot mutate through chat.
- [ ] Include security test examples.
  - [ ] Subtask: Cross-org vector leak test.
  - [ ] Subtask: Viewer mutation denial test.
  - [ ] Subtask: Invalid citation test.
  - [ ] Subtask: Prompt injection fixture test.

### [ ] TDD Requirements
- [ ] Verify README references actual test files or test commands.
- [ ] Run security test suite before final commit.

### [ ] Edge Cases
- [ ] User role changes after embeddings are created.
- [ ] Task visibility changes after chat history exists.
- [ ] Old source cards reference now-unauthorized tasks.
- [ ] LLM cites unauthorized task ID not in prompt.

## [ ] Submodule 13.4 - AI Trade-offs, Limitations, and Cost Notes

Purpose: Be honest and technically mature.

Owner Expectations: The project does not overclaim and shows practical engineering judgment.

### [ ] Tasks
- [ ] Add trade-offs.
  - [ ] Subtask: PostgreSQL + pgvector chosen to avoid extra vector service.
  - [ ] Subtask: In-process indexer chosen for OA simplicity.
  - [ ] Subtask: Live Bedrock calls mocked in CI for determinism.
  - [ ] Subtask: Lightweight chat task creation chosen instead of full autonomous agent.
- [ ] Add limitations.
  - [ ] Subtask: LLM answer quality depends on retrieved context.
  - [ ] Subtask: Ambiguous follow-up questions may need clarification.
  - [ ] Subtask: Prompt guardrails reduce risk but cannot guarantee perfect protection.
  - [ ] Subtask: Dedup threshold may need tuning with real data.
  - [ ] Subtask: Local demo is not full production deployment.
- [ ] Add cost notes.
  - [ ] Subtask: Embeddings generated on task changes, not every list view.
  - [ ] Subtask: Query embedding generated per chat/dedup request.
  - [ ] Subtask: Top K and token limits reduce LLM cost.
  - [ ] Subtask: Local PostgreSQL avoids paid vector DB.

### [ ] TDD Requirements
- [ ] Verify docs do not claim unsupported features.
- [ ] Verify optional features are marked optional or not implemented.

### [ ] Edge Cases
- [ ] Reviewer expects full conversational CRUD because docs are vague.
- [ ] Reviewer expects production hosting because AWS is mentioned.
- [ ] Reviewer expects perfect AI security claim.
- [ ] Reviewer expects deterministic live LLM answers.

## [ ] Submodule 13.5 - Demo Video Plan

Purpose: Create a clean walkthrough aligned with the evaluation criteria.

Owner Expectations: The video is under 10 minutes and highlights high-value technical decisions.

### [ ] Tasks
- [ ] Prepare video structure.
  - [ ] Subtask: 0:00-0:45 introduce stack and scope.
  - [ ] Subtask: 0:45-2:00 show auth, roles, and task dashboard.
  - [ ] Subtask: 2:00-4:00 show RAG chat with sources.
  - [ ] Subtask: 4:00-5:00 show follow-up question and chat task creation.
  - [ ] Subtask: 5:00-6:15 show semantic deduplication.
  - [ ] Subtask: 6:15-7:30 show prompt injection guardrail.
  - [ ] Subtask: 7:30-8:30 show tests and architecture docs.
  - [ ] Subtask: 8:30-9:30 mention tradeoffs and limitations.
- [ ] Prepare recording checklist.
  - [ ] Subtask: Reset and seed database.
  - [ ] Subtask: Reindex embeddings.
  - [ ] Subtask: Confirm Bedrock credentials.
  - [ ] Subtask: Close unrelated browser tabs.
  - [ ] Subtask: Increase font size for readability.
  - [ ] Subtask: Keep terminal ready with test command output.

### [ ] TDD Requirements
- [ ] Run E2E demo test before recording.
- [ ] Run guardrail tests before recording.
- [ ] Run dedup tests before recording.

### [ ] Edge Cases
- [ ] Bedrock response is slow during recording.
- [ ] Chat answer wording differs from expected script.
- [ ] Dedup threshold misses the seeded duplicate.
- [ ] Screen recording file is too large.

## [ ] Submodule 13.6 - Final Submission Checklist

Purpose: Avoid last-minute mistakes.

Owner Expectations: The final submission is complete, clean, and reviewable.

### [ ] Tasks
- [ ] Code quality.
  - [ ] Subtask: Run formatter.
  - [ ] Subtask: Run lint.
  - [ ] Subtask: Run typecheck.
  - [ ] Subtask: Run all tests.
  - [ ] Subtask: Run production builds.
- [ ] Security cleanup.
  - [ ] Subtask: Search for secrets.
  - [ ] Subtask: Search for TODOs that look risky.
  - [ ] Subtask: Confirm `.env` files are ignored.
  - [ ] Subtask: Confirm logs do not contain secrets.
- [ ] Documentation cleanup.
  - [ ] Subtask: Verify README quick start.
  - [ ] Subtask: Verify architecture diagrams.
  - [ ] Subtask: Verify AI sections.
  - [ ] Subtask: Verify limitations section.
- [ ] Submission assets.
  - [ ] Subtask: Add demo video or link.
  - [ ] Subtask: Ensure link permissions allow viewing.
  - [ ] Subtask: Ensure repo is accessible to reviewer.
  - [ ] Subtask: Include any required submission portal information.

### [ ] TDD Requirements
- [ ] Treat final QA failures as bugs and add regression tests where practical.

### [ ] Edge Cases
- [ ] Repo is private without reviewer access.
- [ ] Video link requires login.
- [ ] Local setup fails because README skipped a command.
- [ ] Required env variable missing from `.env.example`.

## [ ] Security Requirements

- [ ] Do not submit real AWS credentials.
- [ ] Do not submit real user data.
- [ ] Do not expose hidden canary token in screenshots or video.
- [ ] Do not claim guardrails are perfect.
- [ ] Do not leave debug raw LLM logging enabled.

## [ ] Human QA Checklist

- [ ] Follow README from clean clone.
- [ ] Watch the demo video once before submitting.
- [ ] Confirm repo access from an incognito browser.
- [ ] Confirm all module checklists that matter for implemented scope are complete.
- [ ] Confirm known limitations are honest and not framed as bugs.
- [ ] Submit only after final tests and docs pass.
