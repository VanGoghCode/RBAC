import { Test } from '@nestjs/testing';
import { FakeEmbeddingClient, FakeLlmClient } from '@task-ai/ai';
import { AuthorizationScopeService, PermissionService } from '@task-ai/auth';
import { TaskCompositeTextBuilder, TaskRepository, AuditRepository } from '@task-ai/tasks';

/**
 * Benchmark smoke tests.
 * These verify functional correctness of performance-critical paths.
 * They do NOT enforce strict timing — that is done manually.
 * They fail only on functional errors, not timing in CI.
 */

describe('Benchmark Smoke Tests', () => {
  describe('PermissionService throughput', () => {
    let service: PermissionService;

    beforeEach(() => {
      service = new PermissionService();
    });

    it('evaluates 1000 permission checks without error', () => {
      const scope = {
        actorUserId: 'user-1',
        allowedOrgIds: ['org-1'],
        rolesByOrg: { 'org-1': ['admin'] },
      };
      const task = {
        orgId: 'org-1',
        visibility: 'PUBLIC' as const,
        createdById: 'user-2',
        assigneeId: null,
      };

      let passed = 0;
      for (let i = 0; i < 1000; i++) {
        if (service.canViewTask(scope, task)) passed++;
      }
      expect(passed).toBe(1000);
    });
  });

  describe('TaskCompositeTextBuilder throughput', () => {
    let builder: TaskCompositeTextBuilder;

    beforeEach(() => {
      builder = new TaskCompositeTextBuilder();
    });

    it('builds 100 composite texts without error', () => {
      const task = {
        title: 'Benchmark task',
        description: 'A task for benchmarking composite text building',
        status: 'TODO' as const,
        priority: 'MEDIUM' as const,
        category: 'Performance',
        tags: ['benchmark', 'test'],
        dueAt: new Date(),
        visibility: 'PUBLIC' as const,
      };

      for (let i = 0; i < 100; i++) {
        const result = builder.build(task);
        expect(result.text).toContain('Benchmark task');
        expect(result.contentHash).toBeTruthy();
      }
    });
  });

  describe('FakeEmbeddingClient throughput', () => {
    it('embeds 100 texts without error', async () => {
      const client = new FakeEmbeddingClient({ dimension: 1024 });
      const texts = Array.from({ length: 100 }, (_, i) => `Task number ${i}`);

      const start = Date.now();
      const results = await client.embedBatch(texts);
      const elapsed = Date.now() - start;

      expect(results).toHaveLength(100);
      results.forEach((r) => {
        expect(r.embedding).toHaveLength(1024);
        expect(r.modelId).toBe('fake-embedding-model');
      });

      // Sanity check — fake should be very fast
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('FakeLlmClient throughput', () => {
    it('completes 100 requests without error', async () => {
      const client = new FakeLlmClient({
        defaultResponse: '{"intent":"query"}',
      });

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        const result = await client.complete(`Message ${i}`);
        expect(result.content).toBe('{"intent":"query"}');
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000);
    });
  });
});
