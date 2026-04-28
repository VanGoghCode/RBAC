/**
 * Repository authorization scope tests.
 * Verify repositories enforce org boundaries and visibility rules.
 * Requires running PostgreSQL with pgvector (pnpm dev:db).
 */

import { TaskRepository } from '@task-ai/tasks';
import { createTestPrismaClient, isDbReachable } from './test-db-client';

let prisma: ReturnType<typeof createTestPrismaClient>;
let taskRepo: InstanceType<typeof TaskRepository>;

describe('Repository authorization scope tests', () => {
  let dbAvailable = false;
  let orgA: string;
  let orgB: string;
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    taskRepo = new TaskRepository(prisma);
    dbAvailable = await isDbReachable(prisma);
    if (!dbAvailable) {
      // eslint-disable-next-line no-console
      console.warn('Database not reachable — skipping repo scope tests');
      return;
    }

    orgA = (await prisma.organization.create({ data: { name: 'Scope Org A', slug: `scope-a-${Date.now()}` } })).id;
    orgB = (await prisma.organization.create({ data: { name: 'Scope Org B', slug: `scope-b-${Date.now()}` } })).id;
    userA = (await prisma.user.create({ data: { email: `scope-a-${Date.now()}@test.com`, name: 'User A', passwordHash: 'hash' } })).id;
    userB = (await prisma.user.create({ data: { email: `scope-b-${Date.now()}@test.com`, name: 'User B', passwordHash: 'hash' } })).id;

    await prisma.orgMembership.createMany({
      data: [
        { userId: userA, orgId: orgA, role: 'member' },
        { userId: userB, orgId: orgB, role: 'member' },
      ],
    });

    await prisma.task.createMany({
      data: [
        { title: 'Public A', orgId: orgA, createdById: userA, visibility: 'PUBLIC' },
        { title: 'Private A', orgId: orgA, createdById: userA, visibility: 'PRIVATE' },
        { title: 'Assigned A', orgId: orgA, createdById: userA, assigneeId: userA, visibility: 'ASSIGNED_ONLY' },
      ],
    });
    await prisma.task.create({ data: { title: 'Public B', orgId: orgB, createdById: userB, visibility: 'PUBLIC' } });
  });

  afterAll(async () => {
    if (dbAvailable && prisma) {
      await prisma.task.deleteMany({ where: { orgId: { in: [orgA, orgB] } } });
      await prisma.orgMembership.deleteMany({ where: { orgId: { in: [orgA, orgB] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
      await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    }
    if (prisma) await prisma.$disconnect();
  });

  it('should not return cross-org tasks', async () => {
    if (!dbAvailable) return;
    const scope = { actorUserId: userA, allowedOrgIds: [orgA], rolesByOrg: { [orgA]: ['member'] } };
    const result = await taskRepo.findMany(scope);
    expect(result.items.every((t) => t.orgId === orgA)).toBe(true);
  });

  it('should respect visibility for non-admin users', async () => {
    if (!dbAvailable) return;
    const scope = { actorUserId: userA, allowedOrgIds: [orgA], rolesByOrg: { [orgA]: ['member'] } };
    const result = await taskRepo.findMany(scope);
    const titles = result.items.map((t) => t.title);
    expect(titles).toContain('Public A');
    expect(titles).toContain('Assigned A');
    expect(titles).toContain('Private A');
  });

  it('findById should return null for cross-org task', async () => {
    if (!dbAvailable) return;
    const taskB = await prisma.task.findFirst({ where: { title: 'Public B' } });
    const scope = { actorUserId: userA, allowedOrgIds: [orgA], rolesByOrg: { [orgA]: ['member'] } };
    const result = await taskRepo.findById(scope, taskB!.id);
    expect(result).toBeNull();
  });

  it('should paginate results', async () => {
    if (!dbAvailable) return;
    const scope = { actorUserId: userA, allowedOrgIds: [orgA], rolesByOrg: { [orgA]: ['member'] } };
    const page1 = await taskRepo.findMany(scope, { limit: 2 });
    expect(page1.items.length).toBeLessThanOrEqual(2);
    if (page1.hasMore && page1.nextCursor) {
      const page2 = await taskRepo.findMany(scope, { limit: 2, cursor: page1.nextCursor });
      expect(page2.items.length).toBeGreaterThan(0);
    }
  });
});
