import {
  Component,
  inject,
  signal,
  computed,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  OnDestroy,
  Pipe,
  PipeTransform,
  DomSanitizer,
  SafeHtml,
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

/** Lightweight markdown → HTML for chat responses (bold, italic, lists, headers, code, line breaks). */
function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Headers (### style, must be at start of line)
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Unordered list items
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Line breaks (double newline → paragraph, single → br)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
  // Wrap in paragraph tags
  html = `<p>${html}</p>`;
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

@Pipe({ name: 'markdown', standalone: true })
class MarkdownPipe implements PipeTransform {
  constructor(private readonly sanitizer: DomSanitizer) {}
  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(value));
  }
}

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
  imports: [FormsModule, MarkdownPipe],
  template: `
    <div class="chat-panel" [class.open]="open()" role="complementary" aria-label="Task Assistant">
      <div class="chat-header">
        <div class="chat-header-text">
          <h2>Task Assistant</h2>
          <span class="chat-header-badge">AI</span>
        </div>
        <button class="chat-close" (click)="toggle()" aria-label="Close chat panel">&times;</button>
      </div>

      <div class="chat-messages" #messageList role="log" aria-live="polite" aria-relevant="additions">
        @if (messages().length === 0) {
          <div class="chat-welcome">
            <div class="welcome-icon" aria-hidden="true">&#x2728;</div>
            <p class="welcome-text">Ask me about your tasks</p>
            <p class="welcome-sub">I can help you find, understand, and manage your work.</p>
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
              <div class="message-content" [innerHTML]="msg.content | markdown"></div>
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
      right: -440px;
      width: 420px;
      height: 100vh;
      background: var(--color-surface);
      border-left: 1px solid var(--color-border);
      box-shadow: var(--shadow-xl);
      display: flex;
      flex-direction: column;
      z-index: 1000;
      transition: right 0.25s ease;
    }
    .chat-panel.open { right: 0; }

    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface-container-low);
    }
    .chat-header-text {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }
    .chat-header h2 {
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      margin: 0;
      color: var(--color-text);
    }
    .chat-header-badge {
      font-size: var(--text-xs);
      font-weight: var(--font-bold);
      color: var(--color-primary);
      background: var(--color-primary-light);
      padding: var(--space-3xs) var(--space-xs);
      border-radius: var(--radius-full);
      letter-spacing: var(--tracking-wide);
    }
    .chat-close {
      background: none;
      border: none;
      font-size: var(--text-xl);
      cursor: pointer;
      color: var(--color-text-muted);
      padding: var(--space-2xs);
      line-height: 1;
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .chat-close:hover {
      background: var(--color-bg-hover);
      color: var(--color-text);
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-md);
    }

    .chat-welcome {
      text-align: center;
      padding: var(--space-2xl) var(--space-md);
    }
    .welcome-icon {
      font-size: var(--text-3xl);
      margin-bottom: var(--space-md);
    }
    .welcome-text {
      font-size: var(--text-lg);
      font-weight: var(--font-medium);
      color: var(--color-text);
      margin-bottom: var(--space-2xs);
    }
    .welcome-sub {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin-bottom: var(--space-lg);
    }
    .suggested-prompts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
      justify-content: center;
    }
    .prompt-chip {
      background: var(--color-surface-container);
      color: var(--color-primary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-full);
      padding: var(--space-xs) var(--space-md);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast);
    }
    .prompt-chip:hover {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
    }

    .chat-message {
      margin-bottom: var(--space-md);
      max-width: 85%;
    }
    .chat-message.user {
      margin-left: auto;
      background: var(--color-primary);
      color: var(--color-on-primary);
      border-radius: var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl);
      padding: var(--space-sm) var(--space-md);
    }
    .chat-message.assistant {
      background: var(--color-surface-container);
      border-radius: var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm);
      padding: var(--space-sm) var(--space-md);
      color: var(--color-text);
    }
    .message-content {
      word-break: break-word;
      line-height: var(--leading-relaxed);
      font-size: var(--text-sm);
    }
    .message-content p {
      margin: 0 0 var(--space-xs) 0;
    }
    .message-content p:last-child {
      margin-bottom: 0;
    }
    .message-content strong {
      font-weight: var(--font-semibold);
    }
    .message-content em {
      font-style: italic;
    }
    .message-content h1,
    .message-content h2,
    .message-content h3,
    .message-content h4 {
      font-weight: var(--font-semibold);
      margin: var(--space-sm) 0 var(--space-xs) 0;
    }
    .message-content h1 { font-size: var(--text-lg); }
    .message-content h2 { font-size: var(--text-base); }
    .message-content h3 { font-size: var(--text-sm); }
    .message-content h4 { font-size: var(--text-xs); }
    .message-content ul {
      margin: var(--space-xs) 0;
      padding-left: var(--space-lg);
      list-style: disc;
    }
    .message-content li {
      margin-bottom: var(--space-3xs);
    }
    .message-content code {
      background: var(--color-surface-container);
      padding: var(--space-3xs) var(--space-2xs);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
    }

    .typing-indicator {
      display: flex;
      gap: var(--space-3xs);
      padding: var(--space-2xs) 0;
    }
    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: var(--color-text-muted);
      border-radius: var(--radius-full);
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
      gap: var(--space-2xs);
      align-items: center;
    }
    .sources-label {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .source-card {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2xs);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-3xs) var(--space-sm);
      font-size: var(--text-xs);
      cursor: pointer;
      transition: border-color var(--transition-fast);
    }
    .source-card:hover { border-color: var(--color-primary); }
    .source-title {
      color: var(--color-primary);
      font-weight: var(--font-medium);
    }
    .source-status {
      background: var(--color-surface-container);
      padding: var(--space-3xs) var(--space-2xs);
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .chat-error {
      padding: var(--space-sm) var(--space-md);
      background: var(--color-error-bg);
      color: var(--color-on-error-container);
      font-size: var(--text-sm);
      border-top: 1px solid var(--color-error-container);
    }

    .chat-input-area {
      padding: var(--space-md);
      border-top: 1px solid var(--color-border);
    }
    .input-wrapper {
      display: flex;
      gap: var(--space-xs);
      align-items: flex-end;
    }
    textarea {
      flex: 1;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-sm) var(--space-md);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      resize: none;
      min-height: 40px;
      max-height: 120px;
      line-height: var(--leading-normal);
      color: var(--color-text);
      background: var(--color-surface-container-low);
      transition: border-color var(--transition-fast);
    }
    textarea:focus {
      border-color: var(--color-border-focus);
      box-shadow: var(--shadow-focus);
      outline: none;
    }
    textarea::placeholder { color: var(--color-text-muted); }

    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-lg);
      border: none;
      background: var(--color-primary);
      color: var(--color-on-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-base);
      flex-shrink: 0;
      transition: background var(--transition-fast);
    }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .send-btn:not(:disabled):hover { background: var(--color-primary-hover); }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--color-on-primary);
      border-top-color: transparent;
      border-radius: var(--radius-full);
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
      border-radius: var(--radius-full);
      border: none;
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-size: var(--text-2xl);
      cursor: pointer;
      box-shadow: var(--shadow-lg);
      z-index: 999;
      transition: background var(--transition-fast), box-shadow var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-toggle:hover {
      background: var(--color-primary-hover);
      box-shadow: var(--shadow-xl);
    }

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
