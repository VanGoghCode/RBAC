/**
 * Seed data idempotence and correctness tests.
 * Requires running PostgreSQL with pgvector (pnpm dev:db) and seed run first.
 */

import { createTestPrismaClient, isDbReachable } from './test-db-client';

let prisma: ReturnType<typeof createTestPrismaClient>;

describe('Seed data tests', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    dbAvailable = await isDbReachable(prisma);
    if (!dbAvailable) {
      // eslint-disable-next-line no-console
      console.warn('Database not reachable — skipping seed tests');
    }
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it('should have required demo users', async () => {
    if (!dbAvailable) return;
    const users = await prisma.user.findMany();
    const emails = users.map((u) => u.email);
    expect(emails).toContain('owner@acme.com');
    expect(emails).toContain('admin@acme.com');
    expect(emails).toContain('viewer@acme.com');
    expect(emails).toContain('member@acme.com');
  });

  it('should have every task belonging to a valid org', async () => {
    if (!dbAvailable) return;
    const tasks = await prisma.task.findMany({ where: { deletedAt: null } });
    expect(tasks.length).toBeGreaterThan(0);
    const orgs = await prisma.organization.findMany();
    const orgIds = new Set(orgs.map((o) => o.id));
    for (const task of tasks) {
      expect(orgIds.has(task.orgId)).toBe(true);
    }
  });

  it('should have tasks in multiple orgs for cross-org leak testing', async () => {
    if (!dbAvailable) return;
    const engOrg = await prisma.organization.findUnique({ where: { slug: 'acme-engineering' } });
    const prodOrg = await prisma.organization.findUnique({ where: { slug: 'acme-product' } });
    expect(engOrg).not.toBeNull();
    expect(prodOrg).not.toBeNull();
    const engTasks = await prisma.task.count({ where: { orgId: engOrg!.id, deletedAt: null } });
    const prodTasks = await prisma.task.count({ where: { orgId: prodOrg!.id, deletedAt: null } });
    expect(engTasks).toBeGreaterThan(0);
    expect(prodTasks).toBeGreaterThan(0);
  });

  it('should have near-duplicate task pair for dedup demo', async () => {
    if (!dbAvailable) return;
    const dedupEvents = await prisma.dedupEvent.findMany();
    expect(dedupEvents.length).toBeGreaterThan(0);
  });

  it('should have private and assigned-only tasks for RBAC tests', async () => {
    if (!dbAvailable) return;
    const privateTasks = await prisma.task.findMany({ where: { visibility: 'PRIVATE', deletedAt: null } });
    const assignedOnly = await prisma.task.findMany({ where: { visibility: 'ASSIGNED_ONLY', deletedAt: null } });
    expect(privateTasks.length).toBeGreaterThan(0);
    expect(assignedOnly.length).toBeGreaterThan(0);
  });

  it('should have seed activity history', async () => {
    if (!dbAvailable) return;
    const activities = await prisma.taskActivity.findMany();
    expect(activities.length).toBeGreaterThan(0);
  });

  it('should have parent-child org hierarchy', async () => {
    if (!dbAvailable) return;
    const parent = await prisma.organization.findUnique({ where: { slug: 'acme-corp' } });
    expect(parent).not.toBeNull();
    const children = await prisma.organization.findMany({ where: { parentOrgId: parent!.id } });
    expect(children.length).toBeGreaterThanOrEqual(2);
  });

  it('should not create duplicate users on re-seed', async () => {
    if (!dbAvailable) return;
    const ownerCount = await prisma.user.count({ where: { email: 'owner@acme.com' } });
    expect(ownerCount).toBe(1);
  });
});
