import { Inject, Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TaskVisibility } from '@prisma/client';
import {
  PromptRenderer,
  RAG_SYSTEM_PROMPT,
  GUARDRAIL_PROMPT,
} from '@task-ai/ai';
import {
  AuthorizationScopeService,
  PermissionService,
} from '@task-ai/auth';
import { TaskRepository, AuditRepository, VectorSearchRepository } from '@task-ai/tasks';
import { LlmTelemetryService } from '../ai/llm-telemetry.service';
import { PrismaService } from '../prisma';
import { ChatRepository } from './chat.repository';
import { GuardrailService } from './guardrails';
import { IntentDetector, type ExtractedTask } from './intent/intent-detector';
import type { ChatAskDto, ChatHistoryQueryDto, ConversationMessagesQueryDto } from './dto';
import type { LlmClient, EmbeddingClient } from '@task-ai/ai';
import type { AuthorizationScope } from '@task-ai/shared/types';

const MAX_CONTEXT_LENGTH = 4000;

/** Detect structured query intent from user message for DB-based fallback. */
interface StructuredQuery {
  dueBefore?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
}

function detectStructuredQuery(message: string): StructuredQuery | null {
  const lower = message.toLowerCase();
  const query: StructuredQuery = {};
  let matched = false;

  // Overdue = due before now
  if (/\boverdue\b|\bpast due\b|\blate\b/.test(lower)) {
    query.dueBefore = new Date().toISOString();
    matched = true;
  }

  // Due soon = due within 7 days
  if (/\bdue soon\b|\bupcoming\b|\bdue this week\b/.test(lower)) {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    query.dueBefore = soon.toISOString();
    matched = true;
  }

  // Status filters
  const statusMatch = lower.match(/\b(todo|in.progress|in.review|blocked|done)\b/i);
  if (statusMatch) {
    const map: Record<string, string> = {
      'todo': 'TODO', 'in progress': 'IN_PROGRESS', 'in.progress': 'IN_PROGRESS',
      'in review': 'IN_REVIEW', 'in.review': 'IN_REVIEW', 'blocked': 'BLOCKED', 'done': 'DONE',
    };
    const status = map[statusMatch[1].toLowerCase()];
    if (status) {
      query.status = status;
      matched = true;
    }
  }

  // Priority filters
  const priorityMatch = lower.match(/\b(low|medium|high|critical)\s+priority\b|\bpriority:\s*(low|medium|high|critical)\b/i);
  if (priorityMatch) {
    const p = (priorityMatch[1] || priorityMatch[2]).toUpperCase();
    query.priority = p;
    matched = true;
  }

  // "my tasks" → filter to current user (handled at call site)
  if (/\bmy tasks\b|\bassigned to me\b|\bmy work\b/.test(lower)) {
    query.assigneeId = '__currentUser__';
    matched = true;
  }

  return matched ? query : null;
}
const MAX_CONVERSATION_MEMORY = 5;

const SAFE_BLOCKED_MESSAGE = 'I cannot process that request. Please try rephrasing your question.';

export interface ChatSource {
  taskId: string;
  title: string;
  similarity: number;
  status?: string;
  priority?: string;
  assigneeName?: string;
  dueAt?: string | null;
}

export interface ChatAskResult {
  answer: string;
  sources: ChatSource[];
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  intent: 'query' | 'create_task' | 'unknown';
  guardrailSafe: boolean;
  latencyMs: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly permission = new PermissionService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatRepo: ChatRepository,
    private readonly scopeService: AuthorizationScopeService,
    private readonly taskRepo: TaskRepository,
    private readonly auditRepo: AuditRepository,
    @Inject('LlmClient') private readonly llm: LlmClient,
    @Inject('EmbeddingClient') private readonly embeddingClient: EmbeddingClient,
    private readonly vectorSearch: VectorSearchRepository,
    private readonly promptRenderer: PromptRenderer,
    private readonly telemetry: LlmTelemetryService,
    private readonly intentDetector: IntentDetector,
    private readonly guardrailService: GuardrailService,
  ) {}

  async ask(userId: string, dto: ChatAskDto): Promise<ChatAskResult> {
    const start = Date.now();
    const scope = await this.scopeService.resolveScope(userId);

    if (!scope.allowedOrgIds.includes(dto.orgId)) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // ─── Input Guardrail ──────────────────────────────────────────
    const inputCheck = this.guardrailService.checkInput(dto.message);
    if (inputCheck.flagged) {
      this.logger.warn(`Input guardrail flagged: ${inputCheck.flaggedPhrases.join(', ')}`);
      await this.auditRepo.log({
        actorId: userId,
        orgId: dto.orgId,
        action: 'GUARDRAIL_INPUT_BLOCKED',
        resourceType: 'chat',
        resourceId: 'blocked',
        metadata: {
          flaggedPhrases: inputCheck.flaggedPhrases,
          redactedMessage: this.guardrailService.redactForLogs(dto.message.slice(0, 200)),
        },
      });

      // Create conversation if needed for context
      let conversationId = dto.conversationId;
      if (!conversationId) {
        const conv = await this.chatRepo.createConversation(userId, dto.orgId);
        conversationId = conv.id;
      }
      const userMsg = await this.chatRepo.saveMessage(conversationId, 'user', dto.message);
      const assistantMsg = await this.chatRepo.saveMessage(
        conversationId,
        'assistant',
        SAFE_BLOCKED_MESSAGE,
      );

      return {
        answer: SAFE_BLOCKED_MESSAGE,
        sources: [],
        conversationId,
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        intent: 'unknown',
        guardrailSafe: false,
        latencyMs: Date.now() - start,
      };
    }

    // Get or create conversation
    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conv = await this.chatRepo.createConversation(userId, dto.orgId);
      conversationId = conv.id;
    } else {
      const conv = await this.chatRepo.findConversationById(conversationId, userId);
      if (!conv) {
        throw new NotFoundException('Conversation not found');
      }
    }

    // Detect intent
    const intent = await this.intentDetector.detectIntent(inputCheck.normalized);

    // Handle task creation intent
    if (intent === 'create_task') {
      return this.handleCreateTaskIntent(userId, scope, dto, conversationId, start);
    }

    // Standard RAG query flow
    return this.handleQueryIntent(userId, scope, { ...dto, message: inputCheck.normalized }, conversationId, start, intent);
  }

  private async handleQueryIntent(
    userId: string,
    scope: AuthorizationScope,
    dto: ChatAskDto,
    conversationId: string,
    start: number,
    intent: 'query' | 'unknown',
  ): Promise<ChatAskResult> {
    // Save user message
    const userMsg = await this.chatRepo.saveMessage(conversationId, 'user', dto.message);

    // Embed user question
    let queryEmbedding: number[];
    try {
      const embResult = await this.embeddingClient.embedText(dto.message);
      queryEmbedding = embResult.embedding;
    } catch (error) {
      this.logger.error(`Failed to embed query: ${(error as Error).message}`);
      const assistantMsg = await this.chatRepo.saveMessage(
        conversationId,
        'assistant',
        'I encountered an error processing your question. Please try again.',
      );
      return {
        answer: 'I encountered an error processing your question. Please try again.',
        sources: [],
        conversationId,
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        intent,
        guardrailSafe: true,
        latencyMs: Date.now() - start,
      };
    }

    // Vector search with authorization scope
    const vectorResults = await this.vectorSearch.search(scope, queryEmbedding, {
      limit: 5,
      minSimilarity: 0.5,
    });

    // Collect task IDs from vector search to avoid duplicates
    const seenTaskIds = new Set<string>();

    // ─── Structured Query Fallback ─────────────────────────────────
    // For date/status-based queries ("overdue", "high priority"), vector search
    // may miss results. Supplement with direct DB queries.
    const structuredQuery = detectStructuredQuery(dto.message);

    if (structuredQuery && vectorResults.length < 3) {
      const filters: Record<string, string> = { ...structuredQuery };
      if (filters.assigneeId === '__currentUser__') {
        filters.assigneeId = userId;
      } else {
        delete filters.assigneeId;
      }

      try {
        const dbResults = await this.taskRepo.findMany(
          scope,
          { limit: 5 },
          filters,
          'dueAt',
          'asc',
        );

        for (const task of dbResults.items) {
          if (!seenTaskIds.has(task.id)) {
            vectorResults.push({
              taskId: task.id,
              title: task.title,
              similarity: 1.0,
              orgId: task.orgId,
              visibility: task.visibility,
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Structured query fallback failed: ${(error as Error).message}`);
      }
    }

    // Load full task context for retrieved tasks
    const sources: ChatSource[] = [];
    const contextParts: string[] = [];
    const taskRecords: Array<{ taskId: string; text: string }> = [];

    for (const result of vectorResults) {
      if (seenTaskIds.has(result.taskId)) continue;
      seenTaskIds.add(result.taskId);
      const task = await this.prisma.task.findFirst({
        where: { id: result.taskId, deletedAt: null },
        include: {
          assignee: { select: { name: true } },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { type: true, comment: true, createdAt: true },
          },
        },
      });

      if (!task) continue;

      // Double-check permission at application level
      if (!this.permission.canViewTask(scope, {
        orgId: task.orgId,
        visibility: task.visibility,
        createdById: task.createdById,
        assigneeId: task.assigneeId,
      })) continue;

      sources.push({
        taskId: task.id,
        title: task.title,
        similarity: result.similarity,
        status: task.status,
        priority: task.priority,
        assigneeName: task.assignee?.name,
        dueAt: task.dueAt?.toISOString() ?? null,
      });

      const recentActivity = task.activities
        .map((a) => `${a.type}: ${a.comment ?? 'no details'}`)
        .join('; ');

      const taskText =
        `Status: ${task.status} | Priority: ${task.priority}\n` +
        `Assignee: ${task.assignee?.name ?? 'Unassigned'}\n` +
        `Due: ${task.dueAt?.toISOString() ?? 'No due date'}\n` +
        `Description: ${task.description ?? 'No description'}\n` +
        `Recent Activity: ${recentActivity || 'None'}`;

      contextParts.push(`[Task: ${task.title}] (ID: ${task.id})\n${taskText}`);
      taskRecords.push({ taskId: task.id, text: taskText });
    }

    // ─── Prompt Boundary Protection ───────────────────────────────
    const safeContext = this.guardrailService.buildSafeContext(taskRecords);
    const contextText = safeContext.slice(0, MAX_CONTEXT_LENGTH);
    const boundaryInstruction = this.guardrailService.getBoundaryInstruction();
    const canaryToken = this.guardrailService.getCanaryToken();

    // Build conversation memory
    const memoryMessages = await this.chatRepo.getRecentMessages(conversationId, MAX_CONVERSATION_MEMORY * 2);
    const memoryBlock = memoryMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-MAX_CONVERSATION_MEMORY * 2)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // Render RAG prompt with boundary protection
    // Note: canary token is NOT injected into the prompt to prevent the LLM from
    // echoing it. Canary detection is kept in the output guardrail for defense-in-depth
    // in case the token appears in task data. Input guardrails (boundary markers, phrase
    // detection) provide primary prompt injection protection.
    const fullPrompt = this.promptRenderer.render(
      `${boundaryInstruction}\n\n${RAG_SYSTEM_PROMPT}`,
      {
        context: contextText || 'No relevant tasks found for this query.',
        question: memoryBlock ? `${memoryBlock}\n\nLatest Question: ${dto.message}` : dto.message,
      },
      'rag-system',
    );

    // Call LLM
    let llmResponse: Awaited<ReturnType<LlmClient['complete']>>;
    try {
      llmResponse = await this.llm.complete(fullPrompt.text, {
        maxTokens: 1024,
        temperature: 0.3,
      });
    } catch (error) {
      this.logger.error(`LLM call failed: ${(error as Error).message}`);
      await this.telemetry.logInteraction({
        modelId: 'unknown',
        latencyMs: Date.now() - start,
        failureCategory: 'llm_call_failed',
        metadata: { error: (error as Error).message },
      });
      const assistantMsg = await this.chatRepo.saveMessage(
        conversationId,
        'assistant',
        'I encountered an error generating a response. Please try again.',
      );
      return {
        answer: 'I encountered an error generating a response. Please try again.',
        sources,
        conversationId,
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        intent,
        guardrailSafe: true,
        latencyMs: Date.now() - start,
      };
    }

    // Log telemetry
    await this.telemetry.logInteraction({
      modelId: llmResponse.modelId,
      promptTokens: llmResponse.promptTokens,
      completionTokens: llmResponse.completionTokens,
      latencyMs: llmResponse.latencyMs,
    });

    // ─── Output Guardrail ─────────────────────────────────────────
    const outputCheck = this.guardrailService.checkOutput(
      llmResponse.content,
      sources.map((s) => ({ taskId: s.taskId, title: s.title, similarity: s.similarity })),
    );

    let guardrailSafe = outputCheck.safe;
    let finalAnswer = llmResponse.content;

    if (outputCheck.blocked) {
      this.logger.warn(`Output guardrail blocked: ${outputCheck.reasons.join(', ')}`);
      finalAnswer = SAFE_BLOCKED_MESSAGE;
      guardrailSafe = false;

      await this.auditRepo.log({
        actorId: userId,
        orgId: dto.orgId,
        action: 'GUARDRAIL_OUTPUT_BLOCKED',
        resourceType: 'chat',
        resourceId: 'blocked',
        metadata: {
          reasons: outputCheck.reasons,
          canaryLeaked: outputCheck.canaryLeaked,
          canaryHint: this.guardrailService.redactForLogs(canaryToken).slice(0, 20),
        },
      });

      await this.telemetry.logInteraction({
        modelId: llmResponse.modelId,
        latencyMs: Date.now() - start,
        failureCategory: outputCheck.canaryLeaked ? 'canary_leaked' : 'guardrail_blocked',
        metadata: { reasons: outputCheck.reasons },
      });
    }

    // Guardrail LLM check disabled — deterministic checks above provide sufficient
    // defense-in-depth (canary token, system prompt leak detection, refusal bypass).
    // The LLM-based check caused excessive false positives blocking legitimate responses.
    // Can be re-enabled with a tuned prompt if needed.

    // Save assistant message
    const sourcesJson = sources.map((s) => ({ taskId: s.taskId, similarity: s.similarity }));
    const assistantMsg = await this.chatRepo.saveMessage(
      conversationId,
      'assistant',
      finalAnswer,
      sourcesJson,
      { safe: guardrailSafe },
    );

    // Update conversation title if first message
    const conv = await this.chatRepo.findConversationById(conversationId, userId);
    if (conv && !conv.title) {
      const title = dto.message.slice(0, 100).trim();
      await this.chatRepo.updateConversationTitle(conversationId, title);
    }

    return {
      answer: finalAnswer,
      sources,
      conversationId,
      userMessageId: userMsg.id,
      assistantMessageId: assistantMsg.id,
      intent,
      guardrailSafe,
      latencyMs: Date.now() - start,
    };
  }

  private async handleCreateTaskIntent(
    userId: string,
    scope: AuthorizationScope,
    dto: ChatAskDto,
    conversationId: string,
    start: number,
  ): Promise<ChatAskResult> {
    const userMsg = await this.chatRepo.saveMessage(conversationId, 'user', dto.message);

    if (!this.permission.canCreateTaskFromChat(scope, dto.orgId)) {
      const assistantMsg = await this.chatRepo.saveMessage(
        conversationId,
        'assistant',
        'You do not have permission to create tasks in this organization.',
      );
      return {
        answer: 'You do not have permission to create tasks in this organization.',
        sources: [],
        conversationId,
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        intent: 'create_task',
        guardrailSafe: true,
        latencyMs: Date.now() - start,
      };
    }

    const extracted = await this.intentDetector.extractTask(dto.message);

    if (!extracted || !extracted.title) {
      const assistantMsg = await this.chatRepo.saveMessage(
        conversationId,
        'assistant',
        'I could not understand the task details. Could you please provide a clear task title? For example: "Create a task to fix the login bug"',
      );
      return {
        answer: 'I could not understand the task details. Could you please provide a clear task title?',
        sources: [],
        conversationId,
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        intent: 'create_task',
        guardrailSafe: true,
        latencyMs: Date.now() - start,
      };
    }

    // ─── Output Validation: Validate extracted task ───────────────
    const taskValidation = this.guardrailService.validateExtractedTask(JSON.stringify(extracted));
    if (!taskValidation.valid) {
      this.logger.warn(`Extracted task validation failed: ${taskValidation.errors.join(', ')}`);
      await this.auditRepo.log({
        actorId: userId,
        orgId: dto.orgId,
        action: 'GUARDRAIL_TASK_VALIDATION_FAILED',
        resourceType: 'chat',
        resourceId: 'blocked',
        metadata: { errors: taskValidation.errors },
      });
      const assistantMsg = await this.chatRepo.saveMessage(
        conversationId,
        'assistant',
        'I could not safely create that task. Please try rephrasing your request.',
      );
      return {
        answer: 'I could not safely create that task. Please try rephrasing your request.',
        sources: [],
        conversationId,
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        intent: 'create_task',
        guardrailSafe: false,
        latencyMs: Date.now() - start,
      };
    }

    // Create task via TasksService pattern (reuse permission checks)
    const assigneeId = !this.permission.canAssignToOther(scope, dto.orgId) ? userId : userId;

    try {
      const task = await this.taskRepo.create(scope, {
        orgId: dto.orgId,
        title: extracted.title,
        description: extracted.description,
        status: (extracted.status as any) ?? 'TODO',
        priority: (extracted.priority as any) ?? 'MEDIUM',
        category: extracted.category,
        visibility: TaskVisibility.PUBLIC,
        assigneeId,
        dueAt: extracted.dueAt ? new Date(extracted.dueAt) : undefined,
      });

      await this.auditRepo.log({
        actorId: userId,
        orgId: dto.orgId,
        action: 'TASK_CREATED_VIA_CHAT',
        resourceType: 'task',
        resourceId: task.id,
        metadata: { title: task.title, source: 'chat' },
      });

      // Mark embedding stale
      await this.prisma.taskEmbedding.updateMany({
        where: { taskId: task.id },
        data: { staleAt: new Date() },
      }).catch(() => {
        // Task may not have embedding yet, that's fine
      });

      const source: ChatSource = {
        taskId: task.id,
        title: task.title,
        similarity: 1,
        status: task.status,
        priority: task.priority,
        dueAt: task.dueAt?.toISOString() ?? null,
      };

      const answer = `I've created the task "${task.title}" for you. It's been added to your organization with ${task.priority} priority.`;
      const assistantMsg = await this.chatRepo.saveMessage(
        conversationId,
        'assistant',
        answer,
        [{ taskId: task.id, similarity: 1 }],
      );

      return {
        answer,
        sources: [source],
        conversationId,
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        intent: 'create_task',
        guardrailSafe: true,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      this.logger.error(`Failed to create task via chat: ${(error as Error).message}`);
      const assistantMsg = await this.chatRepo.saveMessage(
        conversationId,
        'assistant',
        'I encountered an error creating the task. Please try again or create it manually.',
      );
      return {
        answer: 'I encountered an error creating the task. Please try again or create it manually.',
        sources: [],
        conversationId,
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        intent: 'create_task',
        guardrailSafe: true,
        latencyMs: Date.now() - start,
      };
    }
  }

  async getHistory(userId: string, query: ChatHistoryQueryDto) {
    return this.chatRepo.findConversations(userId, {
      limit: query.limit,
      before: query.before,
    });
  }

  async getConversation(userId: string, conversationId: string, query: ConversationMessagesQueryDto) {
    const conv = await this.chatRepo.findConversationById(conversationId, userId);
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }
    return this.chatRepo.findMessages(conversationId, {
      limit: query.limit,
      cursor: query.cursor,
    });
  }
}
