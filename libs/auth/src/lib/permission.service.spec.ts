import { PermissionService, TaskPermissionContext } from './permission.service';
import type { AuthorizationScope } from '@task-ai/shared/types';

describe('PermissionService', () => {
  let service: PermissionService;

  const orgA = 'org-a';
  const orgB = 'org-b';
  const ownerUser = 'user-owner';
  const adminUser = 'user-admin';
  const memberUser = 'user-member';
  const viewerUser = 'user-viewer';

  const makeScope = (
    userId: string,
    orgs: Record<string, string[]>,
  ): AuthorizationScope => ({
    actorUserId: userId,
    allowedOrgIds: Object.keys(orgs),
    rolesByOrg: orgs,
  });

  beforeEach(() => {
    service = new PermissionService();
  });

  // ─── canViewTask ──────────────────────────────────────────────

  describe('canViewTask', () => {
    const publicTask: TaskPermissionContext = {
      orgId: orgA,
      visibility: 'PUBLIC',
      createdById: adminUser,
      assigneeId: null,
    };
    const assignedOnlyTask: TaskPermissionContext = {
      orgId: orgA,
      visibility: 'ASSIGNED_ONLY',
      createdById: adminUser,
      assigneeId: memberUser,
    };
    const privateTask: TaskPermissionContext = {
      orgId: orgA,
      visibility: 'PRIVATE',
      createdById: adminUser,
      assigneeId: null,
    };

    it('owner can view any task', () => {
      const scope = makeScope(ownerUser, { [orgA]: ['owner'] });
      expect(service.canViewTask(scope, publicTask)).toBe(true);
      expect(service.canViewTask(scope, assignedOnlyTask)).toBe(true);
      expect(service.canViewTask(scope, privateTask)).toBe(true);
    });

    it('admin can view any task', () => {
      const scope = makeScope(adminUser, { [orgA]: ['admin'] });
      expect(service.canViewTask(scope, publicTask)).toBe(true);
      expect(service.canViewTask(scope, assignedOnlyTask)).toBe(true);
      expect(service.canViewTask(scope, privateTask)).toBe(true);
    });

    it('member can view public tasks', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      expect(service.canViewTask(scope, publicTask)).toBe(true);
    });

    it('member can view assigned-only if assignee', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      expect(service.canViewTask(scope, assignedOnlyTask)).toBe(true);
    });

    it('member cannot view assigned-only if not assignee', () => {
      const scope = makeScope('other-member', { [orgA]: ['member'] });
      expect(service.canViewTask(scope, assignedOnlyTask)).toBe(false);
    });

    it('member can view private if creator', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      const ownPrivate = { ...privateTask, createdById: memberUser };
      expect(service.canViewTask(scope, ownPrivate)).toBe(true);
    });

    it('member cannot view private if not creator', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      expect(service.canViewTask(scope, privateTask)).toBe(false);
    });

    it('viewer can view public tasks', () => {
      const scope = makeScope(viewerUser, { [orgA]: ['viewer'] });
      expect(service.canViewTask(scope, publicTask)).toBe(true);
    });

    it('viewer can view assigned-only if assignee', () => {
      const scope = makeScope(viewerUser, { [orgA]: ['viewer'] });
      const assignedToViewer = { ...assignedOnlyTask, assigneeId: viewerUser };
      expect(service.canViewTask(scope, assignedToViewer)).toBe(true);
    });

    it('viewer cannot view private tasks', () => {
      const scope = makeScope(viewerUser, { [orgA]: ['viewer'] });
      expect(service.canViewTask(scope, privateTask)).toBe(false);
    });

    it('cross-org access denied', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      const crossOrgTask = { ...publicTask, orgId: orgB };
      expect(service.canViewTask(scope, crossOrgTask)).toBe(false);
    });

    it('owner in parent org can view child org tasks', () => {
      const scope = makeScope(ownerUser, {
        [orgA]: ['owner'],
        [orgB]: ['owner'],
      });
      const childTask: TaskPermissionContext = {
        orgId: orgB,
        visibility: 'PUBLIC',
        createdById: 'someone',
        assigneeId: null,
      };
      expect(service.canViewTask(scope, childTask)).toBe(true);
    });
  });

  // ─── canCreateTask ────────────────────────────────────────────

  describe('canCreateTask', () => {
    it('viewer cannot create', () => {
      const scope = makeScope(viewerUser, { [orgA]: ['viewer'] });
      expect(service.canCreateTask(scope, orgA)).toBe(false);
    });

    it('member can create', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      expect(service.canCreateTask(scope, orgA)).toBe(true);
    });

    it('admin can create', () => {
      const scope = makeScope(adminUser, { [orgA]: ['admin'] });
      expect(service.canCreateTask(scope, orgA)).toBe(true);
    });

    it('owner can create', () => {
      const scope = makeScope(ownerUser, { [orgA]: ['owner'] });
      expect(service.canCreateTask(scope, orgA)).toBe(true);
    });

    it('cross-org create denied', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      expect(service.canCreateTask(scope, orgB)).toBe(false);
    });
  });

  // ─── canUpdateTask ────────────────────────────────────────────

  describe('canUpdateTask', () => {
    const task: TaskPermissionContext = {
      orgId: orgA,
      visibility: 'PUBLIC',
      createdById: adminUser,
      assigneeId: memberUser,
    };

    it('owner can update any', () => {
      const scope = makeScope(ownerUser, { [orgA]: ['owner'] });
      expect(service.canUpdateTask(scope, task)).toBe(true);
    });

    it('admin can update any', () => {
      const scope = makeScope(adminUser, { [orgA]: ['admin'] });
      expect(service.canUpdateTask(scope, task)).toBe(true);
    });

    it('member can update own task', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      const ownTask = { ...task, createdById: memberUser };
      expect(service.canUpdateTask(scope, ownTask)).toBe(true);
    });

    it('member can update assigned task', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      expect(service.canUpdateTask(scope, task)).toBe(true);
    });

    it('member cannot update other unassigned task', () => {
      const scope = makeScope('other-member', { [orgA]: ['member'] });
      const unrelated = { ...task, createdById: 'someone', assigneeId: null };
      expect(service.canUpdateTask(scope, unrelated)).toBe(false);
    });

    it('viewer cannot update', () => {
      const scope = makeScope(viewerUser, { [orgA]: ['viewer'] });
      expect(service.canUpdateTask(scope, task)).toBe(false);
    });
  });

  // ─── canDeleteTask ────────────────────────────────────────────

  describe('canDeleteTask', () => {
    const task: TaskPermissionContext = {
      orgId: orgA,
      visibility: 'PUBLIC',
      createdById: memberUser,
      assigneeId: null,
    };

    it('admin can delete any', () => {
      const scope = makeScope(adminUser, { [orgA]: ['admin'] });
      expect(service.canDeleteTask(scope, task)).toBe(true);
    });

    it('owner can delete any', () => {
      const scope = makeScope(ownerUser, { [orgA]: ['owner'] });
      expect(service.canDeleteTask(scope, task)).toBe(true);
    });

    it('member can delete own', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      expect(service.canDeleteTask(scope, task)).toBe(true);
    });

    it('member cannot delete others', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      const others = { ...task, createdById: 'someone-else' };
      expect(service.canDeleteTask(scope, others)).toBe(false);
    });

    it('viewer cannot delete', () => {
      const scope = makeScope(viewerUser, { [orgA]: ['viewer'] });
      expect(service.canDeleteTask(scope, task)).toBe(false);
    });
  });

  // ─── canQueryOrgTasksForAi ────────────────────────────────────

  describe('canQueryOrgTasksForAi', () => {
    it('viewer denied', () => {
      const scope = makeScope(viewerUser, { [orgA]: ['viewer'] });
      expect(service.canQueryOrgTasksForAi(scope, orgA)).toBe(false);
    });

    it('member allowed', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      expect(service.canQueryOrgTasksForAi(scope, orgA)).toBe(true);
    });

    it('admin allowed', () => {
      const scope = makeScope(adminUser, { [orgA]: ['admin'] });
      expect(service.canQueryOrgTasksForAi(scope, orgA)).toBe(true);
    });

    it('owner allowed', () => {
      const scope = makeScope(ownerUser, { [orgA]: ['owner'] });
      expect(service.canQueryOrgTasksForAi(scope, orgA)).toBe(true);
    });
  });

  // ─── canCreateTaskFromChat ────────────────────────────────────

  describe('canCreateTaskFromChat', () => {
    it('viewer denied', () => {
      const scope = makeScope(viewerUser, { [orgA]: ['viewer'] });
      expect(service.canCreateTaskFromChat(scope, orgA)).toBe(false);
    });

    it('member allowed', () => {
      const scope = makeScope(memberUser, { [orgA]: ['member'] });
      expect(service.canCreateTaskFromChat(scope, orgA)).toBe(true);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────

  describe('edge cases', () => {
    it('user with no memberships gets empty scope', () => {
      const scope = makeScope('nobody', {});
      expect(service.canViewTask(scope, {
        orgId: orgA, visibility: 'PUBLIC', createdById: adminUser, assigneeId: null,
      })).toBe(false);
    });

    it('user in two orgs with different roles', () => {
      const scope = makeScope(memberUser, {
        [orgA]: ['admin'],
        [orgB]: ['viewer'],
      });
      expect(service.canCreateTask(scope, orgA)).toBe(true);
      expect(service.canCreateTask(scope, orgB)).toBe(false);
    });

    it('owner in parent org and viewer in child org', () => {
      const scope = makeScope(ownerUser, {
        [orgA]: ['owner'],
        [orgB]: ['viewer'],
      });
      // Owner scope in orgA still works
      expect(service.canCreateTask(scope, orgA)).toBe(true);
      // But viewer in orgB cannot create
      expect(service.canCreateTask(scope, orgB)).toBe(false);
    });
  });
});
