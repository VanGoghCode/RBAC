# [x] Module 00 - Project Index, Tech Stack, Scope, and Execution Strategy

Branch Name: `docs/module-00-project-index-tech-stack`

## Purpose
Define the complete technical direction for the Secure Task Management System with required RAG chat and the two best OA-friendly advanced AI features.

This module is the planning source of truth. Every later module should follow this scope unless the owner explicitly changes it.

## Owner Expectations
By the end of this module, the project has a clear scope, cheap setup strategy, folder structure, module order, branch plan, security posture, TDD expectations, and final demo target.

## [ ] Recommended OA Scope

### [ ] Must build
- [ ] Base secure task management system with users, organizations, roles, JWT auth, task CRUD, activity history, and Angular dashboard.
- [ ] Required RAG-powered task chat that answers questions using authorized task data only.
- [ ] Task creation through chat as a lightweight intent inside the required chat module.
- [ ] Advanced AI Feature 1: Semantic Task Deduplication.
- [ ] Advanced AI Feature 2: Prompt Injection Guardrails.
- [ ] Strong documentation, tests, and short demo walkthrough.

### [ ] Should not build unless everything above is done
- [ ] Full conversational update/delete CRUD through chat.
- [ ] Multi-modal task input.
- [ ] Fine-tuned classifier.
- [ ] Agent-based orchestration.
- [ ] Slack/email delivery.
- [ ] Full AWS production deployment.

### [ ] Why these advanced features are selected
- [ ] Semantic Task Deduplication reuses the same embedding and vector store pipeline required for RAG, so it adds score without much extra infrastructure.
- [ ] Prompt Injection Guardrails directly strengthen the most security-sensitive part of the challenge and can be proven with a focused test suite.
- [ ] Both features are demo-friendly and easy to explain in under 10 minutes.

## [ ] Whole Tech Stack

### [ ] Frontend
- [ ] Angular in an Nx monorepo.
- [ ] Angular Material and Angular CDK for accessible UI primitives.
- [ ] RxJS for API state and chat streaming state.
- [ ] SCSS with a small design-token file for spacing, typography, colors, and focus rings.
- [ ] Playwright for browser E2E tests.
- [ ] axe or equivalent accessibility checks in E2E tests.

### [ ] Backend
- [ ] NestJS in the same Nx monorepo.
- [ ] REST APIs for auth, orgs, tasks, chat, deduplication, health, and admin audit views.
- [ ] JWT access tokens with secure refresh flow.
- [ ] Guards for authentication, RBAC, and resource ownership.
- [ ] DTO validation with class-validator or Zod.
- [ ] Prisma ORM for normal relational data.
- [ ] Raw SQL through Prisma for pgvector similarity queries.

### [ ] Database and Vector Store
- [ ] PostgreSQL as the only database.
- [ ] pgvector extension inside PostgreSQL for embeddings.
- [ ] Local Docker Postgres with pgvector for development and demo.
- [ ] Optional AWS RDS PostgreSQL only if a hosted demo is absolutely needed.
- [ ] Vector dimension: `1024` when using Amazon Titan Text Embeddings V2.

### [ ] AI Providers
- [ ] AWS Bedrock Runtime through AWS SDK for JavaScript.
- [ ] LLM: configurable Bedrock chat model, preferably a low-cost Claude model available in the selected AWS region.
- [ ] Embeddings: `amazon.titan-embed-text-v2:0` unless the owner changes provider.
- [ ] Use model IDs from environment variables so the app does not depend on one hard-coded model.

### [ ] Testing
- [ ] Jest for NestJS unit and integration tests.
- [ ] Supertest for API E2E tests.
- [ ] Jest or Angular TestBed for Angular component tests.
- [ ] Playwright for end-to-end user flows.
- [ ] Deterministic AI mocks for repeatable tests.
- [ ] Testcontainers or Docker Compose test database for repository and RBAC tests.

### [ ] Cheap Setup Decision
- [ ] Use local Docker Compose for PostgreSQL + pgvector.
- [ ] Use AWS Bedrock for LLM and embeddings with AWS credits.
- [ ] Do not pay for Pinecone, Qdrant Cloud, Auth0, Datadog, or hosted vector services.
- [ ] Keep email, Slack, cron reports, and production deployment optional.

## [ ] Target Folder Structure

```text
repo-root/
  apps/
    api/
      src/
        app/
        main.ts
        environments/
      test/
    web/
      src/
        app/
        assets/
        styles/
      e2e/
  libs/
    shared/
      types/
      validation/
      config/
      test-utils/
    auth/
      data-access/
      domain/
      feature-api/
      feature-ui/
    orgs/
      data-access/
      domain/
      feature-api/
      feature-ui/
    tasks/
      data-access/
      domain/
      feature-api/
      feature-ui/
    ai/
      bedrock/
      embeddings/
      vector-store/
      rag/
      intents/
      guardrails/
      prompts/
    ui/
      shell/
      components/
      a11y/
  prisma/
    schema.prisma
    migrations/
    seed.ts
  docker/
    postgres/
  docs/
    modules/
    adr/
    diagrams/
    demo/
    security/
  scripts/
  .github/
    workflows/
```

## [ ] Security Strategy From A to Z

### [ ] Core principles
- [ ] Enforce permissions in backend services and database queries, never in the LLM.
- [ ] Put RBAC metadata into task embeddings and always filter by authorization scope before semantic ranking.
- [ ] Validate every inbound request body, query parameter, route parameter, and AI tool output.
- [ ] Treat user messages, task descriptions, comments, and retrieved context as untrusted text.
- [ ] Never place secrets, JWTs, AWS keys, database URLs, or hidden policy text in LLM prompts.
- [ ] Log enough for audit but redact sensitive values by default.
- [ ] Rate-limit login, chat, semantic search, and AI mutation endpoints.
- [ ] Use least-privilege AWS IAM permissions for Bedrock invocation.

### [ ] Minimum security requirements
- [ ] Passwords are hashed with Argon2id or bcrypt with a strong cost factor.
- [ ] Access token lifetime is short.
- [ ] Refresh token is stored in an HttpOnly, Secure, SameSite cookie when running in HTTPS environments.
- [ ] CSRF protection is enabled for cookie-authenticated state-changing routes.
- [ ] Helmet or equivalent security headers are enabled in NestJS.
- [ ] CORS only allows the configured Angular origin.
- [ ] Prisma queries use parameterized inputs.
- [ ] Raw SQL vector queries use parameter binding only.
- [ ] API errors do not leak stack traces, SQL details, model prompts, or model raw output.
- [ ] Audit logs exist for login attempts, task mutations, role changes, chat task creation, dedup decisions, and guardrail blocks.

## [ ] Fully Functional Strategy

### [ ] Vertical slice order
- [ ] First build auth, orgs, and a seeded user journey.
- [ ] Then build task CRUD and activity history.
- [ ] Then index task embeddings on create/update.
- [ ] Then build RAG chat without streaming.
- [ ] Then add streaming display.
- [ ] Then add semantic deduplication.
- [ ] Then add prompt injection guardrails.
- [ ] Then harden tests, docs, demo, and final polish.

### [ ] Demo target
- [ ] Login as an Admin in Acme Engineering.
- [ ] Create and update several tasks.
- [ ] Ask chat: "What bugs are blocking the API refactor?"
- [ ] Show grounded answer with source task cards.
- [ ] Click source task card and navigate to task detail.
- [ ] Ask chat to create a task.
- [ ] Create a near-duplicate task and show duplicate warning.
- [ ] Run a prompt injection attempt and show safe refusal or safe grounded answer.
- [ ] Show tests and README architecture notes.

## [ ] Module Branch Plan

- [ ] Module 00: `docs/module-00-project-index-tech-stack`
- [ ] Module 01: `chore/module-01-monorepo-tooling`
- [ ] Module 02: `feature/module-02-database-schema-pgvector`
- [ ] Module 03: `feature/module-03-auth-rbac`
- [ ] Module 04: `feature/module-04-task-crud-activity-audit`
- [ ] Module 05: `feature/module-05-angular-ui-ux-wcag`
- [ ] Module 06: `feature/module-06-ai-foundation-bedrock-pgvector`
- [ ] Module 07: `feature/module-07-rag-chat-required`
- [ ] Module 08: `feature/module-08-semantic-deduplication`
- [ ] Module 09: `feature/module-09-prompt-injection-guardrails`
- [ ] Module 10: `security/module-10-application-hardening`
- [ ] Module 11: `test/module-11-testing-qa-performance`
- [ ] Module 12: `ops/module-12-local-setup-simple-deployment`
- [ ] Module 13: `docs/module-13-readme-demo-submission`

## [ ] TDD Rules For All Modules

- [ ] Write the failing test before implementation.
- [ ] Confirm the test fails for the expected reason.
- [ ] Implement the smallest amount of code needed to pass.
- [ ] Refactor after green tests.
- [ ] Add edge-case tests before considering a task complete.
- [ ] Mock Bedrock calls in unit tests.
- [ ] Use real PostgreSQL + pgvector for vector integration tests.
- [ ] Every RBAC-sensitive feature must include "allowed", "forbidden", and "cross-org leak" tests.
- [ ] Every UI feature must include keyboard, loading, empty, error, and accessible-name checks.

## [ ] Module Dependency Order

- [ ] Complete Module 01 before coding any feature modules.
- [ ] Complete Module 02 before Modules 03, 04, 06, 07, and 08.
- [ ] Complete Module 03 before task APIs and AI APIs.
- [ ] Complete Module 04 before indexing and RAG.
- [ ] Complete Module 06 before Modules 07 and 08.
- [ ] Complete Module 09 before final demo polish.
- [ ] Complete Modules 10, 11, 12, and 13 before submission.

## [ ] Human QA Checklist

- [ ] Confirm the chosen scope is acceptable for the OA.
- [ ] Confirm Bedrock model access is enabled in the target AWS region.
- [ ] Confirm local Docker can run PostgreSQL with pgvector.
- [ ] Confirm the generated branch names match the owner's preferred Git workflow.
- [ ] Confirm no module introduces a paid third-party service beyond AWS Bedrock usage.

## [ ] References For Implementation

- [ ] AWS Bedrock Runtime InvokeModel documentation: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html
- [ ] AWS Bedrock Claude messages documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html
- [ ] Amazon Titan Text Embeddings documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html
- [ ] pgvector documentation: https://github.com/pgvector/pgvector
- [ ] WCAG 2.2: https://www.w3.org/TR/WCAG22/
- [ ] OWASP Top 10: https://owasp.org/Top10/2021/
- [ ] NestJS Server-Sent Events: https://docs.nestjs.com/techniques/server-sent-events
- [ ] Angular accessibility: https://angular.dev/best-practices/a11y
