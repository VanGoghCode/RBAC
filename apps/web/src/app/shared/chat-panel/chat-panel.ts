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
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthState } from '../../auth/auth.state';
import {
  ChatApi,
  ChatAskResponse,
  ChatSource,
} from '../../services/chat.api';

/** Markdown → HTML renderer with blockquotes, code blocks, lists, headers. */
function renderMarkdown(text: string): string {
  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks — protect from further processing
  const codeBlocks: string[] = [];
  html = html.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return `\n%%CODEBLOCK_${idx}%%\n`;
  });

  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType = '';

  const inlineFmt = (t: string) => t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^\s*](?:.*?[^\s*])?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>');

  for (const line of lines) {
    if (line.includes('%%CODEBLOCK_')) {
      if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      result.push(line);
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      result.push('<hr>');
      continue;
    }
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const lvl = headerMatch[1].length;
      result.push(`<h${lvl}>${inlineFmt(headerMatch[2])}</h${lvl}>`);
      continue;
    }
    const quoteMatch = line.match(/^&gt;\s*(.*)$/);
    if (quoteMatch) {
      if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      result.push(`<blockquote>${inlineFmt(quoteMatch[1])}</blockquote>`);
      continue;
    }
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inList && listType !== 'ul') { result.push('</ol>'); inList = false; }
      if (!inList) { result.push('<ul>'); inList = true; listType = 'ul'; }
      result.push(`<li>${inlineFmt(ulMatch[1])}</li>`);
      continue;
    }
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList && listType !== 'ol') { result.push('</ul>'); inList = false; }
      if (!inList) { result.push('<ol>'); inList = true; listType = 'ol'; }
      result.push(`<li>${inlineFmt(olMatch[1])}</li>`);
      continue;
    }
    if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
    if (line.trim() === '') { result.push('<br>'); continue; }
    result.push(`<p>${inlineFmt(line)}</p>`);
  }
  if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); }

  html = result.join('\n');
  html = html.replace(/%%CODEBLOCK_(\d+)%%/g, (_m, idx) => codeBlocks[parseInt(idx)]);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/(<br>\s*){2,}/g, '<br>');
  return html;
}

@Pipe({ name: 'markdown', standalone: true })
class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(value)) as SafeHtml;
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
            @if (msg.loading && !msg.content) {
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
      line-height: 1.7;
      font-size: var(--text-sm);
    }
    .message-content p {
      margin: 0 0 var(--space-xs) 0;
    }
    .message-content p:last-child {
      margin-bottom: 0;
    }
    .message-content strong {
      font-weight: 600;
    }
    .message-content em {
      font-style: italic;
    }
    .message-content h1,
    .message-content h2,
    .message-content h3,
    .message-content h4 {
      font-weight: 700;
      margin: var(--space-sm) 0 var(--space-xs) 0;
      line-height: 1.3;
    }
    .message-content h1 { font-size: var(--text-lg); }
    .message-content h2 { font-size: var(--text-base); }
    .message-content h3 { font-size: var(--text-sm); }
    .message-content h4 { font-size: var(--text-xs); }
    .message-content ul,
    .message-content ol {
      margin: var(--space-xs) 0;
      padding-left: var(--space-lg);
    }
    .message-content ul { list-style: disc; }
    .message-content ol { list-style: decimal; }
    .message-content li {
      margin-bottom: var(--space-3xs);
      line-height: 1.6;
    }
    .message-content code {
      background: var(--color-surface-container);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 0.85em;
      color: var(--color-primary);
      border: 1px solid var(--color-border);
    }
    .message-content pre {
      background: #1e1e2e;
      color: #cdd6f4;
      padding: var(--space-sm);
      border-radius: var(--radius-md);
      overflow-x: auto;
      margin: var(--space-sm) 0;
      font-size: var(--text-xs);
      line-height: 1.5;
    }
    .message-content pre code {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
    }
    .message-content blockquote {
      border-left: 3px solid var(--color-primary);
      margin: var(--space-xs) 0;
      padding: var(--space-2xs) var(--space-sm);
      color: var(--color-text-muted);
      font-style: italic;
      background: var(--color-surface-container-low);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }
    .message-content hr {
      border: none;
      border-top: 1px solid var(--color-border);
      margin: var(--space-sm) 0;
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
export class ChatPanelComponent implements AfterViewChecked {
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

    this.chatApi.askStream(
      { message: text, conversationId: this.conversationId, orgId },
      (accumulated) => {
        this.messages.update((msgs) => {
          const updated = [...msgs];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = { role: 'assistant', content: accumulated, sources: [], loading: true };
          return updated;
        });
        this.shouldScroll = true;
      },
    ).then((response: ChatAskResponse) => {
      this.conversationId = response.conversationId;
      this.messages.update((msgs) => {
        const updated = [...msgs];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          role: 'assistant',
          content: response.answer,
          sources: response.sources,
        };
        return updated;
      });
      this.sending.set(false);
      this.shouldScroll = true;
    }).catch((err) => {
      this.messages.update((msgs) => {
        const updated = [...msgs];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          sources: [],
        };
        return updated;
      });
      this.error.set(err?.message ?? 'Failed to get response');
      this.sending.set(false);
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
}
