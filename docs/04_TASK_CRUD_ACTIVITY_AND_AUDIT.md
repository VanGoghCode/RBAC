# [ ] Module 04 - Task CRUD, Activity History, Comments, and Audit Trail

Branch Name: `feature/module-04-task-crud-activity-audit`

## Purpose
Build the base task management features that RAG, semantic deduplication, and chat task creation depend on.

## Owner Expectations
By the end of this module, users can create, view, update, delete, filter, and inspect tasks according to RBAC. Every important task change creates activity and audit records.

## [ ] Submodule 04.1 - Task API DTOs and Validation

Purpose: Prevent malformed task data from entering the system.

Owner Expectations: API contracts are documented, validated, and shared with the frontend where practical.

### [ ] Tasks
- [ ] Define task DTOs.
  - [ ] Subtask: Create `CreateTaskDto`.
  - [ ] Subtask: Create `UpdateTaskDto`.
  - [ ] Subtask: Create `TaskListQueryDto`.
  - [ ] Subtask: Create `TaskResponseDto`.
  - [ ] Subtask: Create `TaskActivityResponseDto`.
- [ ] Define validation rules.
  - [ ] Subtask: Title is required and length-limited.
  - [ ] Subtask: Description is optional and length-limited.
  - [ ] Subtask: Status must be an allowed enum.
  - [ ] Subtask: Priority must be an allowed enum.
  - [ ] Subtask: Due date must be valid ISO date if provided.
  - [ ] Subtask: Assignee must belong to the task organization if provided.
- [ ] Add consistent error format.
  - [ ] Subtask: Return field-level validation errors.
  - [ ] Subtask: Return generic errors for unauthorized resources.

### [ ] TDD Requirements
- [ ] Write failing tests for invalid title.
- [ ] Write failing tests for invalid status.
- [ ] Write failing tests for invalid due date.
- [ ] Write failing tests for assignee outside organization.
- [ ] Write failing tests for consistent validation error shape.

### [ ] Edge Cases
- [ ] Title contains only whitespace.
- [ ] Description is extremely long.
- [ ] Due date is invalid date string.
- [ ] Client sends unknown fields.
- [ ] Client tries to set `createdById` directly.

## [ ] Submodule 04.2 - Task CRUD APIs

Purpose: Provide secure task management endpoints.

Owner Expectations: CRUD APIs are RBAC-protected and return predictable data.

### [ ] Tasks
- [ ] Implement `POST /tasks`.
  - [ ] Subtask: Check `canCreateTask`.
  - [ ] Subtask: Validate organization access.
  - [ ] Subtask: Create task in transaction.
  - [ ] Subtask: Create activity event.
  - [ ] Subtask: Create audit event.
  - [ ] Subtask: Mark embedding as needed for indexing.
- [ ] Implement `GET /tasks`.
  - [ ] Subtask: Apply authorization scope.
  - [ ] Subtask: Support filters for status, priority, assignee, due date, category, and text search.
  - [ ] Subtask: Support pagination and sorting.
- [ ] Implement `GET /tasks/:id`.
  - [ ] Subtask: Check `canViewTask`.
  - [ ] Subtask: Include activity summary.
  - [ ] Subtask: Exclude soft-deleted tasks unless admin audit mode is implemented.
- [ ] Implement `PATCH /tasks/:id`.
  - [ ] Subtask: Check `canUpdateTask`.
  - [ ] Subtask: Detect changed fields.
  - [ ] Subtask: Create activity per meaningful change.
  - [ ] Subtask: Create audit event.
  - [ ] Subtask: Mark embedding stale.
- [ ] Implement `DELETE /tasks/:id`.
  - [ ] Subtask: Check `canDeleteTask`.
  - [ ] Subtask: Soft-delete task.
  - [ ] Subtask: Create activity and audit events.
  - [ ] Subtask: Exclude deleted task from retrieval and vector search.

### [ ] TDD Requirements
- [ ] Write failing API test for each CRUD endpoint.
- [ ] Write cross-org denial tests for each endpoint.
- [ ] Write Viewer mutation denial tests.
- [ ] Write soft delete test that task disappears from list and detail.
- [ ] Write test that update marks embedding stale.

### [ ] Edge Cases
- [ ] Task is updated by two users at nearly the same time.
- [ ] Task is deleted while another request updates it.
- [ ] Task ID does not exist.
- [ ] User sees generic not-found for unauthorized task.
- [ ] Empty task list returns empty page, not error.

## [ ] Submodule 04.3 - Activity History and Comments

Purpose: Capture task lifecycle details that make RAG answers useful.

Owner Expectations: RAG can explain blockers, status changes, and recent progress using task activity.

### [ ] Tasks
- [ ] Implement `GET /tasks/:id/activity`.
  - [ ] Subtask: Check `canViewTask`.
  - [ ] Subtask: Return paginated activity list.
  - [ ] Subtask: Sort newest or oldest consistently.
- [ ] Implement `POST /tasks/:id/comments`.
  - [ ] Subtask: Check view or comment permission.
  - [ ] Subtask: Validate comment length.
  - [ ] Subtask: Create activity event.
  - [ ] Subtask: Mark embedding stale.
- [ ] Create activity text builder.
  - [ ] Subtask: Convert status changes into readable text.
  - [ ] Subtask: Convert comments into truncated safe text.
  - [ ] Subtask: Include actor display name if authorized.

### [ ] TDD Requirements
- [ ] Write test for comment creation.
- [ ] Write test for activity pagination.
- [ ] Write test that comment updates embedding stale marker.
- [ ] Write test that unauthorized users cannot see activity.

### [ ] Edge Cases
- [ ] Comment is empty.
- [ ] Comment contains HTML or script text.
- [ ] Comment is longer than allowed.
- [ ] Actor was deleted or disabled.
- [ ] Activity references a field that no longer exists.

## [ ] Submodule 04.4 - Composite Text for AI Indexing

Purpose: Convert task records into deterministic text for embeddings.

Owner Expectations: Every task produces a stable, useful representation for semantic search and RAG.

### [ ] Tasks
- [ ] Create `TaskCompositeTextBuilder`.
  - [ ] Subtask: Include title.
  - [ ] Subtask: Include description.
  - [ ] Subtask: Include category.
  - [ ] Subtask: Include status.
  - [ ] Subtask: Include priority.
  - [ ] Subtask: Include due date.
  - [ ] Subtask: Include assignee display name and role if allowed.
  - [ ] Subtask: Include recent activity summary.
  - [ ] Subtask: Include tags if implemented.
- [ ] Add content hash.
  - [ ] Subtask: Hash normalized composite text.
  - [ ] Subtask: Use content hash to avoid duplicate embedding calls.
- [ ] Add truncation rules.
  - [ ] Subtask: Cap activity included in embedding text.
  - [ ] Subtask: Prefer recent and high-signal activity.

### [ ] TDD Requirements
- [ ] Write snapshot-like test for composite text format.
- [ ] Write test that unchanged task content produces same hash.
- [ ] Write test that comment change produces different hash.
- [ ] Write test that long activity history is truncated deterministically.

### [ ] Edge Cases
- [ ] Missing description.
- [ ] Missing due date.
- [ ] Missing assignee.
- [ ] Task with many comments.
- [ ] User-provided prompt injection text inside task description.

## [ ] Security Requirements

- [ ] Enforce RBAC in service and repository layers.
- [ ] Use generic not-found for unauthorized task IDs.
- [ ] Sanitize HTML in comments on display.
- [ ] Do not trust client-sent actor, org, or role values.
- [ ] Keep audit trail for all mutations.
- [ ] Mark embeddings stale inside the same transaction as task updates.
- [ ] Do not include private secrets in composite text.

## [ ] Human QA Checklist

- [ ] Create a task as Admin.
- [ ] Create a task as Member.
- [ ] Try to create a task as Viewer and confirm denial.
- [ ] Update status and confirm activity appears.
- [ ] Add comment and confirm it appears in task detail.
- [ ] Delete task and confirm it disappears from list.
- [ ] Confirm unauthorized task URL does not reveal whether the task exists.

## Other

- [ ] Confirm pre-push command are running and working successfully.