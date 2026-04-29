import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as pg from 'pg';
import { AuthorizationScopeService } from './authorization-scope.service';

function createTestPrismaClient(): PrismaClient {
  const pool = new pg.Pool({
    connectionString: process.env['DATABASE_URL'] || 'postgresql://taskai:taskai@localhost:5432/taskai',
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as any);
}

async function isDbReachable(client: PrismaClient): Promise<boolean> {
  try {
    await client.$connect();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch {
    try { await client.$disconnect(); } catch { /* ignore */ }
    return false;
  }
}

describe('AuthorizationScopeService', () => {
  let prisma: ReturnType<typeof createTestPrismaClient>;
  let service: AuthorizationScopeService;
  let dbAvailable = false;
  let parentOrgId: string;
  let childOrgId: string;
  let unrelatedOrgId: string;
  let ownerUserId: string;
  let memberUserId: string;
  let disabledUserId: string;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    service = new AuthorizationScopeService(prisma);
    dbAvailable = await isDbReachable(prisma);
    if (!dbAvailable) {
       
      console.warn('Database not reachable — skipping AuthorizationScopeService tests');
      return;
    }

    parentOrgId = (await prisma.organization.create({
      data: { name: 'Parent Org', slug: `parent-${Date.now()}` },
    })).id;
    childOrgId = (await prisma.organization.create({
      data: { name: 'Child Org', slug: `child-${Date.now()}`, parentOrgId },
    })).id;
    unrelatedOrgId = (await prisma.organization.create({
      data: { name: 'Unrelated Org', slug: `unrelated-${Date.now()}` },
    })).id;

    ownerUserId = (await prisma.user.create({
      data: { email: `scope-owner-${Date.now()}@test.com`, name: 'Owner', passwordHash: 'hash' },
    })).id;
    memberUserId = (await prisma.user.create({
      data: { email: `scope-member-${Date.now()}@test.com`, name: 'Member', passwordHash: 'hash' },
    })).id;
    disabledUserId = (await prisma.user.create({
      data: {
        email: `scope-disabled-${Date.now()}@test.com`,
        name: 'Disabled',
        passwordHash: 'hash',
        disabledAt: new Date(),
      },
    })).id;

    await prisma.orgMembership.createMany({
      data: [
        { userId: ownerUserId, orgId: parentOrgId, role: 'owner' },
        { userId: memberUserId, orgId: parentOrgId, role: 'member' },
        { userId: disabledUserId, orgId: parentOrgId, role: 'member' },
      ],
    });
  });

  afterAll(async () => {
    if (dbAvailable && prisma) {
      await prisma.orgMembership.deleteMany({
        where: { userId: { in: [ownerUserId, memberUserId, disabledUserId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUserId, memberUserId, disabledUserId] } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [parentOrgId, childOrgId, unrelatedOrgId] } },
      });
    }
    if (prisma) await prisma.$disconnect();
  });

  it('member sees only their org', async () => {
    if (!dbAvailable) return;
    const scope = await service.resolveScope(memberUserId);
    expect(scope.actorUserId).toBe(memberUserId);
    expect(scope.allowedOrgIds).toEqual([parentOrgId]);
    expect(scope.rolesByOrg[parentOrgId]).toEqual(['member']);
  });

  it('owner sees parent + child orgs', async () => {
    if (!dbAvailable) return;
    const scope = await service.resolveScope(ownerUserId);
    expect(scope.allowedOrgIds).toContain(parentOrgId);
    expect(scope.allowedOrgIds).toContain(childOrgId);
    expect(scope.rolesByOrg[parentOrgId]).toContain('owner');
    expect(scope.rolesByOrg[childOrgId]).toContain('owner');
  });

  it('owner does not see unrelated orgs', async () => {
    if (!dbAvailable) return;
    const scope = await service.resolveScope(ownerUserId);
    expect(scope.allowedOrgIds).not.toContain(unrelatedOrgId);
  });

  it('disabled user gets empty scope', async () => {
    if (!dbAvailable) return;
    const scope = await service.resolveScope(disabledUserId);
    expect(scope.allowedOrgIds).toEqual([]);
  });

  it('nonexistent user gets empty scope', async () => {
    if (!dbAvailable) return;
    const scope = await service.resolveScope('00000000-0000-0000-0000-000000000000');
    expect(scope.allowedOrgIds).toEqual([]);
  });

  it('resolveChildOrgIds returns child orgs', async () => {
    if (!dbAvailable) return;
    const children = await service.resolveChildOrgIds(parentOrgId);
    expect(children).toContain(childOrgId);
  });
});
