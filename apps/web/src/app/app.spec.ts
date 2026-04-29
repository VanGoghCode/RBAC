import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { AuthState } from './auth/auth.state';
import type { UserProfileResponse } from '@task-ai/shared/types';

const mockProfile: UserProfileResponse = {
  id: 'user-1',
  email: 'admin@acme.com',
  name: 'Admin User',
  disabledAt: null,
  memberships: [{ orgId: 'org-1', orgName: 'Acme Corp', orgSlug: 'acme', role: 'admin' }],
};

describe('App', () => {
  let authState: AuthState;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
      ],
    }).compileComponents();

    authState = TestBed.inject(AuthState);
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders skip link', () => {
    const fixture = TestBed.createComponent(App);
    (authState as any)._user.set(mockProfile);
    (authState as any)._accessToken.set('token');
    fixture.detectChanges();

    const skipLink = fixture.nativeElement.querySelector('.skip-link');
    expect(skipLink).toBeTruthy();
    expect(skipLink.getAttribute('href')).toBe('#main-content');
    expect(skipLink.textContent).toContain('Skip to main content');
  });

  it('renders top navigation when authenticated', () => {
    const fixture = TestBed.createComponent(App);
    (authState as any)._user.set(mockProfile);
    (authState as any)._accessToken.set('token');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar')).toBeTruthy();
    expect(compiled.querySelector('.topbar-brand')?.textContent).toContain('TaskAI');
    expect(compiled.querySelector('.topbar-org')?.textContent).toContain('Acme Corp');
  });

  it('renders router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('logout button has accessible name', () => {
    const fixture = TestBed.createComponent(App);
    (authState as any)._user.set(mockProfile);
    (authState as any)._accessToken.set('token');
    fixture.detectChanges();

    const userBtn = fixture.nativeElement.querySelector('.topbar-user-btn');
    expect(userBtn).toBeTruthy();
    expect(userBtn.getAttribute('aria-label')).toBe('User menu');
  });
});
