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

// ─── Markdown Rendering ─────────────────────────────────────────────
function renderMarkdown(text: string): string {
  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```) — protect from further processing
  const codeBlocks: string[] = [];
  html = html.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return `\n%%CODEBLOCK_${idx}%%\n`;
  });

  // Process line by line for block elements
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip code block placeholders (handled later)
    if (line.includes('%%CODEBLOCK_')) {
      if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      result.push(line);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      result.push('<hr>');
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const level = headerMatch[1].length;
      result.push(`<h${level}>${inlineFormat(headerMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    const quoteMatch = line.match(/^&gt;\s*(.*)$/);
    if (quoteMatch) {
      if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      result.push(`<blockquote>${inlineFormat(quoteMatch[1])}</blockquote>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inList && listType !== 'ul') { result.push('</ol>'); inList = false; }
      if (!inList) { result.push('<ul>'); inList = true; listType = 'ul'; }
      result.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList && listType !== 'ol') { result.push('</ul>'); inList = false; }
      if (!inList) { result.push('<ol>'); inList = true; listType = 'ol'; }
      result.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    // Close list if non-list line
    if (inList) {
      result.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      result.push('<br>');
      continue;
    }

    // Regular paragraph line
    result.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); }

  html = result.join('\n');

  // Restore code blocks
  html = html.replace(/%%CODEBLOCK_(\d+)%%/g, (_m, idx) => codeBlocks[parseInt(idx)]);

  // Inline code (not inside pre/code blocks)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');
  html = html.replace(/(<br>\s*){2,}/g, '<br>');

  return html;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^\s*](?:.*?[^\s*])?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

@Pipe({ name: 'markdown', standalone: true })
class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(value));
  }
}

// ─── Message Model ──────────────────────────────────────────────────
interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[];
  loading?: boolean;
}

const SUGGESTED_PROMPTS = [
  { icon: '\u26A0\uFE0F', text: 'What needs my attention?' },
  { icon: '\u23F0', text: 'Show overdue tasks' },
  { icon: '\uD83D\uDCCA', text: "Summarize my team's progress" },
  { icon: '\u2705', text: 'What did I finish recently?' },
  { icon: '\uD83D\uDEA7', text: 'Are there any blocked tasks?' },
  { icon: '\uD83D\uDD25', text: 'Show high priority tasks' },
];

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [FormsModule, MarkdownPipe],
  template: `
    <div class="assistant-shell">
      @if (messages().length === 0) {
        <div class="welcome">
          <div class="welcome-logo">TaskAI</div>
          <h1 class="welcome-title">How can I help you today?</h1>
          <div class="prompt-grid">
            @for (prompt of suggestedPrompts; track prompt.text) {
              <button class="prompt-card" (click)="sendSuggested(prompt.text)">
                <span class="prompt-icon">{{ prompt.icon }}</span>
                <span class="prompt-text">{{ prompt.text }}</span>
              </button>
            }
          </div>
        </div>
      } @else {
        <div class="messages" #messageList role="log" aria-live="polite">
          @for (msg of messages(); track $index) {
            <div class="msg-row" [class]="msg.role">
              <div class="msg-inner">
                @if (msg.role === 'assistant') {
                  <div class="avatar ai-avatar">AI</div>
                }
                <div class="msg-body">
                  @if (msg.loading && !msg.content) {
                    <div class="typing">
                      <span></span><span></span><span></span>
                    </div>
                  } @else {
                    <div class="msg-content" [innerHTML]="msg.content | markdown"></div>
                    @if (msg.sources.length > 0) {
                      <div class="sources">
                        <span class="sources-label">Sources</span>
                        <div class="sources-list">
                          @for (source of msg.sources; track source.taskId) {
                            <button
                              class="source-pill"
                              (click)="navigateToTask(source.taskId)"
                              (keydown.enter)="navigateToTask(source.taskId)"
                              [attr.aria-label]="'View task: ' + source.title"
                            >
                              <span class="source-title">{{ source.title }}</span>
                              @if (source.status) {
                                <span class="source-status">{{ source.status }}</span>
                              }
                            </button>
                          }
                        </div>
                      </div>
                    }
                  }
                </div>
                @if (msg.role === 'user') {
                  <div class="avatar user-avatar">{{ userInitial }}</div>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (error()) {
        <div class="error-bar" role="alert">{{ error() }}</div>
      }

      <div class="input-dock">
        <div class="input-box">
          <textarea
            #messageInput
            [(ngModel)]="inputText"
            [disabled]="sending()"
            placeholder="Message TaskAI..."
            rows="1"
            (keydown)="handleKeyDown($event)"
            aria-label="Chat message input"
          ></textarea>
          <button class="send-btn" (click)="send()" [disabled]="!canSend()" aria-label="Send message">
            @if (sending()) {
              <span class="spinner"></span>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            }
          </button>
        </div>
        <p class="input-hint">TaskAI can make mistakes. Verify important information.</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: calc(100vh - var(--topbar-height));
      overflow: hidden;
    }

    .assistant-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 780px;
      margin: 0 auto;
      padding: 0 var(--space-md);
    }

    /* ─── Welcome ──────────────────────────────────────────────── */
    .welcome {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--space-xl);
    }
    .welcome-logo {
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--color-primary);
      letter-spacing: var(--tracking-tight);
      margin-bottom: var(--space-sm);
    }
    .welcome-title {
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      color: var(--color-text);
      margin: 0 0 var(--space-2xl);
    }
    .prompt-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-sm);
      width: 100%;
      max-width: 520px;
    }
    .prompt-card {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-md);
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      cursor: pointer;
      text-align: left;
      transition: background var(--transition-fast), border-color var(--transition-fast);
    }
    .prompt-card:hover {
      background: var(--color-surface-container);
      border-color: var(--color-text-muted);
    }
    .prompt-icon {
      font-size: var(--text-base);
      flex-shrink: 0;
    }
    .prompt-text {
      font-size: var(--text-sm);
      color: var(--color-text);
      font-weight: var(--font-medium);
    }

    /* ─── Messages ─────────────────────────────────────────────── */
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-xl) 0;
    }

    .msg-row {
      padding: var(--space-md) 0;
    }
    .msg-row + .msg-row {
      border-top: none;
    }

    .msg-inner {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
    }
    .msg-row.user .msg-inner {
      justify-content: flex-end;
    }

    .avatar {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: var(--font-bold);
      flex-shrink: 0;
    }
    .ai-avatar {
      background: var(--color-primary);
      color: white;
    }
    .user-avatar {
      background: #6b7280;
      color: white;
    }

    .msg-body {
      flex: 1;
      min-width: 0;
      max-width: 640px;
    }
    .msg-row.user .msg-body {
      background: var(--color-primary);
      color: white;
      padding: var(--space-sm) var(--space-lg);
      border-radius: 20px;
    }

    .msg-content {
      word-break: break-word;
      line-height: 1.7;
      font-size: var(--text-sm);
      color: var(--color-text);
    }
    .msg-row.user .msg-content {
      color: white;
    }

    /* Markdown styles */
    .msg-content p {
      margin: 0 0 var(--space-sm) 0;
      line-height: 1.7;
    }
    .msg-content p:last-child {
      margin-bottom: 0;
    }
    .msg-content strong {
      font-weight: 600;
      color: var(--color-text);
    }
    .msg-content em {
      font-style: italic;
    }
    .msg-content h1 {
      font-size: var(--text-lg);
      font-weight: 700;
      margin: var(--space-lg) 0 var(--space-sm) 0;
      line-height: 1.3;
      color: var(--color-text);
    }
    .msg-content h2 {
      font-size: var(--text-base);
      font-weight: 700;
      margin: var(--space-lg) 0 var(--space-sm) 0;
      line-height: 1.3;
      color: var(--color-text);
    }
    .msg-content h3 {
      font-size: var(--text-sm);
      font-weight: 700;
      margin: var(--space-md) 0 var(--space-xs) 0;
      line-height: 1.3;
      color: var(--color-text);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .msg-content h4 {
      font-size: var(--text-xs);
      font-weight: 600;
      margin: var(--space-md) 0 var(--space-xs) 0;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .msg-content ul {
      margin: var(--space-sm) 0;
      padding-left: var(--space-lg);
      list-style: disc;
    }
    .msg-content ol {
      margin: var(--space-sm) 0;
      padding-left: var(--space-lg);
      list-style: decimal;
    }
    .msg-content li {
      margin-bottom: var(--space-2xs);
      line-height: 1.7;
    }
    .msg-content li > ul,
    .msg-content li > ol {
      margin-top: var(--space-3xs);
      margin-bottom: 0;
    }
    .msg-content code {
      background: var(--color-surface-container);
      padding: 2px 7px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 0.85em;
      color: var(--color-primary);
      border: 1px solid var(--color-border);
    }
    .msg-content pre {
      background: #1e1e2e;
      color: #cdd6f4;
      padding: var(--space-md);
      border-radius: var(--radius-lg);
      overflow-x: auto;
      margin: var(--space-md) 0;
      font-size: var(--text-xs);
      line-height: 1.6;
    }
    .msg-content pre code {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }
    .msg-content blockquote {
      border-left: 3px solid var(--color-primary);
      margin: var(--space-sm) 0;
      padding: var(--space-xs) var(--space-md);
      color: var(--color-text-muted);
      font-style: italic;
      background: var(--color-surface-container-low);
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
    }
    .msg-content hr {
      border: none;
      border-top: 1px solid var(--color-border);
      margin: var(--space-md) 0;
    }
    .msg-row.user .msg-content code {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.2);
      color: white;
    }

    /* ─── Sources ──────────────────────────────────────────────── */
    .sources {
      margin-top: var(--space-md);
      padding-top: var(--space-sm);
      border-top: 1px solid var(--color-border);
    }
    .msg-row.user .sources {
      border-top-color: rgba(255,255,255,0.2);
    }
    .sources-label {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      display: block;
      margin-bottom: var(--space-xs);
    }
    .sources-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
    }
    .source-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: var(--radius-full);
      border: 1px solid var(--color-border);
      background: transparent;
      font-size: var(--text-xs);
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast);
    }
    .source-pill:hover {
      background: var(--color-surface-container);
      border-color: var(--color-primary);
    }
    .source-title {
      color: var(--color-primary);
      font-weight: 500;
    }
    .source-status {
      color: var(--color-text-muted);
    }

    /* ─── Typing ───────────────────────────────────────────────── */
    .typing {
      display: flex;
      gap: 5px;
      padding: var(--space-xs) 0;
    }
    .typing span {
      width: 7px;
      height: 7px;
      background: var(--color-text-muted);
      border-radius: 50%;
      animation: pulse 1.4s ease-in-out infinite;
    }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }

    /* ─── Input Dock ───────────────────────────────────────────── */
    .input-dock {
      padding: var(--space-sm) 0 var(--space-md);
    }
    .input-box {
      display: flex;
      align-items: flex-end;
      gap: var(--space-xs);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 24px;
      padding: var(--space-2xs) var(--space-2xs) var(--space-2xs) var(--space-lg);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .input-box:focus-within {
      border-color: var(--color-text-muted);
      box-shadow: 0 0 0 1px var(--color-text-muted);
    }
    textarea {
      flex: 1;
      border: none;
      background: transparent;
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      resize: none;
      min-height: 36px;
      max-height: 120px;
      line-height: 1.5;
      color: var(--color-text);
      padding: var(--space-xs) 0;
      outline: none;
    }
    textarea::placeholder {
      color: var(--color-text-muted);
    }

    .send-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: var(--color-primary);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background var(--transition-fast), opacity var(--transition-fast);
    }
    .send-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .send-btn:not(:disabled):hover {
      background: var(--color-primary-hover);
    }

    .input-hint {
      text-align: center;
      font-size: 11px;
      color: var(--color-text-muted);
      margin: var(--space-xs) 0 0;
    }

    .error-bar {
      padding: var(--space-sm) var(--space-md);
      background: var(--color-error-bg);
      color: var(--color-on-error-container);
      font-size: var(--text-sm);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-sm);
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid white;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .assistant-shell {
        padding: 0 var(--space-sm);
      }
      .prompt-grid {
        grid-template-columns: 1fr;
      }
      .msg-body {
        max-width: 100%;
      }
    }
  `],
})
export class AssistantPage implements AfterViewChecked {
  private readonly chatApi = inject(ChatApi);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);

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

  get userInitial(): string {
    return this.authState.user()?.name?.charAt(0)?.toUpperCase() ?? 'U';
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

    this.messages.update((msgs) => [
      ...msgs,
      { role: 'user', content: text, sources: [] },
      { role: 'assistant', content: '', sources: [], loading: true },
    ]);
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
