export const ORG_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/**
 * Each role implies all roles listed below it.
 * owner > admin > member > viewer
 */
const ROLE_LEVELS: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function hasRole(required: OrgRole, actual: OrgRole): boolean {
  return ROLE_LEVELS[actual] >= ROLE_LEVELS[required];
}

export function isAtLeastMember(role: string): boolean {
  return ROLE_LEVELS[role as OrgRole] >= ROLE_LEVELS['member'];
}

export function isAtLeastAdmin(role: string): boolean {
  return ROLE_LEVELS[role as OrgRole] >= ROLE_LEVELS['admin'];
}

export function isOwner(role: string): boolean {
  return role === 'owner';
}

export function isViewer(role: string): boolean {
  return role === 'viewer';
}
