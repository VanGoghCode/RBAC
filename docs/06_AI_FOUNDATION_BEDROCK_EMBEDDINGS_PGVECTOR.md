# [x] Module 06 - AI Foundation: AWS Bedrock, Embeddings, Vector Store, and Prompt Assets

Branch Name: `feature/module-06-ai-foundation-bedrock-pgvector`

## Purpose
Create the reusable AI infrastructure that powers RAG chat, semantic deduplication, prompt guardrails, and future AI features.

## Owner Expectations
By the end of this module, the app can call AWS Bedrock through a safe abstraction, generate embeddings, store/search vectors in PostgreSQL with pgvector, version prompts, and test everything with deterministic mocks.

## [x] Submodule 06.1 - Bedrock Runtime Client Abstraction

Purpose: Keep AWS-specific calls isolated from application logic.

Owner Expectations: Services call internal AI interfaces, not AWS SDK directly.

### [x] Tasks
- [x] Create `libs/ai/bedrock`.
  - [x] Subtask: Add Bedrock runtime client factory using AWS SDK for JavaScript.
  - [x] Subtask: Read `AWS_REGION` and model IDs from validated config.
  - [x] Subtask: Support local AWS credentials through normal AWS provider chain.
  - [x] Subtask: Do not store AWS keys in code or frontend files.
- [x] Create `LlmClient` interface.
  - [x] Subtask: Define `complete()` for non-streamed responses.
  - [x] Subtask: Define `stream()` for streamed responses when supported.
  - [x] Subtask: Return normalized content, model metadata, latency, and token usage when available.
- [x] Create `EmbeddingClient` interface.
  - [x] Subtask: Define `embedText(text)`.
  - [x] Subtask: Define `embedBatch(texts)` if batch support is used.
  - [x] Subtask: Validate vector dimensions.
- [x] Create retry and timeout policy.
  - [x] Subtask: Retry transient throttling and network errors with small exponential backoff.
  - [x] Subtask: Do not retry validation errors or auth errors.
  - [x] Subtask: Set per-call timeout.

### [x] TDD Requirements
- [x] Write unit tests for config validation.
- [x] Write unit tests for retryable vs non-retryable errors.
- [x] Write unit tests that real AWS SDK client is not called when mock provider is configured.
- [x] Write test for vector dimension validation.

### [x] Edge Cases
- [x] Bedrock model access is not enabled.
- [x] AWS credentials are missing.
- [x] Region does not support selected model.
- [x] Request is throttled.
- [x] Model returns malformed response.
- [x] Streaming connection drops mid-response.

## [x] Submodule 06.2 - Embedding Pipeline

Purpose: Generate task embeddings automatically and cheaply.

Owner Expectations: Task changes eventually produce fresh embeddings without duplicate Bedrock calls.

### [x] Tasks
- [x] Create embedding queue or background service.
  - [x] Subtask: Start with simple in-process job runner for OA simplicity.
  - [x] Subtask: Pick up tasks marked stale.
  - [x] Subtask: Build composite task text using Module 04 builder.
  - [x] Subtask: Skip embedding call when content hash is unchanged.
  - [x] Subtask: Store embedding with task ID, org ID, assignee ID, visibility, model, version, and content hash.
- [x] Add manual reindex command.
  - [x] Subtask: Add script to reindex all tasks.
  - [x] Subtask: Add script to reindex one organization.
  - [x] Subtask: Add dry-run mode.
- [x] Add indexing status API for development.
  - [x] Subtask: Expose counts for indexed, stale, failed, and missing embeddings to admins only.

### [x] TDD Requirements
- [x] Write failing test that task creation marks embedding stale.
- [x] Write failing test that indexer creates embedding row.
- [x] Write failing test that unchanged content does not call Bedrock twice.
- [x] Write failing test that failed embedding call is retried later.
- [x] Write integration test with fake vector stored in pgvector.

### [x] Edge Cases
- [x] Task is deleted before indexing runs.
- [x] Task is updated while indexing is in progress.
- [x] Composite text is empty or too long.
- [x] Bedrock call fails after DB transaction commits.
- [x] Embedding model dimension changes.

## [x] Submodule 06.3 - Vector Store Repository

Purpose: Provide safe vector insert and search operations.

Owner Expectations: All semantic retrieval is scoped by authorization metadata before similarity ranking.

### [x] Tasks
- [x] Create `VectorStoreRepository`.
  - [x] Subtask: Implement upsert task embedding.
  - [x] Subtask: Implement mark stale.
  - [x] Subtask: Implement delete or exclude deleted task embeddings.
  - [x] Subtask: Implement authorized similarity search.
- [x] Create similarity query.
  - [x] Subtask: Use pgvector cosine distance or equivalent metric consistently.
  - [x] Subtask: Apply `orgId` and visibility filters in `WHERE` clause.
  - [x] Subtask: Exclude soft-deleted tasks.
  - [x] Subtask: Limit top K to configured maximum.
  - [x] Subtask: Return task ID, title, similarity score, and metadata.
- [x] Add vector index.
  - [x] Subtask: Start with exact search for correctness.
  - [x] Subtask: Add approximate index only if needed for performance.
  - [x] Subtask: Document index choice and metric.

### [x] TDD Requirements
- [x] Write integration test that nearest task is returned.
- [x] Write integration test that cross-org nearest task is not returned.
- [x] Write integration test that private task is only returned to assignee or privileged role.
- [x] Write test that top K is capped.
- [x] Write test that deleted tasks are excluded.

### [x] Edge Cases
- [x] No embeddings exist.
- [x] Query vector dimension does not match table.
- [x] Similarity scores tie.
- [x] User has access to many orgs.
- [x] Task embedding exists but task row is missing.

## [x] Submodule 06.4 - Prompt Asset Management

Purpose: Keep prompts versioned, testable, and explainable in the README.

Owner Expectations: Prompt templates are not hidden in random service code.

### [x] Tasks
- [x] Create `libs/ai/prompts`.
  - [x] Subtask: Add RAG system prompt file.
  - [x] Subtask: Add task creation intent prompt file.
  - [x] Subtask: Add guardrail evaluation prompt file if used.
  - [x] Subtask: Add prompt manifest with name, version, owner, and purpose.
- [x] Add prompt rendering utility.
  - [x] Subtask: Escape or delimit untrusted context.
  - [x] Subtask: Include prompt version in LLM logs.
  - [x] Subtask: Validate required variables are present.
- [x] Add prompt tests.
  - [x] Subtask: Snapshot prompt output with safe fake data.
  - [x] Subtask: Test missing variable failure.
  - [x] Subtask: Test canary token injection only in allowed guardrail prompts if used.

### [x] TDD Requirements
- [x] Write failing prompt render test before prompt renderer exists.
- [x] Write failing test for missing variable.
- [x] Write failing test that prompt version is attached to chat response metadata.

### [x] Edge Cases
- [x] Retrieved task contains text that looks like instructions.
- [x] User question contains markdown tables or code.
- [x] Prompt variable is empty.
- [x] Prompt exceeds configured token budget.

## [x] Submodule 06.5 - AI Cost and Latency Controls

Purpose: Keep Bedrock usage cheap and predictable.

Owner Expectations: The OA demo does not accidentally run expensive loops or unbounded calls.

### [x] Tasks
- [x] Add model configuration.
  - [x] Subtask: Set low max output tokens for chat.
  - [x] Subtask: Set top K retrieval limit to 5 by default.
  - [x] Subtask: Set max task context length.
  - [x] Subtask: Set per-user chat rate limit.
- [x] Add caching and deduplication.
  - [x] Subtask: Reuse embeddings when content hash is unchanged.
  - [x] Subtask: Cache query embedding briefly only if safe and scoped by user/session.
- [x] Add telemetry.
  - [x] Subtask: Log latency per Bedrock call.
  - [x] Subtask: Log model ID.
  - [x] Subtask: Log token usage when returned.
  - [x] Subtask: Log failure category.

### [x] TDD Requirements
- [x] Write test that max output tokens are passed to LLM client.
- [x] Write test that rate limit blocks excessive calls.
- [x] Write test that content hash prevents duplicate embeddings.
- [x] Write test that telemetry redacts prompt content by default.

### [x] Edge Cases
- [x] User submits very long question.
- [x] Retrieved context too large.
- [x] Bedrock latency exceeds timeout.
- [x] Token usage missing from provider response.

## [x] Security Requirements

- [x] Bedrock is called only from the backend.
- [x] AWS credentials never appear in Angular code.
- [x] Use least-privilege IAM permissions for Bedrock runtime invocation.
- [x] Redact raw prompts and outputs unless explicitly enabled for development.
- [x] Do not use LLM results as trusted JSON until schema validation passes.
- [x] Do not let vector search run without authorization scope.
- [x] Do not put JWTs, cookies, or secrets into prompts.

## [ ] Human QA Checklist

- [ ] Confirm AWS Bedrock model access in selected region.
- [ ] Run embedding smoke script against one seeded task.
- [ ] Confirm vector row appears in database.
- [ ] Run authorized vector search as Admin.
- [ ] Run authorized vector search as Viewer and confirm fewer results.
- [ ] Temporarily disable AWS credentials and confirm clear error.

## Other

- [x] Confirm pre-push command are running and working successfully.

---

## AI-Journal

- BedrockClient factory: wraps `@aws-sdk/client-bedrock-runtime`. Region + model IDs from env. No keys in code.
- LlmClient interface: `complete(prompt, opts)`. Returns content, modelId, latency, token counts. BedrockLlmClient implements with Claude messages API.
- EmbeddingClient interface: `embedText`, `embedBatch`. Returns vector + metadata. BedrockEmbeddingClient calls Titan. Dimension validation (1024) throws `VectorDimensionError`.
- Retry policy: `withRetry(fn, opts)`. Retries throttling/network (ThrottlingException, ECONNRESET, ETIMEDOUT). Skips validation/auth. Exponential backoff (500ms base). Per-call timeout via `Promise.race`. Timers cleaned up — no leaks.
- Vector store: reuses existing `VectorSearchRepository` from `@task-ai/tasks`. Cosine distance via pgvector `<=>` operator. Visibility filter: admin/owner sees all; member sees PUBLIC + own ASSIGNED_ONLY + own PRIVATE. Top-K capped at 20.
- Embedding pipeline: `EmbeddingPipelineService` in apps/api. Picks up stale embeddings. Builds composite text via `TaskCompositeTextBuilder`. Skips unchanged content (SHA-256 hash match). Upserts via raw SQL (pgvector). Stats API returns indexed/stale/missing counts.
- Prompts: RAG system prompt, task creation prompt, guardrail prompt. All in `libs/ai/prompts/`. Manifest tracks name/version/owner/purpose. `PromptRenderer` replaces `{{var}}` placeholders. Validates required vars. Sanitizes untrusted input with `---` delimiters. Version attached to rendered output.
- Telemetry: `LlmTelemetryService` logs modelId, latency, tokens, failure category to `LlmInteractionLog`. Redacted by default. Stats query for last N minutes.
- Config: `AI_CONFIG` constant. maxOutputTokens=1024, defaultTopK=5, maxTopK=20, maxContextLength=4000, chatRateLimit=20, minSimilarity=0.5, timeout=30s.
- DI wiring: `AiModule` in `apps/api/src/ai/`. Factory providers for BedrockRuntimeClient, LlmClient, EmbeddingClient, VectorSearchRepository. EmbeddingPipelineService + LlmTelemetryService as classes. PromptRenderer injectable.
- Tests: 24 pass in libs/ai (bedrock factory, retry policy, vector validator, embedding client mock, prompt renderer, config). 95 pass in apps/api.
- Build: `nx build api` compiles clean. Webpack bundle succeeds.
