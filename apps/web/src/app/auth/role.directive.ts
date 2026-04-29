import { Directive, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthState } from './auth.state';
import type { OrgRole } from '@task-ai/shared/types';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private readonly authState = inject(AuthState);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  @Input() set appHasRole(role: OrgRole) {
    this.checkRole(role, this.orgId);
  }

  @Input() appHasRoleOrgId = '';

  private get orgId(): string {
    return this.appHasRoleOrgId;
  }

  private checkRole(role: OrgRole, orgId: string): void {
    if (this.authState.hasRole(orgId, role)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
