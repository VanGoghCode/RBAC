import { IntentDetector } from './intent-detector';
import { PromptRenderer } from '@task-ai/ai';
import { FakeLlmClient } from '@task-ai/ai';

describe('IntentDetector', () => {
  let detector: IntentDetector;
  let fakeLlm: FakeLlmClient;
  let renderer: PromptRenderer;

  beforeEach(() => {
    renderer = new PromptRenderer();
  });

  describe('detectIntent', () => {
    it('detects query intent', async () => {
      fakeLlm = new FakeLlmClient({
        responses: { 'Classify': '{"intent":"query"}' },
      });
      detector = new IntentDetector(fakeLlm as any, renderer);

      const result = await detector.detectIntent('What tasks are assigned to me?');
      expect(result).toBe('query');
    });

    it('detects create_task intent', async () => {
      fakeLlm = new FakeLlmClient({
        responses: { 'Classify': '{"intent":"create_task"}' },
      });
      detector = new IntentDetector(fakeLlm as any, renderer);

      const result = await detector.detectIntent('Create a new task for fixing the login bug');
      expect(result).toBe('create_task');
    });

    it('returns unknown for unrecognized JSON', async () => {
      fakeLlm = new FakeLlmClient({
        defaultResponse: 'this is not valid json',
      });
      detector = new IntentDetector(fakeLlm as any, renderer);

      const result = await detector.detectIntent('random message');
      expect(result).toBe('unknown');
    });

    it('returns unknown for unsupported intent value', async () => {
      fakeLlm = new FakeLlmClient({
        defaultResponse: '{"intent":"delete_task"}',
      });
      detector = new IntentDetector(fakeLlm as any, renderer);

      const result = await detector.detectIntent('delete everything');
      expect(result).toBe('unknown');
    });

    it('returns unknown when LLM returns empty response', async () => {
      fakeLlm = new FakeLlmClient({
        defaultResponse: '',
      });
      detector = new IntentDetector(fakeLlm as any, renderer);

      const result = await detector.detectIntent('test');
      expect(result).toBe('unknown');
    });
  });

  describe('extractTask', () => {
    it('extracts valid task from message', async () => {
      fakeLlm = new FakeLlmClient({
        responses: {
          'task': '{"title":"Fix login bug","description":"Users cannot login","priority":"HIGH","status":"TODO"}',
        },
      });
      detector = new IntentDetector(fakeLlm as any, renderer);

      const result = await detector.extractTask('Create a high priority task to fix the login bug');
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Fix login bug');
      expect(result!.priority).toBe('HIGH');
    });

    it('returns null for malformed response', async () => {
      fakeLlm = new FakeLlmClient({
        defaultResponse: 'not json',
      });
      detector = new IntentDetector(fakeLlm as any, renderer);

      const result = await detector.extractTask('test');
      expect(result).toBeNull();
    });

    it('returns null for task with invalid priority', async () => {
      fakeLlm = new FakeLlmClient({
        defaultResponse: '{"title":"Task","priority":"INVALID","status":"TODO"}',
      });
      detector = new IntentDetector(fakeLlm as any, renderer);

      const result = await detector.extractTask('test');
      expect(result).toBeNull();
    });

    it('returns null for task with empty title', async () => {
      fakeLlm = new FakeLlmClient({
        defaultResponse: '{"title":"","priority":"MEDIUM","status":"TODO"}',
      });
      detector = new IntentDetector(fakeLlm as any, renderer);

      const result = await detector.extractTask('test');
      expect(result).toBeNull();
    });

    it('uses defaults for optional fields', async () => {
      fakeLlm = new FakeLlmClient({
        defaultResponse: '{"title":"Simple task"}',
      });
      detector = new IntentDetector(fakeLlm as any, renderer);

      const result = await detector.extractTask('create simple task');
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Simple task');
      expect(result!.priority).toBe('MEDIUM');
      expect(result!.status).toBe('TODO');
    });
  });
});
