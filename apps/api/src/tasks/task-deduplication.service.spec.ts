import { Test } from '@nestjs/testing';
import { AuthorizationScopeService } from '@task-ai/auth';
import { TaskCompositeTextBuilder, TaskRepository, AuditRepository, VectorSearchRepository } from '@task-ai/tasks';
import { PrismaService } from '../prisma';
import { TaskDeduplicationService } from './task-deduplication.service';
import { FakeEmbeddingClient } from '@task-ai/ai';

describe('TaskDeduplicationService', () => {
  let service: TaskDeduplicationService;
  let scopeService: { resolveScope: jest.Mock };
  let taskRepo: { findById: jest.Mock };
  let auditRepo: { log: jest.Mock };
  let vectorSearch: { search: jest.Mock };
  let prisma: { task: { findFirst: jest.Mock }; dedupEvent: { create: jest.Mock } };
  let fakeEmbedding: FakeEmbeddingClient;

  const memberScope = {
    actorUserId: 'user-1',
    allowedOrgIds: ['org-1'],
    rolesByOrg: { 'org-1': ['member'] },
  };

  const viewerScope = {
    actorUserId: 'user-viewer',
    allowedOrgIds: ['org-1'],
    rolesByOrg: { 'org-1': ['viewer'] },
  };

  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeEach(async () => {
    scopeService = { resolveScope: jest.fn() };
    taskRepo = { findById: jest.fn() };
    auditRepo = { log: jest.fn().mockResolvedValue(undefined) };
    vectorSearch = { search: jest.fn() };
    prisma = {
      task: { findFirst: jest.fn() },
      dedupEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    fakeEmbedding = new FakeEmbeddingClient();

    moduleRef = await Test.createTestingModule({
      providers: [
        TaskDeduplicationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthorizationScopeService, useValue: scopeService },
        { provide: TaskRepository, useValue: taskRepo },
        { provide: AuditRepository, useValue: auditRepo },
        { provide: 'EmbeddingClient', useValue: fakeEmbedding },
        { provide: VectorSearchRepository, useValue: vectorSearch },
      ],
    }).compile();

    service = moduleRef.get(TaskDeduplicationService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('checkForDuplicates', () => {
    it('returns empty for viewer (no permission)', async () => {
      scopeService.resolveScope.mockResolvedValue(viewerScope);
      const result = await service.checkForDuplicates('user-viewer', {
        title: 'Test',
        description: '',
        orgId: 'org-1',
      });
      expect(result.hasDuplicates).toBe(false);
      expect(result.candidates).toHaveLength(0);
    });

    it('returns empty when no similar vectors found', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      vectorSearch.search.mockResolvedValue([]);

      const result = await service.checkForDuplicates('user-1', {
        title: 'Unique task',
        description: 'Something unique',
        orgId: 'org-1',
      });
      expect(result.hasDuplicates).toBe(false);
    });

    it('returns candidates when similar vectors found', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      vectorSearch.search.mockResolvedValue([
        { taskId: 'task-1', similarity: 0.95 },
      ]);
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        title: 'Similar task',
        status: 'TODO',
        priority: 'MEDIUM',
        assignee: { name: 'Alice' },
        updatedAt: new Date(),
      });

      const result = await service.checkForDuplicates('user-1', {
        title: 'Similar task',
        description: '',
        orgId: 'org-1',
      });
      expect(result.hasDuplicates).toBe(true);
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].taskId).toBe('task-1');
    });

    it('skips deleted tasks in candidates', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      vectorSearch.search.mockResolvedValue([
        { taskId: 'task-deleted', similarity: 0.93 },
      ]);
      prisma.task.findFirst.mockResolvedValue(null);

      const result = await service.checkForDuplicates('user-1', {
        title: 'Test',
        description: '',
        orgId: 'org-1',
      });
      expect(result.hasDuplicates).toBe(false);
    });
  });

  describe('logDecision', () => {
    it('persists dedup event and audit log', async () => {
      await service.logDecision(
        'user-1', 'org-1', 'candidate-1', 'matched-1',
        0.95, 'CREATE_ANYWAY',
      );

      expect(prisma.dedupEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            decision: 'CREATE_ANYWAY',
            similarity: 0.95,
          }),
        }),
      );
      expect(auditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DEDUP_CREATE_ANYWAY' }),
      );
    });
  });
});
