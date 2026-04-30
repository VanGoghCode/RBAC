import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  AuthorizationScopeService,
  PermissionService,
} from '@task-ai/auth';
import { TaskRepository, AuditRepository } from '@task-ai/tasks';
import { PrismaService } from '../prisma';
import type {
  CreateTaskDto,
  UpdateTaskDto,
  TaskListQueryDto,
  CreateCommentDto,
  ActivityQueryDto,
} from './dto';

@Injectable()
export class TasksService {
  private readonly permission = new PermissionService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskRepo: TaskRepository,
    private readonly auditRepo: AuditRepository,
    private readonly scopeService: AuthorizationScopeService,
  ) {}

  async create(userId: string, dto: CreateTaskDto) {
    const scope = await this.scopeService.resolveScope(userId);

    if (!this.permission.canCreateTask(scope, dto.orgId)) {
      throw new ForbiddenException('You cannot create tasks in this organization');
    }

    // Validate assignee belongs to org
    if (dto.assigneeId) {
      // MEMBER can only assign to self
      if (!this.permission.canAssignToOther(scope, dto.orgId) && dto.assigneeId !== userId) {
        throw new ForbiddenException('Members can only assign tasks to themselves');
      }

      const membership = await this.prisma.orgMembership.findFirst({
        where: { userId: dto.assigneeId, orgId: dto.orgId },
      });
      if (!membership) {
        throw new BadRequestException('Assignee is not a member of this organization');
      }
    }

    const task = await this.taskRepo.create(scope, {
      orgId: dto.orgId,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      category: dto.category,
      tags: dto.tags,
      visibility: dto.visibility,
      assigneeId: dto.assigneeId,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
    });

    await this.auditRepo.log({
      actorId: userId,
      orgId: dto.orgId,
      action: 'TASK_CREATED',
      resourceType: 'task',
      resourceId: task.id,
      metadata: { title: dto.title, status: dto.status },
    });

    return task;
  }

  async findMany(userId: string, query: TaskListQueryDto) {
    const scope = await this.scopeService.resolveScope(userId);

    // If orgId specified, verify access
    if (query.orgId && !scope.allowedOrgIds.includes(query.orgId)) {
      return { items: [], nextCursor: undefined, hasMore: false };
    }

    return this.taskRepo.findMany(
      scope,
      { cursor: query.cursor, limit: query.limit },
      {
        status: query.status,
        assigneeId: query.assigneeId,
        orgId: query.orgId,
        priority: query.priority,
        category: query.category,
        search: query.search,
        dueBefore: query.dueBefore,
        dueAfter: query.dueAfter,
      },
      query.sort,
      query.order,
    );
  }

  async findById(userId: string, taskId: string) {
    const scope = await this.scopeService.resolveScope(userId);
    const task = await this.taskRepo.findById(scope, taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!this.permission.canViewTask(scope, task)) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const scope = await this.scopeService.resolveScope(userId);
    const task = await this.taskRepo.findById(scope, taskId);

    if (!task || !this.permission.canUpdateTask(scope, task)) {
      throw new NotFoundException('Task not found');
    }

    // Validate assignee belongs to org if changing
    if (dto.assigneeId) {
      // MEMBER can only assign to self
      if (!this.permission.canAssignToOther(scope, task.orgId) && dto.assigneeId !== userId) {
        throw new ForbiddenException('Members can only assign tasks to themselves');
      }

      const membership = await this.prisma.orgMembership.findFirst({
        where: { userId: dto.assigneeId, orgId: task.orgId },
      });
      if (!membership) {
        throw new BadRequestException('Assignee is not a member of this organization');
      }
    }

    const updated = await this.taskRepo.update(scope, taskId, {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      category: dto.category,
      tags: dto.tags,
      visibility: dto.visibility,
      assigneeId: dto.assigneeId,
      dueAt: dto.dueAt === null ? null : dto.dueAt ? new Date(dto.dueAt) : undefined,
    });

    await this.auditRepo.log({
      actorId: userId,
      orgId: task.orgId,
      action: 'TASK_UPDATED',
      resourceType: 'task',
      resourceId: taskId,
      metadata: { changedFields: Object.keys(dto) },
    });

    return updated;
  }

  async remove(userId: string, taskId: string) {
    const scope = await this.scopeService.resolveScope(userId);
    const task = await this.taskRepo.findById(scope, taskId);

    if (!task || !this.permission.canDeleteTask(scope, task)) {
      throw new NotFoundException('Task not found');
    }

    await this.taskRepo.softDelete(scope, taskId);

    await this.auditRepo.log({
      actorId: userId,
      orgId: task.orgId,
      action: 'TASK_DELETED',
      resourceType: 'task',
      resourceId: taskId,
      metadata: { title: task.title },
    });

    return { success: true };
  }

  async getActivities(userId: string, taskId: string, query: ActivityQueryDto) {
    const scope = await this.scopeService.resolveScope(userId);
    const task = await this.taskRepo.findById(scope, taskId);

    if (!task || !this.permission.canViewTask(scope, task)) {
      throw new NotFoundException('Task not found');
    }

    return this.taskRepo.findActivities(taskId, { cursor: query.cursor, limit: query.limit }, query.order);
  }

  async addComment(userId: string, taskId: string, dto: CreateCommentDto) {
    const scope = await this.scopeService.resolveScope(userId);
    const task = await this.taskRepo.findById(scope, taskId);

    if (!task || !this.permission.canViewTask(scope, task)) {
      throw new NotFoundException('Task not found');
    }

    // Only members+ can comment (viewers cannot)
    if (!this.permission.canCreateTask(scope, task.orgId)) {
      throw new ForbiddenException('You cannot comment on this task');
    }

    const activity = await this.taskRepo.addComment(taskId, userId, dto.comment);

    await this.auditRepo.log({
      actorId: userId,
      orgId: task.orgId,
      action: 'COMMENT_ADDED',
      resourceType: 'task',
      resourceId: taskId,
      metadata: { commentLength: dto.comment.length },
    });

    return activity;
  }
}
