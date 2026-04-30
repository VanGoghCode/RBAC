import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthorizationScopeService, PermissionService } from '@task-ai/auth';
import { TaskCompositeTextBuilder, TaskRepository, AuditRepository, VectorSearchRepository } from '@task-ai/tasks';
import { PrismaService } from '../prisma';
import type {
  DeduplicateCheckDto,
  DeduplicationCandidate,
  DeduplicationCheckResult,
  DedupDecision,
} from './dto';
import type { EmbeddingClient } from '@task-ai/ai';
import type { AuthorizationScope } from '@task-ai/shared/types';

const DEFAULT_DEDUP_THRESHOLD = 0.92;
const MIN_DEDUP_THRESHOLD = 0.7;
const MAX_DEDUP_THRESHOLD = 0.99;

@Injectable()
export class TaskDeduplicationService {
  private readonly logger = new Logger(TaskDeduplicationService.name);
  private readonly permission = new PermissionService();
  private readonly textBuilder = new TaskCompositeTextBuilder();
  private readonly threshold = this.clampThreshold(
    parseFloat(process.env.DEDUP_SIMILARITY_THRESHOLD ?? String(DEFAULT_DEDUP_THRESHOLD)),
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: AuthorizationScopeService,
    private readonly taskRepo: TaskRepository,
    private readonly auditRepo: AuditRepository,
    @Inject('EmbeddingClient') private readonly embeddingClient: EmbeddingClient,
    private readonly vectorSearch: VectorSearchRepository,
  ) {}

  async checkForDuplicates(
    userId: string,
    draft: DeduplicateCheckDto,
  ): Promise<DeduplicationCheckResult> {
    const scope = await this.scopeService.resolveScope(userId);

    if (!this.permission.canCreateTask(scope, draft.orgId)) {
      return { candidates: [], hasDuplicates: false };
    }

    const composite = this.textBuilder.build({
      title: draft.title,
      description: draft.description ?? null,
      status: (draft.status as any) ?? 'TODO',
      priority: (draft.priority as any) ?? 'MEDIUM',
      category: draft.category ?? null,
      tags: draft.tags ?? [],
      visibility: 'PUBLIC',
      dueAt: draft.dueAt ? new Date(draft.dueAt) : null,
    });

    let embedding: number[];
    try {
      const result = await this.embeddingClient.embedText(composite.text);
      embedding = result.embedding;
    } catch (error) {
      this.logger.error(`Embedding failed for dedup check: ${(error as Error).message}`);
      return { candidates: [], hasDuplicates: false };
    }

    const vectorResults = await this.vectorSearch.search(scope, embedding, {
      limit: 5,
      minSimilarity: this.threshold,
    });

    if (vectorResults.length === 0) {
      return { candidates: [], hasDuplicates: false };
    }

    const candidates: DeduplicationCandidate[] = [];

    for (const result of vectorResults) {
      const task = await this.prisma.task.findFirst({
        where: { id: result.taskId, deletedAt: null },
        include: {
          assignee: { select: { name: true } },
        },
      });

      if (!task) continue;

      candidates.push({
        taskId: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeName: task.assignee?.name ?? null,
        updatedAt: task.updatedAt.toISOString(),
        similarity: result.similarity,
      });
    }

    return {
      candidates,
      hasDuplicates: candidates.length > 0,
    };
  }

  async logDecision(
    userId: string,
    orgId: string,
    candidateTaskId: string,
    matchedTaskId: string,
    similarity: number,
    decision: DedupDecision,
  ): Promise<void> {
    await this.prisma.dedupEvent.create({
      data: {
        userId,
        orgId,
        candidateTaskId,
        matchedTaskId,
        similarity,
        decision,
      },
    });

    await this.auditRepo.log({
      actorId: userId,
      orgId,
      action: `DEDUP_${decision}`,
      resourceType: 'task',
      resourceId: matchedTaskId,
      metadata: { candidateTaskId, similarity, decision },
    });
  }

  async executeMerge(
    userId: string,
    scope: AuthorizationScope,
    matchedTaskId: string,
    draft: DeduplicateCheckDto,
  ): Promise<{ taskId: string; title: string } | null> {
    const task = await this.taskRepo.findById(scope, matchedTaskId);
    if (!task || !this.permission.canUpdateTask(scope, task)) {
      this.logger.warn(`Merge blocked: user lacks update permission on task ${matchedTaskId}`);
      return null;
    }

    const mergeDescription = draft.description
      ? `${task.description ?? ''}\n\n[Merged from duplicate]: ${draft.description}`.trim()
      : task.description;

    const updated = await this.taskRepo.update(scope, matchedTaskId, {
      description: mergeDescription,
    });

    if (draft.tags && draft.tags.length > 0) {
      const mergedTags = [...new Set([...(task.tags ?? []), ...draft.tags])];
      await this.taskRepo.update(scope, matchedTaskId, { tags: mergedTags });
    }

    await this.prisma.taskActivity.create({
      data: {
        taskId: matchedTaskId,
        actorId: userId,
        type: 'COMMENT',
        comment: `Merged with duplicate draft: "${draft.title}"`,
      },
    });

    return { taskId: updated!.id, title: updated!.title };
  }

  private clampThreshold(value: number): number {
    return Math.min(MAX_DEDUP_THRESHOLD, Math.max(MIN_DEDUP_THRESHOLD, value));
  }
}
