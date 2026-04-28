# [ ] Module 06 - AI Foundation: AWS Bedrock, Embeddings, Vector Store, and Prompt Assets

Branch Name: `feature/module-06-ai-foundation-bedrock-pgvector`

## Purpose
Create the reusable AI infrastructure that powers RAG chat, semantic deduplication, prompt guardrails, and future AI features.

## Owner Expectations
By the end of this module, the app can call AWS Bedrock through a safe abstraction, generate embeddings, store/search vectors in PostgreSQL with pgvector, version prompts, and test everything with deterministic mocks.

## [ ] Submodule 06.1 - Bedrock Runtime Client Abstraction

Purpose: Keep AWS-specific calls isolated from application logic.

Owner Expectations: Services call internal AI interfaces, not AWS SDK directly.

### [ ] Tasks
- [ ] Create `libs/ai/bedrock`.
  - [ ] Subtask: Add Bedrock runtime client factory using AWS SDK for JavaScript.
  - [ ] Subtask: Read `AWS_REGION` and model IDs from validated config.
  - [ ] Subtask: Support local AWS credentials through normal AWS provider chain.
  - [ ] Subtask: Do not store AWS keys in code or frontend files.
- [ ] Create `LlmClient` interface.
  - [ ] Subtask: Define `complete()` for non-streamed responses.
  - [ ] Subtask: Define `stream()` for streamed responses when supported.
  - [ ] Subtask: Return normalized content, model metadata, latency, and token usage when available.
- [ ] Create `EmbeddingClient` interface.
  - [ ] Subtask: Define `embedText(text)`.
  - [ ] Subtask: Define `embedBatch(texts)` if batch support is used.
  - [ ] Subtask: Validate vector dimensions.
- [ ] Create retry and timeout policy.
  - [ ] Subtask: Retry transient throttling and network errors with small exponential backoff.
  - [ ] Subtask: Do not retry validation errors or auth errors.
  - [ ] Subtask: Set per-call timeout.

### [ ] TDD Requirements
- [ ] Write unit tests for config validation.
- [ ] Write unit tests for retryable vs non-retryable errors.
- [ ] Write unit tests that real AWS SDK client is not called when mock provider is configured.
- [ ] Write test for vector dimension validation.

### [ ] Edge Cases
- [ ] Bedrock model access is not enabled.
- [ ] AWS credentials are missing.
- [ ] Region does not support selected model.
- [ ] Request is throttled.
- [ ] Model returns malformed response.
- [ ] Streaming connection drops mid-response.

## [ ] Submodule 06.2 - Embedding Pipeline

Purpose: Generate task embeddings automatically and cheaply.

Owner Expectations: Task changes eventually produce fresh embeddings without duplicate Bedrock calls.

### [ ] Tasks
- [ ] Create embedding queue or background service.
  - [ ] Subtask: Start with simple in-process job runner for OA simplicity.
  - [ ] Subtask: Pick up tasks marked stale.
  - [ ] Subtask: Build composite task text using Module 04 builder.
  - [ ] Subtask: Skip embedding call when content hash is unchanged.
  - [ ] Subtask: Store embedding with task ID, org ID, assignee ID, visibility, model, version, and content hash.
- [ ] Add manual reindex command.
  - [ ] Subtask: Add script to reindex all tasks.
  - [ ] Subtask: Add script to reindex one organization.
  - [ ] Subtask: Add dry-run mode.
- [ ] Add indexing status API for development.
  - [ ] Subtask: Expose counts for indexed, stale, failed, and missing embeddings to admins only.

### [ ] TDD Requirements
- [ ] Write failing test that task creation marks embedding stale.
- [ ] Write failing test that indexer creates embedding row.
- [ ] Write failing test that unchanged content does not call Bedrock twice.
- [ ] Write failing test that failed embedding call is retried later.
- [ ] Write integration test with fake vector stored in pgvector.

### [ ] Edge Cases
- [ ] Task is deleted before indexing runs.
- [ ] Task is updated while indexing is in progress.
- [ ] Composite text is empty or too long.
- [ ] Bedrock call fails after DB transaction commits.
- [ ] Embedding model dimension changes.

## [ ] Submodule 06.3 - Vector Store Repository

Purpose: Provide safe vector insert and search operations.

Owner Expectations: All semantic retrieval is scoped by authorization metadata before similarity ranking.

### [ ] Tasks
- [ ] Create `VectorStoreRepository`.
  - [ ] Subtask: Implement upsert task embedding.
  - [ ] Subtask: Implement mark stale.
  - [ ] Subtask: Implement delete or exclude deleted task embeddings.
  - [ ] Subtask: Implement authorized similarity search.
- [ ] Create similarity query.
  - [ ] Subtask: Use pgvector cosine distance or equivalent metric consistently.
  - [ ] Subtask: Apply `orgId` and visibility filters in `WHERE` clause.
  - [ ] Subtask: Exclude soft-deleted tasks.
  - [ ] Subtask: Limit top K to configured maximum.
  - [ ] Subtask: Return task ID, title, similarity score, and metadata.
- [ ] Add vector index.
  - [ ] Subtask: Start with exact search for correctness.
  - [ ] Subtask: Add approximate index only if needed for performance.
  - [ ] Subtask: Document index choice and metric.

### [ ] TDD Requirements
- [ ] Write integration test that nearest task is returned.
- [ ] Write integration test that cross-org nearest task is not returned.
- [ ] Write integration test that private task is only returned to assignee or privileged role.
- [ ] Write test that top K is capped.
- [ ] Write test that deleted tasks are excluded.

### [ ] Edge Cases
- [ ] No embeddings exist.
- [ ] Query vector dimension does not match table.
- [ ] Similarity scores tie.
- [ ] User has access to many orgs.
- [ ] Task embedding exists but task row is missing.

## [ ] Submodule 06.4 - Prompt Asset Management

Purpose: Keep prompts versioned, testable, and explainable in the README.

Owner Expectations: Prompt templates are not hidden in random service code.

### [ ] Tasks
- [ ] Create `libs/ai/prompts`.
  - [ ] Subtask: Add RAG system prompt file.
  - [ ] Subtask: Add task creation intent prompt file.
  - [ ] Subtask: Add guardrail evaluation prompt file if used.
  - [ ] Subtask: Add prompt manifest with name, version, owner, and purpose.
- [ ] Add prompt rendering utility.
  - [ ] Subtask: Escape or delimit untrusted context.
  - [ ] Subtask: Include prompt version in LLM logs.
  - [ ] Subtask: Validate required variables are present.
- [ ] Add prompt tests.
  - [ ] Subtask: Snapshot prompt output with safe fake data.
  - [ ] Subtask: Test missing variable failure.
  - [ ] Subtask: Test canary token injection only in allowed guardrail prompts if used.

### [ ] TDD Requirements
- [ ] Write failing prompt render test before prompt renderer exists.
- [ ] Write failing test for missing variable.
- [ ] Write failing test that prompt version is attached to chat response metadata.

### [ ] Edge Cases
- [ ] Retrieved task contains text that looks like instructions.
- [ ] User question contains markdown tables or code.
- [ ] Prompt variable is empty.
- [ ] Prompt exceeds configured token budget.

## [ ] Submodule 06.5 - AI Cost and Latency Controls

Purpose: Keep Bedrock usage cheap and predictable.

Owner Expectations: The OA demo does not accidentally run expensive loops or unbounded calls.

### [ ] Tasks
- [ ] Add model configuration.
  - [ ] Subtask: Set low max output tokens for chat.
  - [ ] Subtask: Set top K retrieval limit to 5 by default.
  - [ ] Subtask: Set max task context length.
  - [ ] Subtask: Set per-user chat rate limit.
- [ ] Add caching and deduplication.
  - [ ] Subtask: Reuse embeddings when content hash is unchanged.
  - [ ] Subtask: Cache query embedding briefly only if safe and scoped by user/session.
- [ ] Add telemetry.
  - [ ] Subtask: Log latency per Bedrock call.
  - [ ] Subtask: Log model ID.
  - [ ] Subtask: Log token usage when returned.
  - [ ] Subtask: Log failure category.

### [ ] TDD Requirements
- [ ] Write test that max output tokens are passed to LLM client.
- [ ] Write test that rate limit blocks excessive calls.
- [ ] Write test that content hash prevents duplicate embeddings.
- [ ] Write test that telemetry redacts prompt content by default.

### [ ] Edge Cases
- [ ] User submits very long question.
- [ ] Retrieved context too large.
- [ ] Bedrock latency exceeds timeout.
- [ ] Token usage missing from provider response.

## [ ] Security Requirements

- [ ] Bedrock is called only from the backend.
- [ ] AWS credentials never appear in Angular code.
- [ ] Use least-privilege IAM permissions for Bedrock runtime invocation.
- [ ] Redact raw prompts and outputs unless explicitly enabled for development.
- [ ] Do not use LLM results as trusted JSON until schema validation passes.
- [ ] Do not let vector search run without authorization scope.
- [ ] Do not put JWTs, cookies, or secrets into prompts.

## [ ] Human QA Checklist

- [ ] Confirm AWS Bedrock model access in selected region.
- [ ] Run embedding smoke script against one seeded task.
- [ ] Confirm vector row appears in database.
- [ ] Run authorized vector search as Admin.
- [ ] Run authorized vector search as Viewer and confirm fewer results.
- [ ] Temporarily disable AWS credentials and confirm clear error.

## Other

- [ ] Confirm pre-push command are running and working successfully.