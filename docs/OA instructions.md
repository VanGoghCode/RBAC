# AI-Powered Extensions — Secure Task

# Management System

## Addendum to the Full Stack Coding Challenge

This document extends the base Task Management System you will build, with applied AI
capabilities. Candidates should implement the **RAG Chat Module** as a required addition and
select **at least two** concepts from the Advanced AI Features menu.

## Module 1: RAG-Powered Task Chat (Required)

## Concept

Give every user a conversational interface that can answer natural-language questions about
their tasks, activity history, and productivity patterns. The system retrieves relevant task records,
enriches them with context, and passes them to an LLM to generate grounded, citation-backed
answers.

## Architecture


```
None
None
```
#### Data Pipeline

##### 1. Embedding Generation

Every time a task is created or updated, generate an embedding from a composite text
representation:
[Title]: Fix login redirect bug
[Description]: Users are redirected to /home instead of /dashboard after OAuth
login
[Category]: Work → Engineering
[Status]: In Progress
[Created]: 2026-03-
[Assignee]: Jane (Admin, Org: Acme Corp)
[Tags]: bug, auth, frontend
[Activity]: Moved from "To Do" to "In Progress" on 2026-03-20.
Comment by Alex: "Reproduced on staging."
Store the vector alongside the task ID, org ID, and role metadata so retrieval respects RBAC
boundaries.

##### 2. Retrieval Strategy

```
Step Detail
Query embedding Embed the user's natural-language question
with the same model used for tasks.
Scoped search Filter the vector store to only return tasks the
requesting user is authorized to see (org ID +
role).
Top-K retrieval Return the top 5–10 most semantically similar
task documents.
Re-ranking (optional) Apply a cross-encoder or keyword overlap
re-ranker to tighten relevance.
```
##### 3. Augmented Prompt Construction

```
SYSTEM:
You are a task management assistant. Answer the user's question using ONLY
```

```
None
the retrieved task records below. Cite task IDs when referencing specific
tasks. If the information is not present in the context, say so.
CONTEXT (retrieved tasks):
{retrieved_task_documents}
USER:
{user_question}
```
#### API Endpoints

```
POST /chat/ask
Headers: Authorization: Bearer <JWT>
Body: { "message": "What bugs have we fixed this sprint?" }
Response (streamed or JSON):
{
"answer": "This sprint, 3 bugs were closed: ...",
"sources": [
{ "taskId": "task-0042", "title": "Fix login redirect", "similarity": 0.
},
{ "taskId": "task-0038", "title": "Patch XSS in comments", "similarity":
0.87 }
]
}
GET /chat/history
Headers: Authorization: Bearer <JWT>
Query: ?limit=20&before=<cursor>
Response: paginated list of past chat messages for the authenticated user
```
#### Frontend — Chat Panel

Build a slide-out or embedded chat panel in the Angular dashboard with the following UX:

- **Message input** with send button and Enter-to-submit.
- **Streaming token display** — render the LLM response incrementally (SSE or
    WebSocket).
- **Source cards** — beneath each answer, show clickable references to the cited tasks.
    Clicking a source card navigates to that task's detail view.
- **Conversation memory** — maintain a short rolling context window (last 5 exchanges) so
    follow-up questions work: "What about that login bug?" resolves from prior context.


- **Suggested prompts** — on first open, show starter chips: "What did I finish last week?",
    "Show overdue tasks", "Summarize my team's progress."

#### Example Conversations

```
User: What has my team accomplished this month?
Assistant: Your team (Acme Corp → Engineering) closed 14 tasks in March 2026.
Highlights include completing the OAuth migration (task-0031), shipping the new
dashboard layout (task-0027), and resolving 5 high-priority bugs. There are still 3
tasks in review. [Sources: task-0031, task-0027, task-0019, ...]
User: Create a task to write unit tests for the auth module.
Assistant: I've created the task:
```
- **Title:** Write unit tests for auth module
- **Category:** Work → Engineering
- **Status:** To Do
- **Assigned to:** You
Want me to set a due date or priority?
**User:** What's been blocking the API refactor?
**Assistant:** Based on the activity log for task-0044 ("API Refactor — v2 endpoints"),
the main blockers are: (1) a dependency on the database migration in task-0041,
which is still in progress, and (2) a comment from Dave on March 18 noting that the
OpenAPI spec hasn't been finalized. [Sources: task-0044, task-0041]

#### RBAC Integration

The RAG pipeline **must** enforce the same access control as the REST API:

- **Viewers** can only query tasks they are explicitly assigned to or that belong to their org at
    their visibility level.
- **Admins** can query all tasks within their organization.
- **Owners** can query across child organizations.
- Vector store queries must include a metadata filter for orgId and role before any
    semantic matching occurs. Never rely on the LLM to filter — enforce at the retrieval
    layer.


```
None
```
#### Evaluation Criteria for This Module

```
Criterion Weight
Correct RBAC-scoped retrieval (no data
leakage)
```
###### 30%

```
Answer quality and grounding (cites real
tasks, doesn't hallucinate)
```
###### 25%

```
Embedding pipeline (auto-indexes on task
CRUD)
```
###### 20%

```
Chat UX (streaming, sources, follow-ups) 15%
Task creation via chat (intent detection + API
call)
```
###### 10%

### 🧪 Module 2: Advanced AI Features Menu (Pick ≥ 2)

#### A. Intent Detection & Conversational Task CRUD

Go beyond simple Q&A — let users create, update, and delete tasks entirely through natural
language.
**How it works:**

1. Classify the user's message into an intent: query, create_task, update_task,
    delete_task, status_report, unknown.
2. For mutation intents, extract structured parameters (title, description, category, assignee,
    due date) using function calling or structured output.
3. Confirm destructive actions before executing.
4. Call the existing REST API internally and return the result conversationally.
**Implementation hint:** Use LLM function/tool calling. Define tools like create_task(title,
description, category, priority, assignee) and let the model decide when to
invoke them.
POST /chat/ask
Body: { "message": "Remind me to review PRs every Friday at 3pm" }


```
→ Detected intent: create_task
→ Extracted: { title: "Review PRs", recurrence: "weekly/friday/15:00", category:
"Work" }
→ Confirmation: "I'll create a recurring task 'Review PRs' every Friday at 3 PM.
Confirm?"
```
#### B. Semantic Task Deduplication

Before a new task is saved, run its embedding against existing tasks. If cosine similarity
exceeds a threshold (e.g., 0.92), warn the user about potential duplicates.
**Requirements:**

- Show the candidate duplicate(s) with similarity scores.
- Let the user merge, skip, or create anyway.
- Log deduplication events for audit.

#### C. AI-Generated Summaries & Standup Reports

Add a /reports/standup endpoint that generates a daily standup summary for a user or
team.
**Pipeline:**

1. Retrieve all tasks updated in the last 24 hours (scoped by RBAC).
2. Group by status change (completed, started, blocked).
3. Pass to LLM with a structured prompt requesting standup format.
4. Return markdown or render in the dashboard.
**Bonus:** Schedule this as a cron job and deliver via email or a Slack-style notification panel.

#### D. Smart Categorization & Auto-Tagging

When a user creates a task with only a title and description, use an LLM to suggest:

- **Category** (Work, Personal, Health, Finance, etc.)


- **Priority** (Critical, High, Medium, Low)
- **Tags** (extracted key entities and topics)
- **Estimated effort** (Small / Medium / Large)
**Implementation:**
- Call the LLM with few-shot examples of previously categorized tasks.
- Present suggestions as editable chips in the UI — the user confirms or overrides.
- Track acceptance rate as a quality metric.

#### E. Anomaly Detection & Productivity Insights

Analyze task completion patterns and surface insights:

- "You typically complete 4 tasks/day but only finished 1 yesterday."
- "3 tasks have been in 'In Progress' for over 2 weeks."
- "Your team's throughput dropped 30% this sprint vs. last."
**Implementation options:**
- **Rule-based:** Simple heuristics on task timestamps.
- **LLM-based:** Feed aggregated stats into a prompt that generates natural-language
insights.
- **Hybrid:** Rules detect anomalies, LLM narrates them.
Add a /insights endpoint and an "Insights" card on the dashboard.

#### F. Embedding-Powered Task Search

Replace or augment the existing keyword-based task filter with semantic search.

- User types "things related to authentication" → returns tasks about OAuth, JWT, login,
    SSO, even if they never use the word "authentication."
- Implement as a search bar mode toggle: **Keyword** | **Semantic**.
- Show similarity scores alongside results.

#### G. Multi-Modal Task Input

Allow users to create tasks from non-text inputs:


- **Voice:** Integrate the Web Speech API (browser-native) to transcribe voice input, then run
    through intent detection.
- **Image / Screenshot:** User uploads a screenshot of a bug → use a vision-capable LLM
    to extract a title, description, and steps to reproduce.
- **Document / PDF:** User drops a requirements doc → LLM parses it into a set of draft
    tasks.

#### H. Prompt Injection Guardrails

Since the system passes user input into LLM prompts, implement defenses:

1. **Input sanitization** — strip or escape prompt-injection patterns before building the
    augmented prompt.
2. **Output validation** — if the LLM returns tool calls, validate parameters against a schema
    before executing.
3. **Canary tokens** — embed hidden tokens in the system prompt; if they appear in the
    output, flag the response.
4. **Rate limiting** — throttle /chat/ask per user to prevent abuse.
5. **Logging** — log all LLM interactions (input + output) for audit, respecting PII policies.
**Evaluation:** Provide a test suite of known prompt injection attempts and demonstrate that the
system handles them safely.

#### I. Fine-Tuned Task Classifier (Stretch)

Train or fine-tune a small model (e.g., a LoRA adapter on a 7B model, or fine-tune an
embedding model) on the system's historical task data to improve:

- Category prediction accuracy
- Effort estimation
- Priority assignment
**Deliverable:** A training script, evaluation metrics (accuracy, F1), and a comparison against
zero-shot LLM classification.

#### J. Agent-Based Task Orchestration

Build a lightweight agent loop that can execute multi-step plans:


```
User: "Set up everything we need for the Q3 launch."
Agent plan:
```
1. Create task: "Finalize Q3 feature list" → assigned to Product
2. Create task: "QA regression suite for Q3" → assigned to Engineering
3. Create task: "Prepare launch marketing assets" → assigned to Marketing
4. Create task: "Schedule launch retrospective" → assigned to PM
**Agent:** "I've drafted 4 tasks for the Q3 launch. Review and confirm?"
**Requirements:**
- Use a plan-then-execute pattern.
- The agent must respect RBAC — it can only create tasks in orgs/roles the user has
access to.
- All actions are confirmed before commit.

### 🏗 Implementation Notes

#### Recommended Tech Stack Additions

```
Concern Options
Vector store pgvector (PostgreSQL extension),
ChromaDB, Qdrant, or Pinecone
```
Embedding model (^) OpenAI text-embedding-3-small,
Cohere embed-v3, or local
all-MiniLM-L6-v2 via ONNX
LLM Claude (Anthropic API), GPT-4o (OpenAI), or
local Ollama for dev
Streaming Server-Sent Events (SSE) from NestJS to
Angular
Speech-to-text Web Speech API (browser) or Whisper API
Scheduling (^) @nestjs/schedule (cron) for standup
reports


```
None
None
```
#### NX Library Additions

```
libs/
ai/
├── embeddings/ → Embedding generation & vector store client
├── rag/ → Retrieval, prompt construction, LLM client
├── intents/ → Intent classification & parameter extraction
└── guardrails/ → Input sanitization, output validation, canary checks
```
#### Environment Variables

```
# AI Configuration
LLM_PROVIDER=anthropic # anthropic | openai | ollama
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-
EMBEDDING_PROVIDER=openai
EMBEDDING_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=
# Vector Store
VECTOR_STORE=pgvector # pgvector | chroma | qdrant
VECTOR_STORE_URL=postgresql://...
CHROMA_URL=http://localhost:8000 # if using ChromaDB
# Guardrails
MAX_CHAT_REQUESTS_PER_MINUTE=
LOG_LLM_INTERACTIONS=true
CANARY_TOKEN=__SYSTEM_BOUNDARY_42__
```
### 📊 Updated Evaluation Criteria

```
Criterion Weight
Base challenge (RBAC, JWT, NX, UI, tests) 50%
RAG Chat Module (required) 25%
Advanced AI Features (pick ≥ 2) 15%
```

```
Criterion Weight
Documentation & architecture clarity 10%
```
#### Bonus Points

- Streaming responses with visible token rendering
- Thoughtful prompt engineering with version-controlled prompts
- Guardrails test suite with adversarial examples
- Performance benchmarks (retrieval latency, embedding throughput)
- Demo video or walkthrough showing the AI features in action

### 📚 README Additions (Required)

Your README must include these additional sections:

#### AI Architecture

- Diagram showing the RAG pipeline end-to-end.
- Explanation of how embeddings are generated and indexed.
- Description of the prompt templates used and why.

#### Vector Store Schema

- Fields stored alongside embeddings (task ID, org ID, role metadata).
- Index configuration and similarity metric (cosine, dot product, etc.).

#### RBAC in the AI Layer

- How retrieval is scoped to authorized data.
- How mutation intents (create/update/delete via chat) are permission-checked.

#### Prompt Engineering

- All system prompts used, with comments explaining design choices.
- Versioning strategy for prompts (e.g., stored in a prompts/ directory).

#### AI Trade-offs & Limitations

- Known failure modes (e.g., hallucination on ambiguous queries).
- Latency considerations and how you mitigate them.
- Cost estimation for LLM API calls at projected scale.


## Video Guidelines

The video should briefly walk through your solution, highlight key technical decisions and
explain any tradeoffs or unfinished areas.
● Length: Up to 10 minutes
● Format: .mp4 (preferred) or other common formats (.mov, .avi, .wmv, .mkv)
● File size (if uploading): Up to 300 MB
● Editing: No editing required. Focus on clarity and technical explanation.
● If sharing a link: Ensure “anyone with the link can view”

## Important Submission Instructions

Submit your completed work through the official portal:
**https://forms.gle/1iJ2AHzMWsWecLUE**
This portal ensures proper tracking and routing to the hiring team


