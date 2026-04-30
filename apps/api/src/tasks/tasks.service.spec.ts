import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthorizationScopeService } from '@task-ai/auth';
import { TaskRepository, AuditRepository } from '@task-ai/tasks';
import { PrismaService } from '../prisma';
import { TaskDeduplicationService } from './task-deduplication.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: {
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    findMany: jest.Mock;
    findActivities: jest.Mock;
    addComment: jest.Mock;
  };
  let auditRepo: { log: jest.Mock };
  let scopeService: { resolveScope: jest.Mock };
  let prisma: { orgMembership: { findFirst: jest.Mock } };
  let dedupService: {
    checkForDuplicates: jest.Mock;
    logDecision: jest.Mock;
    executeMerge: jest.Mock;
  };

  const memberScope = {
    actorUserId: 'user-1',
    allowedOrgIds: ['org-1'],
    rolesByOrg: { 'org-1': ['member'] },
  };

  const adminScope = {
    actorUserId: 'user-admin',
    allowedOrgIds: ['org-1'],
    rolesByOrg: { 'org-1': ['admin'] },
  };

  const viewerScope = {
    actorUserId: 'user-viewer',
    allowedOrgIds: ['org-1'],
    rolesByOrg: { 'org-1': ['viewer'] },
  };

  const otherOrgScope = {
    actorUserId: 'user-2',
    allowedOrgIds: ['org-2'],
    rolesByOrg: { 'org-2': ['admin'] },
  };

  const mockTask = {
    id: 'task-1',
    orgId: 'org-1',
    title: 'Test task',
    description: 'A test task',
    status: 'TODO',
    priority: 'MEDIUM',
    category: null,
    visibility: 'PUBLIC',
    createdById: 'user-1',
    assigneeId: null,
    dueAt: null,
    deletedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeEach(async () => {
    taskRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findMany: jest.fn(),
      findActivities: jest.fn(),
      addComment: jest.fn(),
    };
    auditRepo = { log: jest.fn().mockResolvedValue(undefined) };
    scopeService = { resolveScope: jest.fn() };
    prisma = { orgMembership: { findFirst: jest.fn() } };
    dedupService = {
      checkForDuplicates: jest.fn().mockResolvedValue({ isDuplicate: false }),
      logDecision: jest.fn().mockResolvedValue(undefined),
      executeMerge: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: TaskRepository, useValue: taskRepo },
        { provide: AuditRepository, useValue: auditRepo },
        { provide: AuthorizationScopeService, useValue: scopeService },
        { provide: TaskDeduplicationService, useValue: dedupService },
      ],
    }).compile();

    service = moduleRef.get(TasksService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  // ─── Create ──────────────────────────────────────────────────

  describe('create', () => {
    it('creates task as member', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      prisma.orgMembership.findFirst.mockResolvedValue({ id: 'm-1' });
      taskRepo.create.mockResolvedValue(mockTask);

      const result = await service.create('user-1', {
        orgId: 'org-1',
        title: 'Test task',
        status: 'TODO',
        priority: 'MEDIUM',
        visibility: 'PUBLIC',
        tags: [],
      });

      expect(result).toEqual(mockTask);
      expect(auditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TASK_CREATED' }),
      );
    });

    it('rejects viewer creating task', async () => {
      scopeService.resolveScope.mockResolvedValue(viewerScope);

      await expect(
        service.create('user-viewer', {
          orgId: 'org-1',
          title: 'Test',
          status: 'TODO',
          priority: 'MEDIUM',
          visibility: 'PUBLIC',
          tags: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects assignee outside organization', async () => {
      scopeService.resolveScope.mockResolvedValue(adminScope);
      prisma.orgMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-admin', {
          orgId: 'org-1',
          title: 'Test',
          status: 'TODO',
          priority: 'MEDIUM',
          visibility: 'PUBLIC',
          tags: [],
          assigneeId: 'user-outside',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── FindById ────────────────────────────────────────────────

  describe('findById', () => {
    it('returns task for member', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      taskRepo.findById.mockResolvedValue(mockTask);

      const result = await service.findById('user-1', 'task-1');
      expect(result).toEqual(mockTask);
    });

    it('returns not-found for unauthorized task (generic)', async () => {
      scopeService.resolveScope.mockResolvedValue(otherOrgScope);
      taskRepo.findById.mockResolvedValue(null);

      await expect(service.findById('user-2', 'task-1')).rejects.toThrow(NotFoundException);
    });

    it('returns not-found for private task not owned by user', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      taskRepo.findById.mockResolvedValue({
        ...mockTask,
        visibility: 'PRIVATE',
        createdById: 'user-other',
      });

      await expect(service.findById('user-1', 'task-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Update ──────────────────────────────────────────────────

  describe('update', () => {
    it('updates task created by user', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.update.mockResolvedValue({ ...mockTask, status: 'IN_PROGRESS' });

      const result = await service.update('user-1', 'task-1', { status: 'IN_PROGRESS' });
      expect(result.status).toBe('IN_PROGRESS');
      expect(auditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TASK_UPDATED' }),
      );
    });

    it('rejects viewer updating task', async () => {
      scopeService.resolveScope.mockResolvedValue(viewerScope);
      taskRepo.findById.mockResolvedValue(mockTask);

      await expect(
        service.update('user-viewer', 'task-1', { status: 'DONE' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects cross-org update', async () => {
      scopeService.resolveScope.mockResolvedValue(otherOrgScope);
      taskRepo.findById.mockResolvedValue(null);

      await expect(
        service.update('user-2', 'task-1', { title: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Delete ──────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes task as creator (member)', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.softDelete.mockResolvedValue(true);

      const result = await service.remove('user-1', 'task-1');
      expect(result.success).toBe(true);
      expect(auditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TASK_DELETED' }),
      );
    });

    it('soft-deletes task as admin', async () => {
      scopeService.resolveScope.mockResolvedValue(adminScope);
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.softDelete.mockResolvedValue(true);

      const result = await service.remove('user-admin', 'task-1');
      expect(result.success).toBe(true);
    });

    it('rejects viewer deleting task', async () => {
      scopeService.resolveScope.mockResolvedValue(viewerScope);
      taskRepo.findById.mockResolvedValue(mockTask);

      await expect(service.remove('user-viewer', 'task-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Activity & Comments ─────────────────────────────────────

  describe('getActivities', () => {
    it('returns activities for authorized user', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.findActivities.mockResolvedValue({
        items: [{ id: 'act-1', type: 'STATUS_CHANGE', actorName: 'User' }],
        nextCursor: undefined,
        hasMore: false,
      });

      const result = await service.getActivities('user-1', 'task-1', { limit: 20, order: 'desc' });
      expect(result.items).toHaveLength(1);
    });

    it('rejects unauthorized user from activity', async () => {
      scopeService.resolveScope.mockResolvedValue(otherOrgScope);
      taskRepo.findById.mockResolvedValue(null);

      await expect(
        service.getActivities('user-2', 'task-1', { limit: 20, order: 'desc' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addComment', () => {
    it('adds comment as member', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      taskRepo.findById.mockResolvedValue(mockTask);
      taskRepo.addComment.mockResolvedValue({
        id: 'act-2',
        taskId: 'task-1',
        actorId: 'user-1',
        actorName: 'User One',
        type: 'COMMENT',
        comment: 'Hello world',
        createdAt: new Date().toISOString(),
      });

      const result = await service.addComment('user-1', 'task-1', { comment: 'Hello world' });
      expect(result.comment).toBe('Hello world');
      expect(auditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COMMENT_ADDED' }),
      );
    });

    it('rejects viewer from commenting', async () => {
      scopeService.resolveScope.mockResolvedValue(viewerScope);
      taskRepo.findById.mockResolvedValue(mockTask);

      await expect(
        service.addComment('user-viewer', 'task-1', { comment: 'Nope' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Cross-Org Denial ────────────────────────────────────────

  describe('cross-org denial', () => {
    it('findMany returns empty for foreign org', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      taskRepo.findMany.mockResolvedValue({ items: [], nextCursor: undefined, hasMore: false });

      const result = await service.findMany('user-1', { orgId: 'org-2', limit: 20, sort: 'updatedAt', order: 'desc' });
      expect(result.items).toHaveLength(0);
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────

  describe('edge cases', () => {
    it('empty task list returns empty page, not error', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      taskRepo.findMany.mockResolvedValue({ items: [], nextCursor: undefined, hasMore: false });

      const result = await service.findMany('user-1', { limit: 20, sort: 'updatedAt', order: 'desc' });
      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('nonexistent task ID returns not-found', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      taskRepo.findById.mockResolvedValue(null);

      await expect(service.findById('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
