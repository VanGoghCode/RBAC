/**
 * Idempotent seed script with comprehensive, realistic data.
 * Uses upsert to ensure re-running is safe.
 * Run: pnpm db:seed
 *
 * All dates anchored to "today" in MST (America/Phoenix, UTC-7).
 * today = 2026-04-30 12:00:00 MST
 */

import { PrismaClient, TaskStatus, TaskPriority, TaskVisibility, ActivityType, DedupDecision } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://taskai:taskai@localhost:5432/taskai',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}

// ─── Date Helpers (MST / America/Phoenix, no DST) ──────────────────
// Anchor: today = 2026-04-30 12:00:00 MST (UTC-7)
const NOW = new Date('2026-04-30T19:00:00.000Z'); // 12:00 PM MST = 19:00 UTC

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  // ─── Wipe existing tasks + related data for clean reseed ──────
  console.log('Cleaning existing data...');
  await prisma.dedupEvent.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.taskEmbedding.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.llmInteractionLog.deleteMany();
  await prisma.task.deleteMany();

  // ─── Organizations ───────────────────────────────────────────
  const acmeCorp = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: { name: 'Acme Corp', slug: 'acme-corp' },
  });

  const acmeEng = await prisma.organization.upsert({
    where: { slug: 'acme-engineering' },
    update: {},
    create: { name: 'Acme Engineering', slug: 'acme-engineering', parentOrgId: acmeCorp.id },
  });

  const acmeProduct = await prisma.organization.upsert({
    where: { slug: 'acme-product' },
    update: {},
    create: { name: 'Acme Product', slug: 'acme-product', parentOrgId: acmeCorp.id },
  });

  // ─── Users ───────────────────────────────────────────────────
  const alice = await prisma.user.upsert({
    where: { email: 'owner@acme.com' },
    update: { passwordHash: hashPassword('password123') },
    create: { email: 'owner@acme.com', name: 'Alice Owner', passwordHash: hashPassword('password123') },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: { passwordHash: hashPassword('password123') },
    create: { email: 'admin@acme.com', name: 'Bob Admin', passwordHash: hashPassword('password123') },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'viewer@acme.com' },
    update: { passwordHash: hashPassword('password123') },
    create: { email: 'viewer@acme.com', name: 'Carol Viewer', passwordHash: hashPassword('password123') },
  });

  const dave = await prisma.user.upsert({
    where: { email: 'member@acme.com' },
    update: { passwordHash: hashPassword('password123') },
    create: { email: 'member@acme.com', name: 'Dave Member', passwordHash: hashPassword('password123') },
  });

  const eve = await prisma.user.upsert({
    where: { email: 'manager@acme.com' },
    update: { passwordHash: hashPassword('password123') },
    create: { email: 'manager@acme.com', name: 'Eve Manager', passwordHash: hashPassword('password123') },
  });

  // ─── Memberships ─────────────────────────────────────────────
  const membershipData = [
    { userId: alice.id, orgId: acmeCorp.id, role: 'owner' },
    { userId: alice.id, orgId: acmeEng.id, role: 'owner' },
    { userId: alice.id, orgId: acmeProduct.id, role: 'owner' },
    { userId: bob.id, orgId: acmeEng.id, role: 'admin' },
    { userId: bob.id, orgId: acmeProduct.id, role: 'admin' },
    { userId: eve.id, orgId: acmeEng.id, role: 'manager' },
    { userId: eve.id, orgId: acmeProduct.id, role: 'manager' },
    { userId: carol.id, orgId: acmeEng.id, role: 'viewer' },
    { userId: carol.id, orgId: acmeProduct.id, role: 'viewer' },
    { userId: dave.id, orgId: acmeEng.id, role: 'member' },
    { userId: dave.id, orgId: acmeProduct.id, role: 'member' },
  ];

  for (const m of membershipData) {
    await prisma.orgMembership.upsert({
      where: { userId_orgId: { userId: m.userId, orgId: m.orgId } },
      update: {},
      create: m,
    });
  }

  // ─── Tasks ───────────────────────────────────────────────────
  // Good distribution: 5 TODO, 5 IN_PROGRESS, 3 IN_REVIEW, 2 BLOCKED, 5 DONE
  // Multiple overdue, upcoming, recently completed
  // Spread across Acme Engineering and Acme Product orgs
  // Various assignees, priorities, categories

  const tasks = [
    // ═══════════════════════════════════════════════════════════
    // ACME ENGINEERING TASKS
    // ═══════════════════════════════════════════════════════════

    // --- TODO ---
    {
      title: 'Refactor API to use DTOs',
      description: 'Migrate all controllers to use validated DTOs instead of raw body params. Add class-validator decorators and create shared response types.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: dave.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      category: 'Backend',
      tags: ['api', 'refactor', 'validation'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(5),
      dueAt: daysFromNow(14),
    },
    {
      title: 'Implement OAuth2 auth flow',
      description: 'Add SSO support with Google and GitHub OAuth2 providers. Handle token exchange, user provisioning, and session management.',
      orgId: acmeEng.id,
      createdById: dave.id,
      assigneeId: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      category: 'Auth',
      tags: ['auth', 'sso'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(3),
      dueAt: daysFromNow(10),
    },
    {
      title: 'Private task for RBAC leak test',
      description: 'This task is PRIVATE — only the creator (Bob Admin) and org admins/owners should see it.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      category: 'Testing',
      tags: ['testing', 'rbac'],
      visibility: TaskVisibility.PRIVATE,
      createdAt: daysAgo(2),
    },
    {
      title: 'Assigned-only task for RBAC test',
      description: 'This task is ASSIGNED_ONLY — only Dave Member (assignee) and org admins/owners should see it.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: dave.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      category: 'Testing',
      tags: ['testing', 'rbac'],
      visibility: TaskVisibility.ASSIGNED_ONLY,
      createdAt: daysAgo(1),
    },
    {
      title: 'Set up CI/CD pipeline for staging',
      description: 'Configure GitHub Actions for automated testing, linting, and deployment to the staging environment on push to develop branch.',
      orgId: acmeEng.id,
      createdById: eve.id,
      assigneeId: dave.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      category: 'DevOps',
      tags: ['ci-cd', 'github-actions', 'staging'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(4),
      dueAt: daysFromNow(3),
    },

    // --- IN_PROGRESS ---
    {
      title: 'Implement OAuth2 authentication',
      description: 'Add Google and GitHub OAuth2 providers for SSO. Includes callback handling, token refresh, and user profile sync.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: dave.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      category: 'Auth',
      tags: ['auth', 'sso', 'oauth'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(10),
      dueAt: daysFromNow(7),
    },
    {
      title: 'Redesign user profile page',
      description: 'Update the profile page with avatar upload, timezone selector, notification preferences, and account security settings.',
      orgId: acmeEng.id,
      createdById: eve.id,
      assigneeId: dave.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      category: 'Frontend',
      tags: ['ui', 'profile', 'settings'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(8),
      dueAt: daysAgo(2), // OVERDUE by 2 days
    },
    {
      title: 'Database query optimization',
      description: 'Profile and optimize slow queries on the task list endpoint. Add composite indexes and consider query plan analysis.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: eve.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      category: 'Backend',
      tags: ['database', 'performance', 'optimization'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(12),
      dueAt: daysAgo(5), // OVERDUE by 5 days
    },
    {
      title: 'Add WebSocket real-time updates',
      description: 'Implement WebSocket connections for real-time task status changes, new comments, and assignment notifications.',
      orgId: acmeEng.id,
      createdById: eve.id,
      assigneeId: dave.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      category: 'Backend',
      tags: ['websocket', 'real-time', 'notifications'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(6),
      dueAt: daysAgo(1), // OVERDUE by 1 day
    },
    {
      title: 'Write E2E tests for task CRUD',
      description: 'Create Playwright end-to-end tests covering create, read, update, delete, and permission scenarios for tasks.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: carol.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.LOW,
      category: 'Testing',
      tags: ['testing', 'e2e', 'playwright'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(3),
      dueAt: daysFromNow(5),
    },

    // --- IN_REVIEW ---
    {
      title: 'Review API error handling',
      description: 'Standardize error responses across all endpoints. Implement consistent error codes, messages, and HTTP status mapping.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: carol.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      category: 'Backend',
      tags: ['api', 'error-handling'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(14),
      dueAt: daysFromNow(2),
    },
    {
      title: 'Accessibility audit fixes',
      description: 'Fix all WCAG 2.1 AA violations found in the accessibility audit. Focus on keyboard navigation, ARIA labels, and color contrast.',
      orgId: acmeEng.id,
      createdById: alice.id,
      assigneeId: dave.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      category: 'Frontend',
      tags: ['accessibility', 'wcag', 'a11y'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(7),
      dueAt: daysFromNow(1),
    },
    {
      title: 'Rate limiting middleware',
      description: 'Implement rate limiting for API endpoints. Configure per-route limits, IP-based throttling, and proper 429 responses.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: eve.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      category: 'Security',
      tags: ['security', 'rate-limit', 'middleware'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(9),
      dueAt: daysAgo(1), // OVERDUE by 1 day (still in review)
    },

    // --- BLOCKED ---
    {
      title: 'Fix XSS vulnerability in comments',
      description: 'Sanitize all user-generated content in task comments and descriptions. Use DOMPurify on frontend and server-side validation.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: bob.id,
      status: TaskStatus.BLOCKED,
      priority: TaskPriority.CRITICAL,
      category: 'Security',
      tags: ['security', 'xss', 'bug'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(15),
      dueAt: daysAgo(3), // OVERDUE by 3 days and blocked
    },
    {
      title: 'Migrate to PostgreSQL 16',
      description: 'Upgrade database from PostgreSQL 15 to 16. Requires infrastructure team approval and maintenance window scheduling.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: eve.id,
      status: TaskStatus.BLOCKED,
      priority: TaskPriority.HIGH,
      category: 'Infrastructure',
      tags: ['database', 'postgresql', 'migration'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(20),
      dueAt: daysFromNow(5),
    },

    // --- DONE ---
    {
      title: 'Set up Prisma ORM',
      description: 'Configure Prisma with PostgreSQL adapter. Define schema, run initial migration, and verify connection pooling.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: dave.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      category: 'Backend',
      tags: ['database', 'orm', 'prisma'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(30),
      dueAt: daysAgo(22),
      completedAt: daysAgo(23),
    },
    {
      title: 'Implement user registration flow',
      description: 'Build email-based registration with verification, password strength requirements, and rate limiting on signup endpoint.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: dave.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      category: 'Auth',
      tags: ['auth', 'registration', 'email'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(25),
      dueAt: daysAgo(18),
      completedAt: daysAgo(19),
    },
    {
      title: 'Design task card component',
      description: 'Create reusable task card component showing title, status badge, priority indicator, assignee avatar, and due date.',
      orgId: acmeEng.id,
      createdById: eve.id,
      assigneeId: dave.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      category: 'Frontend',
      tags: ['ui', 'components', 'task-card'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(20),
      dueAt: daysAgo(15),
      completedAt: daysAgo(16),
    },
    {
      title: 'Add RBAC role-based access control',
      description: 'Implement organization-scoped roles (owner, admin, manager, member, viewer) with permission checks on all endpoints.',
      orgId: acmeEng.id,
      createdById: alice.id,
      assigneeId: bob.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.CRITICAL,
      category: 'Security',
      tags: ['security', 'rbac', 'authorization'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(35),
      dueAt: daysAgo(28),
      completedAt: daysAgo(27),
    },
    {
      title: 'Write unit tests for auth service',
      description: 'Cover login, logout, refresh token rotation, and session management with comprehensive unit tests.',
      orgId: acmeEng.id,
      createdById: bob.id,
      assigneeId: eve.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      category: 'Testing',
      tags: ['testing', 'unit-tests', 'auth'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(18),
      dueAt: daysAgo(12),
      completedAt: daysAgo(13),
    },

    // ═══════════════════════════════════════════════════════════
    // ACME PRODUCT TASKS
    // ═══════════════════════════════════════════════════════════

    // --- TODO ---
    {
      title: 'Build analytics dashboard',
      description: 'Create real-time analytics dashboard with charts for task completion rates, team velocity, and overdue trends.',
      orgId: acmeProduct.id,
      createdById: alice.id,
      assigneeId: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      category: 'Frontend',
      tags: ['dashboard', 'charts', 'analytics'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(7),
      dueAt: daysFromNow(21),
    },
    {
      title: 'User feedback survey module',
      description: 'Build in-app feedback collection with star ratings, text comments, and export to CSV for analysis.',
      orgId: acmeProduct.id,
      createdById: alice.id,
      assigneeId: dave.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      category: 'Feature',
      tags: ['feedback', 'survey', 'ux'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(4),
      dueAt: daysFromNow(12),
    },
    {
      title: 'Product roadmap Q3 planning',
      description: 'Draft Q3 roadmap with feature prioritization based on user research, competitive analysis, and engineering capacity.',
      orgId: acmeProduct.id,
      createdById: alice.id,
      assigneeId: eve.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      category: 'Planning',
      tags: ['roadmap', 'planning', 'q3'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(2),
      dueAt: daysFromNow(5),
    },

    // --- IN_PROGRESS ---
    {
      title: 'Notification preferences page',
      description: 'Allow users to configure email, in-app, and push notification preferences per organization and event type.',
      orgId: acmeProduct.id,
      createdById: eve.id,
      assigneeId: dave.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      category: 'Feature',
      tags: ['notifications', 'settings', 'preferences'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(6),
      dueAt: daysAgo(3), // OVERDUE by 3 days
    },
    {
      title: 'Email template system',
      description: 'Design and implement transactional email templates for task assignments, due date reminders, and weekly summaries.',
      orgId: acmeProduct.id,
      createdById: alice.id,
      assigneeId: dave.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      category: 'Backend',
      tags: ['email', 'templates', 'notifications'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(9),
      dueAt: daysFromNow(2),
    },

    // --- IN_REVIEW ---
    {
      title: 'Search functionality with filters',
      description: 'Implement full-text search with filters for status, priority, assignee, category, and date range across tasks.',
      orgId: acmeProduct.id,
      createdById: bob.id,
      assigneeId: eve.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      category: 'Backend',
      tags: ['search', 'filters', 'full-text'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(11),
      dueAt: daysAgo(2), // OVERDUE by 2 days (in review)
    },

    // --- BLOCKED ---
    {
      title: 'Mobile responsive redesign',
      description: 'Redesign all pages for mobile-first responsive layout. Blocked on design team delivering final mockups.',
      orgId: acmeProduct.id,
      createdById: alice.id,
      assigneeId: null,
      status: TaskStatus.BLOCKED,
      priority: TaskPriority.MEDIUM,
      category: 'Frontend',
      tags: ['mobile', 'responsive', 'design'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(14),
      dueAt: daysFromNow(8),
    },

    // --- DONE ---
    {
      title: 'Onboarding flow for new users',
      description: 'Create step-by-step onboarding wizard with org creation, team invitation, and first task guidance.',
      orgId: acmeProduct.id,
      createdById: alice.id,
      assigneeId: dave.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      category: 'Feature',
      tags: ['onboarding', 'ux', 'new-users'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(22),
      dueAt: daysAgo(16),
      completedAt: daysAgo(17),
    },
    {
      title: 'Export tasks to CSV',
      description: 'Allow users to export filtered task lists to CSV format with customizable columns.',
      orgId: acmeProduct.id,
      createdById: eve.id,
      assigneeId: dave.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      category: 'Feature',
      tags: ['export', 'csv', 'data'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(16),
      dueAt: daysAgo(10),
      completedAt: daysAgo(11),
    },
    {
      title: 'Privacy policy and terms page',
      description: 'Add legal pages with privacy policy, terms of service, and data handling information.',
      orgId: acmeProduct.id,
      createdById: alice.id,
      assigneeId: carol.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      category: 'Legal',
      tags: ['legal', 'privacy', 'terms'],
      visibility: TaskVisibility.PUBLIC,
      createdAt: daysAgo(28),
      dueAt: daysAgo(24),
      completedAt: daysAgo(25),
    },
  ];

  console.log(`Seeding ${tasks.length} tasks...`);
  const seededTasks: Record<string, string> = {};
  for (const t of tasks) {
    const created = await prisma.task.create({ data: t });
    seededTasks[t.title] = created.id;
  }

  // ─── Activity History ────────────────────────────────────────
  console.log('Seeding activity history...');
  const activities = [
    // OAuth2 task - rich history
    {
      taskId: seededTasks['Implement OAuth2 authentication'],
      actorId: bob.id,
      type: ActivityType.COMMENT,
      comment: 'Dave, please start with Google OAuth first. We can add GitHub later.',
      createdAt: daysAgo(9),
    },
    {
      taskId: seededTasks['Implement OAuth2 authentication'],
      actorId: bob.id,
      type: ActivityType.ASSIGNMENT_CHANGE,
      fromValue: null,
      toValue: dave.id,
      createdAt: daysAgo(9),
    },
    {
      taskId: seededTasks['Implement OAuth2 authentication'],
      actorId: dave.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'TODO',
      toValue: 'IN_PROGRESS',
      createdAt: daysAgo(8),
    },
    {
      taskId: seededTasks['Implement OAuth2 authentication'],
      actorId: dave.id,
      type: ActivityType.COMMENT,
      comment: 'Started on Google OAuth provider. Callback handler is mostly done, working on token exchange now.',
      createdAt: daysAgo(5),
    },
    {
      taskId: seededTasks['Implement OAuth2 authentication'],
      actorId: dave.id,
      type: ActivityType.COMMENT,
      comment: 'Hit a snag with the refresh token flow — Google returns a different format than expected. Investigating.',
      createdAt: daysAgo(2),
    },

    // XSS fix - blocked status
    {
      taskId: seededTasks['Fix XSS vulnerability in comments'],
      actorId: bob.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'TODO',
      toValue: 'IN_PROGRESS',
      createdAt: daysAgo(12),
    },
    {
      taskId: seededTasks['Fix XSS vulnerability in comments'],
      actorId: bob.id,
      type: ActivityType.COMMENT,
      comment: 'Initial DOMPurify integration done. Need security team review before deploying.',
      createdAt: daysAgo(8),
    },
    {
      taskId: seededTasks['Fix XSS vulnerability in comments'],
      actorId: bob.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'BLOCKED',
      createdAt: daysAgo(5),
    },
    {
      taskId: seededTasks['Fix XSS vulnerability in comments'],
      actorId: bob.id,
      type: ActivityType.COMMENT,
      comment: 'Blocked on security review from infra team. They need to run their automated scanner first.',
      createdAt: daysAgo(5),
    },

    // Database optimization - overdue
    {
      taskId: seededTasks['Database query optimization'],
      actorId: eve.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'TODO',
      toValue: 'IN_PROGRESS',
      createdAt: daysAgo(10),
    },
    {
      taskId: seededTasks['Database query optimization'],
      actorId: eve.id,
      type: ActivityType.COMMENT,
      comment: 'Identified 3 slow queries on the task list endpoint. Adding composite indexes on (org_id, status, updated_at).',
      createdAt: daysAgo(7),
    },
    {
      taskId: seededTasks['Database query optimization'],
      actorId: eve.id,
      type: ActivityType.DUE_DATE_CHANGE,
      fromValue: daysFromNow(5).toISOString(),
      toValue: daysAgo(5).toISOString(),
      createdAt: daysAgo(4),
    },

    // Redesign profile - overdue
    {
      taskId: seededTasks['Redesign user profile page'],
      actorId: dave.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'TODO',
      toValue: 'IN_PROGRESS',
      createdAt: daysAgo(6),
    },
    {
      taskId: seededTasks['Redesign user profile page'],
      actorId: dave.id,
      type: ActivityType.COMMENT,
      comment: 'Working on the avatar upload component. Using CropperJS for image resizing.',
      createdAt: daysAgo(3),
    },

    // Accessibility audit
    {
      taskId: seededTasks['Accessibility audit fixes'],
      actorId: dave.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'TODO',
      toValue: 'IN_PROGRESS',
      createdAt: daysAgo(5),
    },
    {
      taskId: seededTasks['Accessibility audit fixes'],
      actorId: dave.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'IN_REVIEW',
      createdAt: daysAgo(1),
    },
    {
      taskId: seededTasks['Accessibility audit fixes'],
      actorId: dave.id,
      type: ActivityType.COMMENT,
      comment: 'Fixed all keyboard navigation issues and added missing ARIA labels. Color contrast fixes pending review.',
      createdAt: daysAgo(1),
    },

    // WebSocket task - overdue
    {
      taskId: seededTasks['Add WebSocket real-time updates'],
      actorId: dave.id,
      type: ActivityType.COMMENT,
      comment: 'Using Socket.IO for the WebSocket layer. Connection management is working, now implementing event broadcasting.',
      createdAt: daysAgo(2),
    },

    // Review error handling
    {
      taskId: seededTasks['Review API error handling'],
      actorId: carol.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'IN_REVIEW',
      createdAt: daysAgo(2),
    },
    {
      taskId: seededTasks['Review API error handling'],
      actorId: carol.id,
      type: ActivityType.COMMENT,
      comment: 'All endpoints now return consistent error format. Ready for final review.',
      createdAt: daysAgo(2),
    },

    // Product org activities
    {
      taskId: seededTasks['Notification preferences page'],
      actorId: dave.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'TODO',
      toValue: 'IN_PROGRESS',
      createdAt: daysAgo(4),
    },
    {
      taskId: seededTasks['Notification preferences page'],
      actorId: dave.id,
      type: ActivityType.COMMENT,
      comment: 'Building the preference toggle UI. Need to wire up the backend save endpoint.',
      createdAt: daysAgo(1),
    },

    {
      taskId: seededTasks['Search functionality with filters'],
      actorId: eve.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'IN_REVIEW',
      createdAt: daysAgo(3),
    },

    // Done tasks - completion activities
    {
      taskId: seededTasks['Set up Prisma ORM'],
      actorId: dave.id,
      type: ActivityType.COMMENT,
      comment: 'Schema is defined, initial migration ran successfully. Connection pooling verified under load.',
      createdAt: daysAgo(23),
    },
    {
      taskId: seededTasks['Add RBAC role-based access control'],
      actorId: bob.id,
      type: ActivityType.COMMENT,
      comment: 'All five roles implemented with proper permission boundaries. Integration tests passing.',
      createdAt: daysAgo(27),
    },
  ];

  for (const a of activities) {
    await prisma.taskActivity.create({ data: a });
  }

  // ─── Sample Dedup Event ──────────────────────────────────────
  await prisma.dedupEvent.create({
    data: {
      userId: dave.id,
      orgId: acmeEng.id,
      candidateTaskId: seededTasks['Implement OAuth2 auth flow'],
      matchedTaskId: seededTasks['Implement OAuth2 authentication'],
      similarity: 0.92,
      decision: DedupDecision.SKIP,
    },
  });

  // ─── Summary ─────────────────────────────────────────────────
  const engTasks = tasks.filter(t => t.orgId === acmeEng.id);
  const prodTasks = tasks.filter(t => t.orgId === acmeProduct.id);

  console.log('');
  console.log('=== Seed Complete ===');
  console.log(`Date anchor: ${NOW.toISOString()} (2026-04-30 12:00 PM MST)`);
  console.log(`Organizations: 3 (Acme Corp, Acme Engineering, Acme Product)`);
  console.log(`Users: 5 (Alice, Bob, Carol, Dave, Eve)`);
  console.log(`Memberships: ${membershipData.length}`);
  console.log(`Acme Engineering tasks: ${engTasks.length}`);
  console.log(`  - TODO: ${engTasks.filter(t => t.status === 'TODO').length}`);
  console.log(`  - IN_PROGRESS: ${engTasks.filter(t => t.status === 'IN_PROGRESS').length}`);
  console.log(`  - IN_REVIEW: ${engTasks.filter(t => t.status === 'IN_REVIEW').length}`);
  console.log(`  - BLOCKED: ${engTasks.filter(t => t.status === 'BLOCKED').length}`);
  console.log(`  - DONE: ${engTasks.filter(t => t.status === 'DONE').length}`);
  console.log(`  - Overdue: ${engTasks.filter(t => t.dueAt && t.dueAt < NOW && t.status !== 'DONE').length}`);
  console.log(`Acme Product tasks: ${prodTasks.length}`);
  console.log(`  - TODO: ${prodTasks.filter(t => t.status === 'TODO').length}`);
  console.log(`  - IN_PROGRESS: ${prodTasks.filter(t => t.status === 'IN_PROGRESS').length}`);
  console.log(`  - IN_REVIEW: ${prodTasks.filter(t => t.status === 'IN_REVIEW').length}`);
  console.log(`  - BLOCKED: ${prodTasks.filter(t => t.status === 'BLOCKED').length}`);
  console.log(`  - DONE: ${prodTasks.filter(t => t.status === 'DONE').length}`);
  console.log(`  - Overdue: ${prodTasks.filter(t => t.dueAt && t.dueAt < NOW && t.status !== 'DONE').length}`);
  console.log(`Activities: ${activities.length}`);
  console.log('=====================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
