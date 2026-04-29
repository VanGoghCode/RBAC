# [x] Module 03 - Authentication, RBAC, Organization Access, and API Security Base

Branch Name: `feature/module-03-auth-rbac`

## Purpose
Implement secure authentication and authorization for all base and AI features.

## Owner Expectations
By the end of this module, users can authenticate, receive JWTs, access only authorized organizations and tasks, and all protected APIs reject unauthorized or cross-org access.

## [x] Submodule 03.1 - Authentication APIs

Purpose: Provide secure login, refresh, logout, and current-user flows.

Owner Expectations: Auth is simple enough for the OA but secure enough to withstand review.

### [x] Tasks
- [x] Implement `POST /auth/login`.
  - [x] Subtask: Validate email and password.
  - [x] Subtask: Normalize email before lookup.
  - [x] Subtask: Compare password hash safely.
  - [x] Subtask: Return access token and set refresh cookie.
  - [x] Subtask: Write audit log for success and failure.
- [x] Implement `POST /auth/refresh`.
  - [x] Subtask: Validate refresh token from HttpOnly cookie.
  - [x] Subtask: Rotate refresh token.
  - [x] Subtask: Reject reused or expired refresh tokens.
- [x] Implement `POST /auth/logout`.
  - [x] Subtask: Revoke refresh token.
  - [x] Subtask: Clear refresh cookie.
- [x] Implement `GET /auth/me`.
  - [x] Subtask: Return user profile and memberships.
  - [x] Subtask: Never return password hash or token metadata.

### [x] TDD Requirements
- [x] Write failing test for login with valid credentials.
- [x] Write failing test for login with wrong password.
- [x] Write failing test for disabled user login.
- [x] Write failing test for refresh token rotation.
- [x] Write failing test for logout revoking refresh.
- [x] Write failing test ensuring password hash is never returned.

### [x] Edge Cases
- [x] Email has uppercase letters.
- [x] Email has leading/trailing spaces.
- [x] Password is empty.
- [x] Refresh token is missing.
- [x] Refresh token was already used.
- [x] User is disabled after access token is issued.

## [x] Submodule 03.2 - JWT Strategy and Guards

Purpose: Standardize authentication enforcement across NestJS modules.

Owner Expectations: Protected endpoints are impossible to call without a valid access token.

### [x] Tasks
- [x] Create access token strategy.
  - [x] Subtask: Validate signature, expiration, subject, and token type.
  - [x] Subtask: Attach authenticated actor to request.
  - [x] Subtask: Include user ID and active membership IDs only.
- [x] Create refresh token strategy.
  - [x] Subtask: Validate token fingerprint against database.
  - [x] Subtask: Support token rotation.
- [x] Add global auth conventions.
  - [x] Subtask: Require explicit `@Public()` decorator for public routes.
  - [x] Subtask: Protect all APIs by default where possible.

### [x] TDD Requirements
- [x] Write test that protected route rejects missing token.
- [x] Write test that expired token is rejected.
- [x] Write test that malformed token is rejected.
- [x] Write test that `@Public()` route remains public.

### [x] Edge Cases
- [x] JWT signed with wrong secret.
- [x] JWT has wrong token type.
- [x] User referenced by JWT no longer exists.
- [x] JWT subject is not a valid UUID.

## [x] Submodule 03.3 - RBAC Permission Model

Purpose: Define and enforce roles for organizations, tasks, and AI retrieval.

Owner Expectations: Authorization behavior is predictable and explicitly tested.

### [x] Role Matrix
- [x] Owner
  - [x] Can access all tasks in owned organization and child organizations.
  - [x] Can manage users and roles in owned organization scope.
  - [x] Can query RAG across child organizations.
- [x] Admin
  - [x] Can access all tasks within their organization.
  - [x] Can create, update, assign, and delete tasks in their organization.
  - [x] Can query RAG within their organization.
- [x] Member
  - [x] Can create tasks in their organization.
  - [x] Can view organization-visible tasks and assigned private tasks.
  - [x] Can update tasks they created or are assigned to unless restricted.
- [x] Viewer
  - [x] Can view organization-visible tasks and tasks explicitly assigned to them.
  - [x] Cannot create, update, delete, or use chat mutations.

### [x] Tasks
- [x] Create `PermissionService`.
  - [x] Subtask: Implement `canViewTask`.
  - [x] Subtask: Implement `canCreateTask`.
  - [x] Subtask: Implement `canUpdateTask`.
  - [x] Subtask: Implement `canDeleteTask`.
  - [x] Subtask: Implement `canQueryOrgTasksForAi`.
  - [x] Subtask: Implement `canCreateTaskFromChat`.
- [x] Create `AuthorizationScopeService`.
  - [x] Subtask: Resolve allowed organization IDs for actor.
  - [x] Subtask: Resolve child organization IDs for Owner.
  - [x] Subtask: Resolve task visibility constraints.
  - [x] Subtask: Return a scope object usable by normal queries and vector queries.
- [x] Create reusable guards and decorators.
  - [x] Subtask: Add `@RequireRole()` where route-level role checks are enough.
  - [x] Subtask: Add resource-level checks inside services for task-specific permissions.

### [x] TDD Requirements
- [x] Write permission matrix tests for each role.
- [x] Write cross-org access denial tests.
- [x] Write child-org Owner access tests.
- [x] Write Viewer mutation denial tests.
- [x] Write AI retrieval scope tests that use the same authorization scope as REST APIs.

### [x] Edge Cases
- [x] User belongs to two organizations with different roles.
- [x] User is Owner in parent org and Viewer in child org.
- [x] User has no active memberships.
- [x] Task belongs to child org.
- [x] Task is private and actor is not assignee.
- [x] Task creator leaves organization.

## [x] Submodule 03.4 - Frontend Auth State

Purpose: Keep Angular auth behavior secure and user-friendly.

Owner Expectations: Users can log in, remain logged in through refresh, and are redirected correctly when unauthorized.

### [x] Tasks
- [x] Create auth API client.
  - [x] Subtask: Implement login.
  - [x] Subtask: Implement refresh.
  - [x] Subtask: Implement logout.
  - [x] Subtask: Implement current user fetch.
- [x] Create auth state service.
  - [x] Subtask: Store access token in memory.
  - [x] Subtask: Refresh on page load when refresh cookie exists.
  - [x] Subtask: Clear state on logout or refresh failure.
- [x] Create route guards.
  - [x] Subtask: Redirect unauthenticated users to login.
  - [x] Subtask: Redirect authenticated users away from login.
  - [x] Subtask: Hide or disable UI actions based on role.

### [x] TDD Requirements
- [x] Write component test for login form validation.
- [x] Write route guard test for unauthenticated navigation.
- [x] Write auth state test for refresh failure.
- [x] Write E2E login/logout flow.

### [x] Edge Cases
- [x] User refreshes page during an API request.
- [x] Access token expires while chat stream is open.
- [x] Browser blocks third-party cookies in non-local deployment.
- [x] Multiple tabs log out inconsistently.

## [x] Security Requirements

- [x] Hash passwords with Argon2id or bcrypt.
- [x] Rate-limit login and refresh endpoints.
- [x] Use HttpOnly refresh cookies.
- [x] Use Secure cookies in HTTPS environments.
- [x] Use SameSite cookie policy.
- [x] Add CSRF protection for cookie-authenticated state-changing flows.
- [x] Use generic login error messages.
- [x] Do not return authorization decisions from the LLM.
- [x] Re-check authorization inside services, not only in Angular.

## [ ] Human QA Checklist

- [x] Login as Owner, Admin, Member, and Viewer.
- [ ] Verify each role sees only expected navigation and actions.
- [ ] Try calling protected API without token.
- [ ] Try editing another org's task with a copied task ID.
- [ ] Confirm Viewer cannot create or edit tasks.
- [ ] Confirm Owner can access child org tasks but not unrelated org tasks.

## Other

- [x] Confirm pre-push command are running and working successfully.

---

## AI-Journal

bcryptjs replaced SHA256 in seed. RefreshToken model added to Prisma — family-based rotation, revoke family on reuse.
libs/auth: password.ts (hash/verify), permission.service.ts (pure RBAC matrix — 6 can* methods), authorization-scope.service.ts (resolve memberships + child orgs for owner).
libs/shared/types: token.types.ts (JWT payloads, profile/response DTOs), roles.ts (OrgRole, hasRole, hierarchy helpers).
apps/api/auth: auth.module.ts wires JwtModule, PassportModule, APP_GUARD (global JWT). JwtAccessStrategy validates sig/exp/type. JwtRefreshStrategy reads cookie. JwtAccessGuard skips on @Public(). RolesGuard checks @RequireRole() via AuthorizationScopeService. AuthService: login normalizes email, bcryptjs verify, issues 15m access + 7d refresh, audit logs success/failure. Refresh rotates token, detects reuse via family revocation. Logout revokes + clears cookie. GET /me returns profile+memberships, never hash.
Angular: AuthApi (HttpClient + withCredentials), AuthState (signals — token in memory, refreshOnLoad, hasRole), authInterceptor (Bearer header, 401→refresh+retry once), authGuard/guestGuard, HasRoleDirective, LoginPage component. Routes: /login (guestGuard), / (authGuard → dashboard). APP_INITIALIZER calls refreshOnLoad.
pnpm-workspace.yaml: added packages globs, fixed @task-ai/shared/types workspace resolution. uuid replaced with node:crypto.randomUUID (ESM compat). cookie-parser middleware added to main.ts.
Dependencies added: bcryptjs, @nestjs/jwt, @nestjs/passport, passport-jwt, cookie-parser, @types/express.
Tests: 51 API (17 auth service, 6 auth controller, 4 password, 37 permission, 6 scope, pre-existing schema/repo/seed), 10 web. All pass. Lint clean. Typecheck clean.

Bugfix: SCRAM-SERVER-FIRST-MESSAGE error on login. Root cause: DB had no tables (migrations/seed never ran after fresh Docker volume). pg adapter tried query → SCRAM auth failed because no schema existed. Fix: ran `pnpm db:init` → `pnpm db:generate` → `pnpm db:push -- --accept-data-loss` → `pnpm db:seed`. API restart cleared stale connection error. Lesson: always run full setup sequence after `dev:db` on fresh volume.

Rate limiting: installed @nestjs/throttler. Created ThrottlerBehindProxyGuard (extends ThrottlerGuard, uses X-Forwarded-For). Login throttled to 5 req/min, refresh to 20 req/min. Applied via @UseGuards at AuthController class level.
CSRF protection: double-submit cookie pattern. CsrfGuard validates X-CSRF-Token header matches csrf_token cookie on mutating auth requests (skips GET, HEAD, OPTIONS, login). Login sets non-httpOnly csrf_token cookie. Logout clears it. Angular interceptor reads cookie and attaches header.
E2E tests: Playwright auth.spec.ts (login success, login failure, logout, unauthenticated redirect). API E2E auth.spec.ts (login valid/invalid, me with/without token, logout, CSRF reject/allow).

## Can you test the frontend? Yes. Here's how:

  1. Start the database: pnpm dev:db
  2. Start the API: pnpm dev:api
  3. Start the web app: pnpm dev:web
  4. Open browser — should redirect to /login
  5. Login with seed users:

  ┌─────────────────┬─────────────┬────────┐
  │      Email      │  Password   │  Role  │
  ├─────────────────┼─────────────┼────────┤
  │ owner@acme.com  │ password123 │ Owner  │
  ├─────────────────┼─────────────┼────────┤
  │ admin@acme.com  │ password123 │ Admin  │
  ├─────────────────┼─────────────┼────────┤
  │ member@acme.com │ password123 │ Member │
  ├─────────────────┼─────────────┼────────┤
  │ viewer@acme.com │ password123 │ Viewer │
  └─────────────────┴─────────────┴────────┘

  6. After login → redirects to / dashboard showing user name + Sign Out button

  To test API directly (curl):
  # Login
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"owner@acme.com","password":"password123"}' \
    -c cookies.txt

  # Get profile (use token from login response)
  curl http://localhost:3000/api/auth/me \
    -H "Authorization: Bearer <access-token>"

  # Logout
  curl -X POST http://localhost:3000/api/auth/logout \
    -H "Authorization: Bearer <access-token>" \
    -b cookies.txt