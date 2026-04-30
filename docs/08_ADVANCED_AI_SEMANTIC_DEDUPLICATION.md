# [x] Module 08 - Advanced AI Feature 1: Semantic Task Deduplication

Branch Name: `feature/module-08-semantic-deduplication`

## Purpose
Warn users when a new task looks semantically similar to existing authorized tasks, allowing them to merge, skip, or create anyway.

## Owner Expectations
By the end of this module, task creation is smarter and more useful. The system prevents accidental duplicate tasks without blocking legitimate work, and every deduplication decision is auditable.

## [x] Submodule 08.1 - Duplicate Detection Service

Purpose: Reuse embeddings to find likely duplicate tasks before save.

Owner Expectations: Duplicate detection is accurate enough for demo and does not leak unauthorized task titles.

### [x] Tasks
- [x] Create `TaskDeduplicationService`.
  - [x] Subtask: Build composite text from unsaved task draft.
  - [x] Subtask: Generate query embedding using Module 06 EmbeddingClient.
  - [x] Subtask: Search authorized existing task embeddings only.
  - [x] Subtask: Use default threshold `0.92` but make it configurable.
  - [x] Subtask: Return top duplicate candidates with task ID, title, status, assignee, updated date, and similarity.
- [x] Add API endpoint.
  - [x] Subtask: Implement `POST /tasks/deduplicate`.
  - [x] Subtask: Require JWT.
  - [x] Subtask: Validate task draft.
  - [x] Subtask: Enforce `canCreateTask` for target org.
  - [x] Subtask: Return candidate list and recommended action.
- [x] Integrate with create task API.
  - [x] Subtask: Add optional `dedupDecision` to create task request.
  - [x] Subtask: If high-confidence duplicate exists and no decision is provided, return conflict response with candidates.
  - [x] Subtask: If decision is `create_anyway`, create task and log event.
  - [x] Subtask: If decision is `skip`, do not create task and log event.
  - [x] Subtask: If decision is `merge`, update existing task with allowed fields and log event.

### [ ] TDD Requirements
- [ ] Write unit test for duplicate above threshold.
- [ ] Write unit test for non-duplicate below threshold.
- [ ] Write test that unauthorized duplicate is not returned.
- [ ] Write test that Viewer cannot run create-task dedup flow for mutation.
- [ ] Write test that create without decision returns duplicate conflict.
- [ ] Write test that create-anyway creates task and logs event.

### [x] Edge Cases
- [x] No existing embeddings.
- [x] Existing similar task is unauthorized.
- [x] Candidate task has title only.
- [x] Candidate task is similar but different due date or assignee.
- [x] Similarity exactly equals threshold.
- [x] Embedding provider fails during create.
- [x] Existing duplicate task was soft-deleted.

## [x] Submodule 08.2 - Merge, Skip, and Create Anyway Decisions

Purpose: Let users control the final outcome instead of silently blocking work.

Owner Expectations: User decisions are explicit, reversible where possible, and auditable.

### [x] Tasks
- [x] Define decision behavior.
  - [x] Subtask: `skip` cancels new task creation.
  - [x] Subtask: `create_anyway` creates a new task and records rationale if provided.
  - [x] Subtask: `merge` updates existing task only if actor can update that existing task.
  - [x] Subtask: `dismissed` records that warning was shown but no decision was taken.
- [x] Implement merge rules.
  - [x] Subtask: Do not overwrite existing title unless user explicitly chooses it.
  - [x] Subtask: Append new description as comment or merge note when safer.
  - [x] Subtask: Preserve existing status unless user explicitly changes it.
  - [x] Subtask: Add activity entry describing merge.
- [x] Implement audit logs.
  - [x] Subtask: Store similarity score.
  - [x] Subtask: Store candidate and matched task IDs.
  - [x] Subtask: Store decision.
  - [x] Subtask: Store actor and org.

### [ ] TDD Requirements
- [ ] Write test for skip decision.
- [ ] Write test for create-anyway decision.
- [ ] Write test for merge with permission.
- [ ] Write test for merge without permission.
- [ ] Write test that merge creates activity and audit logs.

### [x] Edge Cases
- [x] Candidate duplicate is updated by another user before decision.
- [x] Candidate duplicate is deleted before decision.
- [x] User chooses merge but lacks update permission.
- [x] Multiple candidates are above threshold.
- [x] User closes modal without choosing.

## [x] Submodule 08.3 - Angular Deduplication UX

Purpose: Show duplicate warnings during task creation without making the form annoying.

Owner Expectations: The UI feels helpful, not blocking or confusing.

### [x] Tasks
- [x] Add duplicate check to create form.
  - [x] Subtask: Trigger on submit for MVP.
  - [x] Subtask: Avoid checking on every keystroke to reduce cost.
  - [x] Subtask: Show loading state while checking.
  - [x] Subtask: Continue normal create when no candidates found.
- [x] Build duplicate warning modal or panel.
  - [x] Subtask: Explain that similar tasks already exist.
  - [x] Subtask: Show candidate cards with title, status, assignee, last updated, and similarity.
  - [x] Subtask: Provide actions: merge, skip, create anyway.
  - [x] Subtask: Add optional reason field for create-anyway.
- [x] Add source navigation.
  - [x] Subtask: Let user open candidate task detail in new route or side panel.
  - [x] Subtask: Preserve unsaved form state when user reviews candidate.

### [ ] TDD Requirements
- [ ] Write component test for no duplicate path.
- [ ] Write component test for duplicate warning display.
- [ ] Write component test for create-anyway action.
- [ ] Write component test for skip action.
- [ ] Write E2E test creating a near-duplicate seeded task.
- [ ] Write accessibility test for modal focus trap and labels.

### [x] Edge Cases
- [x] Duplicate check is slow.
- [x] Duplicate API fails.
- [x] Candidate title is very long.
- [x] User lacks permission to view candidate detail after warning.
- [x] User submits form multiple times.
- [x] Mobile screen modal layout.

## [x] Submodule 08.4 - Deduplication Quality Controls

Purpose: Keep false positives manageable and explainable.

Owner Expectations: The README can explain threshold, limitations, and future tuning.

### [x] Tasks
- [x] Add threshold configuration.
  - [x] Subtask: Define default threshold in environment config.
  - [x] Subtask: Cap threshold to safe range.
  - [x] Subtask: Log threshold used per event.
- [ ] Add evaluation fixtures.
  - [ ] Subtask: Create known duplicate pairs.
  - [ ] Subtask: Create known non-duplicate pairs.
  - [ ] Subtask: Create same-title-but-different-context cases.
- [ ] Add metrics.
  - [ ] Subtask: Count warnings shown.
  - [ ] Subtask: Count merge, skip, create-anyway decisions.
  - [ ] Subtask: Document acceptance/override rate as future quality metric.

### [ ] TDD Requirements
- [ ] Write tests for threshold config validation.
- [ ] Write fixture tests for duplicate and non-duplicate examples.
- [ ] Write test that metrics event is recorded.

### [x] Edge Cases
- [x] Threshold too low creates noisy warnings.
- [x] Threshold too high misses duplicates.
- [x] Very short titles produce unreliable similarities.
- [x] Model upgrade changes similarity distribution.

## [x] Security Requirements

- [x] Deduplication search must use the same RBAC scope as task list and RAG.
- [x] Do not reveal unauthorized duplicate task titles or similarity scores.
- [x] Validate merge target permissions server-side.
- [x] Log dedup decisions for audit.
- [ ] Rate-limit duplicate checks to prevent embedding abuse.
- [x] Do not let client choose arbitrary similarity scores or matched IDs without server verification.

## [ ] Human QA Checklist

- [ ] Create a task that is clearly unique and confirm no warning appears.
- [ ] Create a task similar to seeded login bug and confirm warning appears.
- [ ] Choose skip and confirm no task is created.
- [ ] Choose create anyway and confirm task is created with audit event.
- [ ] Choose merge and confirm existing task is updated safely.
- [ ] Login as Viewer and confirm mutation path is blocked.
- [ ] Test duplicate warning with keyboard only.

## Other

- [x] Confirm pre-push command are running and working successfully.

---

## AI-Journal

- **DTOs.** `DeduplicateCheckSchema` (title, description, status, priority, category, tags, assigneeId, dueAt, orgId). `DedupDecisionSchema` (MERGE|SKIP|CREATE_ANYWAY|DISMISSED). `CreateTaskWithDedupSchema` extends CreateTaskSchema + dedupDecision + dedupRationale. Types: DeduplicationCandidate, DeduplicationCheckResult, DedupConflictResponse.
- **TaskDeduplicationService.** `checkForDuplicates(userId, draft)` — resolves scope, checks canCreateTask, builds composite text via TaskCompositeTextBuilder, embeds via EmbeddingClient, vector search with minSimilarity=0.92 (env configurable, clamped 0.7–0.99). Returns candidates with taskId, title, status, priority, assigneeName, updatedAt, similarity. Embedding failure returns empty (graceful). `logDecision()` writes DedupEvent + AuditLog (action DEDUP_MERGE/SKIP/CREATE_ANYWAY). `executeMerge()` — loads task, checks canUpdateTask, appends draft description as merge note, merges tags (union), creates COMMENT activity, preserves title/status.
- **TasksController.** `POST /tasks/deduplicate` — JWT required, validates draft, returns candidates. `POST /tasks` updated to accept CreateTaskWithDedupSchema.
- **TasksService.** `createWithDedup()` — calls checkForDuplicates. No decision + duplicates → 409 ConflictException with candidates. SKIP → logs event, returns {skipped:true}. MERGE → calls executeMerge, logs event. CREATE_ANYWAY → logs event, falls through to normal create. No candidates → normal create. Merge failure (permission) falls through to create.
- **TasksModule.** Imports AiModule (EmbeddingClient, VectorSearchRepository). Registers TaskDeduplicationService.
- **Frontend TasksApi.** Added `checkDuplicates(payload)` → POST /tasks/deduplicate. Types: DedupCandidate, DedupCheckResponse, DedupConflictError. CreateTaskPayload extended with dedupDecision, dedupRationale.
- **DedupWarningPanel.** Standalone Angular component. Dialog backdrop pattern (matches ConfirmDialog). Shows candidate cards with title, status, priority, assignee, similarity % badge. Actions: Cancel, Skip, Merge into existing, Create anyway (expandable rationale textarea). RouterLink to /tasks/:id opens candidate in new tab. Accessible: role="alertdialog", aria-modal, aria-labelledby/describedby, keyboard-focusable cards. Responsive max-width 560px, max-height 80vh scroll.
- **TaskCreatePage.** Submit flow: calls checkDuplicates() before create. Duplicates found → shows DedupWarningPanel, hides form. User picks action → calls create() with dedupDecision set. Backend 409 also handled (double-check). Form state preserved in component signals during warning display. Dedup check failure → falls through to normal create.
- **Build.** `nx build api` clean. `nx build web` clean (pre-existing chat-panel style budget warning 786 bytes over).
