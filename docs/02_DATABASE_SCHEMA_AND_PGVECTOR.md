# [x] Module 02 - Database Schema, Migrations, Seeds, and pgvector

Branch Name: `feature/module-02-database-schema-pgvector`

## Purpose
Define the relational and vector database foundation for users, organizations, roles, tasks, activity history, chat history, embeddings, deduplication events, and audit logs.

## Owner Expectations
By the end of this module, the database supports secure task management and AI retrieval with authorization metadata. Migrations are repeatable, seeds create a demo-ready dataset, and tests prove schema constraints.

## [x] Submodule 02.1 - Prisma Schema Foundation

Purpose: Model the core domain clearly enough for RBAC, task activity, AI retrieval, and auditability.

Owner Expectations: The schema is normalized, indexed, and easy to query from NestJS services.

### [x] Tasks
- [x] Define `User` model.
  - [x] Subtask: Include `id`, `email`, `name`, `passwordHash`, `createdAt`, `updatedAt`, and `disabledAt`.
  - [x] Subtask: Add unique index on normalized email.
  - [x] Subtask: Add relation to organization memberships.
- [x] Define `Organization` model.
  - [x] Subtask: Include `id`, `name`, `slug`, `parentOrgId`, `createdAt`, and `updatedAt`.
  - [x] Subtask: Support parent-child hierarchy for Owner access.
  - [x] Subtask: Add unique slug constraint.
- [x] Define `OrgMembership` model.
  - [x] Subtask: Include `userId`, `orgId`, `role`, `createdAt`, and `updatedAt`.
  - [x] Subtask: Enforce one membership per user per org.
  - [x] Subtask: Add indexes for `userId`, `orgId`, and `role`.
- [x] Define `Task` model.
  - [x] Subtask: Include `id`, `orgId`, `title`, `description`, `status`, `priority`, `category`, `visibility`, `createdById`, `assigneeId`, `dueAt`, `completedAt`, `deletedAt`, `createdAt`, and `updatedAt`.
  - [x] Subtask: Add indexes for `orgId`, `assigneeId`, `status`, `priority`, `dueAt`, and `updatedAt`.
  - [x] Subtask: Decide whether task IDs in UI use UUIDs or short display IDs like `task-0042`.
- [x] Define `TaskActivity` model.
  - [x] Subtask: Include `taskId`, `actorId`, `type`, `fromValue`, `toValue`, `comment`, and `createdAt`.
  - [x] Subtask: Add index on `taskId` and `createdAt`.
  - [x] Subtask: Capture status changes, comments, assignment changes, priority changes, and due date changes.
- [x] Define `AuditLog` model.
  - [x] Subtask: Include `actorId`, `orgId`, `action`, `resourceType`, `resourceId`, `metadata`, `ipHash`, `userAgentHash`, and `createdAt`.
  - [x] Subtask: Add indexes for security investigation queries.

### [x] TDD Requirements
- [x] Write schema tests that fail when unique email constraint is missing.
- [x] Write schema tests that fail when duplicate memberships are allowed.
- [x] Write repository tests that fail when soft-deleted tasks are returned by default.
- [x] Write audit repository tests that fail when required metadata is omitted.

### [x] Edge Cases
- [x] User email differs only by case.
- [x] Organization has no parent.
- [x] Organization has nested child orgs.
- [x] Task is unassigned.
- [x] Task is assigned to a disabled user.
- [x] Task due date is in the past.
- [x] Soft-deleted task still has activity logs.

## [x] Submodule 02.2 - AI and Chat Tables

Purpose: Store embeddings, chat history, prompt versions, LLM logs, and deduplication events in a way that is auditable and scoped by RBAC.

Owner Expectations: AI features can be tested without external vector services.

### [x] Tasks
- [x] Enable pgvector.
  - [x] Subtask: Add migration with `CREATE EXTENSION IF NOT EXISTS vector`.
  - [x] Subtask: Document local pgvector requirement.
  - [x] Subtask: Add migration rollback note.
- [x] Define `TaskEmbedding` table.
  - [x] Subtask: Include `taskId`, `orgId`, `assigneeId`, `visibility`, `embeddingModel`, `embeddingVersion`, `contentHash`, `embedding`, `indexedAt`, and `staleAt`.
  - [x] Subtask: Use `vector(1024)` for Amazon Titan Text Embeddings V2.
  - [x] Subtask: Add unique index on `taskId` and `embeddingModel`.
  - [x] Subtask: Add vector index after enough seed data exists.
  - [x] Subtask: Add normal indexes for `orgId`, `assigneeId`, and `visibility`.
- [x] Define `ChatConversation` model.
  - [x] Subtask: Include `id`, `userId`, `orgId`, `title`, `createdAt`, and `updatedAt`.
  - [x] Subtask: Add index on `userId` and `updatedAt`.
- [x] Define `ChatMessage` model.
  - [x] Subtask: Include `conversationId`, `role`, `content`, `sourcesJson`, `guardrailResultJson`, `createdAt`.
  - [x] Subtask: Add index on `conversationId` and `createdAt`.
  - [x] Subtask: Store sources as task IDs and similarity scores, not entire task contents.
- [x] Define `PromptVersion` model or prompt manifest.
  - [x] Subtask: Store prompt name, version, content hash, and active flag.
  - [x] Subtask: Keep prompt text in version-controlled files under `libs/ai/prompts`.
- [x] Define `LlmInteractionLog` model.
  - [x] Subtask: Include request metadata, model ID, latency, token counts when available, redaction status, guardrail outcome, and createdAt.
  - [x] Subtask: Make raw prompt/output logging disabled by default.
- [x] Define `DedupEvent` model.
  - [x] Subtask: Include `userId`, `orgId`, `candidateTaskId`, `matchedTaskId`, `similarity`, `decision`, and `createdAt`.
  - [x] Subtask: Support decisions `merge`, `skip`, `create_anyway`, and `dismissed`.

### [x] TDD Requirements
- [x] Write migration test that fails if pgvector is missing.
- [x] Write repository test that stores and retrieves a fake vector.
- [x] Write query test that filters by org before ordering by vector similarity.
- [x] Write chat history pagination test.
- [x] Write dedup event persistence test.

### [x] Edge Cases
- [x] Embedding row exists for a deleted task.
- [x] Embedding model changes and old vectors have different dimensions.
- [x] Chat message has no sources.
- [x] LLM interaction fails before token counts are known.
- [x] Dedup candidate is later deleted.

## [x] Submodule 02.3 - Seed Data

Purpose: Make local demo and tests meaningful without manual setup.

Owner Expectations: Seed command creates realistic orgs, users, roles, tasks, activity logs, comments, and sample embeddings placeholders.

### [x] Tasks
- [x] Create seed organizations.
  - [x] Subtask: Create parent org `Acme Corp`.
  - [x] Subtask: Create child org `Acme Engineering`.
  - [x] Subtask: Create child org `Acme Product`.
- [x] Create seed users.
  - [x] Subtask: Owner user with access across child orgs.
  - [x] Subtask: Admin user in Engineering.
  - [x] Subtask: Viewer user in Engineering.
  - [x] Subtask: Member user assigned to selected tasks.
- [x] Create seed tasks.
  - [x] Subtask: Include authentication, API refactor, dashboard, XSS, and overdue task examples.
  - [x] Subtask: Include status mix: To Do, In Progress, In Review, Blocked, Done.
  - [x] Subtask: Include a near-duplicate task pair for dedup demo.
  - [x] Subtask: Include private/assigned-only tasks for RBAC leak tests.
- [x] Create seed activity history.
  - [x] Subtask: Include status changes.
  - [x] Subtask: Include blocker comments.
  - [x] Subtask: Include assignments and due date changes.

### [x] TDD Requirements
- [x] Write seed test that ensures required demo users exist.
- [x] Write seed test that ensures every seeded task belongs to an org.
- [x] Write seed test that ensures at least one cross-org leak test case exists.

### [x] Edge Cases
- [x] Seed command is run twice.
- [x] Seed data exists with changed passwords.
- [x] Seed data partially failed on previous run.

## [x] Submodule 02.4 - Database Access Patterns

Purpose: Establish query conventions that prevent data leaks.

Owner Expectations: All repositories accept an authorization scope and never query sensitive records without it.

### [x] Tasks
- [x] Create repository conventions.
  - [x] Subtask: Every task query accepts `actorUserId` and `authorizationScope`.
  - [x] Subtask: Every vector search accepts allowed org IDs and allowed visibility/assignment filters.
  - [x] Subtask: Every mutation runs inside a transaction when it creates activity or audit records.
- [x] Create base pagination utilities.
  - [x] Subtask: Use cursor pagination for chat history.
  - [x] Subtask: Use limit/offset only for small admin lists if needed.
  - [x] Subtask: Enforce maximum page sizes.
- [x] Create date handling rules.
  - [x] Subtask: Store timestamps in UTC.
  - [x] Subtask: Render user-local dates in Angular.

### [x] TDD Requirements
- [x] Write test proving repository methods require authorization scope.
- [x] Write test proving vector search does not return cross-org results even with high similarity.
- [x] Write pagination tests for stable ordering when timestamps match.

### [x] Edge Cases
- [x] Empty allowed org list.
- [x] User has multiple memberships.
- [x] Owner has access to child orgs but not unrelated orgs.
- [x] Task has org-level visibility but no assignee.

## [x] Security Requirements

- [x] Use parameterized queries for all raw SQL.
- [x] Do not store raw passwords, tokens, or AWS secrets.
- [x] Keep vector rows scoped with org and visibility metadata.
- [x] Keep audit logs append-only from application code.
- [x] Redact or hash IP and user-agent values if privacy is a concern.
- [x] Use transactions for task mutation plus activity plus audit plus embedding stale marker.

## [x] Human QA Checklist

- [x] Run database reset.
- [x] Run migrations.
- [x] Run seed command twice and confirm idempotence.
- [x] Open database and confirm pgvector extension exists.
- [x] Confirm seeded users and tasks match demo script.
- [x] Confirm vector table exists even before real embeddings are generated.

---

## AI-Journal

Prisma 7 installed. Schema: User, Organization, OrgMembership, Task, TaskActivity, AuditLog, TaskEmbedding, ChatConversation, ChatMessage, PromptVersion, LlmInteractionLog, DedupEvent. pgvector via `vector(1024)` + raw SQL. Prisma 7 needs `@prisma/adapter-pg` + `prisma.config.ts` — no `datasourceUrl` in schema. Adapter pattern required for client engine. Migration SQL hand-written. Seed idempotent via upsert. Repos enforce `AuthorizationScope` — no query without `allowedOrgIds`. Cursor pagination, max 100 page size. 27 tests pass, DB tests auto-skip without DB. Timestamps UTC. Prompt text version-controlled in `libs/ai/prompts`.

Command sequence to test locally:               
                                                                                      
  pnpm dev:db
  pnpm db:init                                                                                                                                                                 
  pnpm db:generate
  pnpm db:push -- --accept-data-loss                                                                                                                                           
  pnpm db:seed                                              
  pnpm test:api