import { Test } from '@nestjs/testing';
import { FakeEmbeddingClient } from '@task-ai/ai';
import { TaskCompositeTextBuilder } from '@task-ai/tasks';
import { PrismaService } from '../prisma';
import { EmbeddingPipelineService } from './embedding-pipeline.service';

describe('EmbeddingPipelineService', () => {
  let service: EmbeddingPipelineService;
  let prisma: {
    taskEmbedding: {
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    task: { count: jest.Mock };
    $executeRaw: jest.Mock;
  };
  let fakeEmbedding: FakeEmbeddingClient;

  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeEach(async () => {
    prisma = {
      taskEmbedding: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
      task: { count: jest.fn().mockResolvedValue(0) },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    fakeEmbedding = new FakeEmbeddingClient({ dimension: 1024 });

    moduleRef = await Test.createTestingModule({
      providers: [
        EmbeddingPipelineService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'EmbeddingClient', useValue: fakeEmbedding },
      ],
    }).compile();

    service = moduleRef.get(EmbeddingPipelineService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('indexStaleTasks', () => {
    it('returns zeroed stats when no stale embeddings', async () => {
      prisma.taskEmbedding.findMany.mockResolvedValue([]);
      const result = await service.indexStaleTasks();
      expect(result.indexed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('skips embeddings with matching content hash', async () => {
      const textBuilder = new TaskCompositeTextBuilder();
      const taskData = {
        title: 'Test',
        description: null,
        status: 'TODO' as const,
        priority: 'MEDIUM' as const,
        category: null,
        tags: [],
        dueAt: null,
        visibility: 'PUBLIC' as const,
      };
      const { contentHash } = textBuilder.build(taskData);

      prisma.taskEmbedding.findMany.mockResolvedValue([
        {
          id: 'emb-1',
          taskId: 'task-1',
          orgId: 'org-1',
          assigneeId: null,
          visibility: 'PUBLIC',
          contentHash,
          task: {
            ...taskData,
            assignee: null,
            activities: [],
          },
        },
      ]);

      const result = await service.indexStaleTasks();
      // Content hash matches → skipped
      expect(result.skipped).toBe(1);
      expect(result.indexed).toBe(0);
    });
  });

  describe('getIndexingStats', () => {
    it('returns correct stats', async () => {
      prisma.taskEmbedding.count
        .mockResolvedValueOnce(5) // stale count
        .mockResolvedValueOnce(20); // total count
      prisma.task.count.mockResolvedValue(25);

      const stats = await service.getIndexingStats();
      expect(stats.indexed).toBe(15); // total - stale
      expect(stats.stale).toBe(5);
      expect(stats.missing).toBe(5); // task count - total embeddings
    });
  });
});
