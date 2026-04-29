import {
  isAtLeastAdmin,
  isAtLeastManager,
  isAtLeastMember,
  isOwner,
  isViewer,
  isMember,
} from '@task-ai/shared/types';
import type { AuthorizationScope } from '@task-ai/shared/types';

export interface TaskPermissionContext {
  orgId: string;
  visibility: string;
  createdById: string;
  assigneeId?: string | null;
}

export class PermissionService {
  /**
   * VIEW Task:
   *   OWNER/ADMIN/MANAGER → all org tasks
   *   MEMBER              → PUBLIC + own created + assigned to them
   *   VIEWER              → PUBLIC + assigned to them only
   */
  canViewTask(scope: AuthorizationScope, task: TaskPermissionContext): boolean {
    if (!scope.allowedOrgIds.includes(task.orgId)) return false;

    const roles = scope.rolesByOrg[task.orgId] ?? [];
    if (roles.some((r) => isAtLeastManager(r) || isOwner(r))) return true;

    // MEMBER and VIEWER: visibility-gated
    if (task.visibility === 'PUBLIC') return true;

    if (task.visibility === 'ASSIGNED_ONLY') {
      return task.assigneeId === scope.actorUserId;
    }

    if (task.visibility === 'PRIVATE') {
      // MEMBER can see own private tasks, VIEWER cannot
      return roles.some((r) => isMember(r)) && task.createdById === scope.actorUserId;
    }

    return false;
  }

  /**
   * CREATE Task:
   *   All except VIEWER can create.
   *   MEMBER can only assign to self (enforced in service layer).
   */
  canCreateTask(scope: AuthorizationScope, orgId: string): boolean {
    if (!scope.allowedOrgIds.includes(orgId)) return false;
    const roles = scope.rolesByOrg[orgId] ?? [];
    return roles.some((r) => isAtLeastMember(r) && !isViewer(r));
  }

  /**
   * MEMBER can only assign to self.
   * MANAGER+ can assign to anyone in org.
   */
  canAssignToOther(scope: AuthorizationScope, orgId: string): boolean {
    if (!scope.allowedOrgIds.includes(orgId)) return false;
    const roles = scope.rolesByOrg[orgId] ?? [];
    return roles.some((r) => isAtLeastManager(r) || isOwner(r));
  }

  /**
   * UPDATE Task:
   *   OWNER/ADMIN/MANAGER → all org tasks
   *   MEMBER              → only own created or assigned tasks
   *   VIEWER              → none
   */
  canUpdateTask(
    scope: AuthorizationScope,
    task: TaskPermissionContext,
  ): boolean {
    if (!scope.allowedOrgIds.includes(task.orgId)) return false;

    const roles = scope.rolesByOrg[task.orgId] ?? [];
    if (roles.some((r) => isAtLeastManager(r) || isOwner(r))) return true;

    if (roles.some((r) => isMember(r))) {
      return (
        task.createdById === scope.actorUserId ||
        task.assigneeId === scope.actorUserId
      );
    }

    return false;
  }

  /**
   * DELETE Task:
   *   OWNER/ADMIN/MANAGER → all org tasks
   *   MEMBER              → only own created tasks
   *   VIEWER              → none
   */
  canDeleteTask(
    scope: AuthorizationScope,
    task: TaskPermissionContext,
  ): boolean {
    if (!scope.allowedOrgIds.includes(task.orgId)) return false;

    const roles = scope.rolesByOrg[task.orgId] ?? [];
    if (roles.some((r) => isAtLeastManager(r) || isOwner(r))) return true;

    if (roles.some((r) => isMember(r))) {
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
