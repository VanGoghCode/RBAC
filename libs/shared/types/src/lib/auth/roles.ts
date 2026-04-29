export const ORG_ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/**
 * owner > admin > manager > member > viewer
 * OWNER   → full access across orgs (including children)
 * ADMIN   → full access within org
 * MANAGER → create/update most tasks, assign to others
 * MEMBER  → CRUD only own/assigned tasks, assign only to self
 * VIEWER  → read-only, limited visibility
 */
const ROLE_LEVELS: Record<OrgRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

export function hasRole(required: OrgRole, actual: OrgRole): boolean {
  return ROLE_LEVELS[actual] >= ROLE_LEVELS[required];
}

export function isAtLeastMember(role: string): boolean {
  return ROLE_LEVELS[role as OrgRole] >= ROLE_LEVELS['member'];
}

export function isAtLeastManager(role: string): boolean {
  return ROLE_LEVELS[role as OrgRole] >= ROLE_LEVELS['manager'];
}

export function isAtLeastAdmin(role: string): boolean {
  return ROLE_LEVELS[role as OrgRole] >= ROLE_LEVELS['admin'];
}

export function isOwner(role: string): boolean {
  return role === 'owner';
}

export function isManager(role: string): boolean {
  return role === 'manager';
}

export function isMember(role: string): boolean {
  return role === 'member';
}

export function isViewer(role: string): boolean {
  return role === 'viewer';
}
