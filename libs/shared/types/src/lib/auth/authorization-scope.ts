/**
 * Authorization scope passed to every repository method.
 * Repositories MUST use this to filter queries — never query without it.
 */
export interface AuthorizationScope {
  actorUserId: string;
  allowedOrgIds: string[];
  /** Roles the actor holds in each org */
  rolesByOrg: Record<string, string[]>;
}

export interface PaginationInput {
  cursor?: string;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export function clampPageSize(limit: number): number {
  return Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
}
