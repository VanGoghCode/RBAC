import { SetMetadata } from '@nestjs/common';
import type { OrgRole } from '@task-ai/shared/types';

export const ROLES_KEY = 'roles';
export const RequireRole = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles);
