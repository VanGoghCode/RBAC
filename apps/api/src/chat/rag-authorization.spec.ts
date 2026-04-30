import { Test } from '@nestjs/testing';
import { PromptRenderer } from '@task-ai/ai';
import { AuthorizationScopeService } from '@task-ai/auth';
import { TaskRepository, AuditRepository, VectorSearchRepository } from '@task-ai/tasks';
import { LlmTelemetryService } from '../ai/llm-telemetry.service';
import { PrismaService } from '../prisma';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';
import { GuardrailService } from './guardrails';
import { IntentDetector } from './intent/intent-detector';

/**
 * AI-Specific Security Regression Tests
 *
 * Verify that AI features maintain security invariants:
 * - RAG results filtered by authorization scope
 * - Private tasks excluded from non-owners
 * - Guardrail blocks always audited
 * - Chat task creation respects permissions
 */
describe('AI Security - RAG Authorization', () => {
  let service: ChatService;
  let moduleRef: import('@nestjs/testing').TestingModule;
  let scopeService: { resolveScope: jest.Mock };
  let vectorSearch: { search: jest.Mock };
  let guardrailService: {
    checkInput: jest.Mock;
    redactForLogs: jest.Mock;
    buildSafeContext: jest.Mock;
    getBoundaryInstruction: jest.Mock;
    getCanaryToken: jest.Mock;
    checkOutput: jest.Mock;
    validateExtractedTask: jest.Mock;
  };
  let auditRepo: { log: jest.Mock };
  let chatRepo: any;
  let llm: { complete: jest.Mock };
  let embeddingClient: { embedText: jest.Mock };
  let promptRenderer: { render: jest.Mock };
  let telemetry: { logInteraction: jest.Mock };
  let prisma: any;
  let intentDetector: { detectIntent: jest.Mock; extractTask: jest.Mock };
  let taskRepo: { create: jest.Mock };

  const memberScope = {
    actorUserId: 'user-1',
    allowedOrgIds: ['org-1'],
    rolesByOrg: { 'org-1': ['member'] },
  };

  const otherOrgScope = {
    actorUserId: 'user-2',
    allowedOrgIds: ['org-2'],
    rolesByOrg: { 'org-2': ['admin'] },
  };

  beforeEach(async () => {
    scopeService = { resolveScope: jest.fn() };
    vectorSearch = { search: jest.fn().mockResolvedValue([]) };
    guardrailService = {
      checkInput: jest.fn().mockReturnValue({
        normalized: 'test message',
        originalLength: 12,
        truncated: false,
        flagged: false,
        flaggedPhrases: [],
        isBenign: false,
      }),
      redactForLogs: jest.fn().mockReturnValue('[REDACTED]'),
      buildSafeContext: jest.fn().mockReturnValue('safe context'),
      getBoundaryInstruction: jest.fn().mockReturnValue('boundary instruction'),
      getCanaryToken: jest.fn().mockReturnValue('canary-token-123'),
      checkOutput: jest.fn().mockReturnValue({
        safe: true,
        blocked: false,
        reasons: [],
        canaryLeaked: false,
      }),
      validateExtractedTask: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    };
    auditRepo = { log: jest.fn().mockResolvedValue(undefined) };
    chatRepo = {
      createConversation: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      findConversationById: jest.fn().mockResolvedValue({ id: 'conv-1', title: null }),
      saveMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      getRecentMessages: jest.fn().mockResolvedValue([]),
      updateConversationTitle: jest.fn().mockResolvedValue(undefined),
    };
    llm = {
      complete: jest.fn().mockResolvedValue({
        content: 'Here are your tasks.',
        modelId: 'test-model',
        promptTokens: 10,
        completionTokens: 20,
        latencyMs: 100,
      }),
    };
    embeddingClient = { embedText: jest.fn().mockResolvedValue({ embedding: [0.1, 0.2] }) };
    promptRenderer = { render: jest.fn().mockReturnValue({ text: 'rendered prompt' }) };
    telemetry = { logInteraction: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      task: { findFirst: jest.fn().mockResolvedValue(null) },
      taskEmbedding: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    intentDetector = {
      detectIntent: jest.fn().mockResolvedValue('query'),
      extractTask: jest.fn(),
    };
    taskRepo = { create: jest.fn() };

    moduleRef = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChatRepository, useValue: chatRepo },
        { provide: AuthorizationScopeService, useValue: scopeService },
        { provide: TaskRepository, useValue: taskRepo },
        { provide: AuditRepository, useValue: auditRepo },
        { provide: 'LlmClient', useValue: llm },
        { provide: 'EmbeddingClient', useValue: embeddingClient },
        { provide: VectorSearchRepository, useValue: vectorSearch },
        { provide: PromptRenderer, useValue: promptRenderer },
        { provide: LlmTelemetryService, useValue: telemetry },
        { provide: IntentDetector, useValue: intentDetector },
        { provide: GuardrailService, useValue: guardrailService },
      ],
    }).compile();

    service = moduleRef.get(ChatService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('RAG retrieval is scoped by authorization', () => {
    it('vector search is called with authorization scope', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);

      await service.ask('user-1', { message: 'What are my tasks?', orgId: 'org-1' });

      expect(vectorSearch.search).toHaveBeenCalledWith(
        memberScope,
        expect.any(Array),
        expect.objectContaining({ limit: 5, minSimilarity: 0.5 }),
      );
    });

    it('cross-org vector results are excluded from chat context', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);

      // Vector search returns a cross-org task
      vectorSearch.search.mockResolvedValue([
        { taskId: 'task-other-org', similarity: 0.9 },
      ]);

      // But permission check rejects it (task from org-2)
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-other-org',
        orgId: 'org-2', // different org
        visibility: 'PUBLIC',
        createdById: 'user-2',
        assigneeId: null,
        title: 'Secret task',
        description: 'This is from another org',
        status: 'TODO',
        priority: 'MEDIUM',
        activities: [],
      });

      const result = await service.ask('user-1', { message: 'Show me tasks', orgId: 'org-1' });

      // The cross-org task should be filtered out
      expect(result.sources).toHaveLength(0);
    });

    it('private tasks from non-creator are excluded', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);

      vectorSearch.search.mockResolvedValue([
        { taskId: 'task-private', similarity: 0.9 },
      ]);

      // Private task created by another user in same org
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-private',
        orgId: 'org-1',
        visibility: 'PRIVATE',
        createdById: 'user-other', // different user
        assigneeId: null,
        title: 'Private task',
        description: 'Hidden details',
        status: 'TODO',
        priority: 'MEDIUM',
        activities: [],
      });

      const result = await service.ask('user-1', { message: 'Show me tasks', orgId: 'org-1' });

      expect(result.sources).toHaveLength(0);
    });

    it('public tasks from same org are included', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);

      vectorSearch.search.mockResolvedValue([
        { taskId: 'task-1', similarity: 0.9 },
      ]);

      prisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        orgId: 'org-1',
        visibility: 'PUBLIC',
        createdById: 'user-other', // different user but public
        assigneeId: null,
        title: 'Public task',
        description: 'Visible to all',
        status: 'TODO',
        priority: 'MEDIUM',
        activities: [],
        assignee: null,
        dueAt: null,
      });

      const result = await service.ask('user-1', { message: 'Show me tasks', orgId: 'org-1' });

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].taskId).toBe('task-1');
    });
  });

  describe('guardrail blocks are always audited', () => {
    it('output guardrail block creates audit log', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      vectorSearch.search.mockResolvedValue([]);
      prisma.task.findFirst.mockResolvedValue(null);

      guardrailService.checkOutput.mockReturnValue({
        safe: false,
        blocked: true,
        reasons: ['canary_leaked'],
        canaryLeaked: true,
      });

      // Skip secondary guardrail by making LLM throw
      llm.complete.mockResolvedValueOnce({
        content: 'Leaked canary token: canary-token-123',
        modelId: 'test',
        promptTokens: 10,
        completionTokens: 5,
        latencyMs: 50,
      });

      await service.ask('user-1', { message: 'Hello', orgId: 'org-1' });

      expect(auditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GUARDRAIL_OUTPUT_BLOCKED',
        }),
      );
    });
  });

  describe('chat task creation respects permissions', () => {
    it('viewer cannot create tasks via chat', async () => {
      scopeService.resolveScope.mockResolvedValue({
        actorUserId: 'user-viewer',
        allowedOrgIds: ['org-1'],
        rolesByOrg: { 'org-1': ['viewer'] },
      });
      intentDetector.detectIntent.mockResolvedValue('create_task');

      const result = await service.ask('user-viewer', {
        message: 'Create a task to fix login',
        orgId: 'org-1',
      });

      expect(result.answer).toContain('do not have permission');
      expect(taskRepo.create).not.toHaveBeenCalled();
    });

    it('task creation validates extracted task against schema', async () => {
      scopeService.resolveScope.mockResolvedValue(memberScope);
      intentDetector.detectIntent.mockResolvedValue('create_task');
      intentDetector.extractTask.mockResolvedValue({
        title: 'Valid task',
        description: 'Description',
        priority: 'MEDIUM',
      });

      const result = await service.ask('user-1', {
        message: 'Create a task called Valid task',
        orgId: 'org-1',
      });

      expect(guardrailService.validateExtractedTask).toHaveBeenCalled();
    });
  });
});
