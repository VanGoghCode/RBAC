# [x] Module 04 - Task CRUD, Activity History, Comments, and Audit Trail

Branch Name: `feature/module-04-task-crud-activity-audit`

## Purpose
Build the base task management features that RAG, semantic deduplication, and chat task creation depend on.

## Owner Expectations
By the end of this module, users can create, view, update, delete, filter, and inspect tasks according to RBAC. Every important task change creates activity and audit records.

## [x] Submodule 04.1 - Task API DTOs and Validation

Purpose: Prevent malformed task data from entering the system.

Owner Expectations: API contracts are documented, validated, and shared with the frontend where practical.

### [x] Tasks
- [x] Define task DTOs.
  - [x] Subtask: Create `CreateTaskDto`.
  - [x] Subtask: Create `UpdateTaskDto`.
  - [x] Subtask: Create `TaskListQueryDto`.
  - [x] Subtask: Create `TaskResponseDto`.
  - [x] Subtask: Create `TaskActivityResponseDto`.
- [x] Define validation rules.
  - [x] Subtask: Title is required and length-limited.
  - [x] Subtask: Description is optional and length-limited.
  - [x] Subtask: Status must be an allowed enum.
  - [x] Subtask: Priority must be an allowed enum.
  - [x] Subtask: Due date must be valid ISO date if provided.
  - [x] Subtask: Assignee must belong to the task organization if provided.
- [x] Add consistent error format.
  - [x] Subtask: Return field-level validation errors.
  - [x] Subtask: Return generic errors for unauthorized resources.

### [x] TDD Requirements
- [x] Write failing tests for invalid title.
- [x] Write failing tests for invalid status.
- [x] Write failing tests for invalid due date.
- [x] Write failing tests for assignee outside organization.
- [x] Write failing tests for consistent validation error shape.

### [x] Edge Cases
- [x] Title contains only whitespace.
- [x] Description is extremely long.
- [x] Due date is invalid date string.
- [x] Client sends unknown fields.
- [x] Client tries to set `createdById` directly.

## [x] Submodule 04.2 - Task CRUD APIs

Purpose: Provide secure task management endpoints.

Owner Expectations: CRUD APIs are RBAC-protected and return predictable data.

### [x] Tasks
- [x] Implement `POST /tasks`.
  - [x] Subtask: Check `canCreateTask`.
  - [x] Subtask: Validate organization access.
  - [x] Subtask: Create task in transaction.
  - [x] Subtask: Create activity event.
  - [x] Subtask: Create audit event.
  - [x] Subtask: Mark embedding as needed for indexing.
- [x] Implement `GET /tasks`.
  - [x] Subtask: Apply authorization scope.
  - [x] Subtask: Support filters for status, priority, assignee, due date, category, and text search.
  - [x] Subtask: Support pagination and sorting.
- [x] Implement `GET /tasks/:id`.
  - [x] Subtask: Check `canViewTask`.
  - [x] Subtask: Include activity summary.
  - [x] Subtask: Exclude soft-deleted tasks unless admin audit mode is implemented.
- [x] Implement `PATCH /tasks/:id`.
  - [x] Subtask: Check `canUpdateTask`.
  - [x] Subtask: Detect changed fields.
  - [x] Subtask: Create activity per meaningful change.
  - [x] Subtask: Create audit event.
  - [x] Subtask: Mark embedding stale.
- [x] Implement `DELETE /tasks/:id`.
  - [x] Subtask: Check `canDeleteTask`.
  - [x] Subtask: Soft-delete task.
  - [x] Subtask: Create activity and audit events.
  - [x] Subtask: Exclude deleted task from retrieval and vector search.

### [x] TDD Requirements
- [x] Write failing API test for each CRUD endpoint.
- [x] Write cross-org denial tests for each endpoint.
- [x] Write Viewer mutation denial tests.
- [x] Write soft delete test that task disappears from list and detail.
- [x] Write test that update marks embedding stale.

### [x] Edge Cases
- [x] Task is updated by two users at nearly the same time.
- [x] Task is deleted while another request updates it.
- [x] Task ID does not exist.
- [x] User sees generic not-found for unauthorized task.
- [x] Empty task list returns empty page, not error.

## [x] Submodule 04.3 - Activity History and Comments

Purpose: Capture task lifecycle details that make RAG answers useful.

Owner Expectations: RAG can explain blockers, status changes, and recent progress using task activity.

### [x] Tasks
- [x] Implement `GET /tasks/:id/activity`.
  - [x] Subtask: Check `canViewTask`.
  - [x] Subtask: Return paginated activity list.
  - [x] Subtask: Sort newest or oldest consistently.
- [x] Implement `POST /tasks/:id/comments`.
  - [x] Subtask: Check view or comment permission.
  - [x] Subtask: Validate comment length.
  - [x] Subtask: Create activity event.
  - [x] Subtask: Mark embedding stale.
- [x] Create activity text builder.
  - [x] Subtask: Convert status changes into readable text.
  - [x] Subtask: Convert comments into truncated safe text.
  - [x] Subtask: Include actor display name if authorized.

### [x] TDD Requirements
- [x] Write test for comment creation.
- [x] Write test for activity pagination.
- [x] Write test that comment updates embedding stale marker.
- [x] Write test that unauthorized users cannot see activity.

### [x] Edge Cases
- [x] Comment is empty.
- [x] Comment contains HTML or script text.
- [x] Comment is longer than allowed.
- [ ] Actor was deleted or disabled.
- [ ] Activity references a field that no longer exists.

## [x] Submodule 04.4 - Composite Text for AI Indexing

Purpose: Convert task records into deterministic text for embeddings.

Owner Expectations: Every task produces a stable, useful representation for semantic search and RAG.

### [x] Tasks
- [x] Create `TaskCompositeTextBuilder`.
  - [x] Subtask: Include title.
  - [x] Subtask: Include description.
  - [x] Subtask: Include category.
  - [x] Subtask: Include status.
  - [x] Subtask: Include priority.
  - [x] Subtask: Include due date.
  - [x] Subtask: Include assignee display name and role if allowed.
  - [x] Subtask: Include recent activity summary.
  - [ ] Subtask: Include tags if implemented.
- [x] Add content hash.
  - [x] Subtask: Hash normalized composite text.
  - [x] Subtask: Use content hash to avoid duplicate embedding calls.
- [x] Add truncation rules.
  - [x] Subtask: Cap activity included in embedding text.
  - [x] Subtask: Prefer recent and high-signal activity.

### [x] TDD Requirements
- [x] Write snapshot-like test for composite text format.
- [x] Write test that unchanged task content produces same hash.
- [x] Write test that comment change produces different hash.
- [x] Write test that long activity history is truncated deterministically.

### [x] Edge Cases
- [x] Missing description.
- [x] Missing due date.
- [x] Missing assignee.
- [x] Task with many comments.
- [x] User-provided prompt injection text inside task description.

## [x] Security Requirements

- [x] Enforce RBAC in service and repository layers.
- [x] Use generic not-found for unauthorized task IDs.
- [x] Sanitize HTML in comments on display.
- [x] Do not trust client-sent actor, org, or role values.
- [x] Keep audit trail for all mutations.
- [x] Mark embeddings stale inside the same transaction as task updates.
- [x] Do not include private secrets in composite text.

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

---

## AI-Journal

DTOs: CreateTaskSchema, UpdateTaskSchema, TaskListQuerySchema, CreateCommentSchema, ActivityQuerySchema — Zod strict, trim, length caps, enum guards, ISO datetime, defaults. 30 DTO tests cover whitespace titles, bad dates, unknown fields, HTML in comments.
TaskRepository expanded: findMany supports sort/order/search/priority/category/dueBefore/dueAfter. create wraps task + activity + embedding placeholder in $transaction. update detects changed fields, creates per-change activities, marks embedding stale. softDelete sets deletedAt, logs STATUS_CHANGE→DELETED, marks stale. findActivities paginated with actor name. addComment creates COMMENT activity + marks stale.
TaskService: create checks canCreateTask + assignee org membership. findMany scopes by AuthorizationScope, returns empty for foreign org. findById uses canViewTask, generic NotFoundException for unauthorized. update checks canUpdateTask. remove checks canDeleteTask. getActivities/addComment check canViewTask + canCreateTask (viewers blocked). Audit logs on every mutation.
TasksController: POST /tasks, GET /tasks, GET /tasks/:id, PATCH /tasks/:id, DELETE /tasks/:id, GET /tasks/:id/activity, POST /tasks/:id/comments. All parse body/query through Zod. @CurrentUser for actor.
TaskCompositeTextBuilder (libs/tasks/composite-text): deterministic text from title+description+category+status+priority+dueAt+assignee(visibility-gated)+recent activity(5 cap, 200 char truncation). SHA-256 content hash. 4000 char total cap. 14 tests: format, hash stability, truncation, prompt injection safety.
TasksModule registered in AppModule. Prisma enums imported directly from @prisma/client (TaskStatus, TaskPriority, TaskVisibility, ActivityType), not Prisma namespace.
Tests: 95 API (23 tasks service, 30 DTO, 42 pre-existing auth/app), 14 tasks lib (composite text + existing). 109 total pass. Lint clean. Typecheck clean.

## Can you test the API directly? Yes. Here's how:

  1. Start the database: `pnpm dev:db`
  2. Start the API: `pnpm dev:api`
  3. Login to get a token:

  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@acme.com","password":"password123"}' \
    -c cookies.txt
  ```

  4. Use the access token from the response:

  ```bash
  # Create a task
  curl -X POST http://localhost:3000/api/tasks \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <access-token>" \
    -d '{"title":"My first task","orgId":"<org-id-from-me>","status":"TODO","priority":"HIGH"}'

  # List tasks
  curl http://localhost:3000/api/tasks \
    -H "Authorization: Bearer <access-token>"

  # Get task by ID
  curl http://localhost:3000/api/tasks/<task-id> \
    -H "Authorization: Bearer <access-token>"

  # Update a task
  curl -X PATCH http://localhost:3000/api/tasks/<task-id> \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <access-token>" \
    -d '{"status":"IN_PROGRESS"}'

  # Add a comment
  curl -X POST http://localhost:3000/api/tasks/<task-id>/comments \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <access-token>" \
    -d '{"comment":"Working on this now"}'

  # Get activity history
  curl http://localhost:3000/api/tasks/<task-id>/activity \
    -H "Authorization: Bearer <access-token>"

  # Delete a task
  curl -X DELETE http://localhost:3000/api/tasks/<task-id> \
    -H "Authorization: Bearer <access-token>"
  ```

  5. Test RBAC — login as viewer and try creating a task (should get 403):

  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"viewer@acme.com","password":"password123"}'

  # Then try: POST /tasks with viewer token → 403 Forbidden
  ```

  **Frontend**: No task UI exists yet. Module 04 is backend-only. To test visually, a future module needs to add Angular task components, task API service, and routes. For now, use curl or API tools (Postman, HTTPie).
