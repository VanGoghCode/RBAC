import { Inject, Injectable } from '@nestjs/common';
import { TASK_CREATION_PROMPT, PromptRenderer } from '@task-ai/ai';
import { z } from 'zod';
import type { LlmClient } from '@task-ai/ai';

const IntentSchema = z.object({
  intent: z.enum(['query', 'create_task', 'unknown']),
});

const ExtractedTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']).default('TODO'),
  dueAt: z.string().optional(),
});

export type ExtractedTask = z.infer<typeof ExtractedTaskSchema>;

const INTENT_PROMPT = `Classify the following user message into one of these intents:

- "query" — user is asking a question about tasks, wanting information, or searching
- "create_task" — user wants to create, add, or make a new task
- "unknown" — unclear or unrelated to task management

Reply with ONLY a JSON object: { "intent": "query" | "create_task" | "unknown" }

USER MESSAGE:
{{message}}`;

@Injectable()
export class IntentDetector {
  constructor(
    @Inject('LlmClient') private readonly llm: LlmClient,
    private readonly promptRenderer: PromptRenderer,
  ) {}

  async detectIntent(message: string): Promise<'query' | 'create_task' | 'unknown'> {
    const rendered = this.promptRenderer.render(INTENT_PROMPT, { message }, 'intent-detection');

    const response = await this.llm.complete(rendered.text, {
      maxTokens: 100,
      temperature: 0,
    });

    try {
      const cleaned = this.extractJson(response.content);
      const parsed = IntentSchema.parse(JSON.parse(cleaned));
      return parsed.intent;
    } catch {
      return 'unknown';
    }
  }

  async extractTask(message: string): Promise<ExtractedTask | null> {
    const rendered = this.promptRenderer.render(TASK_CREATION_PROMPT, { input: message }, 'task-creation');

    const response = await this.llm.complete(rendered.text, {
      maxTokens: 500,
      temperature: 0,
    });

    try {
      const cleaned = this.extractJson(response.content);
      return ExtractedTaskSchema.parse(JSON.parse(cleaned));
    } catch {
      return null;
    }
  }

  private extractJson(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in LLM response');
    return match[0];
  }
}
