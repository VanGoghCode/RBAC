import {
  Component,
  inject,
  signal,
  computed,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthState } from '../../auth/auth.state';
import {
  ChatApi,
  ChatAskResponse,
  ChatSource,
} from '../../services/chat.api';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[];
  loading?: boolean;
}

const SUGGESTED_PROMPTS = [
  'What needs my attention?',
  'Show overdue tasks',
  "Summarize my team's progress",
  'What did I finish recently?',
];

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="chat-panel" [class.open]="open()" role="complementary" aria-label="Task Assistant">
      <div class="chat-header">
        <h2>Task Assistant</h2>
        <button class="chat-close" (click)="toggle()" aria-label="Close chat panel">&times;</button>
      </div>

      <div class="chat-messages" #messageList role="log" aria-live="polite" aria-relevant="additions">
        @if (messages().length === 0) {
          <div class="chat-welcome">
            <p class="welcome-text">Ask me about your tasks</p>
            <div class="suggested-prompts">
              @for (prompt of suggestedPrompts; track prompt) {
                <button class="prompt-chip" (click)="sendSuggested(prompt)">{{ prompt }}</button>
              }
            </div>
          </div>
        }

        @for (msg of messages(); track $index) {
          <div class="chat-message" [class]="msg.role">
            @if (msg.loading) {
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            } @else {
              <div class="message-content">{{ msg.content }}</div>
            }

            @if (msg.sources.length > 0 && !msg.loading) {
              <div class="source-cards">
                <span class="sources-label">Sources:</span>
                @for (source of msg.sources; track source.taskId) {
                  <button
                    class="source-card"
                    (click)="navigateToTask(source.taskId)"
                    (keydown.enter)="navigateToTask(source.taskId)"
                    [attr.aria-label]="'View task: ' + source.title"
                    tabindex="0"
                  >
                    <span class="source-title">{{ source.title }}</span>
                    @if (source.status) {
                      <span class="source-status">{{ source.status }}</span>
                    }
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>

      @if (error()) {
        <div class="chat-error" role="alert">{{ error() }}</div>
      }

      <div class="chat-input-area">
        <div class="input-wrapper">
          <textarea
            #messageInput
            [(ngModel)]="inputText"
            [disabled]="sending()"
            placeholder="Ask about your tasks..."
            rows="1"
            (keydown)="handleKeyDown($event)"
            aria-label="Chat message input"
          ></textarea>
          <button
            class="send-btn"
            (click)="send()"
            [disabled]="!canSend()"
            aria-label="Send message"
          >
            @if (sending()) {
              <span class="spinner"></span>
            } @else {
              &#10148;
            }
          </button>
        </div>
      </div>
    </div>

    <button
      class="chat-toggle"
      (click)="toggle()"
      [attr.aria-label]="open() ? 'Close task assistant' : 'Open task assistant'"
      [attr.aria-expanded]="open()"
    >
      @if (open()) {
        &#10005;
      } @else {
        &#128172;
      }
    </button>
  `,
  styles: [`
    .chat-panel {
      position: fixed;
      top: 0;
      right: -420px;
      width: 400px;
      height: 100vh;
      background: var(--color-bg);
      border-left: 1px solid var(--color-border);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      z-index: 1000;
      transition: right 0.3s ease;
    }
    .chat-panel.open { right: 0; }

    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-muted);
    }
    .chat-header h2 {
      font-size: var(--text-lg);
      font-weight: 600;
      margin: 0;
    }
    .chat-close {
      background: none;
      border: none;
      font-size: var(--text-xl);
      cursor: pointer;
      color: var(--color-text-muted);
      padding: var(--space-xs);
      line-height: 1;
    }
    .chat-close:hover { color: var(--color-text); }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-md);
    }

    .chat-welcome {
      text-align: center;
      padding: var(--space-xl) var(--space-md);
    }
    .welcome-text {
      font-size: var(--text-lg);
      color: var(--color-text-muted);
      margin-bottom: var(--space-lg);
    }
    .suggested-prompts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
      justify-content: center;
    }
    .prompt-chip {
      background: var(--color-primary-light);
      color: var(--color-primary);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-lg);
      padding: var(--space-xs) var(--space-md);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .prompt-chip:hover { background: var(--color-primary); color: var(--color-bg); }

    .chat-message {
      margin-bottom: var(--space-md);
      max-width: 85%;
    }
    .chat-message.user {
      margin-left: auto;
      background: var(--color-primary);
      color: var(--color-text-inverse);
      border-radius: var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg);
      padding: var(--space-sm) var(--space-md);
    }
    .chat-message.assistant {
      background: var(--color-bg-muted);
      border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm);
      padding: var(--space-sm) var(--space-md);
    }
    .message-content {
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.5;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: var(--space-xs) 0;
    }
    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: var(--color-text-muted);
      border-radius: 50%;
      animation: typing 1.4s infinite both;
    }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }

    .source-cards {
      margin-top: var(--space-sm);
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
      align-items: center;
    }
    .sources-label {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .source-card {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 2px var(--space-sm);
      font-size: var(--text-xs);
      cursor: pointer;
      transition: border-color var(--transition-fast);
    }
    .source-card:hover { border-color: var(--color-primary); }
    .source-title { color: var(--color-primary); font-weight: 500; }
    .source-status {
      background: var(--color-bg-muted);
      padding: 1px 4px;
      border-radius: var(--radius-sm);
      font-size: 0.65rem;
    }

    .chat-error {
      padding: var(--space-sm) var(--space-md);
      background: var(--color-error-bg);
      color: var(--color-error);
      font-size: var(--text-sm);
      border-top: 1px solid var(--color-error);
    }

    .chat-input-area {
      padding: var(--space-md);
      border-top: 1px solid var(--color-border);
    }
    .input-wrapper {
      display: flex;
      gap: var(--space-sm);
      align-items: flex-end;
    }
    textarea {
      flex: 1;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-sm) var(--space-md);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      resize: none;
      min-height: 40px;
      max-height: 120px;
      line-height: 1.5;
    }
    textarea:focus { border-color: var(--color-border-focus); outline: none; box-shadow: var(--focus-ring); }
    textarea::placeholder { color: var(--color-text-muted); }

    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      border: none;
      background: var(--color-primary);
      color: var(--color-text-inverse);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-base);
      flex-shrink: 0;
    }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .send-btn:not(:disabled):hover { background: var(--color-primary-hover); }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--color-text-inverse);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .chat-toggle {
      position: fixed;
      bottom: var(--space-xl);
      right: var(--space-xl);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: var(--color-primary);
      color: var(--color-text-inverse);
      font-size: 24px;
      cursor: pointer;
      box-shadow: var(--shadow-md);
      z-index: 999;
      transition: background var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-toggle:hover { background: var(--color-primary-hover); }

    @media (max-width: 768px) {
      .chat-panel { width: 100%; right: -100%; }
    }
  `],
})
export class ChatPanelComponent implements AfterViewChecked, OnDestroy {
  private readonly chatApi = inject(ChatApi);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);

  readonly open = signal(false);
  readonly messages = signal<DisplayMessage[]>([]);
  readonly inputText = signal('');
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly suggestedPrompts = SUGGESTED_PROMPTS;

  private conversationId: string | undefined;
  private shouldScroll = false;
  private sub?: Subscription;

  @ViewChild('messageList') messageListEl!: ElementRef<HTMLElement>;
  @ViewChild('messageInput') messageInputEl!: ElementRef<HTMLTextAreaElement>;

  readonly canSend = computed(() => this.inputText().trim().length > 0 && !this.sending());

  toggle() {
    this.open.update((v) => !v);
    if (this.open()) {
      setTimeout(() => this.messageInputEl?.nativeElement?.focus(), 300);
    }
  }

  sendSuggested(prompt: string) {
    this.inputText.set(prompt);
    this.send();
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send() {
    const text = this.inputText().trim();
    if (!text || this.sending()) return;

    const orgId = this.authState.activeOrgId();
    if (!orgId) {
      this.error.set('No active organization selected.');
      return;
    }

    this.messages.update((msgs) => [...msgs, { role: 'user', content: text, sources: [] }]);
    this.messages.update((msgs) => [...msgs, { role: 'assistant', content: '', sources: [], loading: true }]);
    this.inputText.set('');
    this.error.set(null);
    this.sending.set(true);
    this.shouldScroll = true;

    this.sub = this.chatApi.ask({
      message: text,
      conversationId: this.conversationId,
      orgId,
    }).subscribe({
      next: (response: ChatAskResponse) => {
        this.conversationId = response.conversationId;
        this.messages.update((msgs) => {
          const updated = [...msgs];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.loading) {
            updated[lastIdx] = {
              role: 'assistant',
              content: response.answer,
              sources: response.sources,
            };
          }
          return updated;
        });
        this.sending.set(false);
        this.shouldScroll = true;
      },
      error: (err) => {
        this.messages.update((msgs) => {
          const updated = [...msgs];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.loading) {
            updated[lastIdx] = {
              role: 'assistant',
              content: 'Sorry, I encountered an error. Please try again.',
              sources: [],
            };
          }
          return updated;
        });
        this.error.set(err?.message ?? 'Failed to get response');
        this.sending.set(false);
      },
    });
  }

  navigateToTask(taskId: string) {
    this.router.navigate(['/tasks', taskId]);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.messageListEl?.nativeElement) {
      const el = this.messageListEl.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
