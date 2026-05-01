export interface LlmResponse {
  content: string;
  modelId: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface LlmStreamChunk {
  text: string;
  done: boolean;
  metadata?: {
    modelId: string;
    promptTokens?: number;
    completionTokens?: number;
  };
}

export interface LlmClient {
  complete(prompt: string, options?: LlmOptions): Promise<LlmResponse>;
  completeStream(prompt: string, options?: LlmOptions): AsyncIterable<LlmStreamChunk>;
}

export interface LlmOptions {
  maxTokens?: number;
  temperature?: number;
}
