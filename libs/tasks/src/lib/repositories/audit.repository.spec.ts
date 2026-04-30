import { AuditRepository } from './audit.repository';

describe('AuditRepository', () => {
  let repository: AuditRepository;
  let prisma: {
    auditLog: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    repository = new AuditRepository(prisma as any);
  });

  describe('log', () => {
    it('creates audit log entry', async () => {
      await repository.log({
        actorId: 'user-1',
        orgId: 'org-1',
        action: 'TASK_CREATED',
        resourceType: 'task',
        resourceId: 'task-1',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: 'user-1',
            orgId: 'org-1',
            action: 'TASK_CREATED',
          }),
        }),
      );
    });

    it('stores metadata when provided', async () => {
      await repository.log({
        action: 'LOGIN_FAILED',
        resourceType: 'user',
        resourceId: 'user-1',
        metadata: { reason: 'wrong_password' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: { reason: 'wrong_password' },
          }),
        }),
      );
    });

    it('works without optional fields', async () => {
      await repository.log({
        action: 'TEST_ACTION',
        resourceType: 'test',
        resourceId: 'res-1',
      });

      expect(prisma.auditLog.create).toHaveBeenCalled();
      const call = prisma.auditLog.create.mock.calls[0][0];
      expect(call.data.actorId).toBeUndefined();
      expect(call.data.orgId).toBeUndefined();
    });
  });

  describe('findMany', () => {
    it('scopes by orgId when provided', async () => {
      await repository.findMany({ orgId: 'org-1' }, { limit: 20, offset: 0 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: 'org-1' }),
        }),
      );
    });

    it('scopes by actorId when provided', async () => {
      await repository.findMany({ actorId: 'user-1' }, { limit: 20, offset: 0 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ actorId: 'user-1' }),
        }),
      );
    });

    it('scopes by action when provided', async () => {
      await repository.findMany({ action: 'TASK_CREATED' }, { limit: 20, offset: 0 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'TASK_CREATED' }),
        }),
      );
    });

    it('returns empty where when no filters', async () => {
      await repository.findMany({}, { limit: 20, offset: 0 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('clamps limit to max 100', async () => {
      await repository.findMany({}, { limit: 500, offset: 0 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('returns items and total', async () => {
      const items = [{ id: 'log-1', action: 'TEST' }];
      prisma.auditLog.findMany.mockResolvedValue(items);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await repository.findMany({}, { limit: 20, offset: 0 });
      expect(result.items).toEqual(items);
      expect(result.total).toBe(1);
    });
  });
});
