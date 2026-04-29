import type { PrismaClient } from '@prisma/client';
import type { AuthorizationScope } from '@task-ai/shared/types';

export class AuthorizationScopeService {
  constructor(private readonly prisma: PrismaClient) {}

  async resolveScope(userId: string): Promise<AuthorizationScope> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { disabledAt: true },
    });

    if (!user || user.disabledAt) {
      return { actorUserId: userId, allowedOrgIds: [], rolesByOrg: {} };
    }

    const memberships = await this.prisma.orgMembership.findMany({
      where: { userId },
      select: { orgId: true, role: true },
    });

    const allowedOrgIds: string[] = [];
    const rolesByOrg: Record<string, string[]> = {};

    for (const m of memberships) {
      allowedOrgIds.push(m.orgId);
      if (!rolesByOrg[m.orgId]) rolesByOrg[m.orgId] = [];
      rolesByOrg[m.orgId].push(m.role);
    }

    // Owner in parent org gets child org access
    const ownerOrgIds = memberships
      .filter((m) => m.role === 'owner')
      .map((m) => m.orgId);

    if (ownerOrgIds.length > 0) {
      const childOrgs = await this.prisma.organization.findMany({
        where: { parentOrgId: { in: ownerOrgIds } },
        select: { id: true },
      });
      for (const child of childOrgs) {
        if (!allowedOrgIds.includes(child.id)) {
          allowedOrgIds.push(child.id);
          if (!rolesByOrg[child.id]) rolesByOrg[child.id] = [];
          // Owner in parent is treated as owner in child
          if (!rolesByOrg[child.id].includes('owner')) {
            rolesByOrg[child.id].push('owner');
          }
        }
      }
    }

    return { actorUserId: userId, allowedOrgIds, rolesByOrg };
  }

  async resolveChildOrgIds(orgId: string): Promise<string[]> {
    const children = await this.prisma.organization.findMany({
      where: { parentOrgId: orgId },
      select: { id: true },
    });
    const ids = children.map((c) => c.id);
    // Recurse for nested children
    for (const child of children) {
      const nested = await this.resolveChildOrgIds(child.id);
      ids.push(...nested);
    }
    return ids;
  }
}
