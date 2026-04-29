import { TestBed } from '@angular/core/testing';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders TODO status with label and icon', () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentInstance.status = 'TODO';
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.textContent).toContain('To Do');
    expect(badge.classList).toContain('status-todo');
  });

  it('renders DONE status', () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentInstance.status = 'DONE';
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.textContent).toContain('Done');
  });

  it('renders BLOCKED status', () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentInstance.status = 'BLOCKED';
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.textContent).toContain('Blocked');
  });

  it('has title attribute for accessibility', () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentInstance.status = 'IN_PROGRESS';
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.getAttribute('title')).toBe('In Progress');
  });
});
