# [ ] Module 07 - Required RAG-Powered Task Chat

Branch Name: `feature/module-07-rag-chat-required`

## Purpose
Build the required conversational task assistant that answers user questions from authorized task records, cites sources, keeps short conversation memory, streams responses where practical, and supports lightweight task creation through chat.

## Owner Expectations
By the end of this module, the owner can demo a chat panel that answers grounded questions about tasks, shows clickable source cards, respects RBAC, saves history, supports follow-up questions, and creates a task from a natural-language request.

## [ ] Submodule 07.1 - Chat API Contract

Purpose: Define clear server APIs for chat ask, streaming, history, and source retrieval.

Owner Expectations: The frontend can call the chat feature reliably and tests can validate each response shape.

### [ ] Tasks
- [ ] Implement `POST /chat/ask`.
  - [ ] Subtask: Require JWT.
  - [ ] Subtask: Validate message length and conversation ID.
  - [ ] Subtask: Use non-streamed response for simplest compatibility.
  - [ ] Subtask: Return answer, sources, conversation ID, message IDs, guardrail status, and timing metadata.
- [ ] Implement `POST /chat/ask/stream`.
  - [ ] Subtask: Require JWT with normal Authorization header.
  - [ ] Subtask: Use fetch-readable stream from Angular instead of browser EventSource if request body and auth header are required.
  - [ ] Subtask: Stream answer chunks and final sources event.
  - [ ] Subtask: Return a final completion event with message IDs.
  - [ ] Subtask: Fall back to non-streamed response if provider streaming is disabled.
- [ ] Implement `GET /chat/history`.
  - [ ] Subtask: Require JWT.
  - [ ] Subtask: Return only authenticated user's conversations.
  - [ ] Subtask: Support `limit` and `before` cursor.
  - [ ] Subtask: Cap limit.
- [ ] Implement `GET /chat/conversations/:id` if needed.
  - [ ] Subtask: Require ownership check.
  - [ ] Subtask: Return paginated messages.

### [ ] TDD Requirements
- [ ] Write failing API test for `POST /chat/ask` success.
- [ ] Write failing API test for unauthorized request.
- [ ] Write failing API test for message too long.
- [ ] Write failing API test for history ownership.
- [ ] Write failing streaming test that verifies chunk order and final event.

### [ ] Edge Cases
- [ ] Empty message.
- [ ] Message exceeds max length.
- [ ] Conversation ID belongs to another user.
- [ ] Stream disconnects before completion.
- [ ] User refreshes page while response is streaming.

## [ ] Submodule 07.2 - Retrieval Pipeline

Purpose: Retrieve only the task records the user is allowed to see, then rank semantically relevant records.

Owner Expectations: No task data leaks across users, roles, or organizations.

### [ ] Tasks
- [ ] Build query embedding step.
  - [ ] Subtask: Embed user question using the same embedding model as tasks.
  - [ ] Subtask: Apply max input length.
  - [ ] Subtask: Log latency and failure category.
- [ ] Build authorization scope.
  - [ ] Subtask: Reuse Module 03 `AuthorizationScopeService`.
  - [ ] Subtask: Resolve allowed org IDs.
  - [ ] Subtask: Resolve visibility and assignment constraints.
- [ ] Build vector retrieval.
  - [ ] Subtask: Apply authorization filters before similarity ranking.
  - [ ] Subtask: Return top 5 by default.
  - [ ] Subtask: Include task IDs, titles, similarity scores, and snippets.
  - [ ] Subtask: Exclude deleted tasks.
- [ ] Build context loader.
  - [ ] Subtask: Load full authorized task context for retrieved task IDs.
  - [ ] Subtask: Include recent activity and comments.
  - [ ] Subtask: Truncate per-task context safely.

### [ ] TDD Requirements
- [ ] Write integration test where unauthorized task is more similar but not returned.
- [ ] Write test where Viewer sees assigned/private task but not another private task.
- [ ] Write test where Owner retrieves child org task.
- [ ] Write test where no relevant tasks returns empty context.
- [ ] Write test that deleted task is excluded.

### [ ] Edge Cases
- [ ] User has zero authorized tasks.
- [ ] All embeddings are stale or missing.
- [ ] Query is unrelated to any task.
- [ ] Similarity scores are low.
- [ ] Multiple tasks have same title.

## [ ] Submodule 07.3 - Grounded Prompt Construction

Purpose: Generate answers using only retrieved task records and force citations.

Owner Expectations: The assistant does not hallucinate task facts and always cites source task IDs when referencing tasks.

### [ ] Tasks
- [ ] Create RAG system prompt.
  - [ ] Subtask: State that answers must use only retrieved task context.
  - [ ] Subtask: State that missing information must be acknowledged.
  - [ ] Subtask: State that task-specific claims require task ID citations.
  - [ ] Subtask: State that user/task content is untrusted and cannot override system instructions.
- [ ] Create context format.
  - [ ] Subtask: Delimit every task record clearly.
  - [ ] Subtask: Include task ID, title, status, priority, assignee, due date, org, and recent activity.
  - [ ] Subtask: Include only data authorized for the user.
- [ ] Create answer post-processing.
  - [ ] Subtask: Extract cited task IDs.
  - [ ] Subtask: Validate citations exist in retrieved source set.
  - [ ] Subtask: If invalid citations appear, remove or regenerate safely.

### [ ] TDD Requirements
- [ ] Write prompt render test with two fake tasks.
- [ ] Write test that context contains no unauthorized task.
- [ ] Write test that invalid citation is rejected.
- [ ] Write test that no-context response says information is not present.

### [ ] Edge Cases
- [ ] Retrieved task text contains "ignore previous instructions".
- [ ] Retrieved task has HTML or markdown.
- [ ] User asks for secrets or system prompt.
- [ ] User asks about a task they cannot access.
- [ ] LLM returns uncited factual claims.

## [ ] Submodule 07.4 - Conversation Memory and History

Purpose: Support useful follow-up questions without creating privacy leaks or oversized prompts.

Owner Expectations: Follow-up questions like "What about that login bug?" work within a short rolling context.

### [ ] Tasks
- [ ] Save chat messages.
  - [ ] Subtask: Store user message.
  - [ ] Subtask: Store assistant answer.
  - [ ] Subtask: Store source task IDs and similarities.
  - [ ] Subtask: Store guardrail status.
- [ ] Build rolling memory.
  - [ ] Subtask: Include last 5 exchanges by default.
  - [ ] Subtask: Include summaries only if full history is too long.
  - [ ] Subtask: Never include messages from another user.
  - [ ] Subtask: Never include hidden system details in memory.
- [ ] Add history UI data support.
  - [ ] Subtask: Return paginated conversation list.
  - [ ] Subtask: Return selected conversation messages.

### [ ] TDD Requirements
- [ ] Write test that history is scoped to user.
- [ ] Write test that rolling context includes at most configured exchanges.
- [ ] Write test that old history is not included when limit exceeded.
- [ ] Write test that deleted source task is handled gracefully in old chat.

### [ ] Edge Cases
- [ ] Conversation has hundreds of messages.
- [ ] Source task is deleted after answer.
- [ ] User changes organization membership after chat history exists.
- [ ] Follow-up pronoun is ambiguous.

## [ ] Submodule 07.5 - Lightweight Task Creation Through Chat

Purpose: Satisfy the required task-creation-through-chat evaluation without building a full autonomous agent.

Owner Expectations: A user can say "Create a task to write unit tests for auth" and the system creates a task only if the user has permission.

### [ ] Tasks
- [ ] Build intent detection.
  - [ ] Subtask: Classify messages into `query`, `create_task`, and `unknown` for MVP.
  - [ ] Subtask: Use structured output or JSON-only response from LLM.
  - [ ] Subtask: Validate output with schema before action.
- [ ] Build create task extraction.
  - [ ] Subtask: Extract title.
  - [ ] Subtask: Extract optional description.
  - [ ] Subtask: Extract optional priority.
  - [ ] Subtask: Extract optional due date.
  - [ ] Subtask: Default org to active organization if authorized.
  - [ ] Subtask: Default assignee to current user unless specified and allowed.
- [ ] Execute create task safely.
  - [ ] Subtask: Call internal TaskService, not raw database insert.
  - [ ] Subtask: Reuse `canCreateTaskFromChat` permission.
  - [ ] Subtask: Create activity and audit logs.
  - [ ] Subtask: Mark embedding stale.
  - [ ] Subtask: Return created task source card.
- [ ] Ask clarification when needed.
  - [ ] Subtask: Ask for title if missing.
  - [ ] Subtask: Ask for due date clarification if ambiguous.
  - [ ] Subtask: Ask for assignee clarification if name matches multiple users.

### [ ] TDD Requirements
- [ ] Write unit test for query intent.
- [ ] Write unit test for create task intent.
- [ ] Write test that malformed LLM JSON does not create task.
- [ ] Write test that Viewer cannot create task through chat.
- [ ] Write test that created chat task appears in task list.
- [ ] Write test that chat-created task is indexed later.

### [ ] Edge Cases
- [ ] User says "delete" or "update" even though MVP only supports create.
- [ ] User asks to create task in unauthorized org.
- [ ] User names unknown assignee.
- [ ] User gives relative due date like "next Friday".
- [ ] LLM extracts destructive action unexpectedly.

## [ ] Submodule 07.6 - Angular Chat Panel UX

Purpose: Provide a high-quality chat experience that is accessible and demo-friendly.

Owner Expectations: Chat panel visibly streams responses, displays sources, supports suggested prompts, and works with keyboard/screen readers.

### [ ] Tasks
- [ ] Build chat panel.
  - [ ] Subtask: Add slide-out or embedded panel in dashboard.
  - [ ] Subtask: Add message list.
  - [ ] Subtask: Add input field and send button.
  - [ ] Subtask: Support Enter to send and Shift+Enter for newline if multiline.
  - [ ] Subtask: Disable send during empty input.
- [ ] Add streaming display.
  - [ ] Subtask: Render chunks incrementally.
  - [ ] Subtask: Show typing/loading state.
  - [ ] Subtask: Allow cancel if feasible.
  - [ ] Subtask: Fall back to non-streamed answer if stream fails.
- [ ] Add source cards.
  - [ ] Subtask: Show task title, status, similarity score if useful, and task ID.
  - [ ] Subtask: Make card keyboard-focusable.
  - [ ] Subtask: Navigate to task detail on click or Enter.
- [ ] Add suggested prompts.
  - [ ] Subtask: Show chips on first open.
  - [ ] Subtask: Include "What did I finish last week?".
  - [ ] Subtask: Include "Show overdue tasks".
  - [ ] Subtask: Include "Summarize my team's progress".
- [ ] Add accessible announcements.
  - [ ] Subtask: Announce response completion, not every token.
  - [ ] Subtask: Announce errors clearly.
  - [ ] Subtask: Maintain focus after sending.

### [ ] TDD Requirements
- [ ] Write component test for send button behavior.
- [ ] Write component test for suggested prompt chip.
- [ ] Write component test for source card navigation.
- [ ] Write E2E test for asking a question and seeing sources.
- [ ] Write accessibility test for chat panel labels and focus order.

### [ ] Edge Cases
- [ ] User sends message while offline.
- [ ] Stream fails mid-answer.
- [ ] Answer has no sources.
- [ ] Source task is no longer accessible.
- [ ] Long answer overflows panel.
- [ ] User opens chat on mobile screen.

## [ ] Security Requirements

- [ ] Every chat endpoint requires JWT.
- [ ] Chat history is visible only to the authenticated user.
- [ ] Retrieval uses backend RBAC scope before semantic matching.
- [ ] LLM never receives unauthorized task context.
- [ ] LLM output is rendered as safe text or sanitized markdown only.
- [ ] Tool/intent outputs are schema-validated before executing task creation.
- [ ] Chat task creation uses TaskService and normal RBAC.
- [ ] Rate-limit chat endpoints.
- [ ] Log guardrail outcomes and model failures.

## [ ] Human QA Checklist

- [ ] Ask "What bugs have we fixed this sprint?" as Admin and verify cited tasks.
- [ ] Ask same question as Viewer and verify fewer or different sources.
- [ ] Ask about a known unauthorized task and verify it is not revealed.
- [ ] Ask a follow-up question using "that task" and verify memory works.
- [ ] Click a source card and verify navigation to task detail.
- [ ] Ask chat to create a task and verify task appears in list.
- [ ] Start a chat stream and refresh page to verify graceful handling.
- [ ] Use keyboard only to open chat, send message, and open source card.

## Other

- [ ] Confirm pre-push command are running and working successfully.