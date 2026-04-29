export interface LlmResponse {
  content: string;
  modelId: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface LlmClient {
  complete(prompt: string, options?: LlmOptions): Promise<LlmResponse>;
}

export interface LlmOptions {
  maxTokens?: number;
  temperature?: number;
}
