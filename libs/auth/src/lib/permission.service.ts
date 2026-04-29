import { isAtLeastAdmin, isAtLeastMember, isOwner, isViewer } from '@task-ai/shared/types';
import type { AuthorizationScope } from '@task-ai/shared/types';

export interface TaskPermissionContext {
  orgId: string;
  visibility: string;
  createdById: string;
  assigneeId?: string | null;
}

export class PermissionService {
  canViewTask(scope: AuthorizationScope, task: TaskPermissionContext): boolean {
    if (!scope.allowedOrgIds.includes(task.orgId)) return false;

    const roles = scope.rolesByOrg[task.orgId] ?? [];
    if (roles.some((r) => isAtLeastAdmin(r) || isOwner(r))) return true;

    if (task.visibility === 'PUBLIC') return true;

    if (task.visibility === 'ASSIGNED_ONLY') {
      return task.assigneeId === scope.actorUserId;
    }

    if (task.visibility === 'PRIVATE') {
      return task.createdById === scope.actorUserId;
    }

    return false;
  }

  canCreateTask(scope: AuthorizationScope, orgId: string): boolean {
    if (!scope.allowedOrgIds.includes(orgId)) return false;
    const roles = scope.rolesByOrg[orgId] ?? [];
    return roles.some((r) => isAtLeastMember(r) && !isViewer(r));
  }

  canUpdateTask(
    scope: AuthorizationScope,
    task: TaskPermissionContext,
  ): boolean {
    if (!scope.allowedOrgIds.includes(task.orgId)) return false;

    const roles = scope.rolesByOrg[task.orgId] ?? [];
    if (roles.some((r) => isAtLeastAdmin(r) || isOwner(r))) return true;

    if (roles.some((r) => isAtLeastMember(r))) {
      return (
        task.createdById === scope.actorUserId ||
        task.assigneeId === scope.actorUserId
      );
    }

    return false;
  }

  canDeleteTask(
    scope: AuthorizationScope,
    task: TaskPermissionContext,
  ): boolean {
    if (!scope.allowedOrgIds.includes(task.orgId)) return false;

    const roles = scope.rolesByOrg[task.orgId] ?? [];
    if (roles.some((r) => isAtLeastAdmin(r) || isOwner(r))) return true;

    if (roles.some((r) => isAtLeastMember(r))) {
      return task.createdById === scope.actorUserId;
    }

    return false;
  }

  canQueryOrgTasksForAi(scope: AuthorizationScope, orgId: string): boolean {
    if (!scope.allowedOrgIds.includes(orgId)) return false;
    const roles = scope.rolesByOrg[orgId] ?? [];
    return roles.some((r) => !isViewer(r));
  }

  canCreateTaskFromChat(scope: AuthorizationScope, orgId: string): boolean {
    return this.canCreateTask(scope, orgId);
  }
}
