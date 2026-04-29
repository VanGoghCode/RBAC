import { PrismaClient, Task, Prisma, TaskStatus, TaskPriority, TaskVisibility, ActivityType } from '@prisma/client';
import {
  AuthorizationScope,
  PaginationInput,
  PaginatedResult,
  clampPageSize,
} from '@task-ai/shared/types';

export class TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(
    scope: AuthorizationScope,
    pagination?: PaginationInput,
    filters?: {
      status?: string;
      assigneeId?: string;
      orgId?: string;
      priority?: string;
      category?: string;
      search?: string;
      dueBefore?: string;
      dueAfter?: string;
    },
    sort: 'updatedAt' | 'createdAt' | 'dueAt' = 'updatedAt',
    order: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedResult<Task>> {
    const limit = clampPageSize(pagination?.limit ?? 20);

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      orgId: { in: scope.allowedOrgIds },
      ...(filters?.orgId ? { orgId: filters.orgId } : {}),
      ...(filters?.status ? { status: filters.status as Prisma.EnumTaskStatusFilter } : {}),
      ...(filters?.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters?.priority ? { priority: filters.priority as Prisma.EnumTaskPriorityFilter } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.dueBefore ? { dueAt: { lte: new Date(filters.dueBefore) } } : {}),
      ...(filters?.dueAfter
        ? { dueAt: { ...(filters.dueBefore ? {} : {}), gte: new Date(filters.dueAfter) } }
        : {}),
      ...(filters?.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(pagination?.cursor ? { id: { lt: pagination.cursor } } : {}),
    };

    // Visibility filtering for non-admin/owner
    const effectiveOrgId = filters?.orgId;
    if (!this.isAdminOrOwner(scope, effectiveOrgId)) {
      where.OR = [
        { visibility: 'PUBLIC' },
        { assigneeId: scope.actorUserId, visibility: 'ASSIGNED_ONLY' },
        { createdById: scope.actorUserId, visibility: 'PRIVATE' },
      ];
    }

    const orderBy = [
      { [sort]: order },
      { id: 'desc' as const },
    ] as Prisma.TaskOrderByWithRelationInput[];

    const items = await this.prisma.task.findMany({
      where,
      orderBy,
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

  async create(
    scope: AuthorizationScope,
    data: {
      orgId: string;
      title: string;
      description?: string;
      status: string;
      priority: string;
      category?: string;
      visibility: string;
      assigneeId?: string;
      dueAt?: Date;
    },
  ): Promise<Task> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          orgId: data.orgId,
          title: data.title,
          description: data.description ?? null,
          status: data.status as TaskStatus,
          priority: data.priority as TaskPriority,
          category: data.category ?? null,
          visibility: data.visibility as TaskVisibility,
          createdById: scope.actorUserId,
          assigneeId: data.assigneeId ?? null,
          dueAt: data.dueAt ?? null,
        },
      });

      // Activity: task created
      await tx.taskActivity.create({
        data: {
          taskId: task.id,
          actorId: scope.actorUserId,
          type: 'STATUS_CHANGE',
          fromValue: null,
          toValue: data.status,
        },
      });

      // Create embedding placeholder
      await tx.taskEmbedding.create({
        data: {
          taskId: task.id,
          orgId: data.orgId,
          assigneeId: data.assigneeId ?? null,
          visibility: data.visibility as TaskVisibility,
          embeddingModel: 'placeholder',
          contentHash: '',
          staleAt: new Date(),
        },
      });

      return task;
    });
  }

  async update(
    scope: AuthorizationScope,
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      status?: string;
      priority?: string;
      category?: string | null;
      visibility?: string;
      assigneeId?: string | null;
      dueAt?: Date | null;
    },
  ): Promise<Task | null> {
    const existing = await this.findById(scope, taskId);
    if (!existing) return null;

    const updates: Prisma.TaskUpdateInput = {};
    const changes: Array<{ type: string; from: string | null; to: string | null }> = [];

    if (data.title !== undefined && data.title !== existing.title) {
      updates.title = data.title;
    }
    if (data.description !== undefined) {
      const newDesc = data.description ?? null;
      if (newDesc !== existing.description) updates.description = newDesc;
    }
    if (data.status !== undefined && data.status !== existing.status) {
      updates.status = data.status as TaskStatus;
      changes.push({ type: 'STATUS_CHANGE', from: existing.status, to: data.status });
      if (data.status === 'DONE') updates.completedAt = new Date();
      if (existing.status === 'DONE' && data.status !== 'DONE') updates.completedAt = null;
    }
    if (data.priority !== undefined && data.priority !== existing.priority) {
      updates.priority = data.priority as TaskPriority;
      changes.push({ type: 'PRIORITY_CHANGE', from: existing.priority, to: data.priority });
    }
    if (data.category !== undefined) {
      const newCat = data.category ?? null;
      if (newCat !== existing.category) updates.category = newCat;
    }
    if (data.visibility !== undefined && data.visibility !== existing.visibility) {
      updates.visibility = data.visibility as TaskVisibility;
    }
    if (data.assigneeId !== undefined) {
      const newAssignee = data.assigneeId ?? null;
      if (newAssignee !== existing.assigneeId) {
        updates.assignee = newAssignee
          ? { connect: { id: newAssignee } }
          : { disconnect: true };
        changes.push({
          type: 'ASSIGNMENT_CHANGE',
          from: existing.assigneeId,
          to: newAssignee,
        });
      }
    }
    if (data.dueAt !== undefined) {
      const newDue = data.dueAt ?? null;
      if (
        (newDue === null && existing.dueAt !== null) ||
        (newDue !== null && existing.dueAt === null) ||
        (newDue && existing.dueAt && newDue.getTime() !== existing.dueAt.getTime())
      ) {
        updates.dueAt = newDue;
        changes.push({
          type: 'DUE_DATE_CHANGE',
          from: existing.dueAt?.toISOString() ?? null,
          to: newDue?.toISOString() ?? null,
        });
      }
    }

    if (Object.keys(updates).length === 0) return existing;

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: taskId },
        data: updates,
      });

      // Create activity events for each meaningful change
      for (const change of changes) {
        await tx.taskActivity.create({
          data: {
            taskId,
            actorId: scope.actorUserId,
            type: change.type as ActivityType,
            fromValue: change.from,
            toValue: change.to,
          },
        });
      }

      // Mark embedding stale
      await tx.taskEmbedding.updateMany({
        where: { taskId },
        data: { staleAt: new Date() },
      });

      return task;
    });
  }

  async softDelete(scope: AuthorizationScope, taskId: string): Promise<boolean> {
    const existing = await this.findById(scope, taskId);
    if (!existing) return false;

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { deletedAt: new Date() },
      });

      await tx.taskActivity.create({
        data: {
          taskId,
          actorId: scope.actorUserId,
          type: 'STATUS_CHANGE',
          fromValue: existing.status,
          toValue: 'DELETED',
        },
      });

      await tx.taskEmbedding.updateMany({
        where: { taskId },
        data: { staleAt: new Date() },
      });
    });

    return true;
  }

  async findActivities(
    taskId: string,
    pagination: PaginationInput,
    order: 'asc' | 'desc' = 'desc',
  ) {
    const limit = clampPageSize(pagination.limit);
    const where: Prisma.TaskActivityWhereInput = {
      taskId,
      ...(pagination.cursor ? { id: { lt: pagination.cursor } } : {}),
    };

    const items = await this.prisma.taskActivity.findMany({
      where,
      orderBy: { createdAt: order },
      take: limit + 1,
      include: {
        actor: { select: { id: true, name: true } },
      },
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items: items.map((a) => ({
        id: a.id,
        taskId: a.taskId,
        actorId: a.actorId,
        actorName: a.actor.name,
        type: a.type,
        fromValue: a.fromValue,
        toValue: a.toValue,
        comment: a.comment,
        createdAt: a.createdAt.toISOString(),
      })),
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : undefined,
      hasMore,
    };
  }

  async addComment(
    taskId: string,
    actorId: string,
    comment: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.taskActivity.create({
        data: {
          taskId,
          actorId,
          type: 'COMMENT',
          comment,
        },
        include: {
          actor: { select: { id: true, name: true } },
        },
      });

      // Mark embedding stale
      await tx.taskEmbedding.updateMany({
        where: { taskId },
        data: { staleAt: new Date() },
      });

      return {
        id: activity.id,
        taskId: activity.taskId,
        actorId: activity.actorId,
        actorName: activity.actor.name,
        type: activity.type,
        comment: activity.comment,
        createdAt: activity.createdAt.toISOString(),
      };
    });
  }

  private isAdminOrOwner(scope: AuthorizationScope, orgId?: string): boolean {
    if (!orgId) return false;
    const roles = scope.rolesByOrg[orgId] ?? [];
    return roles.some((r) => r === 'admin' || r === 'owner');
  }
}
