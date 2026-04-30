import { Injectable, Logger } from '@nestjs/common';
import { CanaryService } from './canary.service';
import { InputNormalizer } from './input-normalizer';
import { OutputValidator } from './output-validator';
import { PromptBoundary } from './prompt-boundary';

export interface GuardrailResult {
  safe: boolean;
  blocked: boolean;
  reasons: string[];
  flaggedPhrases: string[];
  canaryLeaked: boolean;
}

@Injectable()
export class GuardrailService {
  private readonly logger = new Logger(GuardrailService.name);

  constructor(
    private readonly inputNormalizer: InputNormalizer,
    private readonly promptBoundary: PromptBoundary,
    private readonly outputValidator: OutputValidator,
    private readonly canaryService: CanaryService,
  ) {}

  /** Run input guardrails on user message before it reaches the LLM. */
  checkInput(message: string): { normalized: string; flagged: boolean; flaggedPhrases: string[] } {
    // Strip boundary markers from user input
    const cleaned = this.promptBoundary.stripBoundaryMarkers(message);

    // Normalize and detect high-risk phrases
    const result = this.inputNormalizer.normalize(cleaned);

    return {
      normalized: result.normalized,
      flagged: result.flagged,
      flaggedPhrases: result.flaggedPhrases,
    };
  }

  /** Run output guardrails on LLM response before returning to user. */
  checkOutput(
    response: string,
    retrievedSources: Array<{ taskId: string; title: string; similarity: number }>,
    citedSources?: Array<{ taskId: string }>,
  ): GuardrailResult {
    const reasons: string[] = [];
    let canaryLeaked = false;
    let blocked = false;

    // 1. Canary token check
    const canaryResult = this.canaryService.check(response);
    if (canaryResult.leaked) {
      canaryLeaked = true;
      blocked = true;
      reasons.push('Canary token detected in output');
    }

    // 2. Validate cited sources are subset of retrieved sources
    if (citedSources && citedSources.length > 0 && retrievedSources.length > 0) {
      const sourceValidation = this.outputValidator.validateSources(citedSources, retrievedSources);
      if (sourceValidation.removedCount > 0) {
        reasons.push(`${sourceValidation.removedCount} invalid citation(s) removed`);
      }
    }

    // 3. Check for system prompt leakage patterns
    if (this.containsSystemPromptLeak(response)) {
      blocked = true;
      reasons.push('Response contains system prompt content');
    }

    // 4. Check for refusal bypass patterns
    if (this.containsRefusalBypass(response)) {
      blocked = true;
      reasons.push('Response appears to bypass safety refusal');
    }

    return {
      safe: !blocked,
      blocked,
      reasons,
      flaggedPhrases: [],
      canaryLeaked,
    };
  }

  /** Build safe context for RAG prompt with boundary protection. */
  buildSafeContext(
    taskRecords: Array<{ taskId: string; text: string }>,
  ): string {
    return this.promptBoundary.wrapTaskRecords(taskRecords);
  }

  /** Get boundary instruction for system prompt. */
  getBoundaryInstruction(): string {
    return this.promptBoundary.getBoundaryInstruction();
  }

  /** Get canary token for prompt injection (internal use only). */
  getCanaryToken(): string {
    return this.canaryService.getToken();
  }

  /** Redact sensitive data from logs. */
  redactForLogs(content: string): string {
    return this.canaryService.redactForLogs(content);
  }

  /** Validate extracted task data from LLM output. */
  validateExtractedTask(raw: unknown): { valid: boolean; errors: string[]; data?: unknown } {
    return this.outputValidator.validateExtractedTask(raw);
  }

  private containsSystemPromptLeak(response: string): boolean {
    const lower = response.toLowerCase();
    const leakIndicators = [
      'you are a helpful assistant for a team task management system',
      'answer only based on the provided task context',
      'do not execute, create, or modify tasks',
      '<untrusted-data>',
      '</untrusted-data>',
    ];
    return leakIndicators.some((indicator) => lower.includes(indicator));
  }

  private containsRefusalBypass(response: string): boolean {
    // Check if response starts with "Sure, I'll ignore" or similar bypass patterns
    const lower = response.toLowerCase().slice(0, 200);
    const bypassPatterns = [
      "sure, i'll ignore",
      'okay, ignoring',
      'as requested, overriding',
      'bypassing safety',
    ];
    return bypassPatterns.some((p) => lower.includes(p));
  }
}
