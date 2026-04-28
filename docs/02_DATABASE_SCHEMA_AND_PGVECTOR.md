# [ ] Module 02 - Database Schema, Migrations, Seeds, and pgvector

Branch Name: `feature/module-02-database-schema-pgvector`

## Purpose
Define the relational and vector database foundation for users, organizations, roles, tasks, activity history, chat history, embeddings, deduplication events, and audit logs.

## Owner Expectations
By the end of this module, the database supports secure task management and AI retrieval with authorization metadata. Migrations are repeatable, seeds create a demo-ready dataset, and tests prove schema constraints.

## [ ] Submodule 02.1 - Prisma Schema Foundation

Purpose: Model the core domain clearly enough for RBAC, task activity, AI retrieval, and auditability.

Owner Expectations: The schema is normalized, indexed, and easy to query from NestJS services.

### [ ] Tasks
- [ ] Define `User` model.
  - [ ] Subtask: Include `id`, `email`, `name`, `passwordHash`, `createdAt`, `updatedAt`, and `disabledAt`.
  - [ ] Subtask: Add unique index on normalized email.
  - [ ] Subtask: Add relation to organization memberships.
- [ ] Define `Organization` model.
  - [ ] Subtask: Include `id`, `name`, `slug`, `parentOrgId`, `createdAt`, and `updatedAt`.
  - [ ] Subtask: Support parent-child hierarchy for Owner access.
  - [ ] Subtask: Add unique slug constraint.
- [ ] Define `OrgMembership` model.
  - [ ] Subtask: Include `userId`, `orgId`, `role`, `createdAt`, and `updatedAt`.
  - [ ] Subtask: Enforce one membership per user per org.
  - [ ] Subtask: Add indexes for `userId`, `orgId`, and `role`.
- [ ] Define `Task` model.
  - [ ] Subtask: Include `id`, `orgId`, `title`, `description`, `status`, `priority`, `category`, `visibility`, `createdById`, `assigneeId`, `dueAt`, `completedAt`, `deletedAt`, `createdAt`, and `updatedAt`.
  - [ ] Subtask: Add indexes for `orgId`, `assigneeId`, `status`, `priority`, `dueAt`, and `updatedAt`.
  - [ ] Subtask: Decide whether task IDs in UI use UUIDs or short display IDs like `task-0042`.
- [ ] Define `TaskActivity` model.
  - [ ] Subtask: Include `taskId`, `actorId`, `type`, `fromValue`, `toValue`, `comment`, and `createdAt`.
  - [ ] Subtask: Add index on `taskId` and `createdAt`.
  - [ ] Subtask: Capture status changes, comments, assignment changes, priority changes, and due date changes.
- [ ] Define `AuditLog` model.
  - [ ] Subtask: Include `actorId`, `orgId`, `action`, `resourceType`, `resourceId`, `metadata`, `ipHash`, `userAgentHash`, and `createdAt`.
  - [ ] Subtask: Add indexes for security investigation queries.

### [ ] TDD Requirements
- [ ] Write schema tests that fail when unique email constraint is missing.
- [ ] Write schema tests that fail when duplicate memberships are allowed.
- [ ] Write repository tests that fail when soft-deleted tasks are returned by default.
- [ ] Write audit repository tests that fail when required metadata is omitted.

### [ ] Edge Cases
- [ ] User email differs only by case.
- [ ] Organization has no parent.
- [ ] Organization has nested child orgs.
- [ ] Task is unassigned.
- [ ] Task is assigned to a disabled user.
- [ ] Task due date is in the past.
- [ ] Soft-deleted task still has activity logs.

## [ ] Submodule 02.2 - AI and Chat Tables

Purpose: Store embeddings, chat history, prompt versions, LLM logs, and deduplication events in a way that is auditable and scoped by RBAC.

Owner Expectations: AI features can be tested without external vector services.

### [ ] Tasks
- [ ] Enable pgvector.
  - [ ] Subtask: Add migration with `CREATE EXTENSION IF NOT EXISTS vector`.
  - [ ] Subtask: Document local pgvector requirement.
  - [ ] Subtask: Add migration rollback note.
- [ ] Define `TaskEmbedding` table.
  - [ ] Subtask: Include `taskId`, `orgId`, `assigneeId`, `visibility`, `embeddingModel`, `embeddingVersion`, `contentHash`, `embedding`, `indexedAt`, and `staleAt`.
  - [ ] Subtask: Use `vector(1024)` for Amazon Titan Text Embeddings V2.
  - [ ] Subtask: Add unique index on `taskId` and `embeddingModel`.
  - [ ] Subtask: Add vector index after enough seed data exists.
  - [ ] Subtask: Add normal indexes for `orgId`, `assigneeId`, and `visibility`.
- [ ] Define `ChatConversation` model.
  - [ ] Subtask: Include `id`, `userId`, `orgId`, `title`, `createdAt`, and `updatedAt`.
  - [ ] Subtask: Add index on `userId` and `updatedAt`.
- [ ] Define `ChatMessage` model.
  - [ ] Subtask: Include `conversationId`, `role`, `content`, `sourcesJson`, `guardrailResultJson`, `createdAt`.
  - [ ] Subtask: Add index on `conversationId` and `createdAt`.
  - [ ] Subtask: Store sources as task IDs and similarity scores, not entire task contents.
- [ ] Define `PromptVersion` model or prompt manifest.
  - [ ] Subtask: Store prompt name, version, content hash, and active flag.
  - [ ] Subtask: Keep prompt text in version-controlled files under `libs/ai/prompts`.
- [ ] Define `LlmInteractionLog` model.
  - [ ] Subtask: Include request metadata, model ID, latency, token counts when available, redaction status, guardrail outcome, and createdAt.
  - [ ] Subtask: Make raw prompt/output logging disabled by default.
- [ ] Define `DedupEvent` model.
  - [ ] Subtask: Include `userId`, `orgId`, `candidateTaskId`, `matchedTaskId`, `similarity`, `decision`, and `createdAt`.
  - [ ] Subtask: Support decisions `merge`, `skip`, `create_anyway`, and `dismissed`.

### [ ] TDD Requirements
- [ ] Write migration test that fails if pgvector is missing.
- [ ] Write repository test that stores and retrieves a fake vector.
- [ ] Write query test that filters by org before ordering by vector similarity.
- [ ] Write chat history pagination test.
- [ ] Write dedup event persistence test.

### [ ] Edge Cases
- [ ] Embedding row exists for a deleted task.
- [ ] Embedding model changes and old vectors have different dimensions.
- [ ] Chat message has no sources.
- [ ] LLM interaction fails before token counts are known.
- [ ] Dedup candidate is later deleted.

## [ ] Submodule 02.3 - Seed Data

Purpose: Make local demo and tests meaningful without manual setup.

Owner Expectations: Seed command creates realistic orgs, users, roles, tasks, activity logs, comments, and sample embeddings placeholders.

### [ ] Tasks
- [ ] Create seed organizations.
  - [ ] Subtask: Create parent org `Acme Corp`.
  - [ ] Subtask: Create child org `Acme Engineering`.
  - [ ] Subtask: Create child org `Acme Product`.
- [ ] Create seed users.
  - [ ] Subtask: Owner user with access across child orgs.
  - [ ] Subtask: Admin user in Engineering.
  - [ ] Subtask: Viewer user in Engineering.
  - [ ] Subtask: Member user assigned to selected tasks.
- [ ] Create seed tasks.
  - [ ] Subtask: Include authentication, API refactor, dashboard, XSS, and overdue task examples.
  - [ ] Subtask: Include status mix: To Do, In Progress, In Review, Blocked, Done.
  - [ ] Subtask: Include a near-duplicate task pair for dedup demo.
  - [ ] Subtask: Include private/assigned-only tasks for RBAC leak tests.
- [ ] Create seed activity history.
  - [ ] Subtask: Include status changes.
  - [ ] Subtask: Include blocker comments.
  - [ ] Subtask: Include assignments and due date changes.

### [ ] TDD Requirements
- [ ] Write seed test that ensures required demo users exist.
- [ ] Write seed test that ensures every seeded task belongs to an org.
- [ ] Write seed test that ensures at least one cross-org leak test case exists.

### [ ] Edge Cases
- [ ] Seed command is run twice.
- [ ] Seed data exists with changed passwords.
- [ ] Seed data partially failed on previous run.

## [ ] Submodule 02.4 - Database Access Patterns

Purpose: Establish query conventions that prevent data leaks.

Owner Expectations: All repositories accept an authorization scope and never query sensitive records without it.

### [ ] Tasks
- [ ] Create repository conventions.
  - [ ] Subtask: Every task query accepts `actorUserId` and `authorizationScope`.
  - [ ] Subtask: Every vector search accepts allowed org IDs and allowed visibility/assignment filters.
  - [ ] Subtask: Every mutation runs inside a transaction when it creates activity or audit records.
- [ ] Create base pagination utilities.
  - [ ] Subtask: Use cursor pagination for chat history.
  - [ ] Subtask: Use limit/offset only for small admin lists if needed.
  - [ ] Subtask: Enforce maximum page sizes.
- [ ] Create date handling rules.
  - [ ] Subtask: Store timestamps in UTC.
  - [ ] Subtask: Render user-local dates in Angular.

### [ ] TDD Requirements
- [ ] Write test proving repository methods require authorization scope.
- [ ] Write test proving vector search does not return cross-org results even with high similarity.
- [ ] Write pagination tests for stable ordering when timestamps match.

### [ ] Edge Cases
- [ ] Empty allowed org list.
- [ ] User has multiple memberships.
- [ ] Owner has access to child orgs but not unrelated orgs.
- [ ] Task has org-level visibility but no assignee.

## [ ] Security Requirements

- [ ] Use parameterized queries for all raw SQL.
- [ ] Do not store raw passwords, tokens, or AWS secrets.
- [ ] Keep vector rows scoped with org and visibility metadata.
- [ ] Keep audit logs append-only from application code.
- [ ] Redact or hash IP and user-agent values if privacy is a concern.
- [ ] Use transactions for task mutation plus activity plus audit plus embedding stale marker.

## [ ] Human QA Checklist

- [ ] Run database reset.
- [ ] Run migrations.
- [ ] Run seed command twice and confirm idempotence.
- [ ] Open database and confirm pgvector extension exists.
- [ ] Confirm seeded users and tasks match demo script.
- [ ] Confirm vector table exists even before real embeddings are generated.
