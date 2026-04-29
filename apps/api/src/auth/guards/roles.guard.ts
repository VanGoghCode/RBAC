import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationScopeService } from '@task-ai/auth';
import { ROLES_KEY } from '../decorators';
import type { AuthenticatedUser, OrgRole } from '@task-ai/shared/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly scopeService: AuthorizationScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;
    if (!user) return false;

    const scope = await this.scopeService.resolveScope(user.userId);
    const orgId = request.params['orgId'] ?? request.body?.orgId ?? request.query['orgId'];
    if (!orgId) return false;

    const userRoles = scope.rolesByOrg[orgId] ?? [];
    return userRoles.some((r) => requiredRoles.includes(r as OrgRole));
  }
}
