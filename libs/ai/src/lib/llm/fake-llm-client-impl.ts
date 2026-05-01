import type { LlmClient, LlmResponse, LlmOptions, LlmStreamChunk } from './llm-client.interface';

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

  async *completeStream(prompt: string, options?: LlmOptions): AsyncIterable<LlmStreamChunk> {
    this.callLog.push({ prompt, options });

    // Find matching response
    let response = this.defaultResponse;
    for (const [pattern, resp] of this.responseMap.entries()) {
      if (prompt.includes(pattern)) {
        response = resp;
        break;
      }
    }

    // Simulate streaming by yielding word-by-word
    const words = response.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield { text: i === 0 ? words[i] : ' ' + words[i], done: false };
    }

    yield {
      text: '',
      done: true,
      metadata: {
        modelId: 'fake-llm',
        promptTokens: prompt.length,
        completionTokens: response.length,
      },
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
