import { TestBed } from '@angular/core/testing';
import { PriorityBadge } from './priority-badge';

describe('PriorityBadge', () => {
  it('renders HIGH priority with label and icon', () => {
    const fixture = TestBed.createComponent(PriorityBadge);
    fixture.componentInstance.priority = 'HIGH';
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.textContent).toContain('High');
    expect(badge.classList).toContain('priority-high');
  });

  it('renders CRITICAL priority', () => {
    const fixture = TestBed.createComponent(PriorityBadge);
    fixture.componentInstance.priority = 'CRITICAL';
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.textContent).toContain('Critical');
  });

  it('has title attribute for accessibility', () => {
    const fixture = TestBed.createComponent(PriorityBadge);
    fixture.componentInstance.priority = 'LOW';
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.getAttribute('title')).toBe('Low');
  });
});
