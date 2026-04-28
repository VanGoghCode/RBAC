# [ ] Module 08 - Advanced AI Feature 1: Semantic Task Deduplication

Branch Name: `feature/module-08-semantic-deduplication`

## Purpose
Warn users when a new task looks semantically similar to existing authorized tasks, allowing them to merge, skip, or create anyway.

## Owner Expectations
By the end of this module, task creation is smarter and more useful. The system prevents accidental duplicate tasks without blocking legitimate work, and every deduplication decision is auditable.

## [ ] Submodule 08.1 - Duplicate Detection Service

Purpose: Reuse embeddings to find likely duplicate tasks before save.

Owner Expectations: Duplicate detection is accurate enough for demo and does not leak unauthorized task titles.

### [ ] Tasks
- [ ] Create `TaskDeduplicationService`.
  - [ ] Subtask: Build composite text from unsaved task draft.
  - [ ] Subtask: Generate query embedding using Module 06 EmbeddingClient.
  - [ ] Subtask: Search authorized existing task embeddings only.
  - [ ] Subtask: Use default threshold `0.92` but make it configurable.
  - [ ] Subtask: Return top duplicate candidates with task ID, title, status, assignee, updated date, and similarity.
- [ ] Add API endpoint.
  - [ ] Subtask: Implement `POST /tasks/deduplicate`.
  - [ ] Subtask: Require JWT.
  - [ ] Subtask: Validate task draft.
  - [ ] Subtask: Enforce `canCreateTask` for target org.
  - [ ] Subtask: Return candidate list and recommended action.
- [ ] Integrate with create task API.
  - [ ] Subtask: Add optional `dedupDecision` to create task request.
  - [ ] Subtask: If high-confidence duplicate exists and no decision is provided, return conflict response with candidates.
  - [ ] Subtask: If decision is `create_anyway`, create task and log event.
  - [ ] Subtask: If decision is `skip`, do not create task and log event.
  - [ ] Subtask: If decision is `merge`, update existing task with allowed fields and log event.

### [ ] TDD Requirements
- [ ] Write unit test for duplicate above threshold.
- [ ] Write unit test for non-duplicate below threshold.
- [ ] Write test that unauthorized duplicate is not returned.
- [ ] Write test that Viewer cannot run create-task dedup flow for mutation.
- [ ] Write test that create without decision returns duplicate conflict.
- [ ] Write test that create-anyway creates task and logs event.

### [ ] Edge Cases
- [ ] No existing embeddings.
- [ ] Existing similar task is unauthorized.
- [ ] Candidate task has title only.
- [ ] Candidate task is similar but different due date or assignee.
- [ ] Similarity exactly equals threshold.
- [ ] Embedding provider fails during create.
- [ ] Existing duplicate task was soft-deleted.

## [ ] Submodule 08.2 - Merge, Skip, and Create Anyway Decisions

Purpose: Let users control the final outcome instead of silently blocking work.

Owner Expectations: User decisions are explicit, reversible where possible, and auditable.

### [ ] Tasks
- [ ] Define decision behavior.
  - [ ] Subtask: `skip` cancels new task creation.
  - [ ] Subtask: `create_anyway` creates a new task and records rationale if provided.
  - [ ] Subtask: `merge` updates existing task only if actor can update that existing task.
  - [ ] Subtask: `dismissed` records that warning was shown but no decision was taken.
- [ ] Implement merge rules.
  - [ ] Subtask: Do not overwrite existing title unless user explicitly chooses it.
  - [ ] Subtask: Append new description as comment or merge note when safer.
  - [ ] Subtask: Preserve existing status unless user explicitly changes it.
  - [ ] Subtask: Add activity entry describing merge.
- [ ] Implement audit logs.
  - [ ] Subtask: Store similarity score.
  - [ ] Subtask: Store candidate and matched task IDs.
  - [ ] Subtask: Store decision.
  - [ ] Subtask: Store actor and org.

### [ ] TDD Requirements
- [ ] Write test for skip decision.
- [ ] Write test for create-anyway decision.
- [ ] Write test for merge with permission.
- [ ] Write test for merge without permission.
- [ ] Write test that merge creates activity and audit logs.

### [ ] Edge Cases
- [ ] Candidate duplicate is updated by another user before decision.
- [ ] Candidate duplicate is deleted before decision.
- [ ] User chooses merge but lacks update permission.
- [ ] Multiple candidates are above threshold.
- [ ] User closes modal without choosing.

## [ ] Submodule 08.3 - Angular Deduplication UX

Purpose: Show duplicate warnings during task creation without making the form annoying.

Owner Expectations: The UI feels helpful, not blocking or confusing.

### [ ] Tasks
- [ ] Add duplicate check to create form.
  - [ ] Subtask: Trigger on submit for MVP.
  - [ ] Subtask: Avoid checking on every keystroke to reduce cost.
  - [ ] Subtask: Show loading state while checking.
  - [ ] Subtask: Continue normal create when no candidates found.
- [ ] Build duplicate warning modal or panel.
  - [ ] Subtask: Explain that similar tasks already exist.
  - [ ] Subtask: Show candidate cards with title, status, assignee, last updated, and similarity.
  - [ ] Subtask: Provide actions: merge, skip, create anyway.
  - [ ] Subtask: Add optional reason field for create-anyway.
- [ ] Add source navigation.
  - [ ] Subtask: Let user open candidate task detail in new route or side panel.
  - [ ] Subtask: Preserve unsaved form state when user reviews candidate.

### [ ] TDD Requirements
- [ ] Write component test for no duplicate path.
- [ ] Write component test for duplicate warning display.
- [ ] Write component test for create-anyway action.
- [ ] Write component test for skip action.
- [ ] Write E2E test creating a near-duplicate seeded task.
- [ ] Write accessibility test for modal focus trap and labels.

### [ ] Edge Cases
- [ ] Duplicate check is slow.
- [ ] Duplicate API fails.
- [ ] Candidate title is very long.
- [ ] User lacks permission to view candidate detail after warning.
- [ ] User submits form multiple times.
- [ ] Mobile screen modal layout.

## [ ] Submodule 08.4 - Deduplication Quality Controls

Purpose: Keep false positives manageable and explainable.

Owner Expectations: The README can explain threshold, limitations, and future tuning.

### [ ] Tasks
- [ ] Add threshold configuration.
  - [ ] Subtask: Define default threshold in environment config.
  - [ ] Subtask: Cap threshold to safe range.
  - [ ] Subtask: Log threshold used per event.
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

### [ ] Edge Cases
- [ ] Threshold too low creates noisy warnings.
- [ ] Threshold too high misses duplicates.
- [ ] Very short titles produce unreliable similarities.
- [ ] Model upgrade changes similarity distribution.

## [ ] Security Requirements

- [ ] Deduplication search must use the same RBAC scope as task list and RAG.
- [ ] Do not reveal unauthorized duplicate task titles or similarity scores.
- [ ] Validate merge target permissions server-side.
- [ ] Log dedup decisions for audit.
- [ ] Rate-limit duplicate checks to prevent embedding abuse.
- [ ] Do not let client choose arbitrary similarity scores or matched IDs without server verification.

## [ ] Human QA Checklist

- [ ] Create a task that is clearly unique and confirm no warning appears.
- [ ] Create a task similar to seeded login bug and confirm warning appears.
- [ ] Choose skip and confirm no task is created.
- [ ] Choose create anyway and confirm task is created with audit event.
- [ ] Choose merge and confirm existing task is updated safely.
- [ ] Login as Viewer and confirm mutation path is blocked.
- [ ] Test duplicate warning with keyboard only.

## Other

- [ ] Confirm pre-push command are running and working successfully.