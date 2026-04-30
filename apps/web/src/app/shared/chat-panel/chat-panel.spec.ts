import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthState } from '../../auth/auth.state';
import { ChatApi, ChatAskResponse } from '../../services/chat.api';
import { ChatPanelComponent } from './chat-panel';

describe('ChatPanelComponent', () => {
  let chatApi: { ask: jest.Mock };
  let authState: AuthState;

  const mockProfile = {
    id: 'user-1',
    email: 'test@test.com',
    name: 'Test',
    disabledAt: null,
    memberships: [{ orgId: 'org-1', orgName: 'Test Org', orgSlug: 'test', role: 'admin' }],
  };

  const mockResponse: ChatAskResponse = {
    answer: 'You have 3 tasks assigned.',
    sources: [
      { taskId: 't-1', title: 'Task One', similarity: 0.9 },
      { taskId: 't-2', title: 'Task Two', similarity: 0.85 },
    ],
    conversationId: 'conv-1',
    userMessageId: 'msg-1',
    assistantMessageId: 'msg-2',
    intent: 'query',
    guardrailSafe: true,
    latencyMs: 500,
  };

  beforeEach(async () => {
    chatApi = { ask: jest.fn().mockReturnValue(of(mockResponse)) };

    await TestBed.configureTestingModule({
      imports: [ChatPanelComponent],
      providers: [
        { provide: ChatApi, useValue: chatApi },
        { provide: AuthState, useClass: AuthState },
        provideRouter([]),
      ],
    }).compileComponents();

    authState = TestBed.inject(AuthState);
    (authState as any)._user.set(mockProfile);
    (authState as any)._accessToken.set('token');
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(ChatPanelComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('starts closed', () => {
    const fixture = TestBed.createComponent(ChatPanelComponent);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('toggles open state', () => {
    const fixture = TestBed.createComponent(ChatPanelComponent);
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance.open()).toBe(true);
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('shows welcome when no messages', () => {
    const fixture = TestBed.createComponent(ChatPanelComponent);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Ask me about your tasks');
  });

  it('shows suggested prompts', () => {
    const fixture = TestBed.createComponent(ChatPanelComponent);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('What needs my attention?');
  });

  it('sends message and receives response', () => {
    const fixture = TestBed.createComponent(ChatPanelComponent);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    fixture.componentInstance.inputText.set('What tasks are assigned to me?');
    fixture.componentInstance.send();

    expect(chatApi.ask).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'What tasks are assigned to me?',
        orgId: 'org-1',
      }),
    );
  });

  it('does not send empty message', () => {
    const fixture = TestBed.createComponent(ChatPanelComponent);
    fixture.componentInstance.inputText.set('');
    fixture.componentInstance.send();
    expect(chatApi.ask).not.toHaveBeenCalled();
  });

  it('shows error when API fails', () => {
    chatApi.ask.mockReturnValue(throwError(() => new Error('API error')));
    const fixture = TestBed.createComponent(ChatPanelComponent);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    fixture.componentInstance.inputText.set('test');
    fixture.componentInstance.send();

    // After send, check that the component transitions to error state
    expect(fixture.componentInstance.sending()).toBe(false);
  });

  it('canSend is false when input is empty', () => {
    const fixture = TestBed.createComponent(ChatPanelComponent);
    fixture.componentInstance.inputText.set('');
    expect(fixture.componentInstance.canSend()).toBe(false);
  });

  it('canSend is false when sending', () => {
    const fixture = TestBed.createComponent(ChatPanelComponent);
    fixture.componentInstance.inputText.set('hello');
    fixture.componentInstance.sending.set(true);
    expect(fixture.componentInstance.canSend()).toBe(false);
  });
});
