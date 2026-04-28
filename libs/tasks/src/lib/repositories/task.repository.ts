import { PrismaClient, Task, Prisma } from '@prisma/client';
import {
  AuthorizationScope,
  PaginationInput,
  PaginatedResult,
  clampPageSize,
} from '@task-ai/shared/types';

export class TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find tasks scoped to the actor's allowed orgs.
   * Never returns tasks outside allowedOrgIds.
   */
  async findMany(
    scope: AuthorizationScope,
    pagination?: PaginationInput,
    filters?: {
      status?: string;
      assigneeId?: string;
      orgId?: string;
    },
  ): Promise<PaginatedResult<Task>> {
    const limit = clampPageSize(pagination?.limit ?? 20);

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      orgId: { in: scope.allowedOrgIds },
      ...(filters?.orgId ? { orgId: filters.orgId } : {}),
      ...(filters?.status ? { status: filters.status as Prisma.EnumTaskStatusFilter } : {}),
      ...(filters?.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(pagination?.cursor
        ? { id: { lt: pagination.cursor } }
        : {}),
    };

    // Visibility filtering based on role
    if (!this.isAdminOrOwner(scope, filters?.orgId)) {
      where.OR = [
        { visibility: 'PUBLIC' },
        { assigneeId: scope.actorUserId, visibility: 'ASSIGNED_ONLY' },
        { createdById: scope.actorUserId, visibility: 'PRIVATE' },
      ];
    }

    const items = await this.prisma.task.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : undefined,
      hasMore,
    };
  }

  async findById(scope: AuthorizationScope, taskId: string): Promise<Task | null> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) return null;
    if (!scope.allowedOrgIds.includes(task.orgId)) return null;
    return task;
  }

  async createWithActivity(
    scope: AuthorizationScope,
    data: Prisma.TaskCreateInput,
  ): Promise<Task> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({ data });
      await tx.taskActivity.create({
        data: {
          taskId: task.id,
          actorId: scope.actorUserId,
          type: 'STATUS_CHANGE',
          fromValue: null,
          toValue: 'TODO',
        },
      });
      return task;
    });
  }

  private isAdminOrOwner(scope: AuthorizationScope, orgId?: string): boolean {
    if (!orgId) return false;
    const roles = scope.rolesByOrg[orgId] ?? [];
    return roles.some((r) => r === 'admin' || r === 'owner');
  }
}
