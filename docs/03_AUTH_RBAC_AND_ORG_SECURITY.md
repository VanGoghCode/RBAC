# [ ] Module 03 - Authentication, RBAC, Organization Access, and API Security Base

Branch Name: `feature/module-03-auth-rbac`

## Purpose
Implement secure authentication and authorization for all base and AI features.

## Owner Expectations
By the end of this module, users can authenticate, receive JWTs, access only authorized organizations and tasks, and all protected APIs reject unauthorized or cross-org access.

## [ ] Submodule 03.1 - Authentication APIs

Purpose: Provide secure login, refresh, logout, and current-user flows.

Owner Expectations: Auth is simple enough for the OA but secure enough to withstand review.

### [ ] Tasks
- [ ] Implement `POST /auth/login`.
  - [ ] Subtask: Validate email and password.
  - [ ] Subtask: Normalize email before lookup.
  - [ ] Subtask: Compare password hash safely.
  - [ ] Subtask: Return access token and set refresh cookie.
  - [ ] Subtask: Write audit log for success and failure.
- [ ] Implement `POST /auth/refresh`.
  - [ ] Subtask: Validate refresh token from HttpOnly cookie.
  - [ ] Subtask: Rotate refresh token.
  - [ ] Subtask: Reject reused or expired refresh tokens.
- [ ] Implement `POST /auth/logout`.
  - [ ] Subtask: Revoke refresh token.
  - [ ] Subtask: Clear refresh cookie.
- [ ] Implement `GET /auth/me`.
  - [ ] Subtask: Return user profile and memberships.
  - [ ] Subtask: Never return password hash or token metadata.

### [ ] TDD Requirements
- [ ] Write failing test for login with valid credentials.
- [ ] Write failing test for login with wrong password.
- [ ] Write failing test for disabled user login.
- [ ] Write failing test for refresh token rotation.
- [ ] Write failing test for logout revoking refresh.
- [ ] Write failing test ensuring password hash is never returned.

### [ ] Edge Cases
- [ ] Email has uppercase letters.
- [ ] Email has leading/trailing spaces.
- [ ] Password is empty.
- [ ] Refresh token is missing.
- [ ] Refresh token was already used.
- [ ] User is disabled after access token is issued.

## [ ] Submodule 03.2 - JWT Strategy and Guards

Purpose: Standardize authentication enforcement across NestJS modules.

Owner Expectations: Protected endpoints are impossible to call without a valid access token.

### [ ] Tasks
- [ ] Create access token strategy.
  - [ ] Subtask: Validate signature, expiration, subject, and token type.
  - [ ] Subtask: Attach authenticated actor to request.
  - [ ] Subtask: Include user ID and active membership IDs only.
- [ ] Create refresh token strategy.
  - [ ] Subtask: Validate token fingerprint against database.
  - [ ] Subtask: Support token rotation.
- [ ] Add global auth conventions.
  - [ ] Subtask: Require explicit `@Public()` decorator for public routes.
  - [ ] Subtask: Protect all APIs by default where possible.

### [ ] TDD Requirements
- [ ] Write test that protected route rejects missing token.
- [ ] Write test that expired token is rejected.
- [ ] Write test that malformed token is rejected.
- [ ] Write test that `@Public()` route remains public.

### [ ] Edge Cases
- [ ] JWT signed with wrong secret.
- [ ] JWT has wrong token type.
- [ ] User referenced by JWT no longer exists.
- [ ] JWT subject is not a valid UUID.

## [ ] Submodule 03.3 - RBAC Permission Model

Purpose: Define and enforce roles for organizations, tasks, and AI retrieval.

Owner Expectations: Authorization behavior is predictable and explicitly tested.

### [ ] Role Matrix
- [ ] Owner
  - [ ] Can access all tasks in owned organization and child organizations.
  - [ ] Can manage users and roles in owned organization scope.
  - [ ] Can query RAG across child organizations.
- [ ] Admin
  - [ ] Can access all tasks within their organization.
  - [ ] Can create, update, assign, and delete tasks in their organization.
  - [ ] Can query RAG within their organization.
- [ ] Member
  - [ ] Can create tasks in their organization.
  - [ ] Can view organization-visible tasks and assigned private tasks.
  - [ ] Can update tasks they created or are assigned to unless restricted.
- [ ] Viewer
  - [ ] Can view organization-visible tasks and tasks explicitly assigned to them.
  - [ ] Cannot create, update, delete, or use chat mutations.

### [ ] Tasks
- [ ] Create `PermissionService`.
  - [ ] Subtask: Implement `canViewTask`.
  - [ ] Subtask: Implement `canCreateTask`.
  - [ ] Subtask: Implement `canUpdateTask`.
  - [ ] Subtask: Implement `canDeleteTask`.
  - [ ] Subtask: Implement `canQueryOrgTasksForAi`.
  - [ ] Subtask: Implement `canCreateTaskFromChat`.
- [ ] Create `AuthorizationScopeService`.
  - [ ] Subtask: Resolve allowed organization IDs for actor.
  - [ ] Subtask: Resolve child organization IDs for Owner.
  - [ ] Subtask: Resolve task visibility constraints.
  - [ ] Subtask: Return a scope object usable by normal queries and vector queries.
- [ ] Create reusable guards and decorators.
  - [ ] Subtask: Add `@RequireRole()` where route-level role checks are enough.
  - [ ] Subtask: Add resource-level checks inside services for task-specific permissions.

### [ ] TDD Requirements
- [ ] Write permission matrix tests for each role.
- [ ] Write cross-org access denial tests.
- [ ] Write child-org Owner access tests.
- [ ] Write Viewer mutation denial tests.
- [ ] Write AI retrieval scope tests that use the same authorization scope as REST APIs.

### [ ] Edge Cases
- [ ] User belongs to two organizations with different roles.
- [ ] User is Owner in parent org and Viewer in child org.
- [ ] User has no active memberships.
- [ ] Task belongs to child org.
- [ ] Task is private and actor is not assignee.
- [ ] Task creator leaves organization.

## [ ] Submodule 03.4 - Frontend Auth State

Purpose: Keep Angular auth behavior secure and user-friendly.

Owner Expectations: Users can log in, remain logged in through refresh, and are redirected correctly when unauthorized.

### [ ] Tasks
- [ ] Create auth API client.
  - [ ] Subtask: Implement login.
  - [ ] Subtask: Implement refresh.
  - [ ] Subtask: Implement logout.
  - [ ] Subtask: Implement current user fetch.
- [ ] Create auth state service.
  - [ ] Subtask: Store access token in memory.
  - [ ] Subtask: Refresh on page load when refresh cookie exists.
  - [ ] Subtask: Clear state on logout or refresh failure.
- [ ] Create route guards.
  - [ ] Subtask: Redirect unauthenticated users to login.
  - [ ] Subtask: Redirect authenticated users away from login.
  - [ ] Subtask: Hide or disable UI actions based on role.

### [ ] TDD Requirements
- [ ] Write component test for login form validation.
- [ ] Write route guard test for unauthenticated navigation.
- [ ] Write auth state test for refresh failure.
- [ ] Write E2E login/logout flow.

### [ ] Edge Cases
- [ ] User refreshes page during an API request.
- [ ] Access token expires while chat stream is open.
- [ ] Browser blocks third-party cookies in non-local deployment.
- [ ] Multiple tabs log out inconsistently.

## [ ] Security Requirements

- [ ] Hash passwords with Argon2id or bcrypt.
- [ ] Rate-limit login and refresh endpoints.
- [ ] Use HttpOnly refresh cookies.
- [ ] Use Secure cookies in HTTPS environments.
- [ ] Use SameSite cookie policy.
- [ ] Add CSRF protection for cookie-authenticated state-changing flows.
- [ ] Use generic login error messages.
- [ ] Do not return authorization decisions from the LLM.
- [ ] Re-check authorization inside services, not only in Angular.

## [ ] Human QA Checklist

- [ ] Login as Owner, Admin, Member, and Viewer.
- [ ] Verify each role sees only expected navigation and actions.
- [ ] Try calling protected API without token.
- [ ] Try editing another org's task with a copied task ID.
- [ ] Confirm Viewer cannot create or edit tasks.
- [ ] Confirm Owner can access child org tasks but not unrelated org tasks.
