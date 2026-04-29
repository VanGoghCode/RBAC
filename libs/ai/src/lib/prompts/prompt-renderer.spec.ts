import { PROMPT_MANIFEST } from './prompt-manifest';
import { PromptRenderer } from './prompt-renderer';
import { RAG_SYSTEM_PROMPT } from './rag-system.prompt';
import { TASK_CREATION_PROMPT } from './task-creation.prompt';

describe('PromptRenderer', () => {
  let renderer: PromptRenderer;

  beforeEach(() => {
    renderer = new PromptRenderer();
  });

  it('renders prompt with all variables', () => {
    const template = 'Hello {{name}}, your task "{{task}}" is {{status}}.';
    const result = renderer.render(template, { name: 'Alice', task: 'Build API', status: 'done' }, 'test');

    expect(result.text).toContain('Alice');
    expect(result.text).toContain('Build API');
    expect(result.text).toContain('done');
    expect(result.text).not.toContain('{{');
  });

  it('throws on missing required variable', () => {
    const template = 'Hello {{name}}, {{greeting}}!';
    expect(() =>
      renderer.render(template, { name: 'Alice' }, 'test'),
    ).toThrow('missing required variables: greeting');
  });

  it('includes prompt version from manifest', () => {
    const result = renderer.render(
      RAG_SYSTEM_PROMPT,
      { context: 'some context', question: 'what?' },
      'rag-system',
    );
    expect(result.promptVersion).toBe(PROMPT_MANIFEST['rag-system'].version);
    expect(result.promptName).toBe('rag-system');
  });

  it('sanitizes untrusted input with delimiters', () => {
    const template = 'Context: {{context}}';
    const result = renderer.render(template, { context: 'user input' }, 'test');
    expect(result.text).toContain('---\nuser input\n---');
  });

  it('renders RAG system prompt with safe fake data', () => {
    const result = renderer.render(
      RAG_SYSTEM_PROMPT,
      { context: 'Task: Fix login bug. Status: TODO.', question: 'What needs fixing?' },
      'rag-system',
    );
    expect(result.text).toContain('Fix login bug');
    expect(result.text).toContain('What needs fixing?');
  });

  it('renders task creation prompt with user input', () => {
    const result = renderer.render(
      TASK_CREATION_PROMPT,
      { input: 'Create a high priority task to fix the database connection timeout by Friday' },
      'task-creation',
    );
    expect(result.text).toContain('database connection timeout');
  });

  it('returns version 0 for unknown prompt', () => {
    const template = 'Test {{x}}';
    const result = renderer.render(template, { x: 'y' }, 'unknown-prompt');
    expect(result.promptVersion).toBe(0);
  });
});
