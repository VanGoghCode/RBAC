/**
 * Schema constraint tests for Module 02.
 * These tests verify database constraints are enforced.
 * Requires running PostgreSQL with pgvector (pnpm dev:db).
 */

import { createTestPrismaClient, isDbReachable } from './test-db-client';

let prisma: ReturnType<typeof createTestPrismaClient>;

describe('Schema constraint tests', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    dbAvailable = await isDbReachable(prisma);
    if (!dbAvailable) {
      // eslint-disable-next-line no-console
      console.warn('Database not reachable — skipping schema constraint tests');
    }
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  describe('User unique email constraint', () => {
    it('should reject duplicate email regardless of case', async () => {
      if (!dbAvailable) return;
      const email = `schema-test-${Date.now()}@test.com`;
      await prisma.user.create({ data: { email, name: 'Test', passwordHash: 'hash' } });
      await expect(
        prisma.user.create({ data: { email: email.toUpperCase(), name: 'Dup', passwordHash: 'hash' } }),
      ).rejects.toThrow();
      await prisma.user.deleteMany({ where: { email } });
    });
  });

  describe('OrgMembership unique constraint', () => {
    it('should reject duplicate membership for same user in same org', async () => {
      if (!dbAvailable) return;
      const user = await prisma.user.create({ data: { email: `mem-test-${Date.now()}@test.com`, name: 'MemTest', passwordHash: 'hash' } });
      const org = await prisma.organization.create({ data: { name: 'MemTest Org', slug: `mem-test-${Date.now()}` } });
      await prisma.orgMembership.create({ data: { userId: user.id, orgId: org.id, role: 'member' } });
      await expect(
        prisma.orgMembership.create({ data: { userId: user.id, orgId: org.id, role: 'admin' } }),
      ).rejects.toThrow();
      await prisma.orgMembership.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    });
  });

  describe('Organization unique slug', () => {
    it('should reject duplicate slug', async () => {
      if (!dbAvailable) return;
      const slug = `slug-test-${Date.now()}`;
      await prisma.organization.create({ data: { name: 'Slug Test A', slug } });
      await expect(
        prisma.organization.create({ data: { name: 'Slug Test B', slug } }),
      ).rejects.toThrow();
      await prisma.organization.deleteMany({ where: { slug } });
    });
  });

  describe('Soft-deleted tasks', () => {
    it('should not return soft-deleted tasks in normal queries', async () => {
      if (!dbAvailable) return;
      const org = await prisma.organization.create({ data: { name: 'SoftDel Org', slug: `softdel-${Date.now()}` } });
      const user = await prisma.user.create({ data: { email: `softdel-${Date.now()}@test.com`, name: 'SoftDel', passwordHash: 'hash' } });
      const task = await prisma.task.create({
        data: { title: 'To be deleted', orgId: org.id, createdById: user.id, deletedAt: new Date() },
      });
      const found = await prisma.task.findFirst({ where: { id: task.id, deletedAt: null } });
      expect(found).toBeNull();
      const raw = await prisma.task.findUnique({ where: { id: task.id } });
      expect(raw).not.toBeNull();
      expect(raw!.deletedAt).not.toBeNull();
      await prisma.task.delete({ where: { id: task.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    });
  });

  describe('AuditLog required fields', () => {
    it('should reject audit log without action', async () => {
      if (!dbAvailable) return;
      await expect(
        prisma.auditLog.create({ data: { resourceType: 'task', resourceId: 'test' } } as any),
      ).rejects.toThrow();
    });

    it('should create audit log with all required fields', async () => {
      if (!dbAvailable) return;
      const log = await prisma.auditLog.create({
        data: { action: 'task.create', resourceType: 'task', resourceId: 'test-id', metadata: { key: 'value' } },
      });
      expect(log.action).toBe('task.create');
      expect(log.resourceType).toBe('task');
      await prisma.auditLog.delete({ where: { id: log.id } });
    });
  });

  describe('pgvector extension', () => {
    it('should have pgvector extension installed', async () => {
      if (!dbAvailable) return;
      const result = await prisma.$queryRaw<Array<{ extname: string }>>`SELECT extname FROM pg_extension WHERE extname = 'vector'`;
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].extname).toBe('vector');
    });

    it('should store and retrieve a fake vector', async () => {
      if (!dbAvailable) return;
      const org = await prisma.organization.create({ data: { name: 'Vec Org', slug: `vec-${Date.now()}` } });
      const user = await prisma.user.create({ data: { email: `vec-${Date.now()}@test.com`, name: 'Vec', passwordHash: 'hash' } });
      const task = await prisma.task.create({ data: { title: 'Vec task', orgId: org.id, createdById: user.id } });
      const fakeVector = Array(1024).fill(0).map((_, i) => (i === 0 ? 1 : 0));
      await prisma.$executeRawUnsafe(
        `INSERT INTO task_embeddings (task_id, org_id, embedding_model, content_hash, embedding) VALUES ($1, $2, $3, $4, $5::vector) ON CONFLICT (task_id) DO UPDATE SET embedding = $5::vector`,
        task.id, org.id, 'test-model', 'hash123', `[${fakeVector.join(',')}]`,
      );
      const result = await prisma.$queryRawUnsafe<Array<{ task_id: string }>>(`SELECT task_id FROM task_embeddings WHERE task_id = $1`, task.id);
      expect(result.length).toBeGreaterThan(0);
      await prisma.$executeRawUnsafe(`DELETE FROM task_embeddings WHERE task_id = $1`, task.id);
      await prisma.task.delete({ where: { id: task.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    });
  });

  describe('TaskEmbedding unique constraint', () => {
    it('should reject duplicate task_id + embedding_model', async () => {
      if (!dbAvailable) return;
      const org = await prisma.organization.create({ data: { name: 'EmbUniq Org', slug: `embuniq-${Date.now()}` } });
      const user = await prisma.user.create({ data: { email: `embuniq-${Date.now()}@test.com`, name: 'EmbUniq', passwordHash: 'hash' } });
      const task = await prisma.task.create({ data: { title: 'EmbUniq task', orgId: org.id, createdById: user.id } });
      const zeroVec = `[${Array(1024).fill(0).join(',')}]`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO task_embeddings (task_id, org_id, embedding_model, content_hash, embedding) VALUES ($1, $2, $3, $4, $5::vector)`,
        task.id, org.id, 'model-v1', 'hash1', zeroVec,
      );
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO task_embeddings (task_id, org_id, embedding_model, content_hash, embedding) VALUES ($1, $2, $3, $4, $5::vector)`,
          task.id, org.id, 'model-v1', 'hash2', zeroVec,
        ),
      ).rejects.toThrow();
      await prisma.$executeRawUnsafe(`DELETE FROM task_embeddings WHERE task_id = $1`, task.id);
      await prisma.task.delete({ where: { id: task.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    });
  });
});
