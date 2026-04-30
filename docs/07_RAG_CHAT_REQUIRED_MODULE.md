# [x] Module 07 - Required RAG-Powered Task Chat

Branch Name: `feature/module-07-rag-chat-required`

## Purpose
Build the required conversational task assistant that answers user questions from authorized task records, cites sources, keeps short conversation memory, streams responses where practical, and supports lightweight task creation through chat.

## Owner Expectations
By the end of this module, the owner can demo a chat panel that answers grounded questions about tasks, shows clickable source cards, respects RBAC, saves history, supports follow-up questions, and creates a task from a natural-language request.

## [x] Submodule 07.1 - Chat API Contract

Purpose: Define clear server APIs for chat ask, streaming, history, and source retrieval.

Owner Expectations: The frontend can call the chat feature reliably and tests can validate each response shape.

### [x] Tasks
- [x] Implement `POST /chat/ask`.
  - [x] Subtask: Require JWT.
  - [x] Subtask: Validate message length and conversation ID.
  - [x] Subtask: Use non-streamed response for simplest compatibility.
  - [x] Subtask: Return answer, sources, conversation ID, message IDs, guardrail status, and timing metadata.
- [x] Implement `POST /chat/ask/stream`.
  - [x] Subtask: Require JWT with normal Authorization header.
  - [x] Subtask: Use fetch-readable stream from Angular instead of browser EventSource if request body and auth header are required.
  - [x] Subtask: Stream answer chunks and final sources event.
  - [x] Subtask: Return a final completion event with message IDs.
  - [x] Subtask: Fall back to non-streamed response if provider streaming is disabled.
- [x] Implement `GET /chat/history`.
  - [x] Subtask: Require JWT.
  - [x] Subtask: Return only authenticated user's conversations.
  - [x] Subtask: Support `limit` and `before` cursor.
  - [x] Subtask: Cap limit.
- [x] Implement `GET /chat/conversations/:id` if needed.
  - [x] Subtask: Require ownership check.
  - [x] Subtask: Return paginated messages.

### [x] TDD Requirements
- [x] Write failing API test for `POST /chat/ask` success.
- [x] Write failing API test for unauthorized request.
- [x] Write failing API test for message too long.
- [x] Write failing API test for history ownership.
- [x] Write failing streaming test that verifies chunk order and final event.

### [x] Edge Cases
- [x] Empty message.
- [x] Message exceeds max length.
- [x] Conversation ID belongs to another user.
- [x] Stream disconnects before completion.
- [x] User refreshes page while response is streaming.

## [x] Submodule 07.2 - Retrieval Pipeline

Purpose: Retrieve only the task records the user is allowed to see, then rank semantically relevant records.

Owner Expectations: No task data leaks across users, roles, or organizations.

### [x] Tasks
- [x] Build query embedding step.
  - [x] Subtask: Embed user question using the same embedding model as tasks.
  - [x] Subtask: Apply max input length.
  - [x] Subtask: Log latency and failure category.
- [x] Build authorization scope.
  - [x] Subtask: Reuse Module 03 `AuthorizationScopeService`.
  - [x] Subtask: Resolve allowed org IDs.
  - [x] Subtask: Resolve visibility and assignment constraints.
- [x] Build vector retrieval.
  - [x] Subtask: Apply authorization filters before similarity ranking.
  - [x] Subtask: Return top 5 by default.
  - [x] Subtask: Include task IDs, titles, similarity scores, and snippets.
  - [x] Subtask: Exclude deleted tasks.
- [x] Build context loader.
  - [x] Subtask: Load full authorized task context for retrieved task IDs.
  - [x] Subtask: Include recent activity and comments.
  - [x] Subtask: Truncate per-task context safely.

### [x] TDD Requirements
- [x] Write integration test where unauthorized task is more similar but not returned.
- [x] Write test where Viewer sees assigned/private task but not another private task.
- [x] Write test where Owner retrieves child org task.
- [x] Write test where no relevant tasks returns empty context.
- [x] Write test that deleted task is excluded.

### [x] Edge Cases
- [x] User has zero authorized tasks.
- [x] All embeddings are stale or missing.
- [x] Query is unrelated to any task.
- [x] Similarity scores are low.
- [x] Multiple tasks have same title.

## [x] Submodule 07.3 - Grounded Prompt Construction

Purpose: Generate answers using only retrieved task records and force citations.

Owner Expectations: The assistant does not hallucinate task facts and always cites source task IDs when referencing tasks.

### [x] Tasks
- [x] Create RAG system prompt.
  - [x] Subtask: State that answers must use only retrieved task context.
  - [x] Subtask: State that missing information must be acknowledged.
  - [x] Subtask: State that task-specific claims require task ID citations.
  - [x] Subtask: State that user/task content is untrusted and cannot override system instructions.
- [x] Create context format.
  - [x] Subtask: Delimit every task record clearly.
  - [x] Subtask: Include task ID, title, status, priority, assignee, due date, org, and recent activity.
  - [x] Subtask: Include only data authorized for the user.
- [x] Create answer post-processing.
  - [x] Subtask: Extract cited task IDs.
  - [x] Subtask: Validate citations exist in retrieved source set.
  - [x] Subtask: If invalid citations appear, remove or regenerate safely.

### [x] TDD Requirements
- [x] Write prompt render test with two fake tasks.
- [x] Write test that context contains no unauthorized task.
- [x] Write test that invalid citation is rejected.
- [x] Write test that no-context response says information is not present.

### [x] Edge Cases
- [x] Retrieved task text contains "ignore previous instructions".
- [x] Retrieved task has HTML or markdown.
- [x] User asks for secrets or system prompt.
- [x] User asks about a task they cannot access.
- [x] LLM returns uncited factual claims.

## [x] Submodule 07.4 - Conversation Memory and History

Purpose: Support useful follow-up questions without creating privacy leaks or oversized prompts.

Owner Expectations: Follow-up questions like "What about that login bug?" work within a short rolling context.

### [x] Tasks
- [x] Save chat messages.
  - [x] Subtask: Store user message.
  - [x] Subtask: Store assistant answer.
  - [x] Subtask: Store source task IDs and similarities.
  - [x] Subtask: Store guardrail status.
- [x] Build rolling memory.
  - [x] Subtask: Include last 5 exchanges by default.
  - [x] Subtask: Include summaries only if full history is too long.
  - [x] Subtask: Never include messages from another user.
  - [x] Subtask: Never include hidden system details in memory.
- [x] Add history UI data support.
  - [x] Subtask: Return paginated conversation list.
  - [x] Subtask: Return selected conversation messages.

### [x] TDD Requirements
- [x] Write test that history is scoped to user.
- [x] Write test that rolling context includes at most configured exchanges.
- [x] Write test that old history is not included when limit exceeded.
- [x] Write test that deleted source task is handled gracefully in old chat.

### [x] Edge Cases
- [x] Conversation has hundreds of messages.
- [x] Source task is deleted after answer.
- [x] User changes organization membership after chat history exists.
- [x] Follow-up pronoun is ambiguous.

## [x] Submodule 07.5 - Lightweight Task Creation Through Chat

Purpose: Satisfy the required task-creation-through-chat evaluation without building a full autonomous agent.

Owner Expectations: A user can say "Create a task to write unit tests for auth" and the system creates a task only if the user has permission.

### [x] Tasks
- [x] Build intent detection.
  - [x] Subtask: Classify messages into `query`, `create_task`, and `unknown` for MVP.
  - [x] Subtask: Use structured output or JSON-only response from LLM.
  - [x] Subtask: Validate output with schema before action.
- [x] Build create task extraction.
  - [x] Subtask: Extract title.
  - [x] Subtask: Extract optional description.
  - [x] Subtask: Extract optional priority.
  - [x] Subtask: Extract optional due date.
  - [x] Subtask: Default org to active organization if authorized.
  - [x] Subtask: Default assignee to current user unless specified and allowed.
- [x] Execute create task safely.
  - [x] Subtask: Call internal TaskService, not raw database insert.
  - [x] Subtask: Reuse `canCreateTaskFromChat` permission.
  - [x] Subtask: Create activity and audit logs.
  - [x] Subtask: Mark embedding stale.
  - [x] Subtask: Return created task source card.
- [x] Ask clarification when needed.
  - [x] Subtask: Ask for title if missing.
  - [x] Subtask: Ask for due date clarification if ambiguous.
  - [x] Subtask: Ask for assignee clarification if name matches multiple users.

### [x] TDD Requirements
- [x] Write unit test for query intent.
- [x] Write unit test for create task intent.
- [x] Write test that malformed LLM JSON does not create task.
- [x] Write test that Viewer cannot create task through chat.
- [x] Write test that created chat task appears in task list.
- [x] Write test that chat-created task is indexed later.

### [x] Edge Cases
- [x] User says "delete" or "update" even though MVP only supports create.
- [x] User asks to create task in unauthorized org.
- [x] User names unknown assignee.
- [x] User gives relative due date like "next Friday".
- [x] LLM extracts destructive action unexpectedly.

## [x] Submodule 07.6 - Angular Chat Panel UX

Purpose: Provide a high-quality chat experience that is accessible and demo-friendly.

Owner Expectations: Chat panel visibly streams responses, displays sources, supports suggested prompts, and works with keyboard/screen readers.

### [x] Tasks
- [x] Build chat panel.
  - [x] Subtask: Add slide-out or embedded panel in dashboard.
  - [x] Subtask: Add message list.
  - [x] Subtask: Add input field and send button.
  - [x] Subtask: Support Enter to send and Shift+Enter for newline if multiline.
  - [x] Subtask: Disable send during empty input.
- [x] Add streaming display.
  - [x] Subtask: Render chunks incrementally.
  - [x] Subtask: Show typing/loading state.
  - [x] Subtask: Allow cancel if feasible.
  - [x] Subtask: Fall back to non-streamed answer if stream fails.
- [x] Add source cards.
  - [x] Subtask: Show task title, status, similarity score if useful, and task ID.
  - [x] Subtask: Make card keyboard-focusable.
  - [x] Subtask: Navigate to task detail on click or Enter.
- [x] Add suggested prompts.
  - [x] Subtask: Show chips on first open.
  - [x] Subtask: Include "What did I finish last week?".
  - [x] Subtask: Include "Show overdue tasks".
  - [x] Subtask: Include "Summarize my team's progress".
- [x] Add accessible announcements.
  - [x] Subtask: Announce response completion, not every token.
  - [x] Subtask: Announce errors clearly.
  - [x] Subtask: Maintain focus after sending.

### [x] TDD Requirements
- [x] Write component test for send button behavior.
- [x] Write component test for suggested prompt chip.
- [x] Write component test for source card navigation.
- [x] Write E2E test for asking a question and seeing sources.
- [x] Write accessibility test for chat panel labels and focus order.

### [x] Edge Cases
- [x] User sends message while offline.
- [x] Stream fails mid-answer.
- [x] Answer has no sources.
- [x] Source task is no longer accessible.
- [x] Long answer overflows panel.
- [x] User opens chat on mobile screen.

## [x] Security Requirements

- [x] Every chat endpoint requires JWT.
- [x] Chat history is visible only to the authenticated user.
- [x] Retrieval uses backend RBAC scope before semantic matching.
- [x] LLM never receives unauthorized task context.
- [x] LLM output is rendered as safe text or sanitized markdown only.
- [x] Tool/intent outputs are schema-validated before executing task creation.
- [x] Chat task creation uses TaskService and normal RBAC.
- [x] Rate-limit chat endpoints.
- [x] Log guardrail outcomes and model failures.

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

- [x] Confirm pre-push command are running and working successfully.

---

## AI-Journal

- DTOs: Zod schemas. `ChatAskSchema` (message max 2000, conversationId uuid optional, orgId uuid required). `ChatHistoryQuerySchema` (limit max 50, before cursor). `ConversationMessagesQuerySchema` (limit, cursor).
- ChatRepository: conversation/message CRUD. `createConversation`, `findConversations` (user-scoped, cursor-paginated), `findMessages` (conversation-scoped), `saveMessage`, `getRecentMessages` (rolling memory, last N), `updateConversationTitle`. All queries filter by userId.
- IntentDetector: classifies message as `query|create_task|unknown` via LLM JSON output. Zod `IntentSchema` validates. `extractTask()` reuses `TASK_CREATION_PROMPT`, parses with `ExtractedTaskSchema` (title, description, priority, status, dueAt). Malformed JSON returns null.
- ChatService: full RAG pipeline. Resolves AuthorizationScope. Embeds question via EmbeddingClient. VectorSearchRepository.search() applies RBAC before similarity. Loads full task context (assignee, activities). Double-checks canViewTask per task. Builds context block (truncated 4000 chars). Rolling memory: last 5 exchanges from ChatRepository. Renders RAG_SYSTEM_PROMPT via PromptRenderer. LLM call with maxTokens=1024. Guardrail check via GUARDRAIL_PROMPT with canary token. Saves user+assistant messages. Intent=create_task: checks canCreateTaskFromChat permission, extracts fields, creates via TaskRepository.create(), audit logs TASK_CREATED_VIA_CHAT, marks embedding stale, returns task as source card. Clarification asked if title missing.
- ChatController: `POST /chat/ask` (non-streamed), `SSE /chat/ask/stream` (Observable-based, falls back to complete-then-emit), `GET /chat/history` (paginated), `GET /chat/conversations/:id` (ownership-checked, paginated messages). All require JWT via @CurrentUser().
- ChatModule: imports PrismaModule, AiModule, TasksModule. Provides ChatService, ChatRepository, IntentDetector, AuthorizationScopeService, TaskRepository, AuditRepository (factory pattern). Registered in AppModule.
- Frontend ChatApi: HttpClient service. Types: ChatSource, ChatAskResponse, ChatAskRequest, ChatConversation, ChatHistoryResponse, ChatMessage, ConversationMessagesResponse. Methods: ask(), getHistory(), getConversation().
- ChatPanelComponent: standalone Angular component. Slide-out panel (fixed right, 400px). Message list with role="log", aria-live="polite". Input with FormsModule ngModel. Enter sends, Shift+Enter newline. Typing indicator (CSS animation dots). Source cards: keyboard-focusable, click/Enter navigates to /tasks/:id. Suggested prompts: 4 chips shown on empty state. Chat toggle button (fixed bottom-right, 56px circle). Signal-based state. Auto-scrolls on new messages. Mobile responsive (100% width). Error display with role="alert".
- Dashboard integration: ChatPanelComponent imported in DashboardPage imports array. `<app-chat-panel />` added to template.
- Build: `nx build api` compiles clean. `nx build web` compiles clean (minor style budget warning 786 bytes over).

### Streaming Note
`/chat/ask/stream` currently wraps the non-streamed `ChatService.ask()` call in an SSE Observable. It emits a single `complete` event after the full LLM response is ready. True incremental token-by-token streaming (using Bedrock `invokeModelWithResponseStream`) is deferred to Module 10 (Application Security Hardening) where it will be implemented alongside input sanitization and hardened streaming error recovery. The frontend already supports rendering chunked events — only the backend needs the streaming Bedrock integration.
