import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, TaskVisibility } from '@prisma/client';
import type { EmbeddingClient } from '@task-ai/ai';
import { TaskCompositeTextBuilder } from '@task-ai/tasks';

export interface EmbeddingJob {
  taskId: string;
  orgId: string;
  assigneeId: string | null;
  visibility: TaskVisibility;
}

@Injectable()
export class EmbeddingPipelineService {
  private readonly logger = new Logger(EmbeddingPipelineService.name);
  private readonly textBuilder = new TaskCompositeTextBuilder();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly embeddingClient: EmbeddingClient,
  ) {}

  async indexStaleTasks(limit = 50): Promise<{ indexed: number; skipped: number; failed: number }> {
    let indexed = 0;
    let skipped = 0;
    let failed = 0;

    const staleEmbeddings = await this.prisma.taskEmbedding.findMany({
      where: { staleAt: { not: null }, task: { deletedAt: null } },
      take: limit,
      include: {
        task: {
          include: {
            assignee: { select: { name: true } },
            activities: {
              where: { type: 'COMMENT' },
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: {
                type: true,
                fromValue: true,
                toValue: true,
                comment: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    for (const row of staleEmbeddings) {
      if (!row.task) {
        skipped++;
        continue;
      }

      try {
        const composite = this.textBuilder.build(row.task, {
          assigneeName: row.task.assignee?.name,
          activities: row.task.activities.map((a) => ({
            type: a.type,
            fromValue: a.fromValue,
            toValue: a.toValue,
            comment: a.comment,
            createdAt: a.createdAt.toISOString(),
          })),
        });

        if (composite.contentHash === row.contentHash && row.contentHash !== '') {
          await this.prisma.taskEmbedding.update({
            where: { id: row.id },
            data: { staleAt: null },
          });
          skipped++;
          continue;
        }

        const result = await this.embeddingClient.embedText(composite.text);

        await this.upsertEmbedding(row.taskId, {
          orgId: row.orgId,
          assigneeId: row.assigneeId,
          visibility: row.visibility,
          embedding: result.embedding,
          modelId: result.modelId,
          contentHash: composite.contentHash,
        });

        indexed++;
      } catch (error) {
        this.logger.error(`Failed to index task ${row.taskId}: ${(error as Error).message}`);
        failed++;
      }
    }

    return { indexed, skipped, failed };
  }

  async indexSingleTask(taskId: string): Promise<boolean> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        assignee: { select: { name: true } },
        activities: {
          where: { type: 'COMMENT' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            type: true,
            fromValue: true,
            toValue: true,
            comment: true,
            createdAt: true,
          },
        },
        embedding: true,
      },
    });

    if (!task) return false;

    const composite = this.textBuilder.build(task, {
      assigneeName: task.assignee?.name,
      activities: task.activities.map((a) => ({
        type: a.type,
        fromValue: a.fromValue,
        toValue: a.toValue,
        comment: a.comment,
        createdAt: a.createdAt.toISOString(),
      })),
    });

    if (task.embedding && task.embedding.contentHash === composite.contentHash && task.embedding.contentHash !== '') {
      await this.prisma.taskEmbedding.update({
        where: { id: task.embedding.id },
        data: { staleAt: null },
      });
      return true;
    }

    const result = await this.embeddingClient.embedText(composite.text);

    await this.upsertEmbedding(taskId, {
      orgId: task.orgId,
      assigneeId: task.assigneeId,
      visibility: task.visibility,
      embedding: result.embedding,
      modelId: result.modelId,
      contentHash: composite.contentHash,
    });

    return true;
  }

  async getIndexingStats(): Promise<{
    indexed: number;
    stale: number;
    failed: number;
    missing: number;
  }> {
    const [stale, total, taskCount] = await Promise.all([
      this.prisma.taskEmbedding.count({
        where: { staleAt: { not: null } },
      }),
      this.prisma.taskEmbedding.count(),
      this.prisma.task.count({ where: { deletedAt: null } }),
    ]);

    // Count indexed = total - stale (embedding column is Unsupported, can't filter in Prisma)
    const indexed = total - stale;

    return {
      indexed,
      stale,
      failed: 0,
      missing: Math.max(0, taskCount - total),
    };
  }

  private async upsertEmbedding(
    taskId: string,
    data: {
      orgId: string;
      assigneeId: string | null;
      visibility: TaskVisibility;
      embedding: number[];
      modelId: string;
      contentHash: string;
    },
  ) {
    const vectorStr = `[${data.embedding.join(',')}]`;

    await this.prisma.$executeRaw`
      INSERT INTO task_embeddings (id, task_id, org_id, assignee_id, visibility, embedding_model, content_hash, embedding, indexed_at, stale_at, embedding_version)
      VALUES (
        gen_random_uuid(),
        ${taskId}::uuid,
        ${data.orgId}::uuid,
        ${data.assigneeId}::uuid,
        ${data.visibility}::"TaskVisibility",
        ${data.modelId},
        ${data.contentHash},
        ${vectorStr}::vector,
        now(),
        NULL,
        1
      )
      ON CONFLICT (task_id) DO UPDATE SET
        org_id = EXCLUDED.org_id,
        assignee_id = EXCLUDED.assignee_id,
        visibility = EXCLUDED.visibility,
        embedding_model = EXCLUDED.embedding_model,
        content_hash = EXCLUDED.content_hash,
        embedding = EXCLUDED.embedding,
        indexed_at = now(),
        stale_at = NULL,
        embedding_version = task_embeddings.embedding_version + 1
    `;
  }
}
