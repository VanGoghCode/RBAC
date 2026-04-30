/**
 * Idempotent seed script.
 * Uses upsert to ensure re-running is safe.
 * Run: pnpm db:seed
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

async function main() {
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
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@acme.com' },
    update: { passwordHash: hashPassword('password123') },
    create: {
      email: 'owner@acme.com',
      name: 'Alice Owner',
      passwordHash: hashPassword('password123'),
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: { passwordHash: hashPassword('password123') },
    create: {
      email: 'admin@acme.com',
      name: 'Bob Admin',
      passwordHash: hashPassword('password123'),
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@acme.com' },
    update: { passwordHash: hashPassword('password123') },
    create: {
      email: 'viewer@acme.com',
      name: 'Carol Viewer',
      passwordHash: hashPassword('password123'),
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'member@acme.com' },
    update: { passwordHash: hashPassword('password123') },
    create: {
      email: 'member@acme.com',
      name: 'Dave Member',
      passwordHash: hashPassword('password123'),
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@acme.com' },
    update: { passwordHash: hashPassword('password123') },
    create: {
      email: 'manager@acme.com',
      name: 'Eve Manager',
      passwordHash: hashPassword('password123'),
    },
  });

  // ─── Memberships ─────────────────────────────────────────────
  const membershipData = [
    { userId: ownerUser.id, orgId: acmeCorp.id, role: 'owner' },
    { userId: ownerUser.id, orgId: acmeEng.id, role: 'owner' },
    { userId: ownerUser.id, orgId: acmeProduct.id, role: 'owner' },
    { userId: adminUser.id, orgId: acmeEng.id, role: 'admin' },
    { userId: adminUser.id, orgId: acmeProduct.id, role: 'admin' },
    { userId: managerUser.id, orgId: acmeEng.id, role: 'manager' },
    { userId: viewerUser.id, orgId: acmeEng.id, role: 'viewer' },
    { userId: memberUser.id, orgId: acmeEng.id, role: 'member' },
    { userId: memberUser.id, orgId: acmeProduct.id, role: 'member' },
  ];

  for (const m of membershipData) {
    await prisma.orgMembership.upsert({
      where: {
        userId_orgId: { userId: m.userId, orgId: m.orgId },
      },
      update: {},
      create: m,
    });
  }

  // ─── Tasks ───────────────────────────────────────────────────
  const tasks = [
    {
      title: 'Implement OAuth2 authentication',
      description: 'Add Google and GitHub OAuth2 providers for SSO.',
      orgId: acmeEng.id,
      createdById: adminUser.id,
      assigneeId: memberUser.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      category: 'Auth',
      tags: ['auth', 'sso', 'oauth'],
      visibility: TaskVisibility.PUBLIC,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Refactor API to use DTOs',
      description: 'Migrate all controllers to use validated DTOs instead of raw body.',
      orgId: acmeEng.id,
      createdById: adminUser.id,
      assigneeId: memberUser.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      category: 'Backend',
      tags: ['api', 'refactor', 'validation'],
      visibility: TaskVisibility.PUBLIC,
    },
    {
      title: 'Build analytics dashboard',
      description: 'Create real-time analytics dashboard with charts.',
      orgId: acmeProduct.id,
      createdById: ownerUser.id,
      assigneeId: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      category: 'Frontend',
      tags: ['dashboard', 'charts', 'analytics'],
      visibility: TaskVisibility.PUBLIC,
    },
    {
      title: 'Fix XSS vulnerability in comments',
      description: 'Sanitize user-generated content in task comments.',
      orgId: acmeEng.id,
      createdById: adminUser.id,
      assigneeId: adminUser.id,
      status: TaskStatus.BLOCKED,
      priority: TaskPriority.CRITICAL,
      category: 'Security',
      tags: ['security', 'xss', 'bug'],
      visibility: TaskVisibility.PUBLIC,
    },
    {
      title: 'Overdue task example',
      description: 'This task is overdue for testing.',
      orgId: acmeEng.id,
      createdById: adminUser.id,
      assigneeId: memberUser.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      category: 'Testing',
      tags: ['testing', 'overdue'],
      visibility: TaskVisibility.PUBLIC,
      dueAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Review API error handling',
      description: 'Standardize error responses across all endpoints.',
      orgId: acmeEng.id,
      createdById: adminUser.id,
      assigneeId: viewerUser.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      category: 'Backend',
      tags: ['api', 'error-handling'],
      visibility: TaskVisibility.PUBLIC,
    },
    {
      title: 'Implement OAuth2 auth flow', // near-duplicate for dedup demo
      description: 'Add SSO support with Google and GitHub providers.',
      orgId: acmeEng.id,
      createdById: memberUser.id,
      assigneeId: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      category: 'Auth',
      tags: ['auth', 'sso'],
      visibility: TaskVisibility.PUBLIC,
    },
    {
      title: 'Private task for RBAC leak test',
      description: 'This should only be visible to creator and admins.',
      orgId: acmeEng.id,
      createdById: adminUser.id,
      assigneeId: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      category: 'Testing',
      tags: ['testing', 'rbac'],
      visibility: TaskVisibility.PRIVATE,
    },
    {
      title: 'Assigned-only task for RBAC leak test',
      description: 'Visible to assignee and admins only.',
      orgId: acmeEng.id,
      createdById: adminUser.id,
      assigneeId: memberUser.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      category: 'Testing',
      tags: ['testing', 'rbac'],
      visibility: TaskVisibility.ASSIGNED_ONLY,
    },
    {
      title: 'Cross-org task in Product',
      description: 'Task belonging to Product org for leak testing.',
      orgId: acmeProduct.id,
      createdById: ownerUser.id,
      assigneeId: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      category: 'Planning',
      tags: ['product', 'cross-org'],
      visibility: TaskVisibility.PUBLIC,
    },
    {
      title: 'Completed migration task',
      description: 'Already done migration to Prisma.',
      orgId: acmeEng.id,
      createdById: adminUser.id,
      assigneeId: memberUser.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      category: 'Backend',
      tags: ['database', 'migration', 'prisma'],
      visibility: TaskVisibility.PUBLIC,
      completedAt: new Date(),
    },
  ];

  const seededTasks: Record<string, string> = {};
  for (const t of tasks) {
    const existing = await prisma.task.findFirst({
      where: { title: t.title, orgId: t.orgId, deletedAt: null },
    });
    if (existing) {
      seededTasks[t.title] = existing.id;
    } else {
      const created = await prisma.task.create({ data: t });
      seededTasks[t.title] = created.id;
    }
  }

  // ─── Activity History ────────────────────────────────────────
  const authTaskId = seededTasks['Implement OAuth2 authentication'];
  const overdueTaskId = seededTasks['Overdue task example'];

  const activities = [
    {
      taskId: authTaskId,
      actorId: adminUser.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'TODO',
      toValue: 'IN_PROGRESS',
    },
    {
      taskId: authTaskId,
      actorId: adminUser.id,
      type: ActivityType.ASSIGNMENT_CHANGE,
      fromValue: null,
      toValue: memberUser.id,
    },
    {
      taskId: authTaskId,
      actorId: memberUser.id,
      type: ActivityType.COMMENT,
      comment: 'Starting on the Google OAuth provider first.',
    },
    {
      taskId: overdueTaskId,
      actorId: adminUser.id,
      type: ActivityType.STATUS_CHANGE,
      fromValue: 'TODO',
      toValue: 'IN_PROGRESS',
    },
    {
      taskId: overdueTaskId,
      actorId: adminUser.id,
      type: ActivityType.DUE_DATE_CHANGE,
      fromValue: null,
      toValue: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      taskId: seededTasks['Fix XSS vulnerability in comments'],
      actorId: adminUser.id,
      type: ActivityType.COMMENT,
      comment: 'Blocked on security review from infra team.',
    },
  ];

  for (const a of activities) {
    const existing = await prisma.taskActivity.findFirst({
      where: {
        taskId: a.taskId,
        actorId: a.actorId,
        type: a.type,
        comment: a.comment ?? undefined,
      },
    });
    if (!existing) {
      await prisma.taskActivity.create({ data: a });
    }
  }

  // ─── Sample Dedup Event ──────────────────────────────────────
  const dedupExisting = await prisma.dedupEvent.findFirst({
    where: {
      candidateTaskId: seededTasks['Implement OAuth2 auth flow'],
      matchedTaskId: authTaskId,
    },
  });
  if (!dedupExisting) {
    await prisma.dedupEvent.create({
      data: {
        userId: memberUser.id,
        orgId: acmeEng.id,
        candidateTaskId: seededTasks['Implement OAuth2 auth flow'],
        matchedTaskId: authTaskId,
        similarity: 0.92,
        decision: DedupDecision.SKIP,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
