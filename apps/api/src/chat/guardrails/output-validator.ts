import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

/** Allowed intents from LLM structured output. */
const ALLOWED_INTENTS = ['query', 'create_task', 'unknown'] as const;

/** Schema for structured intent output from LLM. */
const StructuredIntentSchema = z.object({
  intent: z.enum(ALLOWED_INTENTS),
});

/** Schema for extracted task data from LLM. */
const SafeExtractedTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']).default('TODO'),
  dueAt: z.string().max(50).optional(),
}).strict();

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: unknown;
}

export interface SourceValidationResult {
  validSources: Array<{ taskId: string; title: string; similarity: number }>;
  removedCount: number;
}

@Injectable()
export class OutputValidator {
  private readonly logger = new Logger(OutputValidator.name);

  /** Validate structured intent output from LLM. */
  validateIntent(raw: unknown): ValidationResult {
    if (typeof raw !== 'string') {
      return { valid: false, errors: ['Intent must be a JSON string'] };
    }

    let parsed: unknown;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { valid: false, errors: ['No JSON object found in response'] };
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return { valid: false, errors: ['Malformed JSON in intent response'] };
    }

    const result = StructuredIntentSchema.safeParse(parsed);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return { valid: false, errors };
    }

    return { valid: true, errors: [], data: result.data };
  }

  /** Validate extracted task data from LLM, rejecting unknown fields. */
  validateExtractedTask(raw: unknown): ValidationResult {
    if (typeof raw !== 'string') {
      return { valid: false, errors: ['Task extraction must be a JSON string'] };
    }

    let parsed: unknown;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { valid: false, errors: ['No JSON object found in response'] };
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return { valid: false, errors: ['Malformed JSON in task extraction response'] };
    }

    // Reject unknown fields
    if (typeof parsed === 'object' && parsed !== null) {
      const allowedKeys = new Set(['title', 'description', 'category', 'priority', 'status', 'dueAt']);
      const unknownKeys = Object.keys(parsed).filter((k) => !allowedKeys.has(k));
      if (unknownKeys.length > 0) {
        this.logger.warn(`Unknown fields in task extraction: ${unknownKeys.join(', ')}`);
        return { valid: false, errors: [`Unknown fields: ${unknownKeys.join(', ')}`] };
      }
    }

    const result = SafeExtractedTaskSchema.safeParse(parsed);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return { valid: false, errors };
    }

    return { valid: true, errors: [], data: result.data };
  }

  /** Validate that cited sources are a subset of retrieved sources. */
  validateSources(
    citedSources: Array<{ taskId: string }>,
    retrievedSources: Array<{ taskId: string; title: string; similarity: number }>,
  ): SourceValidationResult {
    const retrievedIds = new Set(retrievedSources.map((s) => s.taskId));
    const validSources = retrievedSources.filter((s) =>
      citedSources.some((c) => c.taskId === s.taskId),
    );
    const removedCount = citedSources.filter((c) => !retrievedIds.has(c.taskId)).length;

    if (removedCount > 0) {
      this.logger.warn(`Removed ${removedCount} invalid citation(s) from response`);
    }

    return { validSources, removedCount };
  }

  /** Reject unsupported intents like delete_task, update_task. */
  isSupportedIntent(intent: string): boolean {
    return ALLOWED_INTENTS.includes(intent as any);
  }
}
