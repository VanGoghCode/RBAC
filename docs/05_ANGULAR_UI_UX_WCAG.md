# [ ] Module 05 - Angular UI, UX Best Practices, and WCAG Compliance

Branch Name: `feature/module-05-angular-ui-ux-wcag`

## Purpose
Build a polished, accessible Angular user interface for authentication, dashboard, task management, and AI entry points.

## Owner Expectations
By the end of this module, the app feels complete, is keyboard usable, meets practical WCAG 2.2 AA expectations, and supports the demo flow without awkward gaps.

## [ ] Submodule 05.1 - Design System and App Shell

Purpose: Create a consistent visual foundation that looks professional without over-engineering.

Owner Expectations: The app has clear navigation, responsive layout, visible focus states, and reusable UI pieces.

### [ ] Tasks
- [ ] Create layout shell.
  - [ ] Subtask: Add top navigation with app name, org switch display, user menu, and logout.
  - [ ] Subtask: Add side navigation or compact dashboard navigation.
  - [ ] Subtask: Add responsive mobile behavior.
  - [ ] Subtask: Add skip-to-content link.
- [ ] Define design tokens.
  - [ ] Subtask: Define spacing scale.
  - [ ] Subtask: Define typography scale.
  - [ ] Subtask: Define focus ring token.
  - [ ] Subtask: Define status and priority labels with non-color cues.
- [ ] Create reusable components.
  - [ ] Subtask: Page header.
  - [ ] Subtask: Empty state.
  - [ ] Subtask: Loading state.
  - [ ] Subtask: Error alert.
  - [ ] Subtask: Confirm dialog.
  - [ ] Subtask: Status badge.
  - [ ] Subtask: Priority badge.

### [ ] TDD Requirements
- [ ] Write component test that app shell renders navigation.
- [ ] Write test that logout button has accessible name.
- [ ] Write test that skip link exists.
- [ ] Write visual smoke test for mobile viewport if tooling allows.

### [ ] Edge Cases
- [ ] User has no organizations.
- [ ] User has multiple organizations.
- [ ] Long organization name.
- [ ] Very narrow screen.
- [ ] Browser zoom at 200 percent.

## [ ] Submodule 05.2 - Login and Auth UX

Purpose: Make authentication clear, fast, and accessible.

Owner Expectations: Login flow is smooth and gives useful errors without leaking security details.

### [ ] Tasks
- [ ] Build login page.
  - [ ] Subtask: Add email field with label.
  - [ ] Subtask: Add password field with label.
  - [ ] Subtask: Add submit button.
  - [ ] Subtask: Add loading state.
  - [ ] Subtask: Add generic invalid credentials error.
  - [ ] Subtask: Add keyboard submit behavior.
- [ ] Build authenticated redirects.
  - [ ] Subtask: Redirect to dashboard after login.
  - [ ] Subtask: Preserve intended route when possible.
  - [ ] Subtask: Redirect to login on expired session.

### [ ] TDD Requirements
- [ ] Write form validation tests.
- [ ] Write E2E login success test.
- [ ] Write E2E login failure test.
- [ ] Write test that screen reader error region announces login failure.

### [ ] Edge Cases
- [ ] Slow login response.
- [ ] Network error.
- [ ] Token expires immediately.
- [ ] User presses Enter repeatedly.
- [ ] Password manager autofills fields.

## [ ] Submodule 05.3 - Task Dashboard and List UX

Purpose: Let users find and manage work quickly.

Owner Expectations: Task list supports filters, sorting, empty states, and clear affordances.

### [ ] Tasks
- [ ] Build dashboard page.
  - [ ] Subtask: Add summary cards for open, overdue, blocked, and completed tasks.
  - [ ] Subtask: Add task list/table.
  - [ ] Subtask: Add filters for status, priority, assignee, due date, and category.
  - [ ] Subtask: Add keyword search.
  - [ ] Subtask: Add create task button based on permission.
- [ ] Build task list row/card.
  - [ ] Subtask: Show title.
  - [ ] Subtask: Show status.
  - [ ] Subtask: Show priority.
  - [ ] Subtask: Show assignee.
  - [ ] Subtask: Show due date with overdue indication.
  - [ ] Subtask: Show source-safe action buttons.
- [ ] Build task detail page.
  - [ ] Subtask: Show all task fields.
  - [ ] Subtask: Show activity timeline.
  - [ ] Subtask: Show comments.
  - [ ] Subtask: Show edit/delete actions based on permission.

### [ ] TDD Requirements
- [ ] Write component test for task empty state.
- [ ] Write component test for filter controls.
- [ ] Write E2E test for create task flow.
- [ ] Write E2E test for status update flow.
- [ ] Write accessibility test for task list keyboard navigation.

### [ ] Edge Cases
- [ ] No tasks.
- [ ] Hundreds of tasks.
- [ ] Long task title.
- [ ] Task with no assignee.
- [ ] Task due date is today.
- [ ] Task is overdue.
- [ ] User lacks create permission.

## [ ] Submodule 05.4 - Task Create and Edit Forms

Purpose: Make task input safe, efficient, and ready for AI-assisted features.

Owner Expectations: Forms validate clearly and support dedup warnings later.

### [ ] Tasks
- [ ] Build task create form.
  - [ ] Subtask: Add title, description, category, priority, status, assignee, due date, and visibility.
  - [ ] Subtask: Add inline validation.
  - [ ] Subtask: Add save/cancel actions.
  - [ ] Subtask: Add loading and error states.
- [ ] Build task edit form.
  - [ ] Subtask: Pre-fill existing values.
  - [ ] Subtask: Disable fields user cannot edit.
  - [ ] Subtask: Confirm destructive delete.
- [ ] Prepare extension points.
  - [ ] Subtask: Leave UI area for semantic duplicate warnings.
  - [ ] Subtask: Leave UI area for AI suggestions if added later.

### [ ] TDD Requirements
- [ ] Write form validation component tests.
- [ ] Write create form E2E test.
- [ ] Write edit form E2E test.
- [ ] Write delete confirmation test.

### [ ] Edge Cases
- [ ] User navigates away with unsaved changes.
- [ ] Server rejects assignee after form loads.
- [ ] Due date timezone changes displayed date.
- [ ] Edit conflict after another user changed the task.

## [ ] Submodule 05.5 - WCAG 2.2 AA Practical Checklist

Purpose: Make accessibility measurable instead of subjective.

Owner Expectations: The app passes keyboard, screen-reader, color, and motion checks for core flows.

### [ ] Tasks
- [ ] Keyboard access.
  - [ ] Subtask: Every interactive element is reachable by keyboard.
  - [ ] Subtask: Focus order follows visual order.
  - [ ] Subtask: Focus is trapped inside dialogs.
  - [ ] Subtask: Escape closes dialogs where appropriate.
- [ ] Accessible names and semantics.
  - [ ] Subtask: Every form control has a label.
  - [ ] Subtask: Icon-only buttons have accessible names.
  - [ ] Subtask: Status and priority badges have text, not only color.
  - [ ] Subtask: Page headings follow logical order.
- [ ] Announcements.
  - [ ] Subtask: Success messages use polite live region.
  - [ ] Subtask: Errors use assertive live region when needed.
  - [ ] Subtask: Chat streaming uses controlled announcements to avoid screen-reader spam.
- [ ] Visual requirements.
  - [ ] Subtask: Text contrast targets WCAG AA.
  - [ ] Subtask: Focus indicator is clearly visible.
  - [ ] Subtask: UI works at 200 percent zoom.
  - [ ] Subtask: Supports reduced motion preference.

### [ ] TDD Requirements
- [ ] Add automated axe checks for login, dashboard, task form, task detail, and chat panel.
- [ ] Add keyboard-only Playwright tests for login and create task.
- [ ] Add test that error messages are connected with `aria-describedby`.

### [ ] Edge Cases
- [ ] Screen reader user opens chat panel during loading.
- [ ] User relies on high contrast mode.
- [ ] User cannot use mouse.
- [ ] User has reduced motion enabled.
- [ ] User zooms page on small screen.

## [ ] Security Requirements

- [ ] Do not store refresh tokens in local storage.
- [ ] Do not render unsanitized HTML from task descriptions, comments, or LLM answers.
- [ ] Hide UI actions for unauthorized users but still rely on backend enforcement.
- [ ] Do not include AWS credentials in frontend config.
- [ ] Do not expose raw prompt text, canary tokens, or hidden guardrail details in UI.
- [ ] Treat all LLM text as untrusted display content.

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