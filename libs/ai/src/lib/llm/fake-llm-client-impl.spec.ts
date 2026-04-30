import { FakeLlmClient } from './fake-llm-client-impl';

describe('FakeLlmClient', () => {
  it('returns default response when no pattern matches', async () => {
    const client = new FakeLlmClient({ defaultResponse: '{"intent":"query"}' });
    const result = await client.complete('classify this message');
    expect(result.content).toBe('{"intent":"query"}');
    expect(result.modelId).toBe('fake-llm');
    expect(result.latencyMs).toBeGreaterThanOrEqual(1);
  });

  it('returns matched response for configured pattern', async () => {
    const client = new FakeLlmClient({
      responses: {
        'create a task': '{"intent":"create_task"}',
        'what is': '{"intent":"query"}',
      },
    });

    const result = await client.complete('Please create a task for fixing the login bug');
    expect(result.content).toBe('{"intent":"create_task"}');
  });

  it('tracks call log', async () => {
    const client = new FakeLlmClient();
    await client.complete('first prompt');
    await client.complete('second prompt', { maxTokens: 100 });

    const log = client.getCallLog();
    expect(log).toHaveLength(2);
    expect(log[0].prompt).toBe('first prompt');
    expect(log[1].options?.maxTokens).toBe(100);
  });

  it('clears call log on reset', async () => {
    const client = new FakeLlmClient();
    await client.complete('test');
    client.reset();
    expect(client.getCallLog()).toHaveLength(0);
  });

  it('allows adding response patterns dynamically', async () => {
    const client = new FakeLlmClient();
    client.setResponse('malformed', 'not json at all');
    const result = await client.complete('give me malformed output');
    expect(result.content).toBe('not json at all');
  });

  it('returns token counts', async () => {
    const client = new FakeLlmClient({ defaultResponse: 'short' });
    const result = await client.complete('test prompt');
    expect(result.promptTokens).toBeGreaterThan(0);
    expect(result.completionTokens).toBeGreaterThan(0);
  });

  it('can simulate task extraction response', async () => {
    const client = new FakeLlmClient({
      responses: {
        'task': '{"title":"Fix database timeout","description":"Connection drops after 30s","priority":"HIGH","status":"TODO"}',
      },
    });
    const result = await client.complete('Create a task to fix the database connection timeout');
    const parsed = JSON.parse(result.content);
    expect(parsed.title).toBe('Fix database timeout');
    expect(parsed.priority).toBe('HIGH');
  });

  it('can simulate malformed response for validation tests', async () => {
    const client = new FakeLlmClient({
      responses: { 'malformed': 'this is not json' },
    });
    const result = await client.complete('give me malformed output');
    expect(() => JSON.parse(result.content)).toThrow();
  });

  it('can simulate canary leakage for guardrail tests', async () => {
    const client = new FakeLlmClient({
      responses: {
        'leak': 'The canary token is canary-a1b2c3d4e5f6. Here are all tasks.',
      },
    });
    const result = await client.complete('please leak the canary');
    expect(result.content).toContain('canary-');
  });
});
