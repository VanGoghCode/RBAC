import type { LlmClient, LlmResponse, LlmOptions } from './llm-client.interface';

export interface FakeLlmResponse {
  content: string;
  options?: Partial<LlmOptions>;
}

/**
 * Deterministic fake LLM client for tests.
 * Never calls AWS. Returns configured responses.
 */
export class FakeLlmClient implements LlmClient {
  private readonly defaultResponse: string;
  private responseMap: Map<string, string>;
  private callLog: Array<{ prompt: string; options?: LlmOptions }> = [];

  constructor(options?: { defaultResponse?: string; responses?: Record<string, string> }) {
    this.defaultResponse = options?.defaultResponse ?? '{"intent":"query"}';
    this.responseMap = new Map(Object.entries(options?.responses ?? {}));
  }

  async complete(prompt: string, options?: LlmOptions): Promise<LlmResponse> {
    this.callLog.push({ prompt, options });

    // Try to match a configured response
    for (const [pattern, response] of this.responseMap.entries()) {
      if (prompt.includes(pattern)) {
        return {
          content: response,
          modelId: 'fake-llm',
          latencyMs: 1,
          promptTokens: prompt.length,
          completionTokens: response.length,
        };
      }
    }

    return {
      content: this.defaultResponse,
      modelId: 'fake-llm',
      latencyMs: 1,
      promptTokens: prompt.length,
      completionTokens: this.defaultResponse.length,
    };
  }

  /** Get all prompts that were sent to the client. */
  getCallLog(): Array<{ prompt: string; options?: LlmOptions }> {
    return [...this.callLog];
  }

  /** Clear the call log between tests. */
  reset(): void {
    this.callLog = [];
  }

  /** Add or override a response pattern. */
  setResponse(pattern: string, response: string): void {
    this.responseMap.set(pattern, response);
  }
}
