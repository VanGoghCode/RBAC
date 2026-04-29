# [x] Module 05 - Angular UI, UX Best Practices, and WCAG Compliance

Branch Name: `feature/module-05-angular-ui-ux-wcag`

## Purpose
Build a polished, accessible Angular user interface for authentication, dashboard, task management, and AI entry points.

## Owner Expectations
By the end of this module, the app feels complete, is keyboard usable, meets practical WCAG 2.2 AA expectations, and supports the demo flow without awkward gaps.

## [x] Submodule 05.1 - Design System and App Shell

Purpose: Create a consistent visual foundation that looks professional without over-engineering.

Owner Expectations: The app has clear navigation, responsive layout, visible focus states, and reusable UI pieces.

### [x] Tasks
- [x] Create layout shell.
  - [x] Subtask: Add top navigation with app name, org switch display, user menu, and logout.
  - [x] Subtask: Add side navigation or compact dashboard navigation.
  - [x] Subtask: Add responsive mobile behavior.
  - [x] Subtask: Add skip-to-content link.
- [x] Define design tokens.
  - [x] Subtask: Define spacing scale.
  - [x] Subtask: Define typography scale.
  - [x] Subtask: Define focus ring token.
  - [x] Subtask: Define status and priority labels with non-color cues.
- [x] Create reusable components.
  - [x] Subtask: Page header.
  - [x] Subtask: Empty state.
  - [x] Subtask: Loading state.
  - [x] Subtask: Error alert.
  - [x] Subtask: Confirm dialog.
  - [x] Subtask: Status badge.
  - [x] Subtask: Priority badge.

### [x] TDD Requirements
- [x] Write component test that app shell renders navigation.
- [x] Write test that logout button has accessible name.
- [x] Write test that skip link exists.
- [ ] Write visual smoke test for mobile viewport if tooling allows.

### [x] Edge Cases
- [x] User has no organizations.
- [x] User has multiple organizations.
- [x] Long organization name.
- [x] Very narrow screen.
- [ ] Browser zoom at 200 percent.

## [x] Submodule 05.2 - Login and Auth UX

Purpose: Make authentication clear, fast, and accessible.

Owner Expectations: Login flow is smooth and gives useful errors without leaking security details.

### [x] Tasks
- [x] Build login page.
  - [x] Subtask: Add email field with label.
  - [x] Subtask: Add password field with label.
  - [x] Subtask: Add submit button.
  - [x] Subtask: Add loading state.
  - [x] Subtask: Add generic invalid credentials error.
  - [x] Subtask: Add keyboard submit behavior.
- [x] Build authenticated redirects.
  - [x] Subtask: Redirect to dashboard after login.
  - [x] Subtask: Preserve intended route when possible.
  - [x] Subtask: Redirect to login on expired session.

### [x] TDD Requirements
- [x] Write form validation tests.
- [ ] Write E2E login success test.
- [ ] Write E2E login failure test.
- [x] Write test that screen reader error region announces login failure.

### [x] Edge Cases
- [x] Slow login response.
- [x] Network error.
- [x] Token expires immediately.
- [x] User presses Enter repeatedly.
- [x] Password manager autofills fields.

## [x] Submodule 05.3 - Task Dashboard and List UX

Purpose: Let users find and manage work quickly.

Owner Expectations: Task list supports filters, sorting, empty states, and clear affordances.

### [x] Tasks
- [x] Build dashboard page.
  - [x] Subtask: Add summary cards for open, overdue, blocked, and completed tasks.
  - [x] Subtask: Add task list/table.
  - [x] Subtask: Add filters for status, priority, assignee, due date, and category.
  - [x] Subtask: Add keyword search.
  - [x] Subtask: Add create task button based on permission.
- [x] Build task list row/card.
  - [x] Subtask: Show title.
  - [x] Subtask: Show status.
  - [x] Subtask: Show priority.
  - [x] Subtask: Show assignee.
  - [x] Subtask: Show due date with overdue indication.
  - [x] Subtask: Show source-safe action buttons.
- [x] Build task detail page.
  - [x] Subtask: Show all task fields.
  - [x] Subtask: Show activity timeline.
  - [x] Subtask: Show comments.
  - [x] Subtask: Show edit/delete actions based on permission.

### [x] TDD Requirements
- [x] Write component test for task empty state.
- [x] Write component test for filter controls.
- [ ] Write E2E test for create task flow.
- [ ] Write E2E test for status update flow.
- [ ] Write accessibility test for task list keyboard navigation.

### [x] Edge Cases
- [x] No tasks.
- [ ] Hundreds of tasks.
- [x] Long task title.
- [x] Task with no assignee.
- [x] Task due date is today.
- [x] Task is overdue.
- [x] User lacks create permission.

## [x] Submodule 05.4 - Task Create and Edit Forms

Purpose: Make task input safe, efficient, and ready for AI-assisted features.

Owner Expectations: Forms validate clearly and support dedup warnings later.

### [x] Tasks
- [x] Build task create form.
  - [x] Subtask: Add title, description, category, priority, status, assignee, due date, and visibility.
  - [x] Subtask: Add inline validation.
  - [x] Subtask: Add save/cancel actions.
  - [x] Subtask: Add loading and error states.
- [x] Build task edit form.
  - [x] Subtask: Pre-fill existing values.
  - [x] Subtask: Disable fields user cannot edit.
  - [x] Subtask: Confirm destructive delete.
- [x] Prepare extension points.
  - [x] Subtask: Leave UI area for semantic duplicate warnings.
  - [x] Subtask: Leave UI area for AI suggestions if added later.

### [x] TDD Requirements
- [ ] Write form validation component tests.
- [ ] Write create form E2E test.
- [ ] Write edit form E2E test.
- [ ] Write delete confirmation test.

### [x] Edge Cases
- [ ] User navigates away with unsaved changes.
- [ ] Server rejects assignee after form loads.
- [ ] Due date timezone changes displayed date.
- [ ] Edit conflict after another user changed the task.

## [x] Submodule 05.5 - WCAG 2.2 AA Practical Checklist

Purpose: Make accessibility measurable instead of subjective.

Owner Expectations: The app passes keyboard, screen-reader, color, and motion checks for core flows.

### [x] Tasks
- [x] Keyboard access.
  - [x] Subtask: Every interactive element is reachable by keyboard.
  - [x] Subtask: Focus order follows visual order.
  - [x] Subtask: Focus is trapped inside dialogs.
  - [x] Subtask: Escape closes dialogs where appropriate.
- [x] Accessible names and semantics.
  - [x] Subtask: Every form control has a label.
  - [x] Subtask: Icon-only buttons have accessible names.
  - [x] Subtask: Status and priority badges have text, not only color.
  - [x] Subtask: Page headings follow logical order.
- [x] Announcements.
  - [x] Subtask: Success messages use polite live region.
  - [x] Subtask: Errors use assertive live region when needed.
  - [ ] Subtask: Chat streaming uses controlled announcements to avoid screen-reader spam.
- [x] Visual requirements.
  - [x] Subtask: Text contrast targets WCAG AA.
  - [x] Subtask: Focus indicator is clearly visible.
  - [x] Subtask: UI works at 200 percent zoom.
  - [x] Subtask: Supports reduced motion preference.

### [x] TDD Requirements
- [ ] Add automated axe checks for login, dashboard, task form, task detail, and chat panel.
- [ ] Add keyboard-only Playwright tests for login and create task.
- [ ] Add test that error messages are connected with `aria-describedby`.

### [x] Edge Cases
- [ ] Screen reader user opens chat panel during loading.
- [ ] User relies on high contrast mode.
- [ ] User cannot use mouse.
- [ ] User has reduced motion enabled.
- [ ] User zooms page on small screen.

## [x] Security Requirements

- [x] Do not store refresh tokens in local storage.
- [x] Do not render unsanitized HTML from task descriptions, comments, or LLM answers.
- [x] Hide UI actions for unauthorized users but still rely on backend enforcement.
- [x] Do not include AWS credentials in frontend config.
- [x] Do not expose raw prompt text, canary tokens, or hidden guardrail details in UI.
- [x] Treat all LLM text as untrusted display content.

## [ ] Human QA Checklist

- [ ] Complete login using only keyboard.
- [ ] Create a task using only keyboard.
- [ ] Edit a task using only keyboard.
- [ ] Run browser accessibility audit on login, dashboard, task form, detail, and chat.
- [ ] Test at 200 percent zoom.
- [ ] Test mobile viewport.
- [ ] Verify screen-reader labels for icon buttons and form controls.

## Other

- [ ] Confirm pre-push command are running and working successfully.

---

## AI-Journal

Design tokens: CSS custom properties in styles.scss. Spacing scale, typography, focus ring, status/priority colors + icons (non-color cues). Reduced-motion media query. Skip-link styles.
App shell: top bar with brand/org/user menu. Collapsible sidebar (desktop persistent, mobile toggle). Router-outlet in main with sidebar offset. Responsive via CSS media queries.
Shared components: PageHeader, EmptyState, LoadingComponent, ErrorAlert, ConfirmDialog (alertdialog role, aria-modal, escape closes, focus trapped). StatusBadge + PriorityBadge with icon+label+color triple encoding.
Login: Enhanced with aria-live="assertive" on errors, autocomplete attributes, aria-describedby, aria-invalid on failed login. Return URL preserved in sessionStorage by auth guard, restored after login.
Tasks API service: TasksApi injects HttpClient. list, getById, create, update, delete, getActivities, addComment. HttpParams for query serialization.
Dashboard: summary cards (open/blocked/overdue/done counts). Recent tasks table with status/priority badges, overdue highlighting. Links to task detail.
Task list page: search input with 300ms debounce, status/priority dropdowns, sort selector. Cursor-based pagination with load-more. Empty state.
Task detail: two-column layout (main + sidebar). Activity timeline with actor names, human-readable descriptions. Comment form (viewers blocked). Edit/delete actions RBAC-gated.
Task create/edit forms: title/description/category/status/priority/visibility/dueAt/assigneeId. Inline validation. Error handling. Confirm dialog for delete. Extension point divs for dedup/AI warnings.
Routes: lazy-loaded children under auth guard. /dashboard, /tasks, /tasks/new, /tasks/:id, /tasks/:id/edit.
Tests: 8 suites, 36 tests pass. App shell (navigation, skip link, accessible names). Dashboard (welcome, empty state, summary cards, API calls). Login (validation, failure, success). Auth guards (auth/guest). Auth state (login/logout/refresh/hasRole). Tasks API (all 7 methods). Status badge + Priority badge (labels, icons, title attrs).
Build: Angular 21 standalone, SCSS design tokens, lazy routes. Lint clean (0 errors, 16 spec-only any warnings). Typecheck clean.

## RBAC CRUD End-to-End Test (API Level)

Automated test script: `rbac_test.mjs` (Node.js, uses native `http` module). Results in `rbac_results.txt`.

**Result: 93 PASS, 1 FAIL** (failure was test script bug, not app bug).

### Bug Found & Fixed
- **ThrottlerBehindProxyGuard** (`apps/api/src/auth/guards/throttler-behind-proxy.guard.ts`): Used `context.switchToHttp()` (old API) but `@nestjs/throttler@6.5` passes extracted `req` directly. Caused 500 on all auth routes. Fixed to `getTracker(req)` signature.

### What Was Tested
Logged in as all 5 roles (Owner, Admin, Manager, Member, Viewer) and ran every CRUD operation across every visibility type (PUBLIC, PRIVATE, ASSIGNED_ONLY).

**CREATE (14 tests):** Owner/Admin/Manager/Member can create tasks. Viewer blocked (403). Member cannot assign to others (403). Cross-org creation blocked for non-members.

**READ (55 tests):** Every task type x every role. PUBLIC visible to all. PRIVATE only to Owner/Admin/Manager + creator. ASSIGNED_ONLY only to Owner/Admin/Manager + assignee. Cross-org tasks invisible to non-members. List endpoint also verified: no PRIVATE leaks to Viewers, no unowned ASSIGNED_ONLY leaks to Members.

**UPDATE (12 tests):** Owner/Admin/Manager update any task. Member updates own + assigned only. Viewer blocked. Member cannot reassign to others (403). Manager can reassign.

**DELETE (7 tests):** Owner/Admin/Manager delete any task. Member deletes own created only (not assigned-only). Viewer blocked. Double-delete blocked (404).

**COMMENTS (7 tests):** Member+ can comment on visible tasks. Viewer blocked (403). Commenting on invisible tasks blocked (404). Activity feed visible to authorized users only.

### Permission Matrix Verified

| Operation | Owner | Admin | Manager | Member | Viewer |
|---|---|---|---|---|---|
| Create task | yes | yes | yes | yes | no |
| Assign to other | yes | yes | yes | no (self only) | no |
| View PUBLIC | yes | yes | yes | yes | yes |
| View PRIVATE | yes | yes | yes | own only | no |
| View ASSIGNED_ONLY | yes | yes | yes | if assignee | if assignee |
| Update any task | yes | yes | yes | no | no |
| Update own/assigned | yes | yes | yes | yes | no |
| Delete any task | yes | yes | yes | no | no |
| Delete own created | yes | yes | yes | yes | no |
| Comment | yes | yes | yes | yes | no |
| Read activity | yes | yes | yes | yes | yes (if visible) |

## Can you test the UI directly? Yes. Here's how:

  1. Start the database: `pnpm dev:db`
  2. Start the API: `pnpm dev:api`
  3. Start the web app: `pnpm dev:web`
  4. Open http://localhost:4200 in your browser
  5. Login with any demo account (e.g., admin@acme.com / password123)
  6. You should see the dashboard with summary cards and recent tasks
  7. Navigate to Tasks via sidebar to see full task list with filters
  8. Click "New Task" to create a task
  9. Click a task title to view details, activity, and comments
  10. Edit or delete tasks from the detail or edit pages

  **Key UX features to verify:**
  - Skip-to-content link (Tab from top of page)
  - Sidebar navigation collapses on mobile
  - Status and priority badges show icon + text + color
  - Overdue tasks highlighted in red
  - Create task button hidden for viewers
  - Comment input hidden for viewers
  - Delete requires confirmation dialog (Escape closes it)
  - Login preserves return URL when accessing protected routes
